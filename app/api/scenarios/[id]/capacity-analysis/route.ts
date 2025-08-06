import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';
import { optimizeCapacityPlanning, type CapacityPlanningParams } from '@/lib/optimization-algorithms';

// Helper function to ensure required columns exist
async function ensureCapacityAnalysisColumns() {
  try {
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios'
      AND column_name = 'capacity_analysis_completed'
    `;

    if (columnCheck.length === 0) {
      console.log('Adding missing capacity_analysis_completed column...');
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN capacity_analysis_completed BOOLEAN DEFAULT false
      `;
      console.log('Successfully added capacity_analysis_completed column');
    }
  } catch (error) {
    console.warn('Could not ensure capacity analysis columns exist:', error);
  }
}

interface CapacityAnalysisRequest {
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

interface YearlyCapacityResult {
  year: number;
  required_capacity: number;
  available_capacity: number;
  capacity_gap: number;
  utilization_rate: number;
  recommended_facilities: Array<{
    name: string;
    type: 'existing' | 'expansion' | 'new';
    capacity_units: number;
    square_feet: number;
    estimated_cost?: number;
  }>;
}

interface CapacityAnalysisResult {
  scenario_id: number;
  analysis_date: string;
  project_duration_years: number;
  base_year: number;
  total_investment_required: number;
  yearly_results: YearlyCapacityResult[];
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
  summary: {
    peak_capacity_required: number;
    total_facilities_recommended: number;
    average_utilization: number;
    investment_per_unit: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    const data: CapacityAnalysisRequest = await request.json();

    // Ensure required columns exist in scenarios table
    await ensureCapacityAnalysisColumns();

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

    // Perform capacity analysis
    const analysisResult = await performCapacityAnalysis(scenarioId, data);

    // Store analysis results in database
    await storeAnalysisResults(scenarioId, analysisResult);

    // Update scenario to mark capacity analysis as completed (if column exists)
    try {
      await sql`
        UPDATE scenarios SET capacity_analysis_completed = true, updated_at = NOW() WHERE id = ${scenarioId}
      `;
      console.log('Marked capacity analysis as completed for scenario', scenarioId);
    } catch (error) {
      // If the column doesn't exist, just log it but don't fail the request
      console.warn('Could not update capacity_analysis_completed column:', error);
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Capacity analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to perform capacity analysis' },
      { status: 500 }
    );
  }
}

import { optimizeCapacityPlanning, type CapacityPlanningParams } from '@/lib/optimization-algorithms';

async function performCapacityAnalysis(
  scenarioId: number,
  data: CapacityAnalysisRequest
): Promise<CapacityAnalysisResult> {
  const { projectConfig, growthForecasts, facilities } = data;

  console.log('Starting REAL capacity optimization analysis for scenario:', scenarioId);

  // Get baseline capacity from current year facilities
  let baselineCapacity = facilities.reduce((sum, facility) => sum + facility.capacity_units, 0);

  // If no facilities provided, estimate baseline from scenario data or use default
  if (baselineCapacity === 0) {
    try {
      // Try to get baseline from scenario metadata or other sources
      const scenarioData = await sql`
        SELECT metadata FROM scenarios WHERE id = ${scenarioId}
      `;

      if (scenarioData[0]?.metadata?.estimated_volume) {
        // Estimate capacity needs based on volume (rough heuristic: 1 unit capacity per 100 volume units)
        baselineCapacity = Math.ceil(scenarioData[0].metadata.estimated_volume / 100);
      } else {
        // Default baseline if no data available
        baselineCapacity = 10000;
      }
    } catch (error) {
      // If any database query fails, use a reasonable default
      console.warn('Could not retrieve baseline capacity data, using default:', error);
      baselineCapacity = 10000;
    }
  }

  // Prepare optimization parameters
  const optimizationParams: CapacityPlanningParams = {
    baseCapacity: baselineCapacity,
    growthForecasts: growthForecasts.map(forecast => ({
      year: projectConfig.base_year + forecast.year_number,
      growth_rate: forecast.units_growth_rate || 5,
      absolute_demand: forecast.absolute_units
    })),
    facilities: facilities.map(facility => ({
      name: facility.name,
      city: facility.city,
      state: facility.state,
      capacity: facility.capacity_units,
      cost_per_unit: (facility.lease_rate_per_sqft || 10) * 10, // Estimate cost per unit
      fixed_cost: facility.square_feet * (facility.lease_rate_per_sqft || 10),
      utilization_target: projectConfig.default_utilization_rate
    })),
    project_duration_years: projectConfig.project_duration_years,
    utilization_target: projectConfig.default_utilization_rate
  };

  // Run real capacity optimization
  console.log('Running real capacity optimization algorithm with params:', optimizationParams);
  const optimizationResult = optimizeCapacityPlanning(optimizationParams);

  // Convert optimization results to the expected format
  const yearlyResults: YearlyCapacityResult[] = optimizationResult.yearly_results.map(yearResult => ({
    year: yearResult.year,
    required_capacity: yearResult.required_capacity,
    available_capacity: yearResult.available_capacity,
    capacity_gap: yearResult.capacity_gap,
    utilization_rate: yearResult.utilization_rate,
    recommended_facilities: yearResult.recommended_actions.map((action, index) => {
      const isExpansion = action.includes('Expand');
      const isNew = action.includes('Add new');

      return {
        name: isNew ? `New Facility ${yearResult.year}` :
              isExpansion ? action.split(' ')[1] + ' Expansion' :
              `Optimized Facility ${index + 1}`,
        type: isNew ? 'new' as const : isExpansion ? 'expansion' as const : 'existing' as const,
        capacity_units: Math.floor(yearResult.required_capacity * 0.1), // Estimate capacity units per facility
        square_feet: Math.floor(yearResult.required_capacity * 0.1) * 10, // 10 sq ft per unit
        estimated_cost: yearResult.total_cost / yearResult.recommended_actions.length
      };
    })
  }));

  const totalInvestment = optimizationResult.total_investment;
  
  // Calculate summary statistics from optimization results
  const peakCapacity = Math.max(...yearlyResults.map(r => r.required_capacity));
  const totalFacilities = yearlyResults.reduce((sum, r) => sum + r.recommended_facilities.length, 0);
  const avgUtilization = yearlyResults.reduce((sum, r) => sum + r.utilization_rate, 0) / yearlyResults.length;
  const investmentPerUnit = totalInvestment > 0 ? totalInvestment / peakCapacity : 0;

  console.log('Capacity optimization completed:', {
    peakCapacity,
    totalInvestment,
    avgUtilization: Math.round(avgUtilization * 10) / 10,
    optimizationScore: optimizationResult.optimization_score
  });

  return {
    scenario_id: scenarioId,
    analysis_date: new Date().toISOString(),
    project_duration_years: projectConfig.project_duration_years,
    base_year: projectConfig.base_year,
    total_investment_required: Math.round(totalInvestment),
    yearly_results: yearlyResults,
    facilities: facilities, // Include original facilities data for city extraction
    summary: {
      peak_capacity_required: peakCapacity,
      total_facilities_recommended: totalFacilities,
      average_utilization: Math.round(avgUtilization * 100) / 100,
      investment_per_unit: Math.round(investmentPerUnit * 100) / 100
    }
  };
}

async function storeAnalysisResults(
  scenarioId: number,
  result: CapacityAnalysisResult
): Promise<void> {
  try {
    await sql`
      INSERT INTO capacity_analysis_results
      (scenario_id, analysis_data, created_at)
      VALUES (${scenarioId}, ${JSON.stringify(result)}, NOW())
      ON CONFLICT (scenario_id)
      DO UPDATE SET
        analysis_data = ${JSON.stringify(result)},
        updated_at = NOW()
    `;
  } catch (error) {
    // If table doesn't exist, create it
    await sql`
      CREATE TABLE IF NOT EXISTS capacity_analysis_results (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        analysis_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(scenario_id)
      )
    `;

    // Try again after creating table
    await sql`
      INSERT INTO capacity_analysis_results
      (scenario_id, analysis_data, created_at)
      VALUES (${scenarioId}, ${JSON.stringify(result)}, NOW())
      ON CONFLICT (scenario_id)
      DO UPDATE SET
        analysis_data = ${JSON.stringify(result)},
        updated_at = NOW()
    `;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    
    const result = await sql`
      SELECT analysis_data FROM capacity_analysis_results WHERE scenario_id = ${scenarioId}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'No capacity analysis found for this scenario' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0].analysis_data);
  } catch (error) {
    console.error('Error fetching capacity analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capacity analysis' },
      { status: 500 }
    );
  }
}
