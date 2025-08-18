import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the problematic files that have failed processing status
    const problemFiles = await sql`
      SELECT id, file_name, processed_data, processing_status
      FROM data_files
      WHERE file_name IN (
        'R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx',
        '2024 TOTALS WITH INBOUND AND OUTBOUND TL (2).xlsx'
      )
      AND processing_status = 'failed'
    `;

    const results = [];
    
    for (const file of problemFiles) {
      console.log(`\nFixing processing for: ${file.file_name}`);
      
      // Check if we have the original file content
      const fileContent = file.processed_data?.file_content;
      
      if (!fileContent) {
        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'no_file_content',
          message: 'No original file content found'
        });
        continue;
      }

      try {
        // Re-parse the Excel file properly
        const { DataValidator } = await import('@/lib/data-validator');
        
        // Convert base64 back to buffer and parse
        const buffer = Buffer.from(fileContent, 'base64');
        const blob = new Blob([buffer]);
        
        // Create a File object for parsing
        const fileObj = new File([blob], file.file_name, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        // Parse the Excel file to get actual data
        const { data, columnHeaders } = await DataValidator.parseFile(fileObj);
        
        console.log(`Parsed ${file.file_name}: ${data.length} rows, ${columnHeaders.length} columns`);
        
        // Update the database with correct data structure
        await sql`
          UPDATE data_files 
          SET 
            processing_status = 'completed',
            processed_data = ${JSON.stringify({
              parsedData: data,
              columnNames: columnHeaders,
              file_content: fileContent,
              reprocessed: true,
              reprocessed_at: new Date().toISOString()
            })},
            validation_result = ${JSON.stringify({
              success: true,
              message: 'Reprocessed to extract actual Excel data',
              rows: data.length,
              columns: columnHeaders.length
            })}
          WHERE id = ${file.id}
        `;
        
        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'fixed',
          rows_extracted: data.length,
          columns_found: columnHeaders.length,
          sample_columns: columnHeaders.slice(0, 10),
          message: 'Successfully reprocessed Excel data'
        });
        
      } catch (parseError) {
        console.error(`Failed to reprocess ${file.file_name}:`, parseError);
        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'parse_failed',
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
      }
    }

    return NextResponse.json({
      success: true,
      files_processed: problemFiles.length,
      results: results,
      summary: {
        fixed: results.filter(r => r.status === 'fixed').length,
        failed: results.filter(r => r.status !== 'fixed').length
      }
    });

  } catch (error) {
    console.error('Error fixing Excel processing:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  // Preview what will be fixed
  try {
    const { sql } = await import('@/lib/database');
    
    const problemFiles = await sql`
      SELECT id, file_name, processing_status, 
             CASE 
               WHEN processed_data->'file_content' IS NOT NULL THEN 'has_content'
               ELSE 'no_content'
             END as has_file_content
      FROM data_files
      WHERE file_name IN (
        'R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx',
        '2024 TOTALS WITH INBOUND AND OUTBOUND TL (2).xlsx'
      )
    `;

    return NextResponse.json({
      success: true,
      files_to_fix: problemFiles,
      action: 'This will reprocess the Excel files to extract actual data instead of validation errors'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
