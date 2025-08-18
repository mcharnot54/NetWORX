import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the R&L file
    const rlFiles = await sql`
      SELECT id, file_name, scenario_id, processed_data
      FROM data_files
      WHERE file_name ILIKE '%R&L%' AND file_name ILIKE '%CURRICULUM%'
      ORDER BY id DESC
      LIMIT 1
    `;

    if (rlFiles.length === 0) {
      return NextResponse.json({ error: 'R&L file not found' }, { status: 404 });
    }

    const file = rlFiles[0];
    const processedData = file.processed_data as any;

    // Check if we have multi-tab structure or regular structure
    const hasMultiTab = processedData?.multi_tab_structure;
    
    let analysis = {
      file_name: file.file_name,
      file_id: file.id,
      data_structure_type: hasMultiTab ? 'multi_tab' : 'regular',
      tabs_found: [],
      column_v_analysis: {},
      extraction_debug: {}
    };

    if (hasMultiTab) {
      // Multi-tab structure analysis
      const tabs = processedData.multi_tab_structure.tabs || [];
      analysis.tabs_found = tabs.map((tab: any) => ({
        name: tab.name,
        rows: tab.rows,
        columns: tab.columns,
        has_column_v: tab.columns.includes('V'),
        target_column: tab.target_column,
        extracted_amount: tab.extracted_amount
      }));

      // Look for Detail tab specifically
      const detailTab = tabs.find((tab: any) => 
        tab.name.toLowerCase().includes('detail')
      );

      if (detailTab) {
        analysis.column_v_analysis = {
          tab_name: detailTab.name,
          all_columns: detailTab.columns,
          has_column_v: detailTab.columns.includes('V'),
          column_v_index: detailTab.columns.indexOf('V'),
          similar_columns: detailTab.columns.filter((col: string) => 
            col.length === 1 || 
            col.toLowerCase().includes('v') ||
            col.toLowerCase().includes('column')
          ),
          selected_column: detailTab.target_column,
          extracted_amount: detailTab.extracted_amount
        };

        // If we have sample data, check column V values
        if (detailTab.sample_data && detailTab.sample_data.length > 0) {
          const sampleRow = detailTab.sample_data[0];
          analysis.extraction_debug = {
            sample_row_keys: Object.keys(sampleRow),
            column_v_value: sampleRow['V'],
            column_v_type: typeof sampleRow['V'],
            all_numeric_columns: Object.keys(sampleRow).filter(key => {
              const value = sampleRow[key];
              return !isNaN(parseFloat(String(value))) && isFinite(parseFloat(String(value)));
            })
          };
        }
      }
    } else {
      // Regular structure - need to re-parse Excel file
      const fileContent = processedData?.file_content;
      if (fileContent) {
        try {
          const XLSX = await import('xlsx');
          const buffer = Buffer.from(fileContent, 'base64');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          
          // Look for Detail sheet specifically
          const detailSheetName = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('detail')
          ) || workbook.SheetNames[0];
          
          if (detailSheetName) {
            const worksheet = workbook.Sheets[detailSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Find header row (skip logos/empty rows)
            let headerRow = null;
            let headerRowIndex = -1;
            
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
              const row = jsonData[i] as any[];
              if (row && row.length > 5) { // Row with substantial data
                let score = 0;
                for (const cell of row) {
                  if (cell && typeof cell === 'string' && cell.trim().length > 0) {
                    score++;
                  }
                }
                if (score > 5) { // Good header candidate
                  headerRow = row;
                  headerRowIndex = i;
                  break;
                }
              }
            }
            
            if (headerRow) {
              // Convert to object format
              const objectData = XLSX.utils.sheet_to_json(worksheet, {
                header: headerRow as string[],
                range: headerRowIndex
              });
              
              analysis.column_v_analysis = {
                sheet_name: detailSheetName,
                header_row_index: headerRowIndex,
                all_headers: headerRow,
                has_column_v: headerRow.includes('V'),
                column_v_index: headerRow.indexOf('V'),
                similar_columns: headerRow.filter((col: any) => 
                  typeof col === 'string' && (
                    col.length === 1 || 
                    col.toLowerCase().includes('v') ||
                    col.toLowerCase().includes('column')
                  )
                ),
                total_rows: objectData.length
              };
              
              // Sample column V values
              if (headerRow.includes('V') && objectData.length > 0) {
                const columnVValues = objectData.slice(0, 10).map((row: any) => row['V']);
                const numericValues = columnVValues.filter(val => {
                  const num = parseFloat(String(val).replace(/[$,\s]/g, ''));
                  return !isNaN(num) && isFinite(num) && num > 0;
                });
                
                analysis.extraction_debug = {
                  sample_column_v_values: columnVValues,
                  numeric_values: numericValues,
                  valid_numeric_count: numericValues.length,
                  total_of_valid_values: numericValues.reduce((sum, val) => {
                    const num = parseFloat(String(val).replace(/[$,\s]/g, ''));
                    return sum + (isNaN(num) ? 0 : num);
                  }, 0)
                };
              }
            }
          }
        } catch (excelError) {
          analysis.extraction_debug = {
            excel_parse_error: excelError instanceof Error ? excelError.message : 'Unknown error'
          };
        }
      }
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error debugging R&L column V:', error);
    return NextResponse.json({
      error: 'Failed to debug R&L column V',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
