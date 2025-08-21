import { NextRequest, NextResponse } from 'next/server';

interface OptimizationRequest {
  scenario_id?: string;
  optimization_criteria: {
    cost_weight: number;
    service_weight: number;
    distance_weight: number;
  };
  service_zone_weighting: {
    parcel_zone_weight: number;
    ltl_zone_weight: number;
    tl_daily_miles_weight: number;
  };
  outbound_weight_percentage: number;
  inbound_weight_percentage: number;
  facility_requirements: number;
  scenario_types: string[];
}

interface DynamicOptimizationResult {
  scenario_id: string;
  scenario_type: string;
  optimization_summary: {
    baseline_cost: number;
    optimized_cost: number;
    total_savings: number;
    savings_percentage: number;
    facilities_used: number;
    routes_optimized: number;
  };
  facility_recommendations: Array<{
    city: string;
    facility_type: string;
    annual_cost: number;
    volume_capacity: number;
    coverage_area: string[];
    cost_savings: number;
    service_improvement: number;
  }>;
  route_optimization: Array<{
    origin: string;
    destination: string;
    transport_mode: string;
    baseline_cost: number;
    optimized_cost: number;
    savings: number;
    volume: number;
    frequency: number;
  }>;
  yearly_projections: Array<{
    year: number;
    total_cost: number;
    savings_vs_baseline: number;
    volume_growth: number;
    recommended_actions: string[];
  }>;
  best_combination_analysis: {
    optimal_facilities: string[];
    total_investment: number;
    annual_savings: number;
    payback_period: number;
    roi_percentage: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as OptimizationRequest;
    const { scenario_id, optimization_criteria, facility_requirements, scenario_types } = body;

    console.log('=== DYNAMIC TRANSPORT OPTIMIZATION START ===');
    console.log(`Scenario ID: ${scenario_id}`);
    console.log(`Facility Requirements: ${facility_requirements}`);
    console.log(`Scenario Types: ${scenario_types.join(', ')}`);

    // First, get the real transport data instead of using hardcoded cities
    const transportDataResponse = await fetch(new URL('/api/extract-dynamic-transport-data', request.url));
    if (!transportDataResponse.ok) {
      throw new Error('Failed to extract dynamic transport data');
    }
    
    const { extracted_data } = await transportDataResponse.json();
    
    console.log(`Using REAL data: ${extracted_data.unique_cities.length} cities, ${extracted_data.routes.length} routes`);
    console.log(`Primary facilities: ${extracted_data.primary_facilities.join(', ')}`);
    console.log(`Baseline total: $${extracted_data.baseline_totals.total.toLocaleString()}`);

    // Generate optimization scenarios based on actual data
    const optimizationResults: DynamicOptimizationResult[] = [];

    for (const scenarioType of scenario_types) {
      const result = await optimizeTransportScenario({
        scenario_type: scenarioType,
        extracted_data,
        optimization_criteria,
        facility_requirements,
        scenario_id: scenario_id || `dynamic_${Date.now()}`
      });
      
      optimizationResults.push(result);
    }

    // Find the best overall combination
    const bestScenario = optimizationResults.reduce((best, current) => 
      current.optimization_summary.savings_percentage > best.optimization_summary.savings_percentage ? current : best
    );

    console.log(`Best scenario: ${bestScenario.scenario_type} with ${bestScenario.optimization_summary.savings_percentage}% savings`);

    return NextResponse.json({
      success: true,
      optimization_results: optimizationResults,
      best_scenario: bestScenario,
      data_source_summary: {
        cities_analyzed: extracted_data.unique_cities.length,
        routes_analyzed: extracted_data.routes.length,
        primary_facilities: extracted_data.primary_facilities,
        baseline_total: extracted_data.baseline_totals.total,
        transport_modes: extracted_data.transportation_modes
      },
      recommendations: generateRecommendations(optimizationResults, extracted_data),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in dynamic transport optimization:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function optimizeTransportScenario(params: {
  scenario_type: string;
  extracted_data: any;
  optimization_criteria: any;
  facility_requirements: number;
  scenario_id: string;
}): Promise<DynamicOptimizationResult> {
  
  const { scenario_type, extracted_data, optimization_criteria, facility_requirements, scenario_id } = params;
  
  console.log(`\n--- Optimizing ${scenario_type} scenario ---`);

  // Analyze current routes and identify optimization opportunities
  const routeAnalysis = analyzeRoutes(extracted_data.routes, scenario_type);
  
  // Determine optimal facility locations based on actual data
  const facilityRecommendations = determineFacilityLocations(
    extracted_data,
    facility_requirements,
    scenario_type,
    optimization_criteria
  );

  // Calculate route optimization based on new facilities
  const routeOptimization = optimizeRoutes(
    extracted_data.routes,
    facilityRecommendations,
    scenario_type,
    optimization_criteria
  );

  // Generate yearly projections
  const yearlyProjections = generateYearlyProjections(
    extracted_data.baseline_totals.total,
    routeOptimization.total_savings,
    scenario_type
  );

  // Calculate best combination analysis
  const bestCombination = analyzeBestCombination(
    facilityRecommendations,
    routeOptimization,
    extracted_data.baseline_totals.total
  );

  const totalSavings = routeOptimization.total_savings + facilityRecommendations.reduce((sum, f) => sum + f.cost_savings, 0);
  const savingsPercentage = (totalSavings / extracted_data.baseline_totals.total) * 100;

  return {
    scenario_id: `${scenario_id}_${scenario_type}`,
    scenario_type,
    optimization_summary: {
      baseline_cost: extracted_data.baseline_totals.total,
      optimized_cost: extracted_data.baseline_totals.total - totalSavings,
      total_savings: totalSavings,
      savings_percentage: Math.round(savingsPercentage * 100) / 100,
      facilities_used: facilityRecommendations.length,
      routes_optimized: routeOptimization.optimized_routes.length
    },
    facility_recommendations: facilityRecommendations,
    route_optimization: routeOptimization.optimized_routes,
    yearly_projections: yearlyProjections,
    best_combination_analysis: bestCombination
  };
}

function analyzeRoutes(routes: any[], scenarioType: string) {
  // Group routes by transport mode and analyze patterns
  const routesByMode = routes.reduce((acc, route) => {
    if (!acc[route.transport_mode]) acc[route.transport_mode] = [];
    acc[route.transport_mode].push(route);
    return acc;
  }, {});

  // Identify high-cost routes that could benefit from optimization
  const highCostRoutes = routes
    .filter(route => route.cost > 1000) // Focus on substantial routes
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 20); // Top 20 highest cost routes

  return {
    routes_by_mode: routesByMode,
    high_cost_routes: highCostRoutes,
    total_routes: routes.length
  };
}

function determineFacilityLocations(
  extractedData: any,
  facilityRequirements: number,
  scenarioType: string,
  optimizationCriteria: any
) {
  const { unique_cities, routes, primary_facilities } = extractedData;
  
  // Calculate city scores based on route volume and costs
  const cityScores = calculateCityScores(routes, unique_cities, optimizationCriteria);
  
  // Select top cities based on scenario type and requirements
  const selectedCities = selectOptimalCities(cityScores, facilityRequirements, scenarioType);

  return selectedCities.map((city, index) => {
    const cityRoutes = routes.filter(r => r.origin === city || r.destination === city);
    const totalVolume = cityRoutes.reduce((sum, r) => sum + (r.cost || 0), 0);
    const coverageArea = findCoverageArea(city, unique_cities, routes);
    
    // Calculate facility costs based on scenario type
    let facilityType = 'Distribution Center';
    let annualCost = 2500000; // Base cost
    
    if (scenarioType.includes('lowest_cost')) {
      facilityType = 'Cost-Optimized Hub';
      annualCost = 2000000;
    } else if (scenarioType.includes('best_service')) {
      facilityType = 'Service Center';
      annualCost = 3000000;
    } else if (scenarioType.includes('lowest_miles')) {
      facilityType = 'Regional Hub';
      annualCost = 2200000;
    }

    // Adjust cost based on city size and primary facility status
    if (primary_facilities.includes(city)) {
      annualCost *= 0.8; // 20% discount for existing primary facilities
    }

    const costSavings = calculateFacilitySavings(city, cityRoutes, scenarioType);
    const serviceImprovement = calculateServiceImprovement(city, coverageArea, scenarioType);

    return {
      city,
      facility_type: facilityType,
      annual_cost: Math.round(annualCost),
      volume_capacity: Math.round(totalVolume * 1.2), // 20% buffer
      coverage_area: coverageArea,
      cost_savings: Math.round(costSavings),
      service_improvement: Math.round(serviceImprovement * 10) / 10
    };
  });
}

function calculateCityScores(routes: any[], cities: string[], optimizationCriteria: any) {
  return cities.map(city => {
    const cityRoutes = routes.filter(r => r.origin === city || r.destination === city);
    const totalCost = cityRoutes.reduce((sum, r) => sum + (r.cost || 0), 0);
    const routeCount = cityRoutes.length;
    
    // Calculate weighted score based on optimization criteria
    const costScore = totalCost * (optimizationCriteria.cost_weight / 100);
    const serviceScore = routeCount * (optimizationCriteria.service_weight / 100);
    const efficiencyScore = (routeCount > 0 ? totalCost / routeCount : 0) * (optimizationCriteria.distance_weight / 100);
    
    const totalScore = costScore + serviceScore + efficiencyScore;
    
    return {
      city,
      score: totalScore,
      total_cost: totalCost,
      route_count: routeCount,
      avg_cost_per_route: routeCount > 0 ? totalCost / routeCount : 0
    };
  }).sort((a, b) => b.score - a.score);
}

function selectOptimalCities(cityScores: any[], facilityRequirements: number, scenarioType: string) {
  // Ensure we don't exceed available cities
  const maxFacilities = Math.min(facilityRequirements, cityScores.length);
  
  if (scenarioType.includes('lowest_cost')) {
    // For cost optimization, prefer fewer, high-volume facilities
    return cityScores.slice(0, Math.max(1, Math.min(maxFacilities, 3))).map(c => c.city);
  } else if (scenarioType.includes('best_service')) {
    // For service optimization, distribute facilities more broadly
    return cityScores.slice(0, maxFacilities).map(c => c.city);
  } else if (scenarioType.includes('lowest_miles')) {
    // For mileage optimization, select geographically distributed facilities
    return selectGeographicallyDistributed(cityScores, maxFacilities);
  } else {
    // Balanced approach
    return cityScores.slice(0, Math.min(maxFacilities, 4)).map(c => c.city);
  }
}

function selectGeographicallyDistributed(cityScores: any[], maxFacilities: number): string[] {
  // Simple geographic distribution - in production this would use actual coordinates
  const selected = [cityScores[0].city]; // Start with highest scoring city
  
  for (let i = 1; i < cityScores.length && selected.length < maxFacilities; i++) {
    const candidate = cityScores[i].city;
    
    // Check if candidate is sufficiently different from already selected cities
    const isDifferent = selected.every(selectedCity => {
      // Simple string distance check - in production use actual geographic distance
      return !candidate.includes(selectedCity.split(',')[0]) && 
             !selectedCity.includes(candidate.split(',')[0]);
    });
    
    if (isDifferent) {
      selected.push(candidate);
    }
  }
  
  return selected;
}

function findCoverageArea(city: string, allCities: string[], routes: any[]): string[] {
  // Find cities that this facility would serve based on existing routes
  const connectedCities = routes
    .filter(r => r.origin === city || r.destination === city)
    .map(r => r.origin === city ? r.destination : r.origin)
    .filter(c => c !== city && c !== 'Unknown Origin' && c !== 'Unknown Destination' && c !== 'Various Destinations');
  
  return [...new Set(connectedCities)].slice(0, 10); // Limit to top 10 for readability
}

function calculateFacilitySavings(city: string, cityRoutes: any[], scenarioType: string): number {
  const totalRouteCost = cityRoutes.reduce((sum, r) => sum + (r.cost || 0), 0);
  
  // Calculate savings based on scenario type
  let savingsRate = 0.15; // Base 15% savings
  
  if (scenarioType.includes('lowest_cost')) {
    savingsRate = 0.25; // 25% savings for cost-focused
  } else if (scenarioType.includes('best_service')) {
    savingsRate = 0.10; // 10% savings but better service
  } else if (scenarioType.includes('lowest_miles')) {
    savingsRate = 0.20; // 20% savings from mileage reduction
  }
  
  return totalRouteCost * savingsRate;
}

function calculateServiceImprovement(city: string, coverageArea: string[], scenarioType: string): number {
  const baseCoverage = coverageArea.length;
  
  if (scenarioType.includes('best_service')) {
    return 25 + (baseCoverage * 2); // High service improvement
  } else if (scenarioType.includes('lowest_miles')) {
    return 15 + baseCoverage; // Moderate improvement from reduced distance
  } else {
    return 10 + baseCoverage; // Standard improvement
  }
}

function optimizeRoutes(
  routes: any[],
  facilities: any[],
  scenarioType: string,
  optimizationCriteria: any
) {
  const optimizedRoutes = [];
  let totalSavings = 0;

  for (const route of routes) {
    // Find the best facility to serve this route
    const bestFacility = findBestFacilityForRoute(route, facilities, scenarioType);
    
    if (bestFacility) {
      const optimizedCost = calculateOptimizedRouteCost(route, bestFacility, scenarioType);
      const savings = route.cost - optimizedCost;
      totalSavings += savings;

      optimizedRoutes.push({
        origin: route.origin,
        destination: route.destination,
        transport_mode: route.transport_mode,
        baseline_cost: route.cost,
        optimized_cost: optimizedCost,
        savings,
        volume: route.cost, // Use cost as proxy for volume
        frequency: route.frequency || 1
      });
    }
  }

  return {
    optimized_routes: optimizedRoutes,
    total_savings: Math.round(totalSavings)
  };
}

function findBestFacilityForRoute(route: any, facilities: any[], scenarioType: string) {
  // Find facility that best serves this route based on coverage area
  return facilities.find(facility => 
    facility.coverage_area.includes(route.origin) || 
    facility.coverage_area.includes(route.destination) ||
    facility.city === route.origin ||
    facility.city === route.destination
  ) || facilities[0]; // Fallback to first facility
}

function calculateOptimizedRouteCost(route: any, facility: any, scenarioType: string): number {
  let optimizationFactor = 0.85; // Base 15% improvement
  
  if (scenarioType.includes('lowest_cost')) {
    optimizationFactor = 0.75; // 25% cost reduction
  } else if (scenarioType.includes('best_service')) {
    optimizationFactor = 0.90; // 10% cost reduction (focus on service)
  } else if (scenarioType.includes('lowest_miles')) {
    optimizationFactor = 0.80; // 20% cost reduction from shorter routes
  }
  
  return Math.round(route.cost * optimizationFactor);
}

function generateYearlyProjections(baselineCost: number, annualSavings: number, scenarioType: string) {
  const projections = [];
  let cumulativeSavings = annualSavings;
  
  for (let year = 1; year <= 5; year++) {
    // Apply growth factors and improvement over time
    const volumeGrowth = 0.05 + (Math.random() * 0.03); // 5-8% annual growth
    const efficiencyImprovement = year * 0.02; // 2% additional improvement per year
    
    const yearCost = baselineCost * Math.pow(1 + volumeGrowth, year);
    const yearSavings = cumulativeSavings * (1 + efficiencyImprovement);
    
    const actions = [];
    if (year === 1) actions.push('Implement new facility configuration');
    if (year === 2) actions.push('Optimize route efficiency');
    if (year === 3) actions.push('Technology integration improvements');
    if (year === 4) actions.push('Process refinement and automation');
    if (year === 5) actions.push('Strategic expansion planning');

    projections.push({
      year: 2024 + year,
      total_cost: Math.round(yearCost - yearSavings),
      savings_vs_baseline: Math.round(yearSavings),
      volume_growth: Math.round(volumeGrowth * 100 * 10) / 10,
      recommended_actions: actions
    });
    
    cumulativeSavings = yearSavings;
  }
  
  return projections;
}

function analyzeBestCombination(facilities: any[], routeOptimization: any, baselineCost: number) {
  const totalInvestment = facilities.reduce((sum, f) => sum + f.annual_cost, 0);
  const annualSavings = routeOptimization.total_savings + 
                       facilities.reduce((sum, f) => sum + f.cost_savings, 0);
  
  const paybackPeriod = totalInvestment / annualSavings;
  const roiPercentage = (annualSavings / totalInvestment) * 100;

  return {
    optimal_facilities: facilities.map(f => f.city),
    total_investment: Math.round(totalInvestment),
    annual_savings: Math.round(annualSavings),
    payback_period: Math.round(paybackPeriod * 10) / 10,
    roi_percentage: Math.round(roiPercentage * 10) / 10
  };
}

function generateRecommendations(results: DynamicOptimizationResult[], extractedData: any): string[] {
  const recommendations = [];
  
  // Find best performing scenario
  const bestResult = results.reduce((best, current) => 
    current.optimization_summary.savings_percentage > best.optimization_summary.savings_percentage ? current : best
  );

  recommendations.push(`Recommend ${bestResult.scenario_type} approach with ${bestResult.optimization_summary.savings_percentage}% savings`);
  recommendations.push(`Optimal facility count: ${bestResult.facility_recommendations.length} facilities`);
  recommendations.push(`Primary hubs: ${bestResult.best_combination_analysis.optimal_facilities.join(', ')}`);
  
  const avgPayback = results.reduce((sum, r) => sum + r.best_combination_analysis.payback_period, 0) / results.length;
  recommendations.push(`Average payback period: ${Math.round(avgPayback * 10) / 10} years`);
  
  if (extractedData.primary_facilities.length > 0) {
    recommendations.push(`Leverage existing facilities: ${extractedData.primary_facilities.slice(0, 3).join(', ')}`);
  }
  
  return recommendations;
}
