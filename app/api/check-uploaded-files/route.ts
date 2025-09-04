import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get all files from database
    const allFiles = await sql`
      SELECT 
        id, file_name, file_type, file_size, data_type, processing_status, upload_date,
        CASE 
          WHEN processed_data IS NOT NULL THEN jsonb_build_object(
            'has_processed_data', true,
            'has_data_key', COALESCE((processed_data ? 'data'), false),
            'has_parsedData_key', COALESCE((processed_data ? 'parsedData'), false)
          )
          ELSE jsonb_build_object('has_processed_data', false)
        END as data_status
      FROM data_files
      ORDER BY upload_date DESC
      LIMIT 10
    `;

    // Check for transportation-related files with pattern matching
    const transportationFiles = await sql`
      SELECT 
        id, file_name, file_type, processing_status,
        CASE 
          WHEN file_name ILIKE '%ups%' THEN 'UPS_FILE'
          WHEN file_name ILIKE '%r&l%' THEN 'RL_FILE' 
          WHEN file_name ILIKE '%tl%' THEN 'TL_FILE'
          WHEN file_name ILIKE '%individual%' THEN 'INDIVIDUAL_FILE'
          WHEN file_name ILIKE '%totals%' THEN 'TOTALS_FILE'
          WHEN file_name ILIKE '%curriculum%' THEN 'CURRICULUM_FILE'
          ELSE 'OTHER'
        END as file_category
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%' OR
        file_name ILIKE '%r&l%' OR
        file_name ILIKE '%tl%' OR
        file_name ILIKE '%individual%' OR
        file_name ILIKE '%totals%' OR
        file_name ILIKE '%curriculum%'
      )
      ORDER BY upload_date DESC
    `;

    return NextResponse.json({
      success: true,
      summary: {
        total_files: allFiles.length,
        transportation_related: transportationFiles.length
      },
      all_files: allFiles.map(f => ({
        id: f.id,
        file_name: f.file_name,
        processing_status: f.processing_status,
        data_status: f.data_status,
        upload_date: f.upload_date
      })),
      transportation_files: transportationFiles.map(f => ({
        id: f.id,
        file_name: f.file_name,
        category: f.file_category,
        processing_status: f.processing_status
      }))
    });

  } catch (error) {
    console.error('Error checking uploaded files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
