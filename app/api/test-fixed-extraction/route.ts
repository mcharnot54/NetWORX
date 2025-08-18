import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    const results = {
      success: true,
      fixed_extractions: {
        rl_file: null,
        tl_file: null
      },
      comparison: {},
      issues_found: []
    };

    // === TEST R&L FILE WITH FIXED LOGIC ===
    const rlFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%R&L%' AND file_name ILIKE '%CURRICULUM%'
      ORDER BY id DESC
      LIMIT 1
    `;

    if (rlFiles.length > 0) {
      const rlFile = rlFiles[0];
      const processedData = rlFile.processed_data as any;
      
      if (processedData?.multi_tab_structure) {
        const tabs = processedData.multi_tab_structure.tabs || [];
        const detailTab = tabs.find((tab: any) => tab.name.toLowerCase().includes('detail'));
        
        if (detailTab && detailTab.sample_data) {
          // Apply the fixed extraction logic
          const testResult = await testRLExtraction(detailTab);
          results.fixed_extractions.rl_file = {
            file_name: rlFile.file_name,
            tab_name: detailTab.name,
            original_extraction: {
              column: detailTab.target_column,
              amount: detailTab.extracted_amount
            },
            fixed_extraction: testResult,
            improvement: testResult.amount < detailTab.extracted_amount ? 'BETTER' : 'NEEDS_REVIEW'
          };
        }
      }
    }

    // === TEST TL FILE WITH FIXED LOGIC ===
    const tlFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024 TOTALS%' AND file_name ILIKE '%TL%'
      ORDER BY id DESC
      LIMIT 1
    `;

    if (tlFiles.length > 0) {
      const tlFile = tlFiles[0];
      const processedData = tlFile.processed_data as any;
      
      if (processedData?.multi_tab_structure) {
        const tabs = processedData.multi_tab_structure.tabs || [];
        let originalTotal = 0;
        let fixedTotal = 0;
        const tabResults = [];
        
        for (const tab of tabs) {
          originalTotal += tab.extracted_amount || 0;
          
          if (tab.sample_data) {
            const testResult = await testTLExtraction(tab);
            fixedTotal += testResult.amount;
            tabResults.push({
              tab_name: tab.name,
              original: { column: tab.target_column, amount: tab.extracted_amount },
              fixed: testResult,
              total_rows_filtered: testResult.total_rows_filtered
            });
          }
        }
        
        results.fixed_extractions.tl_file = {
          file_name: tlFile.file_name,
          original_total: originalTotal,
          fixed_total: fixedTotal,
          improvement: fixedTotal < originalTotal ? 'BETTER' : 'NEEDS_REVIEW',
          tab_results: tabResults
        };
      }
    }

    // === GENERATE COMPARISON ===
    if (results.fixed_extractions.rl_file && results.fixed_extractions.tl_file) {
      const rlOriginal = results.fixed_extractions.rl_file.original_extraction.amount;
      const rlFixed = results.fixed_extractions.rl_file.fixed_extraction.amount;
      const tlOriginal = results.fixed_extractions.tl_file.original_total;
      const tlFixed = results.fixed_extractions.tl_file.fixed_total;
      
      results.comparison = {
        rl_change: {
          from: rlOriginal,
          to: rlFixed,
          difference: rlFixed - rlOriginal,
          percentage_change: rlOriginal > 0 ? ((rlFixed - rlOriginal) / rlOriginal * 100).toFixed(2) + '%' : 'N/A'
        },
        tl_change: {
          from: tlOriginal,
          to: tlFixed,
          difference: tlFixed - tlOriginal,
          percentage_change: tlOriginal > 0 ? ((tlFixed - tlOriginal) / tlOriginal * 100).toFixed(2) + '%' : 'N/A'
        },
        total_baseline_change: {
          from: rlOriginal + tlOriginal,
          to: rlFixed + tlFixed,
          difference: (rlFixed + tlFixed) - (rlOriginal + tlOriginal)
        }
      };
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error testing fixed extraction:', error);
    return NextResponse.json({
      error: 'Failed to test fixed extraction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper function to test R&L extraction with fixed logic
async function testRLExtraction(tab: any) {
  const columns = tab.columns || [];
  const data = tab.sample_data || [];
  
  let bestColumn = '';
  let bestAmount = 0;
  
  // First priority: Look for exact column V - be more lenient
  const columnV = columns.find((col: string) => col === 'V');
  if (columnV) {
    let testAmount = 0;
    let validValues = 0;

    for (const row of data) {
      if (row && row[columnV]) {
        const numValue = parseFloat(String(row[columnV]).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && isFinite(numValue) && numValue > 0.01) {
          testAmount += numValue;
          validValues++;
        }
      }
    }

    // More lenient criteria for column V
    if (validValues > 0 && testAmount > 0 && isFinite(testAmount)) {
      bestAmount = testAmount;
      bestColumn = columnV;
    }
  }

  // If column V didn't work, try priority columns
  if (!bestColumn) {
    const priorityColumns = ['Net Charge', 'net_charge', 'NetCharge', 'Charge', 'charge'];
    
    for (const priorityCol of priorityColumns) {
      if (columns.includes(priorityCol)) {
        let testAmount = 0;
        let validValues = 0;

        for (const row of data) {
          if (row && row[priorityCol]) {
            const numValue = parseFloat(String(row[priorityCol]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && isFinite(numValue) && numValue > 0.01) {
              testAmount += numValue;
              validValues++;
            }
          }
        }

        if (validValues > 5 && testAmount > 1000 && isFinite(testAmount)) {
          bestAmount = testAmount;
          bestColumn = priorityCol;
          break;
        }
      }
    }
  }

  return {
    column: bestColumn,
    amount: bestAmount,
    method: columnV && bestColumn === 'V' ? 'column_v_fixed' : 'fallback_column',
    validation_passed: bestAmount > 0
  };
}

// Helper function to test TL extraction with total row filtering
async function testTLExtraction(tab: any) {
  const data = tab.sample_data || [];
  const targetColumn = tab.target_column;
  
  if (!targetColumn) {
    return { column: '', amount: 0, total_rows_filtered: 0 };
  }
  
  // Filter out total rows
  const filteredData = data.filter((row: any) => {
    if (!row) return false;
    
    const rowValues = Object.values(row).map(val => String(val).toLowerCase());
    const hasTotal = rowValues.some(val => 
      val.includes('total') ||
      val.includes('sum') ||
      val.includes('grand') ||
      val.includes('subtotal')
    );
    
    return !hasTotal;
  });

  let totalAmount = 0;
  
  for (const row of filteredData) {
    if (row && row[targetColumn]) {
      const numValue = parseFloat(String(row[targetColumn]).replace(/[$,\s]/g, ''));
      if (!isNaN(numValue) && numValue > 1) {
        totalAmount += numValue;
      }
    }
  }

  return {
    column: targetColumn,
    amount: totalAmount,
    total_rows_filtered: data.length - filteredData.length,
    original_rows: data.length,
    filtered_rows: filteredData.length
  };
}
