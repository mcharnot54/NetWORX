import { NextRequest, NextResponse } from 'next/server';
import { OptimizationResultService, ScenarioService, WarehouseConfigService, TransportConfigService, AuditLogService } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(scenarioId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID' },
        { status: 400 }
      );
    }

    const { result_type, optimization_params } = body;

    // Create optimization result record
    const optimizationRunId = uuidv4();
    const optimizationResult = await OptimizationResultService.createOptimizationResult({
      scenario_id: scenarioId,
      result_type: result_type || 'combined',
      optimization_run_id: optimizationRunId,
      status: 'running',
      results_data: {},
      performance_metrics: {},
      recommendations: {}
    });

    // Log the action
    await AuditLogService.logAction({
      scenario_id: scenarioId,
      action: 'start_optimization',
      entity_type: 'optimization_result',
      entity_id: optimizationResult.id,
      details: { result_type, optimization_run_id: optimizationRunId }
    });

    // Start optimization process (simulate async processing)
    setTimeout(async () => {
      try {
        // Get scenario configuration
        const [scenario, warehouseConfigs, transportConfigs] = await Promise.all([
          ScenarioService.getScenario(scenarioId),
          WarehouseConfigService.getWarehouseConfigs(scenarioId),
          TransportConfigService.getTransportConfigs(scenarioId)
        ]);

        // Simulate optimization calculations
        const results = await simulateOptimization({
          scenario,
          warehouseConfigs,
          transportConfigs,
          optimization_params
        });

        // Update the optimization result
        await OptimizationResultService.updateOptimizationResult(optimizationResult.id, {
          status: 'completed',
          completed_at: new Date(),
          execution_time_seconds: Math.floor(Math.random() * 60) + 10, // 10-70 seconds
          total_cost: results.totalCost,
          cost_savings: results.costSavings,
          efficiency_score: results.efficiencyScore,
          results_data: results.detailedResults,
          performance_metrics: results.metrics,
          recommendations: results.recommendations
        });

        // Update scenario status
        await ScenarioService.updateScenario(scenarioId, {
          status: 'completed'
        });

        // Log completion
        await AuditLogService.logAction({
          scenario_id: scenarioId,
          action: 'complete_optimization',
          entity_type: 'optimization_result',
          entity_id: optimizationResult.id,
          details: { total_cost: results.totalCost, cost_savings: results.costSavings }
        });

      } catch (error) {
        console.error('Optimization failed:', error);
        
        // Update result status to failed
        await OptimizationResultService.updateOptimizationResult(optimizationResult.id, {
          status: 'failed',
          completed_at: new Date()
        });

        // Update scenario status
        await ScenarioService.updateScenario(scenarioId, {
          status: 'failed'
        });
      }
    }, 1000); // Start processing after 1 second

    return NextResponse.json({
      success: true,
      data: {
        optimization_run_id: optimizationRunId,
        result_id: optimizationResult.id,
        status: 'running',
        message: 'Optimization started successfully'
      }
    });
  } catch (error) {
    console.error('Error starting optimization:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start optimization' },
      { status: 500 }
    );
  }
}

async function simulateOptimization({ scenario, warehouseConfigs, transportConfigs, optimization_params }: any) {
  // Simulate complex optimization calculations
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000)); // 2-5 seconds

  console.log('Optimization params received:', optimization_params);

  // Extract cities and optimization type from params
  const cities = optimization_params?.cities || ['Littleton, MA', 'Chicago, IL'];
  const optimizationType = optimization_params?.optimization_type || 'transport';
  const scenarioType = optimization_params?.scenario_type || 'lowest_cost_city';

  console.log('Processing optimization for cities:', cities, 'type:', optimizationType, 'scenario:', scenarioType);

  const warehouseCosts = warehouseConfigs.reduce((total: number, config: any) => {
    return total + config.fixed_costs + (config.max_capacity * config.variable_cost_per_unit * 0.8);
  }, 0);

  const transportCosts = transportConfigs.reduce((total: number, config: any) => {
    return total + (config.base_freight_cost || 0) + ((config.distance || 0) * (config.fuel_cost_per_km || 0));
  }, 0);

  // Generate transport optimization data based on cities
  const generateTransportDataForCities = (cities: string[]) => {
    const routes = [];
    const baseCostPerMile = scenarioType.includes('cost') ? 1.5 : 2.0;
    const efficiencyMultiplier = scenarioType.includes('service') ? 1.2 : 1.0;

    // Generate routes between cities
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const origin = cities[i];
        const destination = cities[j];
        const distance = Math.floor(Math.random() * 800) + 200; // 200-1000 miles
        const baseCost = distance * baseCostPerMile;

        routes.push({
          route_id: `route_${i}_${j}`,
          origin,
          destination,
          distance_miles: distance,
          original_cost: baseCost,
          optimized_cost: baseCost * (0.8 + Math.random() * 0.15) * efficiencyMultiplier,
          time_savings: Math.random() * 5 + 2, // 2-7 hours
          volume_capacity: Math.floor(Math.random() * 10000) + 5000
        });
      }
    }

    const totalTransportCost = routes.reduce((sum, route) => sum + route.optimized_cost, 0);
    const totalDistance = routes.reduce((sum, route) => sum + route.distance_miles, 0);

    return {
      total_transport_cost: totalTransportCost,
      total_distance: totalDistance,
      route_efficiency: Math.min(95, 75 + Math.random() * 20),
      optimized_routes: routes,
      cities_served: cities,
      scenario_type: scenarioType
    };
  };

  const transportData = generateTransportDataForCities(cities);
  const totalCost = warehouseCosts + transportData.total_transport_cost;
  const originalCost = totalCost * 1.3; // Assume 30% improvement
  const costSavings = originalCost - totalCost;
  const efficiencyScore = Math.min(95, 60 + Math.random() * 35); // 60-95% efficiency

  const detailedResults = {
    warehouse_optimization: {
      total_warehouse_cost: warehouseCosts,
      average_utilization: 75 + Math.random() * 20, // 75-95%
      recommended_capacity_adjustments: warehouseConfigs.map((config: any, index: number) => ({
        warehouse_id: config.id,
        current_capacity: config.max_capacity,
        recommended_capacity: Math.floor(config.max_capacity * (0.9 + Math.random() * 0.2)),
        utilization_improvement: Math.random() * 15 + 5 // 5-20%
      }))
    },
    transport_optimization: transportData,
    overall_metrics: {
      total_cost: totalCost,
      cost_per_unit: totalCost / Math.max(1, warehouseConfigs.reduce((sum: number, config: any) => sum + config.max_capacity, 0)),
      carbon_footprint_reduction: Math.random() * 25 + 10, // 10-35%
      service_level_improvement: Math.random() * 15 + 5, // 5-20%
      cities_analyzed: cities.length,
      routes_optimized: transportData.optimized_routes.length
    }
  };

  const metrics = {
    processing_time_seconds: Math.floor(Math.random() * 60) + 10,
    data_points_analyzed: warehouseConfigs.length + transportConfigs.length + cities.length,
    optimization_iterations: Math.floor(Math.random() * 50) + 25,
    convergence_rate: Math.random() * 0.1 + 0.9, // 90-100%
    confidence_score: Math.random() * 0.2 + 0.8, // 80-100%
    cities_processed: cities.length
  };

  const recommendations = {
    priority_actions: [
      `Optimize transport routes between ${cities.length} cities: ${cities.join(', ')}`,
      'Implement recommended capacity adjustments for high-utilization warehouses',
      `Focus on ${scenarioType.replace(/_/g, ' ')} optimization strategy`,
      'Consider automation upgrades for warehouses with manual operations'
    ],
    cost_reduction_opportunities: [
      {
        category: 'Warehouse Operations',
        potential_savings: costSavings * 0.6,
        implementation_effort: 'Medium',
        timeframe: '3-6 months'
      },
      {
        category: 'Transportation',
        potential_savings: costSavings * 0.4,
        implementation_effort: 'Low',
        timeframe: '1-3 months',
        cities_affected: cities
      }
    ],
    performance_improvements: {
      expected_efficiency_gain: efficiencyScore - 60,
      roi_projection: {
        investment_required: costSavings * 0.2,
        annual_savings: costSavings,
        payback_period_months: Math.floor((costSavings * 0.2) / (costSavings / 12))
      },
      geographic_coverage: cities
    }
  };

  return {
    totalCost,
    costSavings,
    efficiencyScore,
    detailedResults,
    metrics,
    recommendations
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    
    if (isNaN(scenarioId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID' },
        { status: 400 }
      );
    }

    const results = await OptimizationResultService.getOptimizationResults(scenarioId);
    
    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching optimization results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch optimization results' },
      { status: 500 }
    );
  }
}
