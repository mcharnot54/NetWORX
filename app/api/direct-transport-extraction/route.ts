import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get transportation files directly without scenario filtering
    const transportationFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      AND processed_data IS NOT NULL
    `;

    console.log(`Found ${transportationFiles.length} transportation files for direct extraction`);

    let totalTransportationCosts = 0;
    const extractionResults = [];

    for (const file of transportationFiles) {
      console.log(`\n=== Processing ${file.file_name} ===`);
      
      const fileNameLower = file.file_name.toLowerCase();
      let fileTotal = 0;
      
      // Extract costs using the corrected logic
      const allDataArrays = extractAllDataArrays(file.processed_data);
      
      for (const dataArray of allDataArrays) {
        console.log(`Processing ${dataArray.source} with ${dataArray.data.length} rows`);
        
        if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
          // UPS Individual Item Cost - use Net Charge column
          fileTotal += extractFromNetChargeColumn(dataArray.data, file.file_name);
        } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
          // TL file - use column H
          fileTotal += extractFromColumnH(dataArray.data, file.file_name);
        } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
          // R&L file - use column V
          fileTotal += extractFromColumnV(dataArray.data, file.file_name);
        }
      }
      
      totalTransportationCosts += fileTotal;
      extractionResults.push({
        file_name: file.file_name,
        extracted_amount: fileTotal,
        data_arrays_processed: allDataArrays.length
      });
      
      console.log(`Extracted $${fileTotal} from ${file.file_name}`);
    }

    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Total Transportation Baseline: $${totalTransportationCosts}`);

    return NextResponse.json({
      success: true,
      total_transportation_baseline: totalTransportationCosts,
      formatted_total: totalTransportationCosts > 1000000 
        ? `$${(totalTransportationCosts / 1000000).toFixed(1)}M`
        : `$${totalTransportationCosts.toLocaleString()}`,
      file_extractions: extractionResults,
      summary: {
        files_processed: transportationFiles.length,
        total_extracted: totalTransportationCosts,
        extraction_successful: totalTransportationCosts > 0,
        ready_for_2025_baseline: totalTransportationCosts > 100000 // Reasonable threshold
      }
    });

  } catch (error) {
    console.error('Error in direct transport extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions for data extraction

function extractAllDataArrays(processedData: any): Array<{data: any[], source: string}> {
  const dataArrays: Array<{data: any[], source: string}> = [];

  if (!processedData || typeof processedData !== 'object') {
    return dataArrays;
  }

  // Check parsedData
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    dataArrays.push({
      data: processedData.parsedData,
      source: 'parsedData'
    });
  }

  // Check data
  if (processedData.data && Array.isArray(processedData.data)) {
    dataArrays.push({
      data: processedData.data,
      source: 'data'
    });
  }

  // Check nested data structures (for multi-sheet files like TL)
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    for (const [key, value] of Object.entries(processedData.data)) {
      if (Array.isArray(value) && value.length > 0) {
        dataArrays.push({
          data: value,
          source: `data.${key}`
        });
      }
    }
  }

  return dataArrays;
}

function extractFromNetChargeColumn(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

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

  console.log(`Net Charge extraction: $${total} from ${valuesFound} values`);
  return total;
}

function extractFromColumnH(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' || 
          key.toLowerCase().includes('total')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`Column H extraction: $${total} from ${valuesFound} values`);
  return total;
}

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

  console.log(`Column V extraction: $${total} from ${valuesFound} values`);
  return total;
}
