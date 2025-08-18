import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get detailed structure of each file
    const files = await sql`
      SELECT 
        id, file_name,
        CASE 
          WHEN processed_data ? 'file_content' THEN 'has_file_content'
          ELSE 'no_file_content'
        END as content_status,
        jsonb_object_keys(processed_data) as data_keys
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      AND processed_data IS NOT NULL
    `;

    console.log(`Found ${files.length} files to analyze`);

    const results = [];

    // Get each file's complete structure
    for (const file of files) {
      console.log(`\n=== Analyzing ${file.file_name} ===`);
      
      const fullFile = await sql`
        SELECT id, file_name, processed_data
        FROM data_files
        WHERE id = ${file.id}
      `;

      if (fullFile.length > 0) {
        const processedData = fullFile[0].processed_data;
        
        const analysis = {
          file_name: file.file_name,
          file_id: file.id,
          structure: {
            top_level_keys: Object.keys(processedData),
            has_file_content: !!(processedData.file_content),
            file_content_type: processedData.file_content ? typeof processedData.file_content : null,
            has_data: !!(processedData.data),
            data_type: processedData.data ? (Array.isArray(processedData.data) ? 'array' : typeof processedData.data) : null,
            has_parsedData: !!(processedData.parsedData),
            parsedData_type: processedData.parsedData ? (Array.isArray(processedData.parsedData) ? 'array' : typeof processedData.parsedData) : null
          },
          data_analysis: null
        };

        // Analyze the data structure in detail
        if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
          // Multi-sheet structure
          console.log('Found multi-sheet structure in data object');
          analysis.data_analysis = {
            type: 'multi_sheet',
            sheet_names: Object.keys(processedData.data),
            sheet_details: {}
          };
          
          for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
            analysis.data_analysis.sheet_details[sheetName] = {
              is_array: Array.isArray(sheetData),
              length: Array.isArray(sheetData) ? sheetData.length : 'not_array',
              type: typeof sheetData,
              sample_columns: Array.isArray(sheetData) && sheetData.length > 0 ? 
                Object.keys(sheetData[0] || {}).slice(0, 10) : []
            };
          }
        } else if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
          // Single array structure
          console.log('Found single array structure in parsedData');
          analysis.data_analysis = {
            type: 'single_array',
            rows: processedData.parsedData.length,
            sample_columns: processedData.parsedData.length > 0 ? 
              Object.keys(processedData.parsedData[0] || {}).slice(0, 10) : []
          };
        }

        // Test extraction if we found data
        if (analysis.data_analysis) {
          const fileNameLower = file.file_name.toLowerCase();
          
          if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
            analysis.extraction_test = testUPSExtraction(processedData);
          } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
            analysis.extraction_test = testTLExtraction(processedData);
          } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
            analysis.extraction_test = testRLExtraction(processedData);
          }
        }

        results.push(analysis);
      }
    }

    // If we have multi-sheet structures, try to access the original file content
    for (const result of results) {
      if (result.structure.has_file_content) {
        console.log(`\n=== Re-parsing ${result.file_name} from original content ===`);
        
        try {
          const fileRecord = await sql`
            SELECT processed_data->'file_content' as file_content
            FROM data_files
            WHERE id = ${result.file_id}
          `;
          
          if (fileRecord.length > 0 && fileRecord[0].file_content) {
            const XLSX = await import('xlsx');
            const fileContent = Buffer.from(fileRecord[0].file_content, 'base64');
            const workbook = XLSX.read(fileContent, { type: 'buffer' });
            
            result.original_excel_analysis = {
              sheet_names: workbook.SheetNames,
              sheet_count: workbook.SheetNames.length,
              extraction_test: null
            };
            
            console.log(`Original Excel has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
            
            // Test extraction from original
            const fileNameLower = result.file_name.toLowerCase();
            let totalFromOriginal = 0;
            
            if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
              for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const sheetData = XLSX.utils.sheet_to_json(worksheet);
                
                let sheetTotal = 0;
                for (const row of sheetData) {
                  if (row && row['Net Charge']) {
                    const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
                    if (!isNaN(numValue) && numValue > 0.01) {
                      sheetTotal += numValue;
                    }
                  }
                }
                totalFromOriginal += sheetTotal;
                console.log(`UPS ${sheetName}: $${sheetTotal} (${sheetData.length} rows)`);
              }
            }
            
            result.original_excel_analysis.extraction_test = totalFromOriginal;
            console.log(`Total from original ${result.file_name}: $${totalFromOriginal}`);
          }
          
        } catch (excelError) {
          console.error(`Error re-parsing ${result.file_name}:`, excelError);
          result.original_excel_analysis = { error: excelError.message };
        }
      }
    }

    return NextResponse.json({
      success: true,
      file_structures: results,
      summary: {
        total_files: results.length,
        files_with_multi_sheet: results.filter(r => r.data_analysis?.type === 'multi_sheet').length,
        files_with_original_content: results.filter(r => r.structure.has_file_content).length
      }
    });

  } catch (error) {
    console.error('Error checking original structure:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function testUPSExtraction(processedData: any): any {
  // Test both single array and multi-sheet structures
  let total = 0;
  const details = { method: '', tabs: [] };
  
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    details.method = 'multi_sheet';
    for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
      if (Array.isArray(sheetData)) {
        let sheetTotal = 0;
        for (const row of sheetData) {
          if (row && row['Net Charge']) {
            const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 0.01) {
              sheetTotal += numValue;
            }
          }
        }
        details.tabs.push({ name: sheetName, total: sheetTotal, rows: sheetData.length });
        total += sheetTotal;
      }
    }
  } else if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    details.method = 'single_array';
    for (const row of processedData.parsedData) {
      if (row && row['Net Charge']) {
        const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0.01) {
          total += numValue;
        }
      }
    }
    details.tabs.push({ name: 'parsedData', total: total, rows: processedData.parsedData.length });
  }
  
  return { total, details };
}

function testTLExtraction(processedData: any): any {
  let total = 0;
  const details = { method: '', tabs: [] };
  
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    details.method = 'multi_sheet';
    for (const [sheetName, sheetData] of Object.entries(processedData.data)) {
      if (Array.isArray(sheetData)) {
        let sheetTotal = 0;
        for (const row of sheetData) {
          if (row && row['Gross Rate']) {
            const numValue = parseFloat(String(row['Gross Rate']).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 100) {
              sheetTotal += numValue;
            }
          }
        }
        details.tabs.push({ name: sheetName, total: sheetTotal, rows: sheetData.length });
        total += sheetTotal;
      }
    }
  }
  
  return { total, details };
}

function testRLExtraction(processedData: any): any {
  // Similar logic for R&L
  return { total: 0, details: { method: 'needs_investigation', tabs: [] } };
}
