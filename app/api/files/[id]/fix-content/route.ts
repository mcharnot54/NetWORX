import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = parseInt(params.id);
    
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const body = await request.json();
    const { file_content } = body;

    if (!file_content) {
      return NextResponse.json({ error: 'file_content is required' }, { status: 400 });
    }

    const file = await DataFileService.getDataFileWithFullData(fileId);
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Update the file with the new content
    const updatedProcessedData = {
      ...(file.processed_data as any || {}),
      file_content: file_content
    };

    await DataFileService.updateDataFile(fileId, {
      processed_data: updatedProcessedData
    });

    return NextResponse.json({
      success: true,
      message: `File content updated for ${file.file_name}`,
      content_length: file_content.length
    });

  } catch (error) {
    console.error('Error fixing file content:', error);
    return NextResponse.json({
      error: 'Failed to fix file content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
