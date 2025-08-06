import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

// Helper function to ensure warehouse configurations table exists
async function ensureWarehouseConfigTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS warehouse_configurations (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        config_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(scenario_id)
      )
    `;
  } catch (error) {
    console.warn('Could not ensure warehouse_configurations table exists:', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    const configData = await request.json();

    await ensureWarehouseConfigTable();

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

    // Store warehouse configuration
    await sql`
      INSERT INTO warehouse_configurations (scenario_id, config_data)
      VALUES (${scenarioId}, ${JSON.stringify(configData)})
      ON CONFLICT (scenario_id)
      DO UPDATE SET
        config_data = ${JSON.stringify(configData)},
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: 'Warehouse configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving warehouse configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save warehouse configuration' },
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

    await ensureWarehouseConfigTable();

    const result = await sql`
      SELECT config_data FROM warehouse_configurations 
      WHERE scenario_id = ${scenarioId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No warehouse configuration found for this scenario' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0].config_data
    });
  } catch (error) {
    console.error('Error fetching warehouse configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse configuration' },
      { status: 500 }
    );
  }
}
