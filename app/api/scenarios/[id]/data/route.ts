import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    
    if (isNaN(scenarioId)) {
      return NextResponse.json(
        { error: 'Invalid scenario ID' },
        { status: 400 }
      );
    }

    // Fetch all files data for the scenario
    const filesResult = await sql`
      SELECT 
        f.id,
        f.file_name,
        f.file_type,
        f.data_type,
        f.processed_data,
        f.original_columns,
        f.upload_date,
        f.processing_status
      FROM files f
      WHERE f.scenario_id = ${scenarioId}
      AND f.processing_status = 'completed'
      ORDER BY f.upload_date DESC
    `;

    // Combine all data from different files
    const combinedData: any[] = [];
    const metadata = {
      totalFiles: filesResult.length,
      dataTypes: [] as string[],
      lastUpdated: null as string | null,
      totalRecords: 0
    };

    for (const file of filesResult) {
      if (file.processed_data?.parsedData) {
        const fileData = file.processed_data.parsedData;
        
        // Add file source information to each record
        const enrichedData = fileData.map((record: any) => ({
          ...record,
          _source_file: file.file_name,
          _source_type: file.data_type,
          _upload_date: file.upload_date
        }));
        
        combinedData.push(...enrichedData);
        metadata.dataTypes.push(file.data_type);
        metadata.totalRecords += fileData.length;
        
        if (!metadata.lastUpdated || file.upload_date > metadata.lastUpdated) {
          metadata.lastUpdated = file.upload_date;
        }
      }
    }

    // Remove duplicates from dataTypes
    metadata.dataTypes = [...new Set(metadata.dataTypes)];

    return NextResponse.json({
      success: true,
      data: combinedData,
      metadata
    });

  } catch (error) {
    console.error('Database error fetching scenario data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenario data', details: String(error) },
      { status: 500 }
    );
  }
}
