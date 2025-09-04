import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the UPS file with 256 rows (the one with actual data in parsedData)
    const upsFiles = await sql`
      SELECT id, file_name, scenario_id, processed_data,
             CASE 
               WHEN processed_data->'parsedData' IS NOT NULL 
               THEN jsonb_array_length(processed_data->'parsedData')
               ELSE 0 
             END as rows_count
      FROM data_files
      WHERE file_name ILIKE '%ups invoice by state summary 2024%'
      AND processed_data->'parsedData' IS NOT NULL
      ORDER BY rows_count DESC
    `;

    if (upsFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No UPS files with parsedData found"
      });
    }

    // Take the file with the most rows (should be 256)
    const targetFile = upsFiles[0];
    
    if (!targetFile.processed_data?.parsedData) {
      return NextResponse.json({
        success: false,
        error: "No parsedData found in target file"
      });
    }

    const data = targetFile.processed_data.parsedData;
    let total = 0;
    let valuesFound = 0;
    const sampleValues = [];

    // Extract from Net Charge column (this is the column F equivalent)
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (typeof row !== 'object' || !row) continue;

      // Look for Net Charge column specifically
      if (row['Net Charge'] !== undefined && row['Net Charge'] !== null) {
        let value = row['Net Charge'];
        
        // Parse the value (remove commas, convert to number)
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        
        if (!isNaN(numValue) && numValue > 0) {
          total += numValue;
          valuesFound++;
          
          // Store first 10 values for verification
          if (sampleValues.length < 10) {
            sampleValues.push({
              row: i + 1,
              raw_value: value,
              parsed_value: numValue
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      file_info: {
        id: targetFile.id,
        name: targetFile.file_name,
        scenario_id: targetFile.scenario_id,
        total_rows: data.length,
        rows_with_values: valuesFound
      },
      calculation: {
        total_amount: total,
        formatted_total: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        values_summed: valuesFound,
        extraction_method: "Net Charge column direct sum"
      },
      sample_values: sampleValues,
      verification: {
        expected_rows: 256,
        actual_rows: data.length,
        matches_expected: data.length === 256
      }
    });

  } catch (error) {
    console.error('Error calculating UPS total:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
