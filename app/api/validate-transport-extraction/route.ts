import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the specific transportation files
    const transportFiles = await sql`
      SELECT file_name, processed_data, id
      FROM data_files
      WHERE (
        file_name ILIKE '%2024 totals with inbound and outbound tl%' OR
        file_name ILIKE '%r&l curriculum associates%' OR  
        file_name ILIKE '%ups invoice by state summary 2024%'
      )
      AND processed_data IS NOT NULL
      ORDER BY file_name
    `;

    const validationResults = [];

    for (const file of transportFiles) {
      // Use the same data extraction logic as baseline costs
      let allDataArrays = extractAllDataArrays(file.processed_data);

      if (allDataArrays.length === 0) continue;

      // Combine all data arrays for validation
      let data: any[] = [];
      for (const dataArray of allDataArrays) {
        data = data.concat(dataArray.data);
      }

      const fileValidation = {
        file_name: file.file_name,
        total_rows: data.length,
        columns_found: [],
        sample_data: [],
        target_columns: {},
        extracted_values: []
      };

      // Get column headers from first row
      if (data.length > 0 && typeof data[0] === 'object') {
        fileValidation.columns_found = Object.keys(data[0]);
      }

      // Target specific columns based on file type
      const fileName = file.file_name.toLowerCase();
      
      if (fileName.includes('2024 totals with inbound and outbound tl')) {
        // Look for column H
        fileValidation.target_columns = { target: 'H', description: 'TL costs from column H' };
        fileValidation.extracted_values = extractAndValidateColumnH(data);
      } else if (fileName.includes('r&l curriculum associates')) {
        // Look for column V
        fileValidation.target_columns = { target: 'V', description: 'LTL costs from column V' };
        fileValidation.extracted_values = extractAndValidateColumnV(data);
      } else if (fileName.includes('ups invoice by state summary')) {
        // Look for column F
        fileValidation.target_columns = { target: 'F', description: 'Parcel costs from column F' };
        fileValidation.extracted_values = extractAndValidateColumnF(data);
      }

      // Sample data (first 3 rows)
      fileValidation.sample_data = data.slice(0, 3);

      validationResults.push(fileValidation);
    }

    return NextResponse.json({
      success: true,
      files_found: transportFiles.length,
      validation_results: validationResults,
      summary: {
        total_tl_cost: calculateTotalFromValidation(validationResults, '2024 totals with inbound and outbound tl'),
        total_ltl_cost: calculateTotalFromValidation(validationResults, 'r&l curriculum associates'),
        total_parcel_cost: calculateTotalFromValidation(validationResults, 'ups invoice by state summary'),
      }
    });

  } catch (error) {
    console.error('Error validating transport extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function extractAndValidateColumnH(data: any[]): any[] {
  const results = [];
  let totalValue = 0;

  for (let i = 0; i < data.length; i++) { // Process ALL rows
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' ||
          key.toLowerCase().includes('total') ||
          key.toLowerCase().includes('cost')) {

        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
          totalValue += numValue;
          if (results.length < 10) { // Only store first 10 for display
            results.push({
              row_index: i,
              column_key: key,
              raw_value: value,
              parsed_value: numValue
            });
          }
        }
      }
    }
  }

  // Add summary
  results.push({
    row_index: -1,
    column_key: 'TOTAL_SUMMARY',
    raw_value: `Total from ${data.length} rows`,
    parsed_value: totalValue
  });

  return results;
}

function extractAndValidateColumnV(data: any[]): any[] {
  const results = [];
  let totalValue = 0;

  for (let i = 0; i < data.length; i++) { // Process ALL rows
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge')) {

        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
          totalValue += numValue;
          if (results.length < 10) { // Only store first 10 for display
            results.push({
              row_index: i,
              column_key: key,
              raw_value: value,
              parsed_value: numValue
            });
          }
        }
      }
    }
  }

  // Add summary
  results.push({
    row_index: -1,
    column_key: 'TOTAL_SUMMARY',
    raw_value: `Total from ${data.length} rows`,
    parsed_value: totalValue
  });

  return results;
}

function extractAndValidateColumnF(data: any[]): any[] {
  const results = [];
  let totalValue = 0;

  for (let i = 0; i < data.length; i++) { // Process ALL rows
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'F' || key === '__EMPTY_5' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge') ||
          key.toLowerCase().includes('total')) {

        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 10) {
          totalValue += numValue;
          if (results.length < 10) { // Only store first 10 for display
            results.push({
              row_index: i,
              column_key: key,
              raw_value: value,
              parsed_value: numValue
            });
          }
        }
      }
    }
  }

  // Add summary
  results.push({
    row_index: -1,
    column_key: 'TOTAL_SUMMARY',
    raw_value: `Total from ${data.length} rows`,
    parsed_value: totalValue
  });

  return results;
}

function calculateTotalFromValidation(results: any[], fileType: string): number {
  const fileResult = results.find(r => r.file_name.toLowerCase().includes(fileType));
  if (!fileResult) return 0;

  return fileResult.extracted_values.reduce((sum: number, item: any) => sum + item.parsed_value, 0);
}

// Helper function to extract all data arrays from complex nested structures
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

  // Check nested structures in data (like TL files with multiple sheets)
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    extractNestedArrays(processedData.data, 'data', dataArrays);
  }

  // Check nested structures in parsedData
  if (processedData.parsedData && typeof processedData.parsedData === 'object' && !Array.isArray(processedData.parsedData)) {
    extractNestedArrays(processedData.parsedData, 'parsedData', dataArrays);
  }

  // Check for direct array in root
  if (Array.isArray(processedData)) {
    dataArrays.push({
      data: processedData,
      source: 'root'
    });
  }

  return dataArrays;
}

// Recursive function to find arrays in nested objects
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
