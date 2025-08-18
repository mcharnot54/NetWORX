import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simulate the corrected TL extraction logic
function testCorrectTLExtraction(tabData: any, tabName: string) {
  const data = tabData.sample_data || tabData.data || [];
  const columns = tabData.columns || [];
  
  // Find rate column
  const rateColumns = ['Gross Rate', 'gross_rate', 'Rate', 'Freight Cost', 'freight_cost', 'Cost', 'Charge', 'Total', 'Amount'];
  const rateColumn = columns.find((col: string) => 
    rateColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
  );
  
  if (!rateColumn) {
    return {
      tab: tabName,
      error: 'No rate column found',
      columns: columns
    };
  }
  
  console.log(`Testing ${tabName} with rate column: ${rateColumn}`);
  
  // Smart filtering logic
  const filteredData = data.filter((row: any) => {
    if (!row) return false;
    
    // Check for total keywords
    const rowValues = Object.values(row).map(val => String(val).toLowerCase());
    const hasTotal = rowValues.some(val => 
      val.includes('total') ||
      val.includes('sum') ||
      val.includes('grand') ||
      val.includes('subtotal')
    );
    
    if (hasTotal) return false;
    
    // Smart check: if row has monetary value but no supporting data, exclude it
    if (row[rateColumn]) {
      const numValue = parseFloat(String(row[rateColumn]).replace(/[$,\s]/g, ''));
      if (!isNaN(numValue) && numValue > 0) {
        // Check for supporting data columns
        const supportingDataColumns = Object.keys(row).filter(key => 
          key.toLowerCase().includes('origin') ||
          key.toLowerCase().includes('destination') ||
          key.toLowerCase().includes('from') ||
          key.toLowerCase().includes('to') ||
          key.toLowerCase().includes('route') ||
          key.toLowerCase().includes('lane') ||
          key.toLowerCase().includes('city') ||
          key.toLowerCase().includes('state') ||
          key.toLowerCase().includes('zip') ||
          key.toLowerCase().includes('location') ||
          key.toLowerCase().includes('service') ||
          key.toLowerCase().includes('mode') ||
          key.toLowerCase().includes('carrier')
        );
        
        // Count supporting data with actual values
        const supportingDataCount = supportingDataColumns.filter(col => {
          const value = row[col];
          return value && String(value).trim() !== '' && 
                 String(value).toLowerCase() !== 'null' &&
                 String(value).toLowerCase() !== 'n/a';
        }).length;
        
        // If no supporting data, it's likely a total row
        if (supportingDataCount === 0) {
          console.log(`${tabName}: Excluding $${numValue.toLocaleString()} - no supporting data`);
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Calculate total
  let total = 0;
  let validValues = 0;
  
  for (const row of filteredData) {
    if (row && row[rateColumn]) {
      const numValue = parseFloat(String(row[rateColumn]).replace(/[$,\s]/g, ''));
      if (!isNaN(numValue) && numValue > 1) {
        total += numValue;
        validValues++;
      }
    }
  }
  
  return {
    tab: tabName,
    rateColumn: rateColumn,
    originalRows: data.length,
    filteredRows: filteredData.length,
    rowsExcluded: data.length - filteredData.length,
    validValues: validValues,
    total: total,
    formatted: `$${total.toLocaleString()}`
  };
}

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the TL file
    const tlFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024 TOTALS%' AND file_name ILIKE '%TL%'
      ORDER BY id DESC
      LIMIT 1
    `;

    if (tlFiles.length === 0) {
      return NextResponse.json({ error: 'TL file not found' }, { status: 404 });
    }

    const file = tlFiles[0];
    const processedData = file.processed_data as any;
    
    const results = {
      file_name: file.file_name,
      correction_test: [],
      expected_values: {
        'OB LITTLETON': 292177,
        'TOTAL 2024': 376965,
        'IB MA NH': 240465
      }
    };

    if (processedData?.multi_tab_structure) {
      const tabs = processedData.multi_tab_structure.tabs || [];
      
      for (const tab of tabs) {
        const testResult = testCorrectTLExtraction(tab, tab.name);
        (results.correction_test as any[]).push(testResult);
      }
      
      // Calculate total and compare
      const calculatedTotal = (results.correction_test as any[]).reduce((sum, tab) => sum + tab.total, 0);
      const expectedTotal = Object.values(results.expected_values).reduce((sum, val) => sum + val, 0);
      
      (results as any).summary = {
        calculated_total: calculatedTotal,
        expected_total: expectedTotal,
        difference: calculatedTotal - expectedTotal,
        accuracy: expectedTotal > 0 ? ((calculatedTotal / expectedTotal) * 100).toFixed(1) + '%' : 'N/A'
      };
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error testing corrected TL extraction:', error);
    return NextResponse.json({
      error: 'Failed to test corrected extraction',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
