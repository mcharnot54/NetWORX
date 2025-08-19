import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scenarioId = searchParams.get('scenarioId') || '1';

    console.log('Testing file content loading for scenario:', scenarioId);

    const files = await DataFileService.getDataFiles(parseInt(scenarioId));
    
    const fileStatus = files.map(file => ({
      id: file.id,
      name: file.file_name,
      processing_status: file.processing_status,
      has_processed_data: !!file.processed_data,
      file_content_available: !!(file.processed_data as any)?.file_content_available,
      data_size: JSON.stringify(file.processed_data || {}).length
    }));

    return NextResponse.json({
      total_files: files.length,
      files: fileStatus,
      summary: {
        with_content: fileStatus.filter(f => f.file_content_available).length,
        without_content: fileStatus.filter(f => !f.file_content_available).length,
        completed_status: fileStatus.filter(f => f.processing_status === 'completed').length,
        pending_status: fileStatus.filter(f => f.processing_status === 'pending').length
      }
    });

  } catch (error) {
    console.error('Error testing file content:', error);
    return NextResponse.json({
      error: 'Failed to test file content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
