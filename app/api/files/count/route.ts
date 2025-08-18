import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const { sql } = await import('@/lib/database');
    
    // Just count the files
    const result = await sql`
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_files,
        COUNT(CASE WHEN processed_data ? 'file_content' THEN 1 END) as files_with_content
      FROM data_files 
      WHERE scenario_id = ${parseInt(scenarioId)}
    `;

    const counts = result[0] as { total_files: number; completed_files: number; files_with_content: number };

    return NextResponse.json({
      scenario_id: parseInt(scenarioId),
      ...counts
    });

  } catch (error) {
    console.error('Error counting files:', error);
    return NextResponse.json({
      error: 'Failed to count files',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
