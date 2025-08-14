import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(
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

    const { data, metadata, processedAt } = await request.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // Save processed data to the database
    const result = await sql`
      INSERT INTO processed_scenario_data (
        scenario_id,
        processed_data,
        metadata,
        processed_at,
        created_at
      ) VALUES (
        ${scenarioId},
        ${JSON.stringify(data)},
        ${JSON.stringify(metadata)},
        ${processedAt},
        NOW()
      )
      ON CONFLICT (scenario_id) 
      DO UPDATE SET
        processed_data = EXCLUDED.processed_data,
        metadata = EXCLUDED.metadata,
        processed_at = EXCLUDED.processed_at,
        updated_at = NOW()
      RETURNING id
    `;

    // Update scenario status to indicate processing is complete
    await sql`
      UPDATE scenarios 
      SET 
        capacity_analysis_completed = true,
        updated_at = NOW()
      WHERE id = ${scenarioId}
    `;

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      recordsProcessed: data.length,
      message: 'Processed data saved successfully'
    });

  } catch (error) {
    console.error('Database error saving processed data:', error);
    return NextResponse.json(
      { error: 'Failed to save processed data', details: String(error) },
      { status: 500 }
    );
  }
}

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

    // Fetch processed data for the scenario
    const result = await sql`
      SELECT 
        processed_data,
        metadata,
        processed_at,
        created_at,
        updated_at
      FROM processed_scenario_data
      WHERE scenario_id = ${scenarioId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No processed data found for this scenario' },
        { status: 404 }
      );
    }

    const processedData = result.rows[0];

    return NextResponse.json({
      success: true,
      data: processedData.processed_data,
      metadata: processedData.metadata,
      processedAt: processedData.processed_at,
      lastUpdated: processedData.updated_at
    });

  } catch (error) {
    console.error('Database error fetching processed data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processed data', details: String(error) },
      { status: 500 }
    );
  }
}
