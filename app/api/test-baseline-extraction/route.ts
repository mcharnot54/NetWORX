import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get the transportation files that were uploaded (broader pattern matching)
    const transportationFiles = await sql`
      SELECT
        id, file_name, file_type, file_size, data_type, processing_status,
        CASE
          WHEN processed_data IS NOT NULL THEN jsonb_build_object(
            'has_data', true,
            'data_keys', COALESCE((processed_data ? 'data'), false),
            'parsedData_keys', COALESCE((processed_data ? 'parsedData'), false),
            'size_estimate', CASE
              WHEN processed_data ? 'data' THEN 'data_present'
              WHEN processed_data ? 'parsedData' THEN 'parsedData_present'
              ELSE 'no_data_arrays'
            END
          )
          ELSE NULL
        END as data_info
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%associates%'
      )
      AND processed_data IS NOT NULL
      ORDER BY file_name
    `;

    console.log(`Found ${transportationFiles.length} transportation files`);

    const extractionResults = [];

    // Test extraction from each file
    for (const file of transportationFiles) {
      console.log(`\n=== Testing extraction from ${file.file_name} ===`);
      
      try {
        // Get the actual file content for testing
        const fullFileData = await sql`
          SELECT processed_data
          FROM data_files 
          WHERE id = ${file.id}
          AND processed_data IS NOT NULL
        `;

        if (fullFileData.length === 0) {
          extractionResults.push({
            file_name: file.file_name,
            status: 'no_processed_data',
            extraction_result: null
          });
          continue;
        }

        const processedData = fullFileData[0].processed_data;
        
        // Extract all possible data arrays
        const allDataArrays = extractAllDataArrays(processedData);
        console.log(`Found ${allDataArrays.length} data arrays in ${file.file_name}`);

        let totalExtracted = 0;
        const extractionDetails = [];

        for (const dataArray of allDataArrays) {
          console.log(`Testing extraction from ${dataArray.source} with ${dataArray.data.length} rows`);
          
          const fileNameLower = file.file_name.toLowerCase();
          let extracted = 0;

          if (fileNameLower.includes('ups individual item cost')) {
            extracted = extractFromColumnG(dataArray.data, file.file_name);
          } else if (fileNameLower.includes('2024 totals with inbound and outbound tl')) {
            extracted = extractFromColumnH(dataArray.data, file.file_name);
          } else if (fileNameLower.includes('r&l curriculum associates')) {
            extracted = extractFromColumnV(dataArray.data, file.file_name);
          }

          extractionDetails.push({
            source: dataArray.source,
            rows: dataArray.data.length,
            extracted: extracted,
            sample_row_keys: dataArray.data.length > 0 ? Object.keys(dataArray.data[0] || {}).slice(0, 10) : []
          });

          totalExtracted += extracted;
        }

        extractionResults.push({
          file_name: file.file_name,
          status: 'processed',
          total_extracted: totalExtracted,
          data_arrays_found: allDataArrays.length,
          extraction_details: extractionDetails,
          file_info: {
            file_size: file.file_size,
            data_type: file.data_type
          }
        });

      } catch (fileError) {
        console.error(`Error processing ${file.file_name}:`, fileError);
        extractionResults.push({
          file_name: file.file_name,
          status: 'error',
          error: fileError instanceof Error ? fileError.message : 'Unknown error',
          extraction_result: null
        });
      }
    }

    // Calculate totals
    const totalFreightCosts = extractionResults.reduce((sum, result) => {
      return sum + (result.total_extracted || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      summary: {
        files_found: transportationFiles.length,
        files_processed: extractionResults.filter(r => r.status === 'processed').length,
        total_freight_costs_extracted: totalFreightCosts,
        extraction_ready: totalFreightCosts > 0
      },
      file_details: extractionResults,
      transportation_files_info: transportationFiles.map(f => ({
        file_name: f.file_name,
        status: f.processing_status,
        data_info: f.data_info
      }))
    });

  } catch (error) {
    console.error('Error testing baseline extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions (same as in current-baseline-costs route)

function extractAllDataArrays(processedData: any): Array<{data: any[], source: string}> {
  const dataArrays: Array<{data: any[], source: string}> = [];

  if (!processedData || typeof processedData !== 'object') {
    return dataArrays;
  }

  // Check direct array in parsedData
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    dataArrays.push({
      data: processedData.parsedData,
      source: 'parsedData'
    });
  }

  // Check direct array in data
  if (processedData.data && Array.isArray(processedData.data)) {
    dataArrays.push({
      data: processedData.data,
      source: 'data'
    });
  }

  // Check nested structures
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    extractNestedArrays(processedData.data, 'data', dataArrays);
  }

  if (processedData.parsedData && typeof processedData.parsedData === 'object' && !Array.isArray(processedData.parsedData)) {
    extractNestedArrays(processedData.parsedData, 'parsedData', dataArrays);
  }

  return dataArrays;
}

function extractNestedArrays(obj: any, parentPath: string, dataArrays: Array<{data: any[], source: string}>, maxDepth: number = 3): void {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = `${parentPath}.${key}`;

    if (Array.isArray(value) && value.length > 0) {
      dataArrays.push({
        data: value,
        source: currentPath
      });
    } else if (typeof value === 'object' && value !== null) {
      extractNestedArrays(value, currentPath, dataArrays, maxDepth - 1);
    }
  }
}

// Column G extraction (UPS Individual Item Cost - Net Charges)
function extractFromColumnG(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'G' || key === '__EMPTY_6' ||
          key.toLowerCase().includes('net charges') ||
          key.toLowerCase().includes('net charge')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0.01) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`Column G extraction: $${total} from ${valuesFound} values in ${data.length} rows`);
  return total;
}

// Column H extraction (TL totals)
function extractFromColumnH(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' ||
          key.toLowerCase().includes('total') ||
          key.toLowerCase().includes('cost')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`Column H extraction: $${total} from ${valuesFound} values in ${data.length} rows`);
  return total;
}

// Column V extraction (R&L LTL costs)
function extractFromColumnV(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`Column V extraction: $${total} from ${valuesFound} values in ${data.length} rows`);
  return total;
}
