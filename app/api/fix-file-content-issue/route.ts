import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check the specific problematic files
    const files = await sql`
      SELECT 
        id,
        file_name,
        processing_status,
        CASE 
          WHEN processed_data IS NULL THEN false
          WHEN processed_data ? 'file_content' THEN true
          ELSE false
        END as has_file_content,
        CASE 
          WHEN processed_data ? 'file_content' THEN length(processed_data->>'file_content')
          ELSE 0
        END as content_length
      FROM data_files 
      WHERE id IN (65, 66, 67)
      ORDER BY id
    `;

    return NextResponse.json({
      message: 'File content status check',
      files: files,
      issue: 'Files missing file_content in processed_data',
      solution: 'Re-upload files using multi-tab upload to restore content'
    });

  } catch (error) {
    console.error('Error checking files:', error);
    return NextResponse.json({
      error: 'Failed to check files',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
