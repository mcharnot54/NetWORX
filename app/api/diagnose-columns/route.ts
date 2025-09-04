import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get the UPS file and examine its structure
    const upsFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%ups%individual%item%cost%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    const results = {
      ups_analysis: null,
      sample_data: []
    };

    if (upsFile.length > 0) {
      const processedData = upsFile[0].processed_data;
      
      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        const data = processedData.parsedData;
        
        // Get first few non-empty rows to analyze structure
        const sampleRows = [];
        let rowCount = 0;
        
        for (const row of data) {
          if (typeof row === 'object' && row && Object.keys(row).length > 0) {
            sampleRows.push({
              row_index: rowCount,
              all_keys: Object.keys(row),
              all_values: Object.fromEntries(
                Object.entries(row).slice(0, 10).map(([k, v]) => [k, String(v)])
              )
            });
            
            if (sampleRows.length >= 5) break;
          }
          rowCount++;
        }
        
        // Look specifically for column G and related patterns
        const columnGAnalysis = {
          exact_G_found: false,
          empty_6_found: false,
          net_charges_patterns: [],
          sample_G_values: [],
          total_rows_with_G: 0
        };
        
        let rowsChecked = 0;
        for (const row of data.slice(0, 1000)) { // Check first 1000 rows
          if (typeof row === 'object' && row) {
            rowsChecked++;
            
            for (const [key, value] of Object.entries(row)) {
              // Check for exact column G
              if (key === 'G') {
                columnGAnalysis.exact_G_found = true;
                columnGAnalysis.total_rows_with_G++;
                if (columnGAnalysis.sample_G_values.length < 10) {
                  columnGAnalysis.sample_G_values.push({
                    value: String(value),
                    parsed: parseFloat(String(value).replace(/[$,\s]/g, ''))
                  });
                }
              }
              
              // Check for __EMPTY_6
              if (key === '__EMPTY_6') {
                columnGAnalysis.empty_6_found = true;
              }
              
              // Check for net charges patterns
              const keyLower = key.toLowerCase();
              if (keyLower.includes('net') && keyLower.includes('charge')) {
                columnGAnalysis.net_charges_patterns.push({
                  key: key,
                  sample_value: String(value)
                });
              }
            }
          }
        }
        
        results.ups_analysis = {
          file_name: upsFile[0].file_name,
          total_rows: data.length,
          rows_checked: rowsChecked,
          column_G_analysis: columnGAnalysis
        };
        
        results.sample_data = sampleRows;
      }
    }

    return NextResponse.json({
      success: true,
      diagnosis: results
    });

  } catch (error) {
    console.error('Error diagnosing columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
