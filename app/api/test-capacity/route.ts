import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing capacity analysis...');

    // First ensure database schema is correct
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios'
      AND column_name IN ('capacity_analysis_completed', 'transport_optimization_completed', 'warehouse_optimization_completed')
    `;

    const existingColumns = columnCheck.map((row: any) => row.column_name);
    console.log('Existing optimization columns:', existingColumns);

    // Get first scenario to test with
    const scenarios = await sql`
      SELECT * FROM scenarios LIMIT 1
    `;

    if (scenarios.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No scenarios found to test with'
      }, { status: 404 });
    }

    const scenario = scenarios[0];
    console.log('Testing with scenario:', scenario.id);

    // Create test data for capacity analysis
    const testData = {
      projectConfig: {
        default_lease_term_years: 7,
        default_utilization_rate: 80,
        project_duration_years: 3,
        base_year: new Date().getFullYear()
      },
      growthForecasts: [
        {
          year_number: 1,
          forecast_type: 'forecast' as const,
          units_growth_rate: 5,
          dollar_growth_rate: 5,
          is_actual_data: false,
          confidence_level: 80
        },
        {
          year_number: 2,
          forecast_type: 'forecast' as const,
          units_growth_rate: 10,
          dollar_growth_rate: 10,
          is_actual_data: false,
          confidence_level: 75
        },
        {
          year_number: 3,
          forecast_type: 'forecast' as const,
          units_growth_rate: 8,
          dollar_growth_rate: 8,
          is_actual_data: false,
          confidence_level: 70
        }
      ],
      facilities: [
        {
          name: 'Test Warehouse 1',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          square_feet: 50000,
          capacity_units: 10000,
          is_forced: false,
          allow_expansion: true,
          lease_rate_per_sqft: 12,
          operating_cost_per_sqft: 3
        }
      ]
    };

    // Make request to capacity analysis endpoint
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/scenarios/${scenario.id}/capacity-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      columns: existingColumns,
      testResult: result
    });

  } catch (error) {
    console.error('Capacity analysis test error:', error);
    return NextResponse.json({
      success: false,
      error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
