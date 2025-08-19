import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    console.log('=== TRANSPORTATION BASELINE EXTRACTION TEST ===');

    // Get the UPS Individual Item Cost file specifically
    const upsFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%ups%individual%item%cost%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    const results = {
      ups_file: null,
      tl_file: null,
      rl_file: null,
      total_extracted: 0
    };

    if (upsFile.length > 0) {
      console.log(`Found UPS file: ${upsFile[0].file_name}`);
      
      const processedData = upsFile[0].processed_data;
      let totalUPS = 0;
      
      // Check for parsedData array
      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        console.log(`Testing Column G extraction from ${processedData.parsedData.length} rows`);
        
        let valuesFound = 0;
        for (const row of processedData.parsedData.slice(0, 10)) { // Test first 10 rows
          if (typeof row === 'object' && row) {
            for (const [key, value] of Object.entries(row)) {
              if (key === 'Net Charge' || key === 'G' || key === '__EMPTY_6' ||
                  (typeof key === 'string' && key.toLowerCase().includes('net charge'))) {
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 0) {
                  totalUPS += numValue;
                  valuesFound++;
                  console.log(`Found ${key}: ${value} -> ${numValue}`);
                }
              }
            }
          }
        }

        // Now test full extraction
        totalUPS = 0; // Reset for full extraction
        for (const row of processedData.parsedData) {
          if (typeof row === 'object' && row) {
            for (const [key, value] of Object.entries(row)) {
              if (key === 'Net Charge' || key === 'G' || key === '__EMPTY_6') {
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 0.01) {
                  totalUPS += numValue;
                }
              }
            }
          }
        }
        
        results.ups_file = {
          file_name: upsFile[0].file_name,
          total_rows: processedData.parsedData.length,
          sample_values_found: valuesFound,
          total_extracted: totalUPS,
          extraction_method: 'Column G (Net Charges)'
        };
      }
    }

    // Get TL file
    const tlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024%totals%tl%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (tlFile.length > 0) {
      const processedData = tlFile[0].processed_data;
      let totalTL = 0;
      
      // Check all nested arrays for TL data
      if (processedData.data && typeof processedData.data === 'object') {
        for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
          if (Array.isArray(sheetData)) {
            for (const row of sheetData) {
              if (typeof row === 'object' && row) {
                for (const [key, value] of Object.entries(row)) {
                  if (key === 'H' || key === '__EMPTY_7') {
                    const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                    if (!isNaN(numValue) && numValue > 1000) {
                      totalTL += numValue;
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      results.tl_file = {
        file_name: tlFile[0].file_name,
        total_extracted: totalTL,
        extraction_method: 'Column H (All Tabs)'
      };
    }

    // Get R&L file  
    const rlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%r&l%curriculum%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (rlFile.length > 0) {
      const processedData = rlFile[0].processed_data;
      let totalRL = 0;
      
      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        for (const row of processedData.parsedData) {
          if (typeof row === 'object' && row) {
            for (const [key, value] of Object.entries(row)) {
              if (key === 'V' || key === '__EMPTY_21') {
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 100) {
                  totalRL += numValue;
                }
              }
            }
          }
        }
      }
      
      results.rl_file = {
        file_name: rlFile[0].file_name,
        total_extracted: totalRL,
        extraction_method: 'Column V (LTL Charges)'
      };
    }

    results.total_extracted = (results.ups_file?.total_extracted || 0) + 
                             (results.tl_file?.total_extracted || 0) + 
                             (results.rl_file?.total_extracted || 0);

    console.log(`=== EXTRACTION COMPLETE ===`);
    console.log(`UPS: $${results.ups_file?.total_extracted || 0}`);
    console.log(`TL: $${results.tl_file?.total_extracted || 0}`);
    console.log(`R&L: $${results.rl_file?.total_extracted || 0}`);
    console.log(`TOTAL: $${results.total_extracted}`);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total_baseline_transportation_costs: results.total_extracted,
        formatted_total: results.total_extracted > 1000000 
          ? `$${(results.total_extracted / 1000000).toFixed(1)}M`
          : `$${results.total_extracted.toLocaleString()}`,
        status: results.total_extracted > 0 ? 'EXTRACTION_SUCCESSFUL' : 'NO_DATA_FOUND'
      }
    });

  } catch (error) {
    console.error('Error in simple extraction test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
