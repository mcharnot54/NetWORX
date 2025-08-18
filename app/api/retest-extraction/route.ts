import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simulate the fixed extraction logic from MultiTabExcelUploader
function simulateFixedExtraction(tab: any, fileType: 'UPS' | 'TL' | 'RL' | 'OTHER') {
  let bestColumn = '';
  let bestAmount = 0;

  const columns = tab.columns || [];
  const data = tab.sample_data || [];

  if (fileType === 'TL') {
    // Fixed TL logic: Filter out total rows
    const rateColumns = ['Gross Rate', 'Rate', 'Cost', 'Charge', 'Total', 'Amount'];
    const rateColumn = columns.find((col: string) => 
      rateColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
    );
    
    if (rateColumn) {
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

      for (const row of filteredData) {
        if (row && row[rateColumn]) {
          const numValue = parseFloat(String(row[rateColumn]).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 1) {
            bestAmount += numValue;
          }
        }
      }
      bestColumn = rateColumn;
      
      return {
        column: bestColumn,
        amount: bestAmount,
        rows_filtered: data.length - filteredData.length,
        method: 'tl_filtered'
      };
    }
  } else if (fileType === 'RL') {
    // Fixed R&L logic: Prioritize column V with lenient criteria
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
        
        return {
          column: bestColumn,
          amount: bestAmount,
          valid_values: validValues,
          method: 'column_v_lenient'
        };
      }
    }

    // Fallback to priority columns
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
          
          return {
            column: bestColumn,
            amount: bestAmount,
            valid_values: validValues,
            method: 'fallback_priority'
          };
        }
      }
    }

    // Final fallback - avoid address columns
    for (const col of columns) {
      if (!col || 
          col.toLowerCase().includes('empty') || 
          col.toLowerCase().includes('null') ||
          col.toLowerCase().includes('address') ||
          col.toLowerCase().includes('consignee')) continue;

      const isLikelyCostColumn = col.toLowerCase().includes('net') ||
                               col.toLowerCase().includes('charge') ||
                               col.toLowerCase().includes('cost') ||
                               col.toLowerCase().includes('amount') ||
                               col.toLowerCase().includes('total') ||
                               col.toLowerCase().includes('freight') ||
                               col.toLowerCase().includes('revenue');

      if (!isLikelyCostColumn) continue;

      let testAmount = 0;
      let validValues = 0;

      for (const row of data) {
        if (row && row[col]) {
          const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && isFinite(numValue) && numValue > 0.01) {
            testAmount += numValue;
            validValues++;
          }
        }
      }

      if (validValues > 5 && testAmount > bestAmount && testAmount > 1000 && isFinite(testAmount)) {
        bestAmount = testAmount;
        bestColumn = col;
      }
    }
    
    return {
      column: bestColumn,
      amount: bestAmount,
      method: 'pattern_match_filtered'
    };
  }

  return { column: '', amount: 0, method: 'none' };
}

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    const results = {
      original_vs_fixed: [],
      summary: {}
    };

    // Get both files
    const files = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (file_name ILIKE '%R&L%' AND file_name ILIKE '%CURRICULUM%')
         OR (file_name ILIKE '%2024 TOTALS%' AND file_name ILIKE '%TL%')
      ORDER BY file_name
    `;

    for (const file of files) {
      const processedData = file.processed_data as any;
      
      if (processedData?.multi_tab_structure) {
        const tabs = processedData.multi_tab_structure.tabs || [];
        const fileType = file.file_name.includes('R&L') ? 'RL' : 'TL';
        
        let originalTotal = 0;
        let fixedTotal = 0;
        const tabComparisons = [];

        for (const tab of tabs) {
          originalTotal += tab.extracted_amount || 0;
          
          // Apply fixed extraction logic
          const fixedResult = simulateFixedExtraction(tab, fileType as any);
          fixedTotal += fixedResult.amount;
          
          tabComparisons.push({
            tab_name: tab.name,
            original: {
              column: tab.target_column,
              amount: tab.extracted_amount
            },
            fixed: fixedResult,
            improvement: {
              amount_change: fixedResult.amount - (tab.extracted_amount || 0),
              is_better: fileType === 'RL' ? 
                (fixedResult.column === 'V' && tab.target_column !== 'V') :
                (fixedResult.amount < (tab.extracted_amount || 0) && fixedResult.amount > 0)
            }
          });
        }

        results.original_vs_fixed.push({
          file_name: file.file_name,
          file_type: fileType,
          original_total: originalTotal,
          fixed_total: fixedTotal,
          change: fixedTotal - originalTotal,
          percentage_change: originalTotal > 0 ? ((fixedTotal - originalTotal) / originalTotal * 100).toFixed(2) + '%' : 'N/A',
          tabs: tabComparisons
        });
      }
    }

    // Calculate summary
    const rlResult = results.original_vs_fixed.find(r => r.file_type === 'RL');
    const tlResult = results.original_vs_fixed.find(r => r.file_type === 'TL');

    results.summary = {
      rl_fixed: rlResult ? {
        old: rlResult.original_total,
        new: rlResult.fixed_total,
        improvement: rlResult.fixed_total > 0 && rlResult.fixed_total < rlResult.original_total
      } : null,
      tl_fixed: tlResult ? {
        old: tlResult.original_total,
        new: tlResult.fixed_total,
        improvement: tlResult.fixed_total > 0 && tlResult.fixed_total < tlResult.original_total
      } : null,
      total_baseline: {
        old: (rlResult?.original_total || 0) + (tlResult?.original_total || 0),
        new: (rlResult?.fixed_total || 0) + (tlResult?.fixed_total || 0)
      }
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error retesting extraction:', error);
    return NextResponse.json({
      error: 'Failed to retest extraction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
