import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get ALL UPS files in the database
    const upsFiles = await sql`
      SELECT id, file_name, scenario_id, processing_status, data_type, processed_data
      FROM data_files
      WHERE file_name ILIKE '%ups invoice by state summary 2024%'
      ORDER BY id
    `;

    const analysisResults = [];
    let totalExtracted = 0;

    for (const file of upsFiles) {
      const analysis = {
        file_id: file.id,
        file_name: file.file_name,
        scenario_id: file.scenario_id,
        processing_status: file.processing_status,
        data_type: file.data_type,
        data_structure: 'none',
        rows_found: 0,
        column_f_values: [],
        extracted_total: 0,
        data_location: 'not_found'
      };

      if (file.processed_data) {
        // Check parsedData location
        if (file.processed_data.parsedData && Array.isArray(file.processed_data.parsedData)) {
          analysis.data_structure = 'parsedData_array';
          analysis.data_location = 'processed_data.parsedData';
          analysis.rows_found = file.processed_data.parsedData.length;
          
          // Extract from column F using exact validation logic
          let fileTotal = 0;
          for (const row of file.processed_data.parsedData) {
            if (typeof row !== 'object' || !row) continue;
            
            for (const [key, value] of Object.entries(row)) {
              if (key === 'F' || key === '__EMPTY_5' ||
                  key.toLowerCase().includes('net') ||
                  key.toLowerCase().includes('charge') ||
                  key.toLowerCase().includes('total')) {
                
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 10) {
                  fileTotal += numValue;
                  analysis.column_f_values.push({
                    row_index: analysis.column_f_values.length,
                    column_key: key,
                    raw_value: value,
                    parsed_value: numValue
                  });
                }
              }
            }
          }
          analysis.extracted_total = fileTotal;
          totalExtracted += fileTotal;
        }
        
        // Check data location
        if (file.processed_data.data && typeof file.processed_data.data === 'object') {
          if (Array.isArray(file.processed_data.data)) {
            analysis.data_structure += '_data_array';
            analysis.rows_found += file.processed_data.data.length;
          } else {
            analysis.data_structure += '_data_object';
            const keys = Object.keys(file.processed_data.data);
            analysis.data_structure += `_keys_${keys.join('_')}`;
          }
        }
      }

      analysisResults.push(analysis);
    }

    return NextResponse.json({
      success: true,
      total_ups_files: upsFiles.length,
      total_extracted_value: totalExtracted,
      file_analysis: analysisResults,
      duplicate_summary: {
        files_by_scenario: analysisResults.reduce((acc: any, file) => {
          acc[`scenario_${file.scenario_id}`] = (acc[`scenario_${file.scenario_id}`] || 0) + 1;
          return acc;
        }, {}),
        extraction_by_file: analysisResults.map(f => ({
          id: f.file_id,
          scenario: f.scenario_id,
          rows: f.rows_found,
          extracted: f.extracted_total
        }))
      }
    });

  } catch (error) {
    console.error('Error diagnosing UPS duplicates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
