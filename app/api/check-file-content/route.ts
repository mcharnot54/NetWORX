import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check specific files that are failing
    const files = await sql`
      SELECT 
        id,
        file_name,
        processing_status,
        file_size,
        upload_date,
        CASE 
          WHEN processed_data IS NULL THEN 'no_processed_data'
          WHEN processed_data ? 'file_content' THEN 'has_file_content'
          ELSE 'has_processed_data_no_content'
        END as content_status,
        CASE 
          WHEN processed_data ? 'file_content' THEN length(processed_data->>'file_content')
          ELSE 0
        END as content_length,
        CASE 
          WHEN processed_data IS NOT NULL THEN array_to_string(array(SELECT jsonb_object_keys(processed_data)), ', ')
          ELSE NULL
        END as available_keys
      FROM data_files 
      WHERE id IN (65, 66, 67)
      ORDER BY id
    `;

    return NextResponse.json({
      summary: {
        total_files: files.length,
        files_with_content: files.filter((f: any) => f.content_status === 'has_file_content').length,
        files_without_content: files.filter((f: any) => f.content_status !== 'has_file_content').length
      },
      files: files.map((f: any) => ({
        id: f.id,
        file_name: f.file_name,
        processing_status: f.processing_status,
        file_size: f.file_size,
        upload_date: f.upload_date,
        content_status: f.content_status,
        content_length: f.content_length,
        available_keys: f.available_keys
      }))
    });

  } catch (error) {
    console.error('Error checking file content:', error);
    return NextResponse.json({
      error: 'Failed to check file content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
