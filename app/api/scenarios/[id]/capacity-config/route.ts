import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

interface CapacityConfigData {
  projectConfig: {
    default_lease_term_years: number;
    default_utilization_rate: number;
    project_duration_years: number;
    base_year: number;
  };
  growthForecasts: Array<{
    year_number: number;
    forecast_type: 'actual' | 'forecast' | 'linear';
    units_growth_rate?: number;
    dollar_growth_rate?: number;
    absolute_units?: number;
    absolute_dollars?: number;
    is_actual_data: boolean;
    confidence_level?: number;
    notes?: string;
  }>;
  facilities: Array<{
    id?: number;
    name: string;
    city: string;
    state: string;
    zip_code: string;
    square_feet: number;
    capacity_units: number;
    is_forced: boolean;
    force_start_year?: number;
    force_end_year?: number;
    allow_expansion: boolean;
    lease_rate_per_sqft?: number;
    operating_cost_per_sqft?: number;
  }>;
}

// Save capacity configuration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    const configData: CapacityConfigData = await request.json();

    // Validate scenario exists
    const scenarioResult = await sql`
      SELECT * FROM scenarios WHERE id = ${scenarioId}
    `;

    if (scenarioResult.length === 0) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Create capacity_configurations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS capacity_configurations (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        config_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(scenario_id)
      )
    `;

    // Save or update configuration
    await sql`
      INSERT INTO capacity_configurations (scenario_id, config_data, created_at, updated_at)
      VALUES (${scenarioId}, ${JSON.stringify(configData)}, NOW(), NOW())
      ON CONFLICT (scenario_id)
      DO UPDATE SET
        config_data = ${JSON.stringify(configData)},
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      message: 'Capacity configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving capacity configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save capacity configuration' },
      { status: 500 }
    );
  }
}

// Load capacity configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);

    // Check if table exists first
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'capacity_configurations'
      )
    `;

    if (!tableExists[0].exists) {
      return NextResponse.json(
        { error: 'No configuration found for this scenario' },
        { status: 404 }
      );
    }

    // Get configuration data
    const result = await sql`
      SELECT config_data FROM capacity_configurations WHERE scenario_id = ${scenarioId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No configuration found for this scenario' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0].config_data
    });

  } catch (error) {
    console.error('Error loading capacity configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load capacity configuration' },
      { status: 500 }
    );
  }
}
