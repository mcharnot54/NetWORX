import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

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

async function performCapacityAnalysis(
  scenarioId: number,
  data: CapacityAnalysisRequest
): Promise<CapacityAnalysisResult> {
  const { projectConfig, growthForecasts, facilities } = data;
  const yearlyResults: YearlyCapacityResult[] = [];
  let totalInvestment = 0;

  // Get baseline capacity from current year (assuming we have some initial data)
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

  let currentCapacity = baselineCapacity;
  
  for (let yearIndex = 0; yearIndex < projectConfig.project_duration_years; yearIndex++) {
    const year = projectConfig.base_year + yearIndex;
    const forecast = growthForecasts[yearIndex];
    
    // Calculate required capacity for this year
    let requiredCapacity: number;
    
    if (forecast?.absolute_units) {
      requiredCapacity = forecast.absolute_units;
    } else if (forecast?.units_growth_rate !== undefined) {
      // Apply growth rate to previous year's requirement
      const previousRequired = yearIndex === 0 ? baselineCapacity : yearlyResults[yearIndex - 1].required_capacity;
      requiredCapacity = previousRequired * (1 + forecast.units_growth_rate / 100);
    } else {
      // Default to 5% growth if no forecast provided
      const previousRequired = yearIndex === 0 ? baselineCapacity : yearlyResults[yearIndex - 1].required_capacity;
      requiredCapacity = previousRequired * 1.05;
    }

    // Account for utilization rate
    const effectiveCapacity = currentCapacity * (projectConfig.default_utilization_rate / 100);
    const capacityGap = requiredCapacity - effectiveCapacity;
    
    const recommendedFacilities: YearlyCapacityResult['recommended_facilities'] = [];
    
    // If there's a capacity gap, recommend solutions
    if (capacityGap > 0) {
      // First, try to expand existing facilities that allow expansion
      let remainingGap = capacityGap;
      
      for (const facility of facilities.filter(f => f.allow_expansion)) {
        if (remainingGap <= 0) break;
        
        const expansionCapacity = Math.min(remainingGap, facility.capacity_units * 0.5); // Max 50% expansion
        const expansionSqFt = (expansionCapacity / facility.capacity_units) * facility.square_feet;
        const expansionCost = expansionSqFt * (facility.lease_rate_per_sqft || 10) * projectConfig.default_lease_term_years;
        
        recommendedFacilities.push({
          name: `${facility.name} - Expansion`,
          type: 'expansion',
          capacity_units: expansionCapacity,
          square_feet: expansionSqFt,
          estimated_cost: expansionCost
        });
        
        currentCapacity += expansionCapacity;
        totalInvestment += expansionCost;
        remainingGap -= expansionCapacity;
      }
      
      // If gap remains, recommend new facilities
      if (remainingGap > 0) {
        const newFacilityCapacity = Math.ceil(remainingGap / 1000) * 1000; // Round up to nearest 1000
        const newFacilitySqFt = newFacilityCapacity * 10; // Assume 10 sq ft per capacity unit
        const newFacilityCost = newFacilitySqFt * 12 * projectConfig.default_lease_term_years; // $12/sq ft
        
        recommendedFacilities.push({
          name: `New Facility ${year}`,
          type: 'new',
          capacity_units: newFacilityCapacity,
          square_feet: newFacilitySqFt,
          estimated_cost: newFacilityCost
        });
        
        currentCapacity += newFacilityCapacity;
        totalInvestment += newFacilityCost;
      }
    }

    // Check for forced facilities in this year
    const forcedFacilities = facilities.filter(f => 
      f.is_forced && 
      f.force_start_year === year
    );
    
    for (const forced of forcedFacilities) {
      const forcedCost = forced.square_feet * (forced.lease_rate_per_sqft || 10) * projectConfig.default_lease_term_years;
      
      recommendedFacilities.push({
        name: forced.name,
        type: 'existing',
        capacity_units: forced.capacity_units,
        square_feet: forced.square_feet,
        estimated_cost: forcedCost
      });
      
      currentCapacity += forced.capacity_units;
      totalInvestment += forcedCost;
    }

    const yearResult: YearlyCapacityResult = {
      year,
      required_capacity: Math.round(requiredCapacity),
      available_capacity: Math.round(currentCapacity),
      capacity_gap: Math.round(Math.max(0, capacityGap)),
      utilization_rate: Math.round((requiredCapacity / currentCapacity) * 100 * 100) / 100,
      recommended_facilities: recommendedFacilities
    };
    
    yearlyResults.push(yearResult);
  }

  // Calculate summary statistics
  const peakCapacity = Math.max(...yearlyResults.map(r => r.required_capacity));
  const totalFacilities = yearlyResults.reduce((sum, r) => sum + r.recommended_facilities.length, 0);
  const avgUtilization = yearlyResults.reduce((sum, r) => sum + r.utilization_rate, 0) / yearlyResults.length;
  const investmentPerUnit = totalInvestment / peakCapacity;

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
