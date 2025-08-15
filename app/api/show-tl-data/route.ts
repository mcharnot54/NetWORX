import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get all data files to see what we have
    const allFiles = await sql`
      SELECT 
        id, 
        file_name, 
        processing_status, 
        data_type,
        scenario_id,
        CASE 
          WHEN processed_data IS NOT NULL THEN 'Has processed data'
          ELSE 'No processed data'
        END as data_status,
        created_at
      FROM data_files
      ORDER BY created_at DESC
    `;

    // Look specifically for TL file
    const tlFile = await sql`
      SELECT id, file_name, processed_data, processing_status
      FROM data_files
      WHERE file_name ILIKE '%TL%' OR file_name ILIKE '%TOTALS%'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let baselineFound = null;
    let dataPreview = null;

    if (tlFile.length > 0 && tlFile[0].processed_data?.data) {
      const data = tlFile[0].processed_data.data;
      
      // Get first few rows for preview
      dataPreview = {
        file_name: tlFile[0].file_name,
        total_rows: data.length,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        first_3_rows: data.slice(0, 3),
        last_3_rows: data.slice(-3)
      };

      // Look for baseline - check all numeric values over $1M
      let maxValue = 0;
      let maxValueInfo = null;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const [key, value] of Object.entries(row)) {
          let numVal = 0;
          if (typeof value === 'number') {
            numVal = value;
          } else if (typeof value === 'string') {
            numVal = parseFloat(value.replace(/[$,]/g, '')) || 0;
          }

          if (numVal > maxValue && numVal > 1000000) {
            maxValue = numVal;
            maxValueInfo = {
              value: numVal,
              column: key,
              row_index: i,
              original_value: value,
              formatted: `$${(numVal/1000000).toFixed(1)}M`
            };
          }
        }
      }

      if (maxValueInfo) {
        baselineFound = maxValueInfo;
      }
    }

    return NextResponse.json({
      summary: {
        total_files: allFiles.length,
        tl_file_found: tlFile.length > 0,
        tl_file_processed: tlFile.length > 0 && !!tlFile[0].processed_data,
        baseline_extracted: !!baselineFound
      },
      all_files: allFiles,
      tl_file_data: dataPreview,
      baseline_found: baselineFound,
      recommendation: baselineFound 
        ? `Use $${(baselineFound.value/1000000).toFixed(1)}M as 2025 baseline (found in column "${baselineFound.column}")` 
        : 'No baseline found - TL file may need processing in Data Processor'
    });

  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
