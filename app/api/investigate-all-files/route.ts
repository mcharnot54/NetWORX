import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    const results = {
      ups_file: null,
      tl_file: null,
      rl_file: null
    };

    // 1. Investigate UPS file structure - check if we're getting all tabs
    console.log('=== INVESTIGATING UPS FILE ===');
    const upsFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%ups%individual%item%cost%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (upsFile.length > 0) {
      const processedData = upsFile[0].processed_data;
      console.log('UPS file structure:', Object.keys(processedData));
      
      const upsAnalysis = {
        file_name: upsFile[0].file_name,
        top_level_keys: Object.keys(processedData),
        tabs_found: [],
        total_extraction: 0
      };

      // Check for multiple data sources (tabs)
      if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
        // Multi-sheet structure
        for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
          if (Array.isArray(sheetData)) {
            let tabTotal = extractNetChargeFromArray(sheetData, `UPS-${sheetName}`);
            upsAnalysis.tabs_found.push({
              sheet_name: sheetName,
              rows: sheetData.length,
              extracted: tabTotal
            });
            upsAnalysis.total_extraction += tabTotal;
          }
        }
      } else if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        // Single array structure
        let tabTotal = extractNetChargeFromArray(processedData.parsedData, 'UPS-parsedData');
        upsAnalysis.tabs_found.push({
          sheet_name: 'parsedData',
          rows: processedData.parsedData.length,
          extracted: tabTotal
        });
        upsAnalysis.total_extraction += tabTotal;
      }

      results.ups_file = upsAnalysis;
    }

    // 2. Investigate TL file structure
    console.log('\n=== INVESTIGATING TL FILE ===');
    const tlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024%totals%tl%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (tlFile.length > 0) {
      const processedData = tlFile[0].processed_data;
      console.log('TL file structure:', Object.keys(processedData));
      
      const tlAnalysis = {
        file_name: tlFile[0].file_name,
        top_level_keys: Object.keys(processedData),
        tabs_found: [],
        total_extraction: 0,
        sample_data: null
      };

      // Check different data structures
      if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
        // Multi-sheet structure (expected for TL file)
        for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
          if (Array.isArray(sheetData)) {
            let tabTotal = extractColumnHFromArray(sheetData, `TL-${sheetName}`);
            tlAnalysis.tabs_found.push({
              sheet_name: sheetName,
              rows: sheetData.length,
              extracted: tabTotal,
              sample_keys: sheetData.length > 0 ? Object.keys(sheetData[0] || {}).slice(0, 10) : []
            });
            tlAnalysis.total_extraction += tabTotal;
            
            // Get sample data for first sheet
            if (!tlAnalysis.sample_data && sheetData.length > 0) {
              tlAnalysis.sample_data = {
                sheet: sheetName,
                first_row_keys: Object.keys(sheetData[0] || {}),
                first_row_values: Object.fromEntries(
                  Object.entries(sheetData[0] || {}).slice(0, 5).map(([k, v]) => [k, String(v)])
                )
              };
            }
          }
        }
      } else if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        let tabTotal = extractColumnHFromArray(processedData.parsedData, 'TL-parsedData');
        tlAnalysis.tabs_found.push({
          sheet_name: 'parsedData',
          rows: processedData.parsedData.length,
          extracted: tabTotal
        });
        tlAnalysis.total_extraction += tabTotal;
      }

      results.tl_file = tlAnalysis;
    }

    // 3. Investigate R&L file structure
    console.log('\n=== INVESTIGATING R&L FILE ===');
    const rlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%r&l%curriculum%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (rlFile.length > 0) {
      const processedData = rlFile[0].processed_data;
      console.log('R&L file structure:', Object.keys(processedData));
      
      const rlAnalysis = {
        file_name: rlFile[0].file_name,
        top_level_keys: Object.keys(processedData),
        tabs_found: [],
        total_extraction: 0,
        sample_data: null
      };

      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        let tabTotal = extractColumnVFromArray(processedData.parsedData, 'RL-parsedData');
        rlAnalysis.tabs_found.push({
          sheet_name: 'parsedData',
          rows: processedData.parsedData.length,
          extracted: tabTotal
        });
        rlAnalysis.total_extraction += tabTotal;
        
        // Get sample data
        if (processedData.parsedData.length > 0) {
          rlAnalysis.sample_data = {
            first_row_keys: Object.keys(processedData.parsedData[0] || {}),
            first_row_values: Object.fromEntries(
              Object.entries(processedData.parsedData[0] || {}).slice(0, 5).map(([k, v]) => [k, String(v)])
            )
          };
        }
      }

      results.rl_file = rlAnalysis;
    }

    const grandTotal = (results.ups_file?.total_extraction || 0) + 
                      (results.tl_file?.total_extraction || 0) + 
                      (results.rl_file?.total_extraction || 0);

    console.log('\n=== FINAL INVESTIGATION RESULTS ===');
    console.log(`UPS Total: $${results.ups_file?.total_extraction || 0}`);
    console.log(`TL Total: $${results.tl_file?.total_extraction || 0}`);
    console.log(`R&L Total: $${results.rl_file?.total_extraction || 0}`);
    console.log(`GRAND TOTAL: $${grandTotal}`);

    return NextResponse.json({
      success: true,
      investigation_results: results,
      summary: {
        ups_extraction: results.ups_file?.total_extraction || 0,
        tl_extraction: results.tl_file?.total_extraction || 0,
        rl_extraction: results.rl_file?.total_extraction || 0,
        grand_total: grandTotal,
        issues_found: {
          ups_multiple_tabs: results.ups_file?.tabs_found?.length > 1,
          tl_no_extraction: (results.tl_file?.total_extraction || 0) === 0,
          rl_no_extraction: (results.rl_file?.total_extraction || 0) === 0
        }
      }
    });

  } catch (error) {
    console.error('Error investigating files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for extraction

function extractNetChargeFromArray(data: any[], source: string): number {
  let total = 0;
  let valuesFound = 0;

  console.log(`Extracting Net Charge from ${source} (${data.length} rows)`);

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'Net Charge' || 
          key.toLowerCase().includes('net charge') ||
          key.toLowerCase().includes('net charges')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0.01) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`${source}: Found ${valuesFound} values, total $${total}`);
  return total;
}

function extractColumnHFromArray(data: any[], source: string): number {
  let total = 0;
  let valuesFound = 0;

  console.log(`Extracting Column H from ${source} (${data.length} rows)`);

  // Log sample keys from first few rows to understand structure
  if (data.length > 0) {
    console.log(`Sample keys from ${source}:`, Object.keys(data[0] || {}).slice(0, 15));
  }

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' || 
          key.toLowerCase().includes('total') ||
          key.toLowerCase().includes('cost') ||
          key.toLowerCase().includes('amount')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) { // TL costs should be substantial
          total += numValue;
          valuesFound++;
          if (valuesFound <= 5) { // Log first few matches
            console.log(`${source} - Found ${key}: ${value} -> $${numValue}`);
          }
        }
      }
    }
  }

  console.log(`${source}: Found ${valuesFound} values, total $${total}`);
  return total;
}

function extractColumnVFromArray(data: any[], source: string): number {
  let total = 0;
  let valuesFound = 0;

  console.log(`Extracting Column V from ${source} (${data.length} rows)`);

  // Log sample keys from first few rows
  if (data.length > 0) {
    console.log(`Sample keys from ${source}:`, Object.keys(data[0] || {}).slice(0, 15));
  }

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge') ||
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('cost')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) { // LTL costs threshold
          total += numValue;
          valuesFound++;
          if (valuesFound <= 5) { // Log first few matches
            console.log(`${source} - Found ${key}: ${value} -> $${numValue}`);
          }
        }
      }
    }
  }

  console.log(`${source}: Found ${valuesFound} values, total $${total}`);
  return total;
}
