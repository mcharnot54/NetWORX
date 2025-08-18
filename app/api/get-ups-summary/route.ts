import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    const upsFiles = await sql`
      SELECT id, file_name, scenario_id, processing_status, 
             CASE 
               WHEN processed_data->'parsedData' IS NOT NULL 
               THEN jsonb_array_length(processed_data->'parsedData')
               ELSE 0 
             END as rows_count
      FROM data_files
      WHERE file_name ILIKE '%ups invoice by state summary 2024%'
      ORDER BY id
    `;

    return NextResponse.json({
      total_files: upsFiles.length,
      files: upsFiles.map((f: any) => ({
        id: f.id,
        scenario: f.scenario_id,
        status: f.processing_status,
        rows: f.rows_count
      })),
      should_have: "1 file with ~256 rows"
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
