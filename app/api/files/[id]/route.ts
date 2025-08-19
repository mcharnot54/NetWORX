import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

export const dynamic = 'force-dynamic';

// Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = parseInt(params.id);
    
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    // Check if file exists first
    const file = await DataFileService.getDataFile(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await DataFileService.deleteDataFile(fileId);
    
    return NextResponse.json({ 
      success: true, 
      message: `File "${file.file_name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Get individual file data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = parseInt(params.id);
    
    if (isNaN(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const file = await DataFileService.getDataFile(fileId);
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ file });

  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({
      error: 'Failed to fetch file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
