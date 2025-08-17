import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get all uploaded files with their basic info
    const files = await sql`
      SELECT 
        id,
        file_name, 
        data_type,
        file_size,
        processing_status,
        scenario_id,
        created_at,
        CASE 
          WHEN processed_data IS NOT NULL THEN true
          ELSE false
        END as has_processed_data
      FROM data_files
      ORDER BY created_at DESC
    `;

    // Get sample data from a few processed files
    const sampleData = [];
    
    for (const file of files.slice(0, 3)) { // Check first 3 files
      if (file.has_processed_data) {
        try {
          const fileData = await sql`
            SELECT processed_data
            FROM data_files
            WHERE id = ${file.id}
          `;
          
          if (fileData[0]?.processed_data?.data) {
            const data = Array.isArray(fileData[0].processed_data.data) 
              ? fileData[0].processed_data.data 
              : Object.values(fileData[0].processed_data.data);
              
            sampleData.push({
              file_name: file.file_name,
              rows: Array.isArray(data) ? data.length : 0,
              sample_row: Array.isArray(data) && data.length > 0 ? data[0] : null,
              columns: Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' 
                ? Object.keys(data[0]) 
                : []
            });
          }
        } catch (error) {
          console.error(`Error reading data from file ${file.file_name}:`, error);
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
