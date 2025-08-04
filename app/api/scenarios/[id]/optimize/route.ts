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

  const warehouseCosts = warehouseConfigs.reduce((total: number, config: any) => {
    return total + config.fixed_costs + (config.max_capacity * config.variable_cost_per_unit * 0.8);
  }, 0);

  const transportCosts = transportConfigs.reduce((total: number, config: any) => {
    return total + (config.base_freight_cost || 0) + ((config.distance || 0) * (config.fuel_cost_per_km || 0));
  }, 0);

  const totalCost = warehouseCosts + transportCosts;
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
    transport_optimization: {
      total_transport_cost: transportCosts,
      route_efficiency: 80 + Math.random() * 15, // 80-95%
      optimized_routes: transportConfigs.map((config: any) => ({
        route_id: config.id,
        original_cost: (config.base_freight_cost || 0) + ((config.distance || 0) * (config.fuel_cost_per_km || 0)),
        optimized_cost: ((config.base_freight_cost || 0) + ((config.distance || 0) * (config.fuel_cost_per_km || 0))) * (0.8 + Math.random() * 0.15),
        time_savings: Math.random() * 5 + 2 // 2-7 hours
      }))
    },
    overall_metrics: {
      total_cost: totalCost,
      cost_per_unit: totalCost / Math.max(1, warehouseConfigs.reduce((sum: number, config: any) => sum + config.max_capacity, 0)),
      carbon_footprint_reduction: Math.random() * 25 + 10, // 10-35%
      service_level_improvement: Math.random() * 15 + 5 // 5-20%
    }
  };

  const metrics = {
    processing_time_seconds: Math.floor(Math.random() * 60) + 10,
    data_points_analyzed: warehouseConfigs.length + transportConfigs.length,
    optimization_iterations: Math.floor(Math.random() * 50) + 25,
    convergence_rate: Math.random() * 0.1 + 0.9, // 90-100%
    confidence_score: Math.random() * 0.2 + 0.8 // 80-100%
  };

  const recommendations = {
    priority_actions: [
      'Implement recommended capacity adjustments for high-utilization warehouses',
      'Optimize route scheduling to reduce fuel costs',
      'Consider automation upgrades for warehouses with manual operations',
      'Evaluate consolidation opportunities for underutilized facilities'
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
        timeframe: '1-3 months'
      }
    ],
    performance_improvements: {
      expected_efficiency_gain: efficiencyScore - 60,
      roi_projection: {
        investment_required: costSavings * 0.2,
        annual_savings: costSavings,
        payback_period_months: Math.floor((costSavings * 0.2) / (costSavings / 12))
      }
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
