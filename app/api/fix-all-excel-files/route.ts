import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get ALL failed Excel files that have file content but failed processing
    const failedFiles = await sql`
      SELECT id, file_name, processed_data, processing_status
      FROM data_files
      WHERE processing_status = 'failed'
      AND processed_data->'file_content' IS NOT NULL
      AND (file_name LIKE '%.xlsx' OR file_name LIKE '%.xls' OR file_name LIKE '%.csv')
      ORDER BY file_name
    `;

    console.log(`Found ${failedFiles.length} failed Excel files to fix`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of failedFiles) {
      console.log(`\n=== FIXING: ${file.file_name} (ID: ${file.id}) ===`);
      
      try {
        // Get the original file content
        const fileContent = file.processed_data?.file_content;
        
        if (!fileContent) {
          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'no_content',
            message: 'No file content found'
          });
          errorCount++;
          continue;
        }

        // Re-parse the Excel file
        const { DataValidator } = await import('@/lib/data-validator');
        
        // Convert base64 to buffer and create file object
        const buffer = Buffer.from(fileContent, 'base64');
        const blob = new Blob([buffer], { 
          type: file.file_name.endsWith('.csv') 
            ? 'text/csv' 
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const fileObj = new File([blob], file.file_name);
        
        // Parse the file to extract actual data
        const { data, columnHeaders } = await DataValidator.parseFile(fileObj);
        
        console.log(`Successfully parsed ${file.file_name}: ${data.length} rows, ${columnHeaders.length} columns`);
        
        // Update the database with the correct structure
        await sql`
          UPDATE data_files 
          SET 
            processing_status = 'completed',
            processed_data = ${JSON.stringify({
              parsedData: data,
              columnNames: columnHeaders,
              file_content: fileContent,
              reprocessed: true,
              reprocessed_at: new Date().toISOString(),
              original_errors: file.processed_data?.errors || []
            })},
            validation_result = ${JSON.stringify({
              success: true,
              message: 'Reprocessed successfully - extracted actual Excel data',
              rows: data.length,
              columns: columnHeaders.length,
              reprocessed: true
            })}
          WHERE id = ${file.id}
        `;
        
        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'fixed',
          rows_extracted: data.length,
          columns_found: columnHeaders.length,
          sample_columns: columnHeaders.slice(0, 8),
          message: `Fixed: ${data.length} rows, ${columnHeaders.length} columns`
        });
        
        successCount++;
        
      } catch (parseError) {
        console.error(`Failed to fix ${file.file_name}:`, parseError);
        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'parse_error',
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        errorCount++;
      }
    }

    // Also check for any files that might be missing the R&L file
    const missingFiles = await sql`
      SELECT COUNT(*) as count FROM data_files 
      WHERE file_name ILIKE '%r&l%curriculum%associates%'
    `;
    
    const rlFileExists = missingFiles[0]?.count > 0;

    return NextResponse.json({
      success: true,
      total_files_processed: failedFiles.length,
      results: results,
      summary: {
        fixed: successCount,
        failed: errorCount,
        rl_file_exists: rlFileExists
      },
      message: `Fixed ${successCount} out of ${failedFiles.length} failed Excel files`
    });

  } catch (error) {
    console.error('Error fixing all Excel files:', error);
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
    
    const failedFiles = await sql`
      SELECT id, file_name, processing_status,
             CASE 
               WHEN processed_data->'file_content' IS NOT NULL THEN 'has_content'
               ELSE 'no_content'
             END as has_file_content
      FROM data_files
      WHERE processing_status = 'failed'
      AND (file_name LIKE '%.xlsx' OR file_name LIKE '%.xls' OR file_name LIKE '%.csv')
      ORDER BY file_name
    `;

    return NextResponse.json({
      success: true,
      files_to_fix: failedFiles.length,
      files: failedFiles,
      action: 'This will reprocess ALL failed Excel files to extract actual data'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
