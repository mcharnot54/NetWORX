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

    const savedFile = await DataFileService.createDataFile(fileData);
    return NextResponse.json({ file: savedFile });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
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
