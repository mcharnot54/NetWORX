import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

export const dynamic = 'force-dynamic'; // This route needs to be dynamic for database operations

// Get files for a scenario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    console.log('Fetching files for scenario:', scenarioId);

    // Test database connection first
    try {
      const { sql } = await import('@/lib/database');
      await sql`SELECT 1`;
    } catch (dbError) {
      console.error('Database connection failed in GET /api/files:', dbError);
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 503 });
    }

    // Check if the data_files table exists
    try {
      const { sql } = await import('@/lib/database');
      await sql`SELECT 1 FROM data_files LIMIT 1`;
    } catch (tableError) {
      console.error('data_files table check failed:', tableError);
      // Return empty files array if table doesn't exist yet
      return NextResponse.json({
        files: [],
        warning: 'data_files table not ready yet',
        message: 'Database needs initialization'
      });
    }

    const files = await DataFileService.getDataFiles(parseInt(scenarioId));
    console.log(`Found ${files.length} files for scenario ${scenarioId}`);
    return NextResponse.json({ files });

  } catch (error) {
    console.error('Error fetching files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to fetch files',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
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
      file_content, // Base64 encoded file content
      force_upload, // Option to bypass duplicate checking
      replace_existing // Option to replace existing file instead of creating duplicate
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

    // Truncate file_type if too long (max 50 chars for now, should be migrated to 100)
    const truncatedFileType = file_type && file_type.length > 50 ? file_type.substring(0, 50) : file_type;

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

    // Check for duplicate files before saving (unless force_upload is true)
    let existingFileId = null;
    if (!force_upload) {
      try {
        const { sql } = await import('@/lib/database');

        const existingFiles = await sql`
          SELECT id, file_name, scenario_id, processing_status, created_at
          FROM data_files
          WHERE file_name = ${truncatedFileName}
          ORDER BY created_at DESC
        `;

        if (existingFiles.length > 0) {
          // Check if exact duplicate exists in same scenario
          const sameScenarioFile = existingFiles.find((f: any) => f.scenario_id === scenario_id);

          if (sameScenarioFile) {
            if (replace_existing) {
              // Mark for replacement
              existingFileId = sameScenarioFile.id;
              console.log(`Will replace existing file ID: ${existingFileId}`);
            } else {
              return NextResponse.json({
                error: 'Duplicate file exists',
                details: `File "${truncatedFileName}" already exists in scenario ${scenario_id}`,
                existing_file: {
                  id: sameScenarioFile.id,
                  scenario_id: sameScenarioFile.scenario_id,
                  status: sameScenarioFile.processing_status,
                  created_at: sameScenarioFile.created_at
                },
                action_required: 'Add force_upload=true or replace_existing=true to proceed',
                options: {
                  force_upload: 'Create duplicate file anyway',
                  replace_existing: 'Replace the existing file'
                }
              }, { status: 409 }); // 409 Conflict
            }
          }

          // Log duplicates in other scenarios
          const otherScenarioFiles = existingFiles.filter((f: any) => f.scenario_id !== scenario_id);
          if (otherScenarioFiles.length > 0) {
            console.warn(`File "${truncatedFileName}" exists in other scenarios:`,
              otherScenarioFiles.map((f: any) => `ID:${f.id} Scenario:${f.scenario_id}`));
          }
        }
      } catch (duplicateCheckError) {
        console.error('Error checking for duplicates:', duplicateCheckError);
        // Continue with upload if duplicate check fails
      }
    }

    // Extract metadata if processed_data is available
    let metadata = {};
    if (processed_data && Array.isArray(processed_data.data)) {
      try {
        const { DataValidator } = await import('@/lib/data-validator');
        metadata = DataValidator.extractMetadata(processed_data.data, truncatedFileName);
      } catch (error) {
        console.warn('Could not extract metadata:', error);
      }
    }

    const fileData = {
      scenario_id,
      file_name: truncatedFileName,
      file_type: truncatedFileType,
      file_size,
      data_type: validDataType,
      processing_status: processing_status || 'pending',
      validation_result: validation_result || {},
      processed_data: {
        ...processed_data,
        file_content // Store the actual file content
      },
      metadata, // Include extracted metadata
      original_columns,
      mapped_columns: mapped_columns || {}
    };

    console.log('Attempting to save file with data:', {
      scenario_id,
      file_name: truncatedFileName,
      file_type,
      data_type: validDataType,
      file_size,
      processed_data_size: processed_data ? JSON.stringify(processed_data).length : 0,
      original_columns_count: original_columns ? original_columns.length : 0
    });

    let savedFile;
    try {
      if (existingFileId && replace_existing) {
        // Replace existing file
        const { sql } = await import('@/lib/database');
        await sql`
          UPDATE data_files
          SET
            file_type = ${truncatedFileType},
            file_size = ${file_size},
            data_type = ${validDataType},
            processing_status = ${processing_status || 'pending'},
            validation_result = ${fileData.validation_result},
            processed_data = ${fileData.processed_data},
            original_columns = ${original_columns},
            mapped_columns = ${fileData.mapped_columns},
            updated_at = NOW()
          WHERE id = ${existingFileId}
        `;

        // Get the updated file
        const updatedFiles = await sql`
          SELECT * FROM data_files WHERE id = ${existingFileId}
        `;

        savedFile = updatedFiles[0];
        console.log(`File replaced successfully: ID ${existingFileId}`);
      } else {
        // Create new file
        savedFile = await DataFileService.createDataFile(fileData);
        console.log('File saved successfully:', savedFile.id);
      }
    } catch (dbError) {
      console.error('Database error while saving/updating file:', dbError);
      throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    }

    return NextResponse.json({
      file: savedFile,
      action: existingFileId ? 'replaced' : 'created',
      duplicate_prevention_active: !force_upload
    });
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
