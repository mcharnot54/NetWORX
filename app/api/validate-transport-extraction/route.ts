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
      if (!file.processed_data?.data) continue;

      let data = file.processed_data.data;
      if (!Array.isArray(data)) {
        // Handle nested data structures
        if (typeof data === 'object') {
          const keys = Object.keys(data);
          const arrayKey = keys.find(key => Array.isArray(data[key]));
          if (arrayKey) {
            data = data[arrayKey];
          } else {
            data = Object.entries(data).map(([key, value]) => ({ [key]: value }));
          }
        } else {
          continue;
        }
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
  
  for (let i = 0; i < Math.min(data.length, 10); i++) { // Check first 10 rows
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' || 
          key.toLowerCase().includes('total') || 
          key.toLowerCase().includes('cost')) {
        
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
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
  
  return results;
}

function extractAndValidateColumnV(data: any[]): any[] {
  const results = [];
  
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge')) {
        
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
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
  
  return results;
}

function extractAndValidateColumnF(data: any[]): any[] {
  const results = [];
  
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      if (key === 'F' || key === '__EMPTY_5' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge') ||
          key.toLowerCase().includes('total')) {
        
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 10) {
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
  
  return results;
}

function calculateTotalFromValidation(results: any[], fileType: string): number {
  const fileResult = results.find(r => r.file_name.toLowerCase().includes(fileType));
  if (!fileResult) return 0;
  
  return fileResult.extracted_values.reduce((sum: number, item: any) => sum + item.parsed_value, 0);
}
