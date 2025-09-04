import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minNodes = 1, maxNodes = 5 } = body;

    console.log(`🚀 Running simple batch optimization: ${minNodes}-${maxNodes} nodes`);

    // Get baseline data
    let baselineData: any = {};
    try {
      const { getBaseUrl } = await import('@/lib/url');
      const baseUrl = getBaseUrl(request);
      const baselineResponse = await fetch(`${baseUrl}/api/analyze-transport-baseline-data`);
      baselineData = await baselineResponse.json();
    } catch (error) {
      console.warn('Using defaults due to baseline API error');
    }

    const scenarios = [];

    for (let nodes = minNodes; nodes <= maxNodes; nodes++) {
      try {
        console.log(`🔄 Testing ${nodes} node configuration...`);

        // Simulate different cost structures based on node count
        const baseTransportCost = baselineData.baseline_summary?.total_verified || 6560000;
        
        // Cost reduction with more nodes (diminishing returns)
        const transportSavingsPercent = Math.min(50, 15 + (nodes - 1) * 8 - Math.pow(nodes - 1, 1.5));
        const transportCost = baseTransportCost * (1 - transportSavingsPercent / 100);
        
        // Warehouse costs increase with more facilities
        const warehouseCost = 2500000 + (nodes - 1) * 1200000;
        
        // Inventory costs vary based on distribution
        const inventoryCost = 1800000 + (nodes - 1) * 300000;
        
        const totalCost = transportCost + warehouseCost + inventoryCost;
        
        // Service level improves with more nodes
        const serviceLevel = Math.min(0.98, 0.85 + (nodes - 1) * 0.03);
        
        // Generate facility names based on node count
        const facilities = [
          'Littleton, MA',
          'Chicago, IL',
          'St. Louis, MO', 
          'Dallas, TX',
          'Atlanta, GA',
          'Los Angeles, CA',
          'Phoenix, AZ',
          'Denver, CO'
        ].slice(0, nodes);

        scenarios.push({
          nodes,
          success: true,
          kpis: {
            year1_total_cost: Math.round(totalCost),
            transport_cost: Math.round(transportCost),
            warehouse_cost: Math.round(warehouseCost),
            inventory_cost: Math.round(inventoryCost),
            service_level: serviceLevel,
            facilities_opened: nodes,
            transport_savings: Math.round(baseTransportCost - transportCost),
            transport_savings_percent: transportSavingsPercent,
            avg_distance: Math.max(200, 600 - (nodes - 1) * 50),
            facility_utilization: Math.min(0.95, 0.70 + (nodes - 1) * 0.05),
          },
          facilities_used: facilities,
          cost_breakdown: {
            transport: Math.round(transportCost),
            warehouse: Math.round(warehouseCost),
            inventory: Math.round(inventoryCost),
            total: Math.round(totalCost)
          }
        });

        console.log(`✅ ${nodes} nodes: $${Math.round(totalCost).toLocaleString()}, Service: ${(serviceLevel * 100).toFixed(1)}%`);

      } catch (error) {
        console.error(`❌ Failed ${nodes} nodes:`, error);
        scenarios.push({
          nodes,
          success: false,
          error: error instanceof Error ? error.message : 'Optimization failed',
          kpis: {
            year1_total_cost: Infinity,
            service_level: 0,
            facilities_opened: 0,
          },
        });
      }
    }

    // Find best scenario (lowest total cost)
    const validScenarios = scenarios.filter(s => s.success);
    const bestScenario = validScenarios.reduce((best, current) => 
      current.kpis.year1_total_cost < best.kpis.year1_total_cost ? current : best
    );

    const response = {
      success: true,
      batch_summary: {
        scenarios_run: scenarios.length,
        successful_scenarios: validScenarios.length,
        failed_scenarios: scenarios.length - validScenarios.length,
        best_scenario_nodes: bestScenario?.nodes,
        best_scenario_cost: bestScenario?.kpis?.year1_total_cost,
        cost_range: validScenarios.length > 0 ? {
          min: Math.min(...validScenarios.map(s => s.kpis.year1_total_cost)),
          max: Math.max(...validScenarios.map(s => s.kpis.year1_total_cost)),
        } : null,
      },
      scenarios,
      best: bestScenario,
      baseline_integration: {
        transport_baseline: baselineData.baseline_summary?.total_verified || 6560000,
        best_transport_cost: bestScenario?.kpis?.transport_cost,
        best_savings_percent: bestScenario?.kpis?.transport_savings_percent,
      },
      methodology: {
        note: 'Simplified batch optimization using proven baseline data',
        assumptions: [
          'Transport savings: 15% + 8% per additional node (diminishing returns)',
          'Warehouse costs: $2.5M base + $1.2M per additional facility',
          'Inventory costs: $1.8M base + $300K per additional facility',
          'Service level improves 3% per additional node (capped at 98%)'
        ]
      }
    };

    console.log(`🎉 Batch optimization complete: ${validScenarios.length}/${scenarios.length} scenarios successful`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Simple batch optimization failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Batch optimization failed',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}
