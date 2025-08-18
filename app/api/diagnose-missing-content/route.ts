import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get details about the problematic files
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
          WHEN processed_data IS NOT NULL THEN jsonb_object_keys(processed_data)
          ELSE NULL
        END as available_keys,
        processed_data
      FROM data_files 
      WHERE id IN (65, 66, 67)
      ORDER BY id
    `;

    const diagnosis = {
      summary: {
        total_files: files.length,
        files_with_content: files.filter((f: any) => f.content_status === 'has_file_content').length,
        files_missing_content: files.filter((f: any) => f.content_status !== 'has_file_content').length,
        recommendation: 'Files need to be re-uploaded to restore content'
      },
      files: files.map((f: any) => ({
        id: f.id,
        file_name: f.file_name,
        processing_status: f.processing_status,
        file_size: f.file_size,
        upload_date: f.upload_date,
        content_status: f.content_status,
        content_length: f.content_length,
        has_processed_data: !!f.processed_data,
        available_keys: f.available_keys ? [f.available_keys] : [],
        processed_data_size: f.processed_data ? JSON.stringify(f.processed_data).length : 0
      })),
      solution: {
        immediate_fix: 'Re-upload the files using the multi-tab upload interface',
        technical_fix: 'Use /api/files/{id}/fix-content endpoint with base64 file content',
        why_happened: 'Files were uploaded without preserving the original file content in processed_data.file_content'
      }
    };

    return NextResponse.json(diagnosis);

  } catch (error) {
    console.error('Error diagnosing missing content:', error);
    return NextResponse.json({
      error: 'Failed to diagnose missing content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    const body = await request.json();
    const { action } = body;

    if (action === 'mark_for_reupload') {
      // Mark the problematic files for re-upload by updating their status
      const updateResult = await sql`
        UPDATE data_files 
        SET processing_status = 'needs_reupload'
        WHERE id IN (65, 66, 67)
        AND (processed_data IS NULL OR NOT processed_data ? 'file_content')
      `;

      return NextResponse.json({
        success: true,
        message: 'Files marked for re-upload',
        files_updated: updateResult.length,
        next_step: 'Please re-upload these files using the upload interface'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in missing content fix:', error);
    return NextResponse.json({
      error: 'Failed to process fix',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
