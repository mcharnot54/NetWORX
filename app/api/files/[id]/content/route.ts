import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = parseInt(params.id);
    
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const file = await DataFileService.getDataFileWithFullData(fileId);
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Extract just the file content
    const fileContent = (file.processed_data as any)?.file_content;
    
    return NextResponse.json({
      id: file.id,
      file_name: file.file_name,
      file_content: fileContent,
      has_content: !!fileContent,
      content_length: fileContent?.length || 0
    });

  } catch (error) {
    console.error('Error fetching file content:', error);
    return NextResponse.json({
      error: 'Failed to fetch file content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
