import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get all files with their processed_data structure
    const files = await sql`
      SELECT 
        id,
        file_name,
        processing_status,
        CASE 
          WHEN processed_data IS NULL THEN 'null'
          WHEN processed_data ? 'file_content' THEN 'has_file_content'
          ELSE 'no_file_content'
        END as content_status,
        CASE 
          WHEN processed_data IS NOT NULL THEN jsonb_object_keys(processed_data)
          ELSE NULL
        END as available_keys,
        CASE 
          WHEN processed_data ? 'file_content' THEN length(processed_data->>'file_content')
          ELSE 0
        END as file_content_length,
        upload_date
      FROM data_files 
      ORDER BY upload_date DESC
      LIMIT 10
    `;

    // Also get detailed structure for the specific problematic files
    const detailedFiles = await sql`
      SELECT 
        id,
        file_name,
        processed_data
      FROM data_files 
      WHERE id IN (65, 66, 67)
    `;

    const debug = {
      files_summary: files.map((f: any) => ({
        id: f.id,
        file_name: f.file_name,
        processing_status: f.processing_status,
        content_status: f.content_status,
        available_keys: f.available_keys,
        file_content_length: f.file_content_length,
        upload_date: f.upload_date
      })),
      detailed_structures: detailedFiles.map((f: any) => ({
        id: f.id,
        file_name: f.file_name,
        processed_data_keys: f.processed_data ? Object.keys(f.processed_data) : null,
        has_file_content: !!(f.processed_data?.file_content),
        file_content_type: f.processed_data?.file_content ? typeof f.processed_data.file_content : null,
        file_content_length: f.processed_data?.file_content ? f.processed_data.file_content.length : 0,
        other_data_present: f.processed_data ? Object.keys(f.processed_data).filter(k => k !== 'file_content') : []
      }))
    };

    return NextResponse.json(debug);

  } catch (error) {
    console.error('Error debugging file content:', error);
    return NextResponse.json({
      error: 'Failed to debug file content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
