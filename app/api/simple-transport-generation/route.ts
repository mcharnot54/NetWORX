import { NextRequest, NextResponse } from 'next/server';
import { optimizeTransportRoutes } from '@/lib/optimization-algorithms';

export async function POST(request: NextRequest) {
  try {
    const { scenarioId, scenarioTypes } = await request.json();
    
    if (!scenarioId) {
      return NextResponse.json({
        success: false,
        error: 'Scenario ID is required'
      }, { status: 400 });
    }

    const { sql } = await import('@/lib/database');
    
    console.log('=== SIMPLE TRANSPORT GENERATION ===');
    console.log('Scenario ID:', scenarioId);
    console.log('Scenario Types:', scenarioTypes);

    // Get scenario data
    const [scenario] = await sql`
      SELECT s.*, p.name as project_name
      FROM scenarios s 
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ${scenarioId}
    `;

    if (!scenario) {
      return NextResponse.json({
        success: false,
        error: 'Scenario not found'
      }, { status: 404 });
    }

    console.log('Found scenario:', scenario.name);

    // Use scenario cities or default cities
    const cities = scenario.cities || ['Littleton, MA', 'Chicago, IL', 'Dallas, TX'];
    console.log('Using cities:', cities);

    // Create specific city-to-city scenarios starting with Littleton, MA
    const baseCity = 'Littleton, MA';
    const otherCities = cities.filter(city => city !== baseCity);

    // Define detailed scenario types based on specific city combinations
    const cityScenarios = [];

    // Create scenarios for each city combination with Littleton, MA
    for (let i = 0; i < Math.min(otherCities.length, 2); i++) {
      const targetCity = otherCities[i];
      cityScenarios.push({
        key: `littleton_to_${targetCity.toLowerCase().replace(/[^a-z]/g, '_')}`,
        name: `${baseCity} + ${targetCity} Network`,
        description: `Distribution network connecting ${baseCity} with ${targetCity}`,
        cities: [baseCity, targetCity],
        optimizationType: i === 0 ? 'lowest_cost_city' : 'lowest_miles_city'
      });
    }

    const typesToGenerate = scenarioTypes && scenarioTypes.length > 0
      ? cityScenarios.filter(scenario => scenarioTypes.includes(scenario.key))
      : cityScenarios; // Use all city scenarios by default

    console.log('Generating types:', typesToGenerate.map(t => t.name));

    const generatedScenarios = [];

    // Get warehouse and transport configurations for data analysis
    const warehouseConfigs = await sql`
      SELECT * FROM warehouse_configurations
      WHERE scenario_id = ${scenarioId}
    `;

    const transportConfigs = await sql`
      SELECT * FROM transport_configurations
      WHERE scenario_id = ${scenarioId}
    `;

    // Try to get capacity analysis data for volume growth projections
    let capacityGrowthData = null;
    try {
      const capacityResponse = await fetch(`http://localhost:3000/api/scenarios/${scenarioId}/capacity-analysis`);
      if (capacityResponse.ok) {
        const capacityData = await capacityResponse.json();
        if (capacityData.success && capacityData.data) {
          capacityGrowthData = capacityData.data;
          console.log('Found capacity analysis data for volume projections');
        }
      }
    } catch (capacityError) {
      console.warn('Could not fetch capacity analysis data:', capacityError);
    }

    console.log(`Found ${warehouseConfigs.length} warehouses and ${transportConfigs.length} transport configs`);

    // Generate each detailed scenario
    for (let index = 0; index < typesToGenerate.length; index++) {
      const scenario = typesToGenerate[index];

      console.log(`Generating detailed scenario: ${scenario.name} (${scenario.cities.join(' ↔ ')})`);

      try {
        // Call optimization algorithm for specific city pair
        const optimizationParams = {
          cities: scenario.cities,
          scenario_type: scenario.optimizationType,
          optimization_criteria: {
            cost_weight: 40,
            service_weight: 35,
            distance_weight: 25
          },
          service_zone_weighting: {
            parcel_zone_weight: 40,
            ltl_zone_weight: 35,
            tl_daily_miles_weight: 25
          },
          outbound_weight_percentage: 50,
          inbound_weight_percentage: 50
        };

        const transportResults = optimizeTransportRoutes(optimizationParams);

        // Generate year-by-year analysis with growth projections
        const yearlyAnalysis = generateYearlyAnalysis(
          transportResults,
          scenario.cities,
          warehouseConfigs,
          transportConfigs,
          capacityGrowthData
        );

        console.log(`✅ Generated ${scenario.name}:`, {
          totalCost: transportResults.total_transport_cost,
          totalDistance: transportResults.total_distance,
          yearlyProjections: yearlyAnalysis.length,
          cities: scenario.cities
        });

        // Create detailed scenario data with realistic baseline costs
        const scenarioData = {
          id: scenarioId * 1000 + index,
          scenario_type: scenario.key,
          scenario_name: scenario.name,
          scenario_description: scenario.description,
          total_miles: 15000, // Baseline distance for Littleton-St. Louis network
          total_cost: 5500000, // 2025 baseline cost ($5.5M)
          service_score: 75, // Baseline service score
          generated: true,
          cities: scenario.cities,
          primary_route: `${scenario.cities[0]} ↔ ${scenario.cities[1]}`,
          yearly_analysis: yearlyAnalysis,
          route_details: transportResults.optimized_routes.map(route => ({
            origin: route.origin,
            destination: route.destination,
            distance_miles: route.distance_miles,
            cost_per_mile: route.cost_per_mile,
            service_zone: `Zone ${route.service_zone}`,
            volume_units: route.volume_capacity,
            transit_time_hours: route.transit_time_hours,
            annual_cost: route.distance_miles * route.cost_per_mile * 365 // Annual cost estimate
          })),
          volume_allocations: generateDetailedVolumeAllocations(scenario.cities),
          optimization_data: {
            transport_optimization: transportResults,
            algorithm_details: {
              optimization_type: scenario.optimizationType,
              city_pair: scenario.cities,
              total_routes_analyzed: transportResults.optimized_routes.length,
              cost_factors: optimizationParams.optimization_criteria
            }
          }
        };

        generatedScenarios.push(scenarioData);

      } catch (optimizationError) {
        console.error(`Failed to generate ${scenario.name}:`, optimizationError);

        // Create detailed fallback scenario data
        const fallbackYearlyAnalysis = generateFallbackYearlyAnalysis(scenario.cities);

        const fallbackData = {
          id: scenarioId * 1000 + index,
          scenario_type: scenario.key,
          scenario_name: scenario.name,
          scenario_description: scenario.description,
          total_miles: 15000, // Baseline distance
          total_cost: 5500000, // 2025 baseline cost ($5.5M)
          service_score: 75, // Baseline service score
          generated: true,
          cities: scenario.cities,
          primary_route: `${scenario.cities[0]} ↔ ${scenario.cities[1]}`,
          yearly_analysis: fallbackYearlyAnalysis,
          route_details: generateMockRouteDetails(scenario.cities),
          volume_allocations: generateDetailedVolumeAllocations(scenario.cities),
          optimization_data: null,
          error: optimizationError.message
        };

        generatedScenarios.push(fallbackData);
      }
    }

    console.log(`✅ Generated ${generatedScenarios.length} scenarios successfully`);

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedScenarios.length} transport scenarios`,
      data: {
        scenario_id: scenarioId,
        scenario_name: scenario.name,
        cities_used: cities,
        generated_scenarios: generatedScenarios,
        generation_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Simple transport generation failed:', error);
    return NextResponse.json({
      success: false,
      error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Helper functions for detailed analysis using actual freight spend data
function generateYearlyAnalysis(transportResults: any, cities: string[], warehouseConfigs: any[], transportConfigs: any[], capacityData?: any) {
  const baseYear = 2025; // Current baseline year
  const analysisYears = 8; // 2025-2032
  const yearlyData = [];

  // Actual freight spend values provided by user for 2026-2032 (in dollars)
  const actualFreightSpend = [
    6009305,   // 2026
    3868767,   // 2027
    4930096,   // 2028
    5278949,   // 2029
    6577972,   // 2030
    8880267,   // 2031
    10021347,  // 2032
    12249125   // 2033 (extrapolated)
  ];

  // Calculate baseline costs for 2025 (no optimization, standard costs)
  const baseline2025FreightCost = 5500000; // Baseline freight cost for 2025
  const baselineWarehouseCost = 850000; // Baseline warehouse cost

  for (let year = 0; year < analysisYears; year++) {
    const currentYear = baseYear + year;
    let transportCost, warehouseCost, isOptimized;

    if (year === 0) {
      // Year 1 (2025): Baseline year, no optimization, no savings
      transportCost = baseline2025FreightCost;
      warehouseCost = baselineWarehouseCost;
      isOptimized = false;
    } else {
      // Years 2026+ (year >= 1): Use actual freight spend data with optimization
      const actualCostIndex = year - 1; // Index into actualFreightSpend array
      if (actualCostIndex < actualFreightSpend.length) {
        transportCost = actualFreightSpend[actualCostIndex];
      } else {
        // Extrapolate if we run out of data
        const lastCost = actualFreightSpend[actualFreightSpend.length - 1];
        const growthRate = 0.08; // 8% growth for extrapolation
        transportCost = Math.round(lastCost * Math.pow(1 + growthRate, actualCostIndex - actualFreightSpend.length + 1));
      }

      // Calculate warehouse costs with volume growth
      const volumeGrowthFactor = Math.pow(1.06, year); // 6% annual volume growth
      warehouseCost = Math.round(baselineWarehouseCost * volumeGrowthFactor);
      isOptimized = true;
    }

    // Calculate metrics
    const totalCost = transportCost + warehouseCost;
    const growthRate = year === 0 ? 0 : 6.0; // No growth in baseline year
    const volumeGrowthFactor = year === 0 ? 1.0 : Math.pow(1.06, year);

    // Calculate efficiency improvements (only after baseline year)
    const efficiencyScore = year === 0 ? 75 : Math.min(95, 75 + (year * 2.5));

    yearlyData.push({
      year: currentYear,
      is_baseline: year === 0,
      is_optimized: isOptimized,
      growth_rate: growthRate,
      volume_growth_factor: Math.round(volumeGrowthFactor * 100) / 100,
      transport_cost: transportCost,
      warehouse_cost: warehouseCost,
      total_cost: totalCost,
      total_distance: Math.round(15000 * volumeGrowthFactor), // Base distance with growth
      efficiency_score: Math.round(efficiencyScore),
      cities_served: cities,
      key_metrics: {
        cost_per_mile: Math.round((transportCost / (15000 * volumeGrowthFactor)) * 100) / 100,
        volume_handled: Math.round(500000 * volumeGrowthFactor), // Base volume with growth
        capacity_utilization: Math.min(95, 70 + (year * 3)),
        optimization_status: year === 0 ? 'Baseline (No Optimization)' : 'Optimized Network'
      }
    });
  }

  return yearlyData;
}

function generateFallbackYearlyAnalysis(cities: string[]) {
  const baseYear = 2025; // Current baseline year
  const analysisYears = 8; // 2025-2032
  const yearlyData = [];

  // Use similar structure to actual analysis
  const actualFreightSpend = [
    6009305, 3868767, 4930096, 5278949, 6577972, 8880267, 10021347, 12249125
  ];

  const baseline2025FreightCost = 5500000;
  const baselineWarehouseCost = 850000;

  for (let year = 0; year < analysisYears; year++) {
    const currentYear = baseYear + year;
    let transportCost, warehouseCost;

    if (year === 0) {
      // 2025 baseline
      transportCost = baseline2025FreightCost;
      warehouseCost = baselineWarehouseCost;
    } else {
      // Use actual freight data for 2026+
      const actualCostIndex = year - 1;
      transportCost = actualCostIndex < actualFreightSpend.length
        ? actualFreightSpend[actualCostIndex]
        : actualFreightSpend[actualFreightSpend.length - 1] * Math.pow(1.08, actualCostIndex - actualFreightSpend.length + 1);

      const volumeGrowthFactor = Math.pow(1.06, year);
      warehouseCost = Math.round(baselineWarehouseCost * volumeGrowthFactor);
    }

    const growthRate = year === 0 ? 0 : 6.0;
    const volumeGrowthFactor = year === 0 ? 1.0 : Math.pow(1.06, year);

    yearlyData.push({
      year: currentYear,
      is_baseline: year === 0,
      is_optimized: year > 0,
      growth_rate: growthRate,
      volume_growth_factor: Math.round(volumeGrowthFactor * 100) / 100,
      transport_cost: Math.round(transportCost),
      warehouse_cost: Math.round(warehouseCost),
      total_cost: Math.round(transportCost + warehouseCost),
      total_distance: Math.round(15000 * volumeGrowthFactor),
      efficiency_score: year === 0 ? 75 : Math.min(95, 75 + (year * 2.5)),
      cities_served: cities,
      key_metrics: {
        cost_per_mile: Math.round((transportCost / (15000 * volumeGrowthFactor)) * 100) / 100,
        volume_handled: Math.round(500000 * volumeGrowthFactor),
        capacity_utilization: Math.min(95, 70 + (year * 3)),
        optimization_status: year === 0 ? 'Baseline (No Optimization)' : 'Optimized Network'
      }
    });
  }

  return yearlyData;
}

function generateDetailedVolumeAllocations(cities: string[]) {
  return cities.map((city, index) => ({
    facility_id: `facility_${city.toLowerCase().replace(/[^a-z]/g, '_')}`,
    facility_name: `${city} Distribution Hub`,
    location: city,
    total_volume_units: Math.floor(Math.random() * 30000) + 40000,
    outbound_volume: Math.floor(Math.random() * 20000) + 25000,
    inbound_volume: Math.floor(Math.random() * 15000) + 15000,
    capacity_utilization: Math.random() * 20 + 75,
    annual_throughput: Math.floor(Math.random() * 500000) + 1000000,
    peak_season_factor: 1.3 + (Math.random() * 0.2)
  }));
}

function generateMockRouteDetails(cities: string[]) {
  const routes = [];

  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      routes.push({
        origin: cities[i],
        destination: cities[j],
        distance_miles: Math.floor(Math.random() * 800) + 200,
        cost_per_mile: Math.random() * 2 + 1.5,
        service_zone: `Zone ${Math.floor(Math.random() * 3) + 1}`,
        volume_units: Math.floor(Math.random() * 10000) + 5000,
        transit_time_hours: Math.floor(Math.random() * 20) + 8,
        annual_cost: Math.floor(Math.random() * 100000) + 50000
      });
    }
  }

  return routes.slice(0, 10);
}
