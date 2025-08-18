import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    const results = {
      tl_analysis: null,
      rl_analysis: null
    };

    // Debug TL file
    console.log('=== DEBUGGING TL FILE ===');
    const tlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024%totals%tl%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (tlFile.length > 0) {
      const processedData = tlFile[0].processed_data;
      console.log('TL structure keys:', Object.keys(processedData));

      const tlDebug = {
        file_name: tlFile[0].file_name,
        structure: Object.keys(processedData),
        sheets_analysis: {}
      };

      if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
        console.log('TL sheets found:', Object.keys(processedData.data));
        
        for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
          if (Array.isArray(sheetData) && sheetData.length > 0) {
            console.log(`\nAnalyzing TL sheet: ${sheetName} (${sheetData.length} rows)`);
            
            // Get column names from first few rows
            const columnNames = new Set();
            const sampleValues = {};
            
            for (const row of sheetData.slice(0, 20)) {
              if (typeof row === 'object' && row) {
                Object.keys(row).forEach(key => columnNames.add(key));
              }
            }
            
            console.log(`${sheetName} columns:`, Array.from(columnNames).slice(0, 15));
            
            // Look for column H and similar patterns
            let extractionTest = 0;
            let valuesFound = 0;
            
            for (const row of sheetData) {
              if (typeof row === 'object' && row) {
                for (const [key, value] of Object.entries(row)) {
                  // Test multiple patterns for TL costs
                  if (key === 'H' || key === '__EMPTY_7' || 
                      key.toLowerCase().includes('total') ||
                      key.toLowerCase().includes('cost') ||
                      key.toLowerCase().includes('amount') ||
                      key.toLowerCase().includes('freight')) {
                    
                    const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                    if (!isNaN(numValue) && numValue > 50) { // Very low threshold for testing
                      extractionTest += numValue;
                      valuesFound++;
                      
                      // Log first few matches
                      if (valuesFound <= 5) {
                        console.log(`${sheetName} - Found ${key}: ${value} -> $${numValue}`);
                        if (!sampleValues[key]) sampleValues[key] = [];
                        sampleValues[key].push(value);
                      }
                    }
                  }
                }
              }
            }
            
            tlDebug.sheets_analysis[sheetName] = {
              rows: sheetData.length,
              columns: Array.from(columnNames),
              extraction_test: extractionTest,
              values_found: valuesFound,
              sample_values: sampleValues
            };
          }
        }
      }

      results.tl_analysis = tlDebug;
    }

    // Debug R&L file
    console.log('\n=== DEBUGGING R&L FILE ===');
    const rlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%r&l%curriculum%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (rlFile.length > 0) {
      const processedData = rlFile[0].processed_data;
      console.log('R&L structure keys:', Object.keys(processedData));

      const rlDebug = {
        file_name: rlFile[0].file_name,
        structure: Object.keys(processedData),
        analysis: {}
      };

      if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
        const data = processedData.parsedData;
        console.log(`R&L has ${data.length} rows`);
        
        // Get column names
        const columnNames = new Set();
        const sampleValues = {};
        
        for (const row of data.slice(0, 20)) {
          if (typeof row === 'object' && row) {
            Object.keys(row).forEach(key => columnNames.add(key));
          }
        }
        
        console.log('R&L columns:', Array.from(columnNames).slice(0, 15));
        
        // Test extraction
        let extractionTest = 0;
        let valuesFound = 0;
        
        for (const row of data) {
          if (typeof row === 'object' && row) {
            for (const [key, value] of Object.entries(row)) {
              // Test multiple patterns for R&L costs
              if (key === 'V' || key === '__EMPTY_21' ||
                  key.toLowerCase().includes('net') ||
                  key.toLowerCase().includes('charge') ||
                  key.toLowerCase().includes('amount') ||
                  key.toLowerCase().includes('cost') ||
                  key.toLowerCase().includes('freight')) {
                
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 5) { // Very low threshold
                  extractionTest += numValue;
                  valuesFound++;
                  
                  // Log first few matches
                  if (valuesFound <= 5) {
                    console.log(`R&L - Found ${key}: ${value} -> $${numValue}`);
                    if (!sampleValues[key]) sampleValues[key] = [];
                    sampleValues[key].push(value);
                  }
                }
              }
            }
          }
        }
        
        rlDebug.analysis = {
          rows: data.length,
          columns: Array.from(columnNames),
          extraction_test: extractionTest,
          values_found: valuesFound,
          sample_values: sampleValues
        };
      }

      results.rl_analysis = rlDebug;
    }

    const totalExtracted = (results.tl_analysis?.sheets_analysis ? 
      Object.values(results.tl_analysis.sheets_analysis).reduce((sum: number, sheet: any) => sum + (sheet.extraction_test || 0), 0) : 0) +
      (results.rl_analysis?.analysis?.extraction_test || 0);

    console.log('\n=== DEBUG SUMMARY ===');
    console.log(`TL extraction test: $${Object.values(results.tl_analysis?.sheets_analysis || {}).reduce((sum: number, sheet: any) => sum + (sheet.extraction_test || 0), 0)}`);
    console.log(`R&L extraction test: $${results.rl_analysis?.analysis?.extraction_test || 0}`);
    console.log(`Total: $${totalExtracted}`);

    return NextResponse.json({
      success: true,
      debug_results: results,
      summary: {
        tl_total: Object.values(results.tl_analysis?.sheets_analysis || {}).reduce((sum: number, sheet: any) => sum + (sheet.extraction_test || 0), 0),
        rl_total: results.rl_analysis?.analysis?.extraction_test || 0,
        grand_total: totalExtracted
      }
    });

  } catch (error) {
    console.error('Error debugging TL/RL columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
