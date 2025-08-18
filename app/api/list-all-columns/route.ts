import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    const results = {};

    // Get TL file columns
    console.log('=== LISTING TL COLUMNS ===');
    const tlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024%totals%tl%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (tlFile.length > 0) {
      const processedData = tlFile[0].processed_data;
      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        const allColumns = new Set();
        const sampleValues = {};
        
        // Collect all column names and sample values
        for (const row of processedData.parsedData.slice(0, 100)) {
          if (typeof row === 'object' && row) {
            for (const [key, value] of Object.entries(row)) {
              allColumns.add(key);
              if (!sampleValues[key] && value && String(value).trim() !== '') {
                sampleValues[key] = String(value);
              }
            }
          }
        }
        
        const columnList = Array.from(allColumns).sort();
        console.log(`TL file has ${columnList.length} columns:`, columnList);
        
        results['tl_file'] = {
          file_name: tlFile[0].file_name,
          total_rows: processedData.parsedData.length,
          total_columns: columnList.length,
          all_columns: columnList,
          sample_values: sampleValues
        };
      }
    }

    // Get R&L file columns
    console.log('\n=== LISTING R&L COLUMNS ===');
    const rlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%r&l%curriculum%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (rlFile.length > 0) {
      const processedData = rlFile[0].processed_data;
      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        const allColumns = new Set();
        const sampleValues = {};
        
        // Collect all column names and sample values
        for (const row of processedData.parsedData.slice(0, 100)) {
          if (typeof row === 'object' && row) {
            for (const [key, value] of Object.entries(row)) {
              allColumns.add(key);
              if (!sampleValues[key] && value && String(value).trim() !== '') {
                sampleValues[key] = String(value);
              }
            }
          }
        }
        
        const columnList = Array.from(allColumns).sort();
        console.log(`R&L file has ${columnList.length} columns:`, columnList);
        
        results['rl_file'] = {
          file_name: rlFile[0].file_name,
          total_rows: processedData.parsedData.length,
          total_columns: columnList.length,
          all_columns: columnList,
          sample_values: sampleValues
        };
      }
    }

    // Now test specific promising columns
    console.log('\n=== TESTING SPECIFIC COLUMNS ===');
    
    // Test TL extractions
    if (results['tl_file']) {
      const tlData = tlFile[0].processed_data.parsedData;
      const tlTests = {};
      
      // Test specific column patterns that might be column H equivalent
      const tlTestColumns = results['tl_file'].all_columns.filter(col => 
        col.includes('Total') || 
        col.includes('Cost') ||
        col.includes('Amount') ||
        col.includes('Freight') ||
        col === 'H' ||
        col.includes('__EMPTY_')
      );
      
      for (const col of tlTestColumns.slice(0, 10)) { // Test top 10 candidates
        let total = 0;
        let count = 0;
        
        for (const row of tlData.slice(0, 500)) { // Test first 500 rows
          if (typeof row === 'object' && row && row[col]) {
            const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 500) { // Lower threshold for testing
              total += numValue;
              count++;
            }
          }
        }
        
        if (count > 0) {
          tlTests[col] = { total, count, sample: results['tl_file'].sample_values[col] };
          console.log(`TL "${col}": $${total} from ${count} values (sample: "${results['tl_file'].sample_values[col]}")`);
        }
      }
      
      results['tl_file'].extraction_tests = tlTests;
    }

    // Test R&L extractions
    if (results['rl_file']) {
      const rlData = rlFile[0].processed_data.parsedData;
      const rlTests = {};
      
      // Test specific column patterns that might be column V equivalent
      const rlTestColumns = results['rl_file'].all_columns.filter(col => 
        col.includes('Net') || 
        col.includes('Charge') ||
        col.includes('Amount') ||
        col.includes('Cost') ||
        col === 'V' ||
        col.includes('__EMPTY_')
      );
      
      for (const col of rlTestColumns.slice(0, 10)) { // Test top 10 candidates
        let total = 0;
        let count = 0;
        
        for (const row of rlData.slice(0, 500)) { // Test first 500 rows
          if (typeof row === 'object' && row && row[col]) {
            const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 50) { // Lower threshold for testing
              total += numValue;
              count++;
            }
          }
        }
        
        if (count > 0) {
          rlTests[col] = { total, count, sample: results['rl_file'].sample_values[col] };
          console.log(`R&L "${col}": $${total} from ${count} values (sample: "${results['rl_file'].sample_values[col]}")`);
        }
      }
      
      results['rl_file'].extraction_tests = rlTests;
    }

    return NextResponse.json({
      success: true,
      column_analysis: results
    });

  } catch (error) {
    console.error('Error listing columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
