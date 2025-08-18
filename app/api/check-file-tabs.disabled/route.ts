import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get the raw file content to check for multiple sheets
    const files = await sql`
      SELECT 
        id, file_name, 
        CASE 
          WHEN processed_data ? 'file_content' THEN 'has_file_content'
          ELSE 'no_file_content'
        END as content_status,
        processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      AND processed_data IS NOT NULL
    `;

    const results = [];

    for (const file of files) {
      console.log(`\n=== Analyzing ${file.file_name} ===`);
      
      const analysis = {
        file_name: file.file_name,
        file_id: file.id,
        structure_analysis: {},
        extraction_test: 0
      };

      const processedData = file.processed_data;
      
      // Analyze the structure
      if (processedData) {
        analysis.structure_analysis = {
          top_level_keys: Object.keys(processedData),
          has_data_object: !!(processedData.data && typeof processedData.data === 'object'),
          has_parsedData_array: !!(processedData.parsedData && Array.isArray(processedData.parsedData)),
          data_is_array: Array.isArray(processedData.data),
          data_is_object: !Array.isArray(processedData.data) && typeof processedData.data === 'object'
        };

        // If data is an object (multi-sheet), check what's inside
        if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
          analysis.structure_analysis.data_object_keys = Object.keys(processedData.data);
          analysis.structure_analysis.sheet_info = {};
          
          for (const [key, value] of Object.entries(processedData.data)) {
            analysis.structure_analysis.sheet_info[key] = {
              is_array: Array.isArray(value),
              length: Array.isArray(value) ? value.length : 'not_array',
              type: typeof value
            };
          }
        }

        // Test extraction based on file type
        const fileNameLower = file.file_name.toLowerCase();
        
        if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
          // Test UPS extraction
          analysis.extraction_test = testUPSExtraction(processedData);
        } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
          // Test TL extraction
          analysis.extraction_test = testTLExtraction(processedData);
        } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
          // Test R&L extraction
          analysis.extraction_test = testRLExtraction(processedData);
        }
      }

      results.push(analysis);
    }

    const totalExtracted = results.reduce((sum, r) => sum + (r.extraction_test || 0), 0);

    return NextResponse.json({
      success: true,
      file_analyses: results,
      summary: {
        files_analyzed: results.length,
        total_extracted_test: totalExtracted,
        formatted_total: totalExtracted > 1000000 
          ? `$${(totalExtracted / 1000000).toFixed(1)}M`
          : `$${totalExtracted.toLocaleString()}`
      }
    });

  } catch (error) {
    console.error('Error checking file tabs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function testUPSExtraction(processedData: any): number {
  let total = 0;
  
  console.log('Testing UPS extraction...');
  
  // Check if there are multiple data sources (multiple tabs)
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    console.log('UPS has multi-sheet structure:', Object.keys(processedData.data));
    
    // Extract from each sheet
    for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
      if (Array.isArray(sheetData)) {
        const sheetTotal = extractNetCharges(sheetData);
        console.log(`UPS ${sheetName}: $${sheetTotal}`);
        total += sheetTotal;
      }
    }
  } else if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    console.log('UPS has single array structure');
    total = extractNetCharges(processedData.parsedData);
  }
  
  console.log(`UPS total extraction: $${total}`);
  return total;
}

function testTLExtraction(processedData: any): number {
  let total = 0;
  
  console.log('Testing TL extraction...');
  
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    console.log('TL has multi-sheet structure:', Object.keys(processedData.data));
    
    for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
      if (Array.isArray(sheetData)) {
        const sheetTotal = extractColumnH(sheetData);
        console.log(`TL ${sheetName}: $${sheetTotal} (${sheetData.length} rows)`);
        total += sheetTotal;
      }
    }
  } else if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    total = extractColumnH(processedData.parsedData);
  }
  
  console.log(`TL total extraction: $${total}`);
  return total;
}

function testRLExtraction(processedData: any): number {
  let total = 0;
  
  console.log('Testing R&L extraction...');
  
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    total = extractColumnV(processedData.parsedData);
    console.log(`R&L extraction: $${total} (${processedData.parsedData.length} rows)`);
  }
  
  return total;
}

function extractNetCharges(data: any[]): number {
  let total = 0;
  
  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      if (key === 'Net Charge' || key.toLowerCase().includes('net charge')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0.01) {
          total += numValue;
        }
      }
    }
  }
  
  return total;
}

function extractColumnH(data: any[]): number {
  let total = 0;
  let foundKeys = new Set();
  
  // First, identify what keys exist that might be column H
  for (const row of data.slice(0, 10)) {
    if (typeof row === 'object' && row) {
      Object.keys(row).forEach(key => foundKeys.add(key));
    }
  }
  
  console.log('Available keys in TL data:', Array.from(foundKeys).slice(0, 20));
  
  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      // More flexible matching for TL costs
      if (key === 'H' || key === '__EMPTY_7' || 
          key.toLowerCase().includes('total') ||
          key.toLowerCase().includes('cost') ||
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('freight') ||
          key.toLowerCase().includes('charge')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) { // Lower threshold for testing
          total += numValue;
        }
      }
    }
  }
  
  return total;
}

function extractColumnV(data: any[]): number {
  let total = 0;
  let foundKeys = new Set();
  
  // First, identify what keys exist
  for (const row of data.slice(0, 10)) {
    if (typeof row === 'object' && row) {
      Object.keys(row).forEach(key => foundKeys.add(key));
    }
  }
  
  console.log('Available keys in R&L data:', Array.from(foundKeys).slice(0, 20));
  
  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      // More flexible matching for R&L costs
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge') ||
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('cost') ||
          key.toLowerCase().includes('freight')) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 10) { // Lower threshold for testing
          total += numValue;
        }
      }
    }
  }
  
  return total;
}
