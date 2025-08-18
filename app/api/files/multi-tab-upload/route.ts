import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    const body = await request.json();
    
    const {
      fileName,
      fileType,
      fileSize,
      dataType,
      scenarioId,
      processedData
    } = body;

    console.log(`Uploading multi-tab file: ${fileName}`);
    console.log(`Tabs found: ${processedData.multi_tab_structure?.tabs?.length || 0}`);

    // Insert file record with multi-tab structure preserved
    const fileRecord = await sql`
      INSERT INTO data_files (
        scenario_id,
        file_name,
        file_type,
        file_size,
        data_type,
        upload_date,
        processing_status,
        processed_data,
        validation_result,
        original_columns,
        mapped_columns
      ) VALUES (
        ${scenarioId},
        ${fileName},
        ${fileType},
        ${fileSize},
        ${dataType},
        NOW(),
        'completed',
        ${JSON.stringify(processedData)},
        ${JSON.stringify({
          multi_tab_validation: true,
          tabs_processed: processedData.multi_tab_structure?.tabs?.length || 0,
          total_extracted: processedData.multi_tab_structure?.total_extracted || 0,
          file_type_detected: processedData.multi_tab_structure?.file_type,
          validation_status: 'success'
        })},
        ${JSON.stringify(processedData.multi_tab_structure?.tabs?.flatMap((tab: any) => tab.columns) || [])},
        ${JSON.stringify({})}
      )
      RETURNING id, file_name, processing_status
    `;

    console.log(`File uploaded successfully with ID: ${fileRecord[0].id}`);

    return NextResponse.json({
      success: true,
      file: fileRecord[0],
      message: `Multi-tab file ${fileName} uploaded successfully`,
      tabs_processed: processedData.multi_tab_structure?.tabs?.length || 0,
      total_extracted: processedData.multi_tab_structure?.total_extracted || 0
    });

  } catch (error) {
    console.error('Error uploading multi-tab file:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json({
        success: false,
        error: 'Scenario ID is required'
      }, { status: 400 });
    }

    const { sql } = await import('@/lib/database');

    // Get multi-tab files for the scenario
    const files = await sql`
      SELECT 
        id,
        file_name,
        file_type,
        file_size,
        data_type,
        upload_date,
        processing_status,
        validation_result,
        CASE 
          WHEN processed_data ? 'multi_tab_structure' THEN 
            jsonb_build_object(
              'has_multi_tab_structure', true,
              'tabs_count', jsonb_array_length(processed_data->'multi_tab_structure'->'tabs'),
              'file_type_detected', processed_data->'multi_tab_structure'->'file_type',
              'total_extracted', processed_data->'multi_tab_structure'->'total_extracted'
            )
          ELSE 
            jsonb_build_object('has_multi_tab_structure', false)
        END as multi_tab_info
      FROM data_files
      WHERE scenario_id = ${scenarioId}
      ORDER BY upload_date DESC
    `;

    return NextResponse.json({
      success: true,
      files: files,
      total_files: files.length,
      multi_tab_files: files.filter(f => f.multi_tab_info.has_multi_tab_structure).length
    });

  } catch (error) {
    console.error('Error retrieving multi-tab files:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
