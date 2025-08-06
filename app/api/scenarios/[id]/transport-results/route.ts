import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

// Helper function to ensure transport results table exists
async function ensureTransportResultsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS transport_analysis_results (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        analysis_data JSONB NOT NULL,
        selected_scenarios TEXT[] NOT NULL,
        analysis_timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(scenario_id, analysis_timestamp)
      )
    `;
  } catch (error) {
    console.warn('Could not ensure transport_analysis_results table exists:', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    const { analysisResults, selectedScenarios, analysisTimestamp } = await request.json();

    await ensureTransportResultsTable();

    // Validate scenario exists
    const scenarioResult = await sql`
      SELECT id FROM scenarios WHERE id = ${scenarioId}
    `;

    if (scenarioResult.length === 0) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Store transport analysis results
    await sql`
      INSERT INTO transport_analysis_results 
      (scenario_id, analysis_data, selected_scenarios, analysis_timestamp)
      VALUES (
        ${scenarioId}, 
        ${JSON.stringify(analysisResults)}, 
        ${selectedScenarios},
        ${analysisTimestamp}
      )
      ON CONFLICT (scenario_id, analysis_timestamp)
      DO UPDATE SET
        analysis_data = ${JSON.stringify(analysisResults)},
        selected_scenarios = ${selectedScenarios},
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: 'Transport analysis results saved successfully'
    });
  } catch (error) {
    console.error('Error saving transport analysis results:', error);
    return NextResponse.json(
      { error: 'Failed to save transport analysis results' },
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

    await ensureTransportResultsTable();

    const result = await sql`
      SELECT analysis_data, selected_scenarios, analysis_timestamp
      FROM transport_analysis_results 
      WHERE scenario_id = ${scenarioId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No transport analysis results found for this scenario' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching transport analysis results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport analysis results' },
      { status: 500 }
    );
  }
}
