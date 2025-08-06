import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check current file_type column length
    const fileTypeCheck = await sql`
      SELECT character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'data_files' AND column_name = 'file_type'
    `;

    if (fileTypeCheck.length > 0) {
      const currentLength = fileTypeCheck[0].character_maximum_length;
      console.log(`Current file_type column length: ${currentLength}`);
      
      if (currentLength < 100) {
        // Expand file_type column to accommodate longer MIME types
        await sql`
          ALTER TABLE data_files
          ALTER COLUMN file_type TYPE VARCHAR(100)
        `;
        console.log('Expanded file_type column to VARCHAR(100)');
        
        return NextResponse.json({
          success: true,
          message: `file_type column expanded from VARCHAR(${currentLength}) to VARCHAR(100)`
        });
      } else {
        return NextResponse.json({
          success: true,
          message: `file_type column already has sufficient length: VARCHAR(${currentLength})`
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'data_files table or file_type column not found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
