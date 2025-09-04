import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get specific transportation files and examine their full structure
    const files = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%2024 totals with inbound and outbound tl%' OR
        file_name ILIKE '%ups invoice by state summary 2024%' OR
        file_name ILIKE '%r&l curriculum associates%'
      )
      AND processed_data IS NOT NULL
      LIMIT 3
    `;

    const fileAnalysis = [];

    for (const file of files) {
      console.log(`\n=== ANALYZING FILE: ${file.file_name} ===`);
      
      if (!file.processed_data) {
        fileAnalysis.push({
          file_name: file.file_name,
          error: 'No processed_data found'
        });
        continue;
      }

      let analysis = {
        file_name: file.file_name,
        processed_data_type: typeof file.processed_data,
        processed_data_keys: [],
        data_structure: 'unknown',
        total_rows: 0,
        sample_rows: [],
        all_columns: [],
        data_location: 'not_found'
      };

      try {
        let processedData = file.processed_data;
        console.log('Processed data type:', typeof processedData);
        console.log('Processed data keys:', Object.keys(processedData || {}));

        if (processedData && typeof processedData === 'object') {
          analysis.processed_data_keys = Object.keys(processedData);
          
          // Check different possible data locations
          let actualData = null;
          
          if (processedData.data) {
            console.log('Found .data property');
            actualData = processedData.data;
            analysis.data_location = 'processed_data.data';
          } else if (processedData.parsedData) {
            console.log('Found .parsedData property');
            actualData = processedData.parsedData;
            analysis.data_location = 'processed_data.parsedData';
          } else if (Array.isArray(processedData)) {
            console.log('processedData is array');
            actualData = processedData;
            analysis.data_location = 'processed_data (direct array)';
          }

          if (actualData) {
            console.log('Actual data type:', typeof actualData);
            console.log('Is array:', Array.isArray(actualData));

            if (Array.isArray(actualData)) {
              analysis.data_structure = 'array';
              analysis.total_rows = actualData.length;
              analysis.sample_rows = actualData.slice(0, 5); // First 5 rows
              
              if (actualData.length > 0 && typeof actualData[0] === 'object') {
                analysis.all_columns = Object.keys(actualData[0]);
                console.log('Columns found:', analysis.all_columns);
              }
            } else if (typeof actualData === 'object') {
              analysis.data_structure = 'object';
              const keys = Object.keys(actualData);
              console.log('Object keys:', keys);
              
              // Check if any keys contain arrays (multiple sheets)
              for (const key of keys) {
                if (Array.isArray(actualData[key])) {
                  console.log(`Found array in key: ${key}, length: ${actualData[key].length}`);
                  analysis.data_location = `processed_data.data.${key}`;
                  analysis.total_rows += actualData[key].length;
                  if (actualData[key].length > 0) {
                    analysis.sample_rows.push({
                      sheet_name: key,
                      sample_data: actualData[key].slice(0, 3),
                      columns: typeof actualData[key][0] === 'object' ? Object.keys(actualData[key][0]) : []
                    });
                  }
                }
              }
            }
          }
        }

        fileAnalysis.push(analysis);

      } catch (error) {
        console.error(`Error analyzing ${file.file_name}:`, error);
        fileAnalysis.push({
          file_name: file.file_name,
          error: error instanceof Error ? error.message : 'Unknown error',
          processed_data_keys: analysis.processed_data_keys
        });
      }
    }

    return NextResponse.json({
      success: true,
      files_analyzed: files.length,
      file_analysis: fileAnalysis
    });

  } catch (error) {
    console.error('Error in debug-file-structure:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
