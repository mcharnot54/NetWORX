import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Find the specific TL file
    const tlFiles = await sql`
      SELECT id, file_name, processed_data, metadata
      FROM data_files
      WHERE file_name ILIKE '%2024 TOTALS WITH INBOUND AND OUTBOUND TL%'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (tlFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not find the "2024 TOTALS WITH INBOUND AND OUTBOUND TL" file'
      }, { status: 404 });
    }

    const tlFile = tlFiles[0];
    console.log('Found TL file:', tlFile.file_name);

    if (!tlFile.processed_data || !tlFile.processed_data.data) {
      return NextResponse.json({
        success: false,
        error: 'File needs to be processed first. Please validate the file in Data Processor.',
        file_id: tlFile.id,
        file_name: tlFile.file_name
      }, { status: 400 });
    }

    const data = tlFile.processed_data.data;
    console.log(`Processing ${data.length} rows from TL file`);

    // Look for 2024/2025 baseline freight costs
    let baselineFreightCost = null;
    let totalFreightCost = 0;
    let analysisDetails = [];

    // Check first few rows to understand structure
    const sampleRows = data.slice(0, 5);
    console.log('Sample data structure:', sampleRows.map(row => Object.keys(row)));

    // Look for total freight costs in various ways
    for (const row of data) {
      // Convert row to lowercase keys for easier matching
      const lowerRow = {};
      Object.keys(row).forEach(key => {
        lowerRow[key.toLowerCase()] = row[key];
      });

      // Look for freight/cost related columns
      const freightColumns = Object.keys(lowerRow).filter(key =>
        key.includes('freight') || 
        key.includes('transport') || 
        key.includes('cost') ||
        key.includes('total') ||
        key.includes('spend')
      );

      if (freightColumns.length > 0) {
        for (const col of freightColumns) {
          const value = lowerRow[col];
          if (typeof value === 'number' && value > 1000000) { // Looking for values in millions
            totalFreightCost += value;
            analysisDetails.push({
              column: col,
              value: value,
              row_sample: Object.keys(row).slice(0, 5)
            });
          } else if (typeof value === 'string') {
            // Try to parse string values
            const numValue = parseFloat(value.replace(/[$,]/g, ''));
            if (!isNaN(numValue) && numValue > 1000000) {
              totalFreightCost += numValue;
              analysisDetails.push({
                column: col,
                value: numValue,
                original_string: value,
                row_sample: Object.keys(row).slice(0, 5)
              });
            }
          }
        }
      }
    }

    // Look for specific patterns that might indicate total costs
    const summaryRows = data.filter(row => {
      const rowStr = JSON.stringify(row).toLowerCase();
      return rowStr.includes('total') || rowStr.includes('sum') || rowStr.includes('grand');
    });

    let grandTotal = null;
    if (summaryRows.length > 0) {
      console.log('Found summary rows:', summaryRows.length);
      
      for (const row of summaryRows) {
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (typeof value === 'number' && value > 5000000) { // Looking for grand totals
            grandTotal = value;
          } else if (typeof value === 'string') {
            const numValue = parseFloat(value.replace(/[$,]/g, ''));
            if (!isNaN(numValue) && numValue > 5000000) {
              grandTotal = numValue;
            }
          }
        });
      }
    }

    // Use grand total if found, otherwise use sum of all freight costs
    baselineFreightCost = grandTotal || totalFreightCost;

    if (!baselineFreightCost || baselineFreightCost < 1000000) {
      return NextResponse.json({
        success: false,
        error: 'Could not find a valid freight cost total in the file. Please check the data structure.',
        analysis_details: analysisDetails,
        sample_data: sampleRows,
        total_rows: data.length,
        columns_found: data.length > 0 ? Object.keys(data[0]) : []
      }, { status: 400 });
    }

    console.log('Extracted baseline freight cost:', baselineFreightCost);

    return NextResponse.json({
      success: true,
      baseline_freight_cost_2025: Math.round(baselineFreightCost),
      source_file: tlFile.file_name,
      extraction_method: grandTotal ? 'grand_total' : 'sum_of_freight_costs',
      analysis_details: analysisDetails,
      data_summary: {
        total_rows: data.length,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        summary_rows_found: summaryRows.length
      }
    });

  } catch (error) {
    console.error('Error extracting baseline from TL file:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to extract baseline: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check if TL file exists and is processed
    const tlFiles = await sql`
      SELECT id, file_name, processing_status, created_at
      FROM data_files
      WHERE file_name ILIKE '%2024 TOTALS WITH INBOUND AND OUTBOUND TL%'
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      tl_files_found: tlFiles.length,
      files: tlFiles,
      next_step: tlFiles.length > 0 && tlFiles[0].processing_status === 'completed' 
        ? 'Call POST /api/extract-baseline-from-file to extract baseline cost'
        : 'Please validate the TL file in Data Processor first'
    });

  } catch (error) {
    console.error('Error checking TL files:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to check TL files: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
