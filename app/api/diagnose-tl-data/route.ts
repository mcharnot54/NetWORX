import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    
    const diagnosis = {
      file_name: file.file_name,
      tabs_analysis: []
    };

    if (processedData?.multi_tab_structure) {
      const tabs = processedData.multi_tab_structure.tabs || [];
      
      for (const tab of tabs) {
        const data = tab.sample_data || tab.data || [];
        const columns = tab.columns || [];
        
        // Find NET charge/rate column (NOT gross)
        const netRateColumns = ['Net Charge', 'Net Rate', 'Net Cost', 'net_charge', 'net_rate'];
        const fallbackColumns = ['Rate', 'Charge', 'Cost', 'Freight Cost', 'freight_cost'];

        // Prioritize NET columns first
        let rateColumn = columns.find((col: string) =>
          netRateColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
        );

        // If no NET column found, use fallback but exclude GROSS
        if (!rateColumn) {
          rateColumn = columns.find((col: string) =>
            !col.toLowerCase().includes('gross') && // EXCLUDE gross columns
            fallbackColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
          );
        }
        
        // Analyze last few rows for totals
        const lastRows = data.slice(-5).map((row: any, index: number) => {
          const rowIndex = data.length - 5 + index;
          const rateValue = rateColumn ? row[rateColumn] : null;
          const numValue = rateValue ? parseFloat(String(rateValue).replace(/[$,\s]/g, '')) : 0;
          
          // Check supporting data
          const supportingDataColumns = Object.keys(row).filter(key => 
            key.toLowerCase().includes('origin') ||
            key.toLowerCase().includes('destination') ||
            key.toLowerCase().includes('from') ||
            key.toLowerCase().includes('to') ||
            key.toLowerCase().includes('city') ||
            key.toLowerCase().includes('state') ||
            key.toLowerCase().includes('location')
          );
          
          const supportingDataCount = supportingDataColumns.filter(col => {
            const value = row[col];
            return value && String(value).trim() !== '' && 
                   String(value).toLowerCase() !== 'null';
          }).length;
          
          return {
            row_index: rowIndex,
            rate_value: rateValue,
            numeric_value: numValue,
            supporting_data_columns: supportingDataColumns,
            supporting_data_count: supportingDataCount,
            is_likely_total: numValue > 0 && supportingDataCount === 0,
            sample_row_data: Object.keys(row).slice(0, 5).reduce((obj: any, key) => {
              obj[key] = row[key];
              return obj;
            }, {})
          };
        });
        
        // Calculate totals with and without filtering
        let totalWithoutFiltering = 0;
        let totalWithFiltering = 0;
        let rowsExcluded = 0;
        
        for (const row of data) {
          if (row && rateColumn && row[rateColumn]) {
            const numValue = parseFloat(String(row[rateColumn]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 1) {
              totalWithoutFiltering += numValue;
              
              // Check if this row should be excluded
              const supportingDataColumns = Object.keys(row).filter(key => 
                key.toLowerCase().includes('origin') ||
                key.toLowerCase().includes('destination') ||
                key.toLowerCase().includes('from') ||
                key.toLowerCase().includes('to') ||
                key.toLowerCase().includes('city') ||
                key.toLowerCase().includes('state') ||
                key.toLowerCase().includes('location')
              );
              
              const supportingDataCount = supportingDataColumns.filter(col => {
                const value = row[col];
                return value && String(value).trim() !== '' && 
                       String(value).toLowerCase() !== 'null';
              }).length;
              
              if (supportingDataCount > 0) {
                totalWithFiltering += numValue;
              } else {
                rowsExcluded++;
              }
            }
          }
        }
        
        (diagnosis.tabs_analysis as any[]).push({
          tab_name: tab.name,
          total_rows: data.length,
          rate_column: rateColumn,
          all_columns: columns,
          last_5_rows: lastRows,
          totals: {
            without_filtering: totalWithoutFiltering,
            with_smart_filtering: totalWithFiltering,
            difference: totalWithoutFiltering - totalWithFiltering,
            rows_excluded: rowsExcluded
          },
          expected_total: tab.name === 'OB LITTLETON' ? 292177 : 
                          tab.name === 'TOTAL 2024' ? 376965 :
                          tab.name === 'IB MA NH' ? 240465 : null
        });
      }
    }

    return NextResponse.json(diagnosis);

  } catch (error) {
    console.error('Error diagnosing TL data:', error);
    return NextResponse.json({
      error: 'Failed to diagnose TL data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
