import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    
    if (fileId) {
      // Show specific file data
      const fileData = await sql`
        SELECT 
          id,
          file_name,
          data_type,
          scenario_id,
          processing_status,
          processed_data
        FROM data_files
        WHERE id = ${parseInt(fileId)}
      `;

      if (fileData.length === 0) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const file = fileData[0];
      let data = null;
      let structure = null;

      if (file.processed_data?.data) {
        data = file.processed_data.data;
        
        // Analyze structure
        if (Array.isArray(data) && data.length > 0) {
          structure = {
            type: 'array',
            length: data.length,
            first_row_keys: Object.keys(data[0]),
            sample_rows: data.slice(0, 3)
          };
        } else if (typeof data === 'object') {
          structure = {
            type: 'object',
            keys: Object.keys(data),
            sample_data: data
          };
        }
      }

      return NextResponse.json({
        success: true,
        file: {
          id: file.id,
          file_name: file.file_name,
          data_type: file.data_type,
          scenario_id: file.scenario_id,
          processing_status: file.processing_status
        },
        raw_data: data,
        structure: structure
      });
    }

    // Show all files with processed data
    const files = await sql`
      SELECT 
        id,
        file_name,
        data_type,
        scenario_id,
        processing_status,
        CASE 
          WHEN processed_data IS NOT NULL THEN 'Has Data'
          ELSE 'No Data'
        END as data_status
      FROM data_files
      WHERE processed_data IS NOT NULL
      ORDER BY id DESC
    `;

    return NextResponse.json({
      success: true,
      message: 'Available files with processed data. Use ?fileId=X to see specific file data.',
      files: files
    });

  } catch (error) {
    console.error('Error showing raw data:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
