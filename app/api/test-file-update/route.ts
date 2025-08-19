import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql, DataFileService } = await import('@/lib/database');
    
    // Test basic database connection
    await sql`SELECT 1`;
    
    // Get a test file if any exist
    const testFiles = await sql`
      SELECT id, file_name, processing_status 
      FROM data_files 
      LIMIT 1
    `;
    
    if (testFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files to test update with',
        database_connected: true
      });
    }
    
    const testFile = testFiles[0];
    
    // Try to update the file
    const updateData = {
      processing_status: 'completed',
      validation_result: {
        success: true,
        message: 'Test update',
        timestamp: new Date().toISOString()
      },
      processed_data: {
        test: true,
        updated_at: new Date().toISOString()
      }
    };
    
    console.log('Testing file update for file:', testFile.id);
    console.log('Update data:', updateData);
    
    const updatedFile = await DataFileService.updateDataFile(testFile.id, updateData);
    
    return NextResponse.json({
      success: true,
      message: 'File update test successful',
      original_file: testFile,
      updated_file: updatedFile,
      database_connected: true
    });
    
  } catch (error) {
    console.error('File update test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check database connection and table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'data_files' 
      ORDER BY ordinal_position
    `;
    
    const fileCount = await sql`
      SELECT COUNT(*) as count FROM data_files
    `;
    
    return NextResponse.json({
      success: true,
      table_structure: tableInfo,
      file_count: fileCount[0]?.count || 0,
      database_connected: true
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
