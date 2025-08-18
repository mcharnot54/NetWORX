import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    const results = {
      ups_verification: null,
      tl_columns: null,
      rl_columns: null
    };

    // 1. Verify UPS extraction is getting all 4 tabs in the combined array
    console.log('=== VERIFYING UPS EXTRACTION ===');
    const upsFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%ups%individual%item%cost%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (upsFile.length > 0) {
      const processedData = upsFile[0].processed_data;
      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        let netChargeTotal = 0;
        let netChargeCount = 0;
        
        for (const row of processedData.parsedData) {
          if (typeof row === 'object' && row && row['Net Charge']) {
            const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 0.01) {
              netChargeTotal += numValue;
              netChargeCount++;
            }
          }
        }
        
        results.ups_verification = {
          file_name: upsFile[0].file_name,
          total_rows: processedData.parsedData.length,
          net_charge_values: netChargeCount,
          total_extracted: netChargeTotal,
          note: "This should represent all 4 tabs combined if Excel processing flattened them"
        };
        
        console.log(`UPS: ${netChargeCount} Net Charge values totaling $${netChargeTotal} from ${processedData.parsedData.length} rows`);
      }
    }

    // 2. Find actual column names in TL file
    console.log('\n=== FINDING TL COLUMN NAMES ===');
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
        const data = processedData.parsedData;
        
        // Get all unique column names
        const allColumns = new Set();
        for (const row of data.slice(0, 50)) {
          if (typeof row === 'object' && row) {
            Object.keys(row).forEach(key => allColumns.add(key));
          }
        }
        
        const columnList = Array.from(allColumns);
        console.log('TL columns found:', columnList);
        
        // Test extraction with different column patterns
        const extractionTests = {};
        
        // Test each potential column
        for (const col of columnList) {
          let testTotal = 0;
          let testCount = 0;
          
          for (const row of data) {
            if (typeof row === 'object' && row && row[col]) {
              const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 100) { // TL costs should be substantial
                testTotal += numValue;
                testCount++;
              }
            }
          }
          
          if (testTotal > 0) {
            extractionTests[col] = {
              total: testTotal,
              count: testCount,
              average: testCount > 0 ? testTotal / testCount : 0
            };
            console.log(`TL column "${col}": $${testTotal} from ${testCount} values (avg: $${testTotal/testCount})`);
          }
        }
        
        results.tl_columns = {
          file_name: tlFile[0].file_name,
          total_rows: data.length,
          all_columns: columnList,
          extraction_tests: extractionTests,
          best_column: Object.entries(extractionTests).reduce((best, [col, stats]: [string, any]) => 
            (stats.total > (best.stats?.total || 0)) ? {column: col, stats} : best, 
            {column: null, stats: null}
          )
        };
      }
    }

    // 3. Find actual column names in R&L file
    console.log('\n=== FINDING R&L COLUMN NAMES ===');
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
        const data = processedData.parsedData;
        
        // Get all unique column names
        const allColumns = new Set();
        for (const row of data.slice(0, 50)) {
          if (typeof row === 'object' && row) {
            Object.keys(row).forEach(key => allColumns.add(key));
          }
        }
        
        const columnList = Array.from(allColumns);
        console.log('R&L columns found:', columnList);
        
        // Test extraction with different column patterns
        const extractionTests = {};
        
        // Test each potential column
        for (const col of columnList) {
          let testTotal = 0;
          let testCount = 0;
          
          for (const row of data) {
            if (typeof row === 'object' && row && row[col]) {
              const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 10) { // R&L costs threshold
                testTotal += numValue;
                testCount++;
              }
            }
          }
          
          if (testTotal > 0) {
            extractionTests[col] = {
              total: testTotal,
              count: testCount,
              average: testCount > 0 ? testTotal / testCount : 0
            };
            console.log(`R&L column "${col}": $${testTotal} from ${testCount} values (avg: $${testTotal/testCount})`);
          }
        }
        
        results.rl_columns = {
          file_name: rlFile[0].file_name,
          total_rows: data.length,
          all_columns: columnList,
          extraction_tests: extractionTests,
          best_column: Object.entries(extractionTests).reduce((best, [col, stats]: [string, any]) => 
            (stats.total > (best.stats?.total || 0)) ? {column: col, stats} : best, 
            {column: null, stats: null}
          )
        };
      }
    }

    const grandTotal = (results.ups_verification?.total_extracted || 0) +
                      (results.tl_columns?.best_column?.stats?.total || 0) +
                      (results.rl_columns?.best_column?.stats?.total || 0);

    console.log('\n=== COLUMN ANALYSIS COMPLETE ===');
    console.log(`UPS (confirmed): $${results.ups_verification?.total_extracted || 0}`);
    console.log(`TL (best column): $${results.tl_columns?.best_column?.stats?.total || 0}`);
    console.log(`R&L (best column): $${results.rl_columns?.best_column?.stats?.total || 0}`);
    console.log(`GRAND TOTAL: $${grandTotal}`);

    return NextResponse.json({
      success: true,
      analysis: results,
      summary: {
        ups_confirmed_total: results.ups_verification?.total_extracted || 0,
        tl_best_column: results.tl_columns?.best_column?.column,
        tl_best_total: results.tl_columns?.best_column?.stats?.total || 0,
        rl_best_column: results.rl_columns?.best_column?.column,
        rl_best_total: results.rl_columns?.best_column?.stats?.total || 0,
        grand_total: grandTotal,
        formatted_total: grandTotal > 1000000 
          ? `$${(grandTotal / 1000000).toFixed(2)}M`
          : `$${grandTotal.toLocaleString()}`
      }
    });

  } catch (error) {
    console.error('Error finding correct columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
