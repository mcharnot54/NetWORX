import { NextRequest, NextResponse } from 'next/server';
import { EnhancedExcelValidator } from '@/lib/enhanced-excel-validator';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('🔄 Checking for files that failed due to size limits...');
    
    // Find files that might have failed due to size limits
    // Look for files with large file_size but failed processing
    const failedFiles = await sql`
      SELECT id, file_name, file_size, processing_status, processed_data
      FROM data_files 
      WHERE processing_status = 'failed' 
      AND file_size > 100000000  -- Files larger than 100MB
      AND (processed_data IS NULL OR processed_data = '{}' OR processed_data->'error' IS NOT NULL)
      ORDER BY file_size DESC
    `;
    
    console.log(`Found ${failedFiles.length} large files that failed processing`);
    
    const results = [];
    
    for (const file of failedFiles) {
      console.log(`🔍 Checking file: ${file.file_name} (${(file.file_size / 1024 / 1024).toFixed(1)}MB)`);
      
      try {
        // Check if file has content stored
        if (!file.processed_data?.file_content) {
          console.log(`❌ File ${file.file_name} has no stored content - needs re-upload`);
          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'no_content',
            message: 'File needs to be re-uploaded with increased size limit',
            action_needed: 'Re-upload the file - size limit increased to 150MB'
          });
          continue;
        }
        
        // Try to reprocess the file with the new size limit
        console.log(`🔄 Attempting to reprocess ${file.file_name}...`);
        
        // Convert stored content back to buffer for reprocessing
        const fileContent = file.processed_data.file_content;
        if (!fileContent) {
          console.log(`❌ No file content found for ${file.file_name}`);
          continue;
        }
        
        // Create a mock file object for reprocessing
        const mockFile = {
          name: file.file_name,
          size: file.file_size,
          arrayBuffer: () => Promise.resolve(Buffer.from(fileContent, 'base64'))
        };
        
        // Use the enhanced validator with new size limit
        const validationResult = await EnhancedExcelValidator.validateAndProcessFile(
          mockFile as any,
          {
            maxFileSizeMB: 150, // Use new increased limit
            backupOriginal: true,
            csvEncoding: 'utf-8',
            supportedFormats: ['.xlsx', '.xls', '.csv'],
            validation: {
              strictMode: false,
              skipEmptyRows: true,
              skipEmptyColumns: true,
              autoDetectDataType: true
            }
          }
        );
        
        if (validationResult.isValid && validationResult.data) {
          // Update the file with successful processing
          await sql`
            UPDATE data_files 
            SET processing_status = 'completed',
                processed_data = ${JSON.stringify(validationResult.data)},
                validation_result = ${JSON.stringify(validationResult)}
            WHERE id = ${file.id}
          `;
          
          console.log(`✅ Successfully reprocessed ${file.file_name}`);
          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'success',
            message: 'File reprocessed successfully with increased size limit',
            sheets_found: validationResult.data.sheetsProcessed?.length || 0,
            total_rows: validationResult.data.processedRowCount || 0
          });
        } else {
          console.log(`❌ Reprocessing failed for ${file.file_name}: ${validationResult.errors?.join(', ')}`);
          results.push({
            file_id: file.id,
            file_name: file.file_name,
            status: 'failed',
            message: 'Reprocessing failed even with increased size limit',
            errors: validationResult.errors
          });
        }
        
      } catch (error) {
        console.error(`Error reprocessing ${file.file_name}:`, error);
        results.push({
          file_id: file.id,
          file_name: file.file_name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during reprocessing'
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const needsReupload = results.filter(r => r.status === 'no_content').length;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${failedFiles.length} large files. ${successCount} fixed, ${needsReupload} need re-upload.`,
      processed_files: failedFiles.length,
      successful_fixes: successCount,
      needs_reupload: needsReupload,
      results
    });
    
  } catch (error) {
    console.error('Error reprocessing large files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'Reprocess files that failed due to file size limits',
    method: 'POST',
    purpose: 'Fix files that failed when size limit was 100MB, now that limit is 150MB',
    target_files: 'Files > 100MB with failed processing status'
  });
}
