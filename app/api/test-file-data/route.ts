import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get all uploaded files with their basic info
    let files = [];
    try {
      files = await sql`
        SELECT
          id,
          file_name,
          data_type,
          file_size,
          processing_status,
          scenario_id,
          upload_date as created_at,
          CASE
            WHEN processed_data IS NOT NULL THEN true
            ELSE false
          END as has_processed_data
        FROM data_files
        ORDER BY upload_date DESC
      `;
    } catch (columnError) {
      // Try without date column if it doesn't exist
      console.log('Trying fallback query without date column');
      files = await sql`
        SELECT
          id,
          file_name,
          data_type,
          file_size,
          processing_status,
          scenario_id,
          CASE
            WHEN processed_data IS NOT NULL THEN true
            ELSE false
          END as has_processed_data
        FROM data_files
        ORDER BY id DESC
      `;
    }

    // Get sample data from a few processed files
    const sampleData = [];

    for (const file of files.slice(0, 3)) { // Check first 3 files
      if (file.has_processed_data) {
        try {
          const fileData = await sql`
            SELECT processed_data
            FROM data_files
            WHERE id = ${file.id}
            LIMIT 1
          `;

          if (fileData && fileData.length > 0 && fileData[0]?.processed_data) {
            let processedData = fileData[0].processed_data;

            // Safely access the data property
            let data = null;
            if (processedData && typeof processedData === 'object' && processedData.data) {
              data = processedData.data;

              // Handle nested data structures
              if (!Array.isArray(data) && typeof data === 'object') {
                // Try to find an array in the data object
                const keys = Object.keys(data);
                const arrayKey = keys.find(key => Array.isArray(data[key]));
                if (arrayKey) {
                  data = data[arrayKey];
                } else {
                  // Convert object to array of key-value pairs
                  data = Object.entries(data).map(([key, value]) => ({ [key]: value }));
                }
              }
            }

            if (Array.isArray(data) && data.length > 0) {
              const firstRow = data[0];
              sampleData.push({
                file_name: file.file_name,
                rows: data.length,
                sample_row: typeof firstRow === 'object' && firstRow !== null ? firstRow : { value: firstRow },
                columns: typeof firstRow === 'object' && firstRow !== null
                  ? Object.keys(firstRow)
                  : ['value']
              });
            } else {
              sampleData.push({
                file_name: file.file_name,
                rows: 0,
                sample_row: null,
                columns: []
              });
            }
          }
        } catch (error) {
          console.error(`Error reading data from file ${file.file_name}:`, error);
          // Add error info to sample data for debugging
          sampleData.push({
            file_name: file.file_name,
            rows: 0,
            sample_row: null,
            columns: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      files_summary: {
        total_files: files.length,
        processed_files: files.filter(f => f.has_processed_data).length,
        files: files.map(f => ({
          id: f.id,
          name: f.file_name,
          type: f.data_type,
          status: f.processing_status,
          scenario_id: f.scenario_id,
          has_data: f.has_processed_data
        }))
      },
      sample_data: sampleData
    });

  } catch (error) {
    console.error('Error testing file data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
