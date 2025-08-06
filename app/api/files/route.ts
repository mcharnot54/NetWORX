import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

// Get files for a scenario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const files = await DataFileService.getDataFiles(parseInt(scenarioId));
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

// Save a new file
export async function POST(request: NextRequest) {
  try {
    // Test database connection first
    try {
      const { sql } = await import('@/lib/database');
      await sql`SELECT 1`;
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 503 });
    }
    const body = await request.json();
    const {
      scenario_id,
      file_name,
      file_type,
      file_size,
      data_type,
      processing_status,
      validation_result,
      processed_data,
      original_columns,
      mapped_columns,
      file_content // Base64 encoded file content
    } = body;

    if (!scenario_id || !file_name || !file_type) {
      return NextResponse.json({ 
        error: 'scenario_id, file_name, and file_type are required' 
      }, { status: 400 });
    }

    // Validate data_type against allowed values
    const allowedDataTypes = ['forecast', 'sku', 'network', 'cost', 'capacity'];
    const validDataType = allowedDataTypes.includes(data_type) ? data_type : 'network';

    // Truncate file_name if too long (max 255 chars)
    const truncatedFileName = file_name.length > 255 ? file_name.substring(0, 255) : file_name;

    // Validate file size
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file_size && file_size > maxFileSize) {
      return NextResponse.json({
        error: 'File too large',
        details: `File size ${file_size} exceeds maximum of ${maxFileSize} bytes`
      }, { status: 413 });
    }

    // Validate processed_data structure
    if (processed_data && typeof processed_data === 'object') {
      try {
        JSON.stringify(processed_data);
      } catch (jsonError) {
        return NextResponse.json({
          error: 'Invalid processed_data format',
          details: 'Cannot serialize processed_data to JSON'
        }, { status: 400 });
      }
    }

    const fileData = {
      scenario_id,
      file_name: truncatedFileName,
      file_type,
      file_size,
      data_type: validDataType,
      processing_status: processing_status || 'pending',
      validation_result: validation_result || {},
      processed_data: {
        ...processed_data,
        file_content // Store the actual file content
      },
      original_columns,
      mapped_columns: mapped_columns || {}
    };

    console.log('Attempting to save file with data:', {
      scenario_id,
      file_name: truncatedFileName,
      file_type,
      data_type: validDataType,
      file_size,
      processed_data_size: processed_data ? JSON.stringify(processed_data).length : 0
    });

    const savedFile = await DataFileService.createDataFile(fileData);
    return NextResponse.json({ file: savedFile });
  } catch (error) {
    console.error('Error saving file:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });

    return NextResponse.json({
      error: 'Failed to save file',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Update file data (processing results, validation, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'File id is required' }, { status: 400 });
    }

    const updatedFile = await DataFileService.updateDataFile(id, updateData);
    return NextResponse.json({ file: updatedFile });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}
