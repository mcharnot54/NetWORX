import { NextRequest, NextResponse } from 'next/server';
import {
  OptimizationConfig,
  ForecastRow,
  SKU,
  IntegratedRunResult,
  DemandMap,
  CapacityMap,
  CostMatrix
} from '@/types/advanced-optimization';
import { optimizeTransportMultiYear } from '@/lib/optimization/transportMultiYear';

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting batch scenario optimization...');
    
    const body = await req.json();
    const { 
      scenario, 
      config, 
      forecast, 
      skus, 
      candidateFacilities,
      destinations,
      ...payloadRest 
    } = body;

    // Validate scenario parameters
    const minNodes = Math.max(1, scenario?.minNodes || 1);
    const maxNodes = Math.max(minNodes, scenario?.maxNodes || 5);
    const step = Math.max(1, scenario?.step || 1);
    const criterion = scenario?.criterion || 'total_cost';

    console.log(`📊 Batch parameters: ${minNodes}-${maxNodes} nodes, step=${step}, criterion=${criterion}`);

    // Get baseline transportation data
    let actualTransportBaseline = 6560000; // Default $6.56M
    try {
      const baselineResponse = await fetch('http://localhost:3000/api/analyze-transport-baseline-data');
      const baselineData = await baselineResponse.json();
      if (baselineData.success) {
        actualTransportBaseline = baselineData.baseline_summary.total_verified;
      }
    } catch (error) {
      console.warn('Using default baseline cost due to API error:', error);
    }

    // Default configuration if not provided
    const defaultConfig: OptimizationConfig = {
      optimization: {
        solver: 'JSLP_SOLVER',
        weights: { cost: 0.6, utilization: 0.1, service_level: 0.3 }
      },
      warehouse: {
        operating_days: 260,
        DOH: 14,
        pallet_length_inches: 48,
        pallet_width_inches: 40,
        ceiling_height_inches: 432,
        rack_height_inches: 96,
        aisle_factor: 0.35,
        outbound_pallets_per_door_per_day: 480,
        inbound_pallets_per_door_per_day: 480,
        max_outbound_doors: 15,
        max_inbound_doors: 12,
        outbound_area_per_door: 4000,
        inbound_area_per_door: 4000,
        min_office: 5000,
        min_battery: 3000,
        min_packing: 6000,
        max_utilization: 0.85,
        initial_facility_area: 352000,
        case_pick_area_fixed: 24000,
        each_pick_area_fixed: 44000,
        min_conveyor: 6000,
        facility_design_area: 400000,
        cost_per_sqft_annual: 8.5,
        thirdparty_cost_per_sqft: 12.0,
        max_facilities: 8,
      },
      transportation: {
        fixed_cost_per_facility: 250000,
        cost_per_mile: 2.85,
        service_level_requirement: 0.95,
        max_distance_miles: 800,
        required_facilities: 1,
        max_facilities: 10,
        max_capacity_per_facility: 15_000_000,
        mandatory_facilities: ['Littleton, MA'],
        weights: { cost: 0.6, service_level: 0.4 }
      },
      ...config
    };

    // Default forecast and SKUs
    const defaultForecast: ForecastRow[] = forecast || [
      { year: 2025, annual_units: 13_000_000 },
      { year: 2026, annual_units: 15_600_000 },
      { year: 2027, annual_units: 18_720_000 },
    ];

    const defaultSKUs: SKU[] = skus || [
      { sku: 'Educational_Materials_A', annual_volume: 4_000_000, units_per_case: 12, cases_per_pallet: 40 },
      { sku: 'Educational_Materials_B', annual_volume: 3_500_000, units_per_case: 24, cases_per_pallet: 35 },
      { sku: 'Educational_Materials_C', annual_volume: 2_800_000, units_per_case: 18, cases_per_pallet: 42 },
    ];

    // Default candidate facilities and destinations
    const defaultCandidates = candidateFacilities || [
      'Littleton, MA', 'Chicago, IL', 'St. Louis, MO', 'Dallas, TX', 'Atlanta, GA', 
      'Los Angeles, CA', 'Phoenix, AZ', 'Denver, CO', 'Nashville, TN', 'Kansas City, MO'
    ];

    const defaultDestinations = destinations || [
      'New York, NY', 'Chicago, IL', 'Dallas, TX', 'Los Angeles, CA', 'Atlanta, GA',
      'Seattle, WA', 'Denver, CO', 'Phoenix, AZ', 'Houston, TX', 'Miami, FL',
      'Boston, MA', 'Philadelphia, PA', 'San Francisco, CA', 'Detroit, MI', 'Minneapolis, MN'
    ];

    // Dynamically import heavy optimization modules to improve startup time
    const { optimizeWarehouse } = await import('@/lib/advanced-warehouse-optimizer');
    const { optimizeTransport, generateCostMatrix } = await import('@/lib/advanced-transport-optimizer');
    const { optimizeInventory } = await import('@/lib/optimization/inventory');

    // Run warehouse optimization once (doesn't depend on node count)
    console.log('🏭 Running warehouse optimization...');
    const warehouseResult = optimizeWarehouse(
      defaultConfig,
      defaultForecast,
      defaultSKUs
    );

    // Run inventory optimization
    console.log('📦 Running inventory optimization...');
    const inventoryParams = {
      service_level: 0.95,
      lead_time_days: 14,
      holding_cost_per_unit_per_year: 2.5,
      demand_cv: 0.2,
      operating_days: defaultConfig.warehouse.operating_days
    };
    
    const inventoryResult = optimizeInventory(
      inventoryParams,
      defaultForecast,
      defaultSKUs
    );

    // Generate cost matrix
    console.log('🗺️ Generating comprehensive cost matrix...');
    const costMatrix = await generateCostMatrix(
      defaultCandidates,
      defaultDestinations,
      actualTransportBaseline
    );

    // Create demand and capacity maps
    const totalDemand = defaultForecast[0].annual_units;
    const demandPerDest = totalDemand / defaultDestinations.length;
    const demand: DemandMap = Object.fromEntries(
      defaultDestinations.map(dest => [dest, demandPerDest])
    );

    const scenarios: any[] = [];
    
    // Run transport optimization for each node count
    for (let nodes = minNodes; nodes <= maxNodes; nodes += step) {
      console.log(`🚛 Optimizing transport network: ${nodes} nodes...`);
      
      // Select top candidates based on node count
      const selectedCandidates = defaultCandidates.slice(0, Math.min(nodes + 2, defaultCandidates.length));
      
      const capacity: CapacityMap = Object.fromEntries(
        selectedCandidates.map(facility => [
          facility,
          facility === 'Littleton, MA' ? totalDemand : totalDemand * 0.8
        ])
      );

      try {
        const transportResult = optimizeTransport(
          defaultConfig.transportation,
          costMatrix,
          demand,
          capacity,
          { minFacilities: nodes, maxFacilities: nodes },
          { current_cost: actualTransportBaseline, target_savings: 40 }
        );

        // Calculate combined metrics
        const transportCost = transportResult.network_metrics.total_transportation_cost;
        const warehouseCost = warehouseResult.optimization_summary.total_annual_cost;
        const inventoryCost = inventoryResult.total_cost;
        const totalCost = transportCost + warehouseCost + inventoryCost;

        // Calculate savings
        const transportSavings = actualTransportBaseline - transportCost;
        const transportSavingsPercent = (transportSavings / actualTransportBaseline) * 100;

        scenarios.push({
          nodes,
          transport: transportResult,
          warehouse: warehouseResult,
          inventory: inventoryResult,
          kpis: {
            year1_total_cost: totalCost,
            transport_cost: transportCost,
            warehouse_cost: warehouseCost,
            inventory_cost: inventoryCost,
            service_level: transportResult.network_metrics.service_level_achievement,
            facilities_opened: transportResult.optimization_summary.facilities_opened,
            transport_savings: transportSavings,
            transport_savings_percent: transportSavingsPercent,
            avg_distance: transportResult.network_metrics.weighted_avg_distance,
            facility_utilization: transportResult.network_metrics.avg_facility_utilization,
          },
          facilities_used: transportResult.open_facilities,
        });

        console.log(`✅ ${nodes} nodes: $${Math.round(totalCost).toLocaleString()}, Service: ${(transportResult.network_metrics.service_level_achievement * 100).toFixed(1)}%`);

      } catch (error) {
        console.error(`❌ Failed to optimize ${nodes} nodes:`, error);
        scenarios.push({
          nodes,
          error: error instanceof Error ? error.message : 'Optimization failed',
          kpis: {
            year1_total_cost: Infinity,
            service_level: 0,
            facilities_opened: 0,
          },
        });
      }
    }

    // Find best scenario based on criterion
    let bestIdx = 0;
    const validScenarios = scenarios.filter(s => !s.error);
    
    if (validScenarios.length > 0) {
      if (criterion === 'service_then_cost') {
        let bestSvc = -1;
        let bestCost = Infinity;
        validScenarios.forEach((s, i) => {
          const svc = s.kpis.service_level;
          const cost = s.kpis.year1_total_cost;
          if (svc > bestSvc || (svc === bestSvc && cost < bestCost)) {
            bestSvc = svc;
            bestCost = cost;
            bestIdx = scenarios.indexOf(s);
          }
        });
      } else {
        let bestCost = Infinity;
        validScenarios.forEach((s, i) => {
          if (s.kpis.year1_total_cost < bestCost) {
            bestCost = s.kpis.year1_total_cost;
            bestIdx = scenarios.indexOf(s);
          }
        });
      }
    }

    const response = {
      success: true,
      batch_summary: {
        scenarios_run: scenarios.length,
        successful_scenarios: validScenarios.length,
        failed_scenarios: scenarios.length - validScenarios.length,
        best_scenario_nodes: scenarios[bestIdx]?.nodes,
        best_scenario_cost: scenarios[bestIdx]?.kpis?.year1_total_cost,
        cost_range: validScenarios.length > 0 ? {
          min: Math.min(...validScenarios.map(s => s.kpis.year1_total_cost)),
          max: Math.max(...validScenarios.map(s => s.kpis.year1_total_cost)),
        } : null,
      },
      warehouse: warehouseResult,
      inventory: inventoryResult,
      scenarios,
      best: scenarios[bestIdx],
      baseline_integration: {
        transport_baseline: actualTransportBaseline,
        best_transport_cost: scenarios[bestIdx]?.kpis?.transport_cost,
        best_savings_percent: scenarios[bestIdx]?.kpis?.transport_savings_percent,
      }
    };

    console.log(`🎉 Batch optimization complete: ${validScenarios.length}/${scenarios.length} scenarios successful`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Batch optimization failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Batch run error',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}
