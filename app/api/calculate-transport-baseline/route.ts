import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    const results = {
      success: true,
      transport_totals: {
        ups_parcel: { amount: 0, rows: 0, file_id: null, status: 'not_found' },
        rl_ltl: { amount: 0, rows: 0, file_id: null, status: 'not_found' },
        tl_costs: { amount: 0, rows: 0, file_id: null, status: 'not_found' }
      },
      total_transport_baseline: 0,
      files_analyzed: []
    };

    // Get the exact transport files needed
    const transportFiles = await sql`
      SELECT id, file_name, scenario_id, processed_data,
             CASE
               WHEN processed_data->'parsedData' IS NOT NULL
               THEN jsonb_array_length(processed_data->'parsedData')
               ELSE 0
             END as parsed_rows
      FROM data_files
      WHERE (
        file_name = 'UPS Invoice by State Summary 2024.xlsx' OR
        file_name = '2024 TOTALS WITH INBOUND AND OUTBOUND TL (2).xlsx' OR
        file_name = 'R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx'
      )
      AND processed_data IS NOT NULL
      ORDER BY file_name, parsed_rows DESC
    `;

    console.log(`Found ${transportFiles.length} potential transport files`);

    for (const file of transportFiles) {
      const fileName = file.file_name.toLowerCase();
      let data = null;
      let dataSource = 'not_found';

      // Extract data using the same logic as baseline extraction
      if (file.processed_data?.parsedData && Array.isArray(file.processed_data.parsedData)) {
        data = file.processed_data.parsedData;
        dataSource = 'parsedData';
      } else if (file.processed_data?.data) {
        // Handle complex nested structures like TL files
        if (Array.isArray(file.processed_data.data)) {
          data = file.processed_data.data;
          dataSource = 'data_array';
        } else if (typeof file.processed_data.data === 'object') {
          // Look for nested arrays (multiple sheets)
          const nestedArrays = findNestedArrays(file.processed_data.data);
          if (nestedArrays.length > 0) {
            data = nestedArrays.flat(); // Combine all sheets
            dataSource = `nested_arrays_${nestedArrays.length}`;
          }
        }
      }

      if (!data || data.length === 0) continue;

      console.log(`Processing ${file.file_name}: ${data.length} rows from ${dataSource}`);

      // UPS Parcel File (Column F / Net Charge) - EXACT NAME MATCH
      if (file.file_name === 'UPS Invoice by State Summary 2024.xlsx') {
        const { total, valuesFound } = extractFromNetCharge(data);
        if (total > results.transport_totals.ups_parcel.amount) {
          results.transport_totals.ups_parcel = {
            amount: total,
            rows: data.length,
            file_id: file.id,
            status: 'calculated',
            values_found: valuesFound,
            data_source: dataSource
          };
        }
      }

      // R&L LTL File (Column V) - EXACT NAME MATCH
      else if (file.file_name === 'R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx') {
        const { total, valuesFound } = extractFromColumnV(data);
        if (total > results.transport_totals.rl_ltl.amount) {
          results.transport_totals.rl_ltl = {
            amount: total,
            rows: data.length,
            file_id: file.id,
            status: 'calculated',
            values_found: valuesFound,
            data_source: dataSource
          };
        }
      }

      // TL File (Column H) - EXACT NAME MATCH
      else if (file.file_name === '2024 TOTALS WITH INBOUND AND OUTBOUND TL (2).xlsx') {
        const { total, valuesFound } = extractFromColumnH(data);
        if (total > results.transport_totals.tl_costs.amount) {
          results.transport_totals.tl_costs = {
            amount: total,
            rows: data.length,
            file_id: file.id,
            status: 'calculated',
            values_found: valuesFound,
            data_source: dataSource
          };
        }
      }

      results.files_analyzed.push({
        id: file.id,
        name: file.file_name,
        rows: data.length,
        data_source: dataSource,
        file_type: getFileType(fileName)
      });
    }

    // Calculate total
    results.total_transport_baseline = 
      results.transport_totals.ups_parcel.amount +
      results.transport_totals.rl_ltl.amount +
      results.transport_totals.tl_costs.amount;

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error calculating transport baseline:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Extract from UPS Net Charge column
function extractFromNetCharge(data: any[]): { total: number, valuesFound: number } {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    if (row['Net Charge'] !== undefined && row['Net Charge'] !== null) {
      const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
      if (!isNaN(numValue) && numValue > 0) {
        total += numValue;
        valuesFound++;
      }
    }
  }

  return { total, valuesFound };
}

// Extract from Column V (R&L LTL)
function extractFromColumnV(data: any[]): { total: number, valuesFound: number } {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge') ||
          key.toLowerCase().includes('cost')) {
        
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  return { total, valuesFound };
}

// Extract from Column H (TL costs)
function extractFromColumnH(data: any[]): { total: number, valuesFound: number } {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' || 
          key.toLowerCase().includes('total') || 
          key.toLowerCase().includes('cost') ||
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('charge')) {
        
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  return { total, valuesFound };
}

// Find nested arrays in complex objects (for TL files with multiple sheets)
function findNestedArrays(obj: any, maxDepth: number = 3): any[][] {
  const arrays: any[][] = [];
  
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return arrays;

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0) {
      arrays.push(value);
    } else if (typeof value === 'object' && value !== null) {
      arrays.push(...findNestedArrays(value, maxDepth - 1));
    }
  }

  return arrays;
}

// Determine file type for logging
function getFileType(fileName: string): string {
  if (fileName.includes('ups invoice')) return 'ups_parcel';
  if (fileName.includes('r&l') || fileName.includes('curriculum')) return 'rl_ltl';
  if (fileName.includes('totals with inbound and outbound tl')) return 'tl_costs';
  return 'unknown';
}
