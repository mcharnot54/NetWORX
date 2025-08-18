import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the TL file
    const tlFiles = await sql`
      SELECT id, file_name, scenario_id, processed_data
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

    let analysis = {
      file_name: file.file_name,
      file_id: file.id,
      data_structure_type: processedData?.multi_tab_structure ? 'multi_tab' : 'regular',
      tabs_analysis: [],
      total_rows_found: [],
      extraction_summary: {}
    };

    if (processedData?.multi_tab_structure) {
      // Multi-tab structure analysis
      const tabs = processedData.multi_tab_structure.tabs || [];
      
      for (const tab of tabs) {
        const tabAnalysis = {
          tab_name: tab.name,
          rows: tab.rows,
          columns: tab.columns,
          target_column: tab.target_column,
          extracted_amount: tab.extracted_amount,
          potential_total_rows: [],
          last_10_rows: [],
          column_analysis: {}
        };

        // If we have sample data, analyze it
        if (tab.sample_data && tab.sample_data.length > 0) {
          // Get last few rows to check for totals
          const lastRows = tab.sample_data.slice(-10);
          tabAnalysis.last_10_rows = lastRows.map((row: any, index: number) => {
            const rowKeys = Object.keys(row);
            const rowValues = Object.values(row);
            
            // Check if this looks like a total row
            const hasTotal = rowKeys.some(key => 
              String(row[key]).toLowerCase().includes('total') ||
              String(row[key]).toLowerCase().includes('sum') ||
              String(row[key]).toLowerCase().includes('grand')
            );
            
            const allNullOrEmpty = rowValues.every(val => 
              val === null || val === undefined || val === '' || String(val).trim() === ''
            );
            
            return {
              row_index: index,
              is_likely_total: hasTotal,
              is_empty: allNullOrEmpty,
              sample_values: rowKeys.slice(0, 5).reduce((obj: any, key) => {
                obj[key] = row[key];
                return obj;
              }, {}),
              target_column_value: tab.target_column ? row[tab.target_column] : null
            };
          });

          // Analyze the target column specifically
          if (tab.target_column) {
            const columnValues = tab.sample_data.map((row: any) => row[tab.target_column]).filter(val => val != null);
            const numericValues = columnValues.map(val => {
              const num = parseFloat(String(val).replace(/[$,\s]/g, ''));
              return isNaN(num) ? 0 : num;
            }).filter(num => num > 0);
            
            tabAnalysis.column_analysis = {
              column_name: tab.target_column,
              total_values: columnValues.length,
              numeric_values: numericValues.length,
              sum_all: numericValues.reduce((sum, val) => sum + val, 0),
              largest_values: numericValues.sort((a, b) => b - a).slice(0, 5),
              sample_values: columnValues.slice(0, 10)
            };
          }
        }

        analysis.tabs_analysis.push(tabAnalysis);
      }

      // Calculate extraction summary
      const totalExtracted = tabs.reduce((sum: number, tab: any) => sum + (tab.extracted_amount || 0), 0);
      analysis.extraction_summary = {
        total_tabs: tabs.length,
        total_extracted: totalExtracted,
        individual_extractions: tabs.map((tab: any) => ({
          tab: tab.name,
          amount: tab.extracted_amount,
          column: tab.target_column
        }))
      };
    } else {
      // Regular structure - need to re-parse Excel file
      const fileContent = processedData?.file_content;
      if (fileContent) {
        try {
          const XLSX = await import('xlsx');
          const buffer = Buffer.from(fileContent, 'base64');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) continue;
            
            const headers = Object.keys(jsonData[0] as any);
            
            // Look for potential rate columns
            const rateColumns = headers.filter(header => 
              header.toLowerCase().includes('rate') ||
              header.toLowerCase().includes('cost') ||
              header.toLowerCase().includes('freight') ||
              header.toLowerCase().includes('total') ||
              header.toLowerCase().includes('amount')
            );
            
            // Check last 10 rows for totals
            const lastRows = jsonData.slice(-10).map((row: any, index: number) => {
              const hasTotal = Object.values(row).some(val => 
                String(val).toLowerCase().includes('total') ||
                String(val).toLowerCase().includes('sum') ||
                String(val).toLowerCase().includes('grand')
              );
              
              return {
                row_index: jsonData.length - 10 + index,
                is_likely_total: hasTotal,
                sample_values: Object.keys(row).slice(0, 3).reduce((obj: any, key) => {
                  obj[key] = row[key];
                  return obj;
                }, {}),
                rate_column_values: rateColumns.reduce((obj: any, col) => {
                  obj[col] = row[col];
                  return obj;
                }, {})
              };
            });
            
            analysis.tabs_analysis.push({
              tab_name: sheetName,
              rows: jsonData.length,
              columns: headers,
              rate_columns: rateColumns,
              last_10_rows: lastRows,
              total_rows_found: lastRows.filter(row => row.is_likely_total)
            });
          }
        } catch (excelError) {
          analysis.extraction_summary = {
            excel_parse_error: excelError instanceof Error ? excelError.message : 'Unknown error'
          };
        }
      }
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error debugging TL totals:', error);
    return NextResponse.json({
      error: 'Failed to debug TL totals',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
