import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get TL file and other key files with processed data
    const keyFiles = await sql`
      SELECT 
        id,
        file_name,
        data_type,
        scenario_id,
        processing_status,
        processed_data
      FROM data_files
      WHERE processed_data IS NOT NULL
      AND (
        file_name ILIKE '%TL%' OR 
        file_name ILIKE '%total%' OR 
        file_name ILIKE '%cost%' OR 
        file_name ILIKE '%freight%' OR
        file_name ILIKE '%warehouse%' OR
        file_name ILIKE '%labor%' OR
        file_name ILIKE '%rent%' OR
        file_name ILIKE '%inventory%' OR
        file_name ILIKE '%operational%' OR
        file_name ILIKE '%financial%'
      )
      ORDER BY id DESC
    `;

    const results = [];

    for (const file of keyFiles) {
      if (!file.processed_data?.data) continue;

      let data = file.processed_data.data;
      
      // Handle different data structures
      if (!Array.isArray(data)) {
        if (typeof data === 'object') {
          const keys = Object.keys(data);
          const arrayKey = keys.find(key => Array.isArray(data[key]));
          if (arrayKey) {
            data = data[arrayKey];
          } else {
            data = Object.entries(data).map(([key, value]) => ({ key, value }));
          }
        } else {
          continue;
        }
      }

      if (data.length === 0) continue;

      console.log(`\n=== FILE: ${file.file_name} ===`);
      console.log(`Rows: ${data.length}`);
      console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);

      // Show all data for smaller files, sample for larger ones
      const rowsToShow = data.length <= 10 ? data : [...data.slice(0, 5), ...data.slice(-5)];
      
      const fileResult = {
        file_id: file.id,
        file_name: file.file_name,
        data_type: file.data_type,
        scenario_id: file.scenario_id,
        processing_status: file.processing_status,
        total_rows: data.length,
        columns: Object.keys(data[0]),
        sample_data: rowsToShow.map((row, index) => ({
          row_index: index,
          data: row
        }))
      };

      // Look for potential baseline cost values
      const costValues = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const [key, value] of Object.entries(row)) {
          let numVal = 0;
          if (typeof value === 'number') {
            numVal = value;
          } else if (typeof value === 'string') {
            const cleaned = value.replace(/[$,\s]/g, '');
            if (/^\d+\.?\d*$/.test(cleaned)) {
              numVal = parseFloat(cleaned);
            }
          }

          if (numVal > 100000) { // Values over $100K
            costValues.push({
              row: i,
              column: key,
              value: numVal,
              formatted: numVal > 1000000 ? `$${(numVal/1000000).toFixed(2)}M` : `$${(numVal/1000).toFixed(0)}K`,
              original: value,
              row_data: row // Include full row for context
            });
          }
        }
      }

      // Sort by value descending
      costValues.sort((a, b) => b.value - a.value);
      fileResult.potential_cost_values = costValues;

      results.push(fileResult);
    }

    return NextResponse.json({
      success: true,
      files_examined: results.length,
      files: results
    });

  } catch (error) {
    console.error('Error showing cost data details:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
