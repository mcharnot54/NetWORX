import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the comprehensive transport baseline (uses correct $2.9M UPS amount)
    const { getBaseUrl } = await import('@/lib/url');
    const baseUrl = getBaseUrl(request);
    const transportResponse = await fetch(`${baseUrl}/api/calculate-transport-baseline`);
    
    if (!transportResponse.ok) {
      throw new Error('Failed to get transport baseline');
    }
    
    const transportData = await transportResponse.json();
    
    if (!transportData.success) {
      throw new Error('Transport baseline calculation failed');
    }

    // Build corrected baseline costs using the proper transport amounts
    const baselineCosts = {
      warehouse_costs: {
        operating_costs_other: 0,
        total_labor_costs: 0,
        rent_and_overhead: 0
      },
      transport_costs: {
        freight_costs: transportData.total_transport_baseline || 0
      },
      inventory_costs: {
        total_inventory_costs: 0
      },
      total_baseline: transportData.total_transport_baseline || 0,
      transport_breakdown: {
        ups_parcel: transportData.transport_totals?.ups_parcel?.amount || 0,
        rl_ltl: transportData.transport_totals?.rl_ltl?.amount || 0,
        tl_costs: transportData.transport_totals?.tl_costs?.amount || 0
      },
      data_sources: [{
        type: 'corrected_transport_calculation',
        source: 'comprehensive_calculator',
        ups_status: transportData.transport_totals?.ups_parcel?.status,
        rl_status: transportData.transport_totals?.rl_ltl?.status,
        tl_status: transportData.transport_totals?.tl_costs?.status,
        files_analyzed: transportData.files_analyzed?.length || 0
      }],
      scenarios_analyzed: 1
    };

    return NextResponse.json({
      success: true,
      baseline_costs: formatBaselineCosts(baselineCosts),
      transport_details: transportData.transport_totals,
      metadata: {
        scenarios_analyzed: 1,
        data_sources: baselineCosts.data_sources,
        last_updated: new Date().toISOString(),
        data_quality: baselineCosts.total_baseline > 0 ? 'Using corrected transport amounts' : 'No data found',
        note: 'Using $2.9M corrected UPS amount from comprehensive calculator'
      }
    });

  } catch (error) {
    console.error('Error creating corrected baseline costs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to format baseline costs for display
function formatBaselineCosts(baselineCosts: any) {
  const formatCost = (cost: number) => ({
    raw: cost,
    formatted: cost > 1000000
      ? `$${(cost / 1000000).toFixed(1)}M`
      : cost > 1000
        ? `$${(cost / 1000).toFixed(0)}K`
        : `$${cost.toFixed(0)}`,
    percentage: baselineCosts.total_baseline > 0
      ? ((cost / baselineCosts.total_baseline) * 100).toFixed(1)
      : '0.0'
  });

  return {
    warehouse_costs: {
      operating_costs_other: formatCost(baselineCosts.warehouse_costs.operating_costs_other),
      total_labor_costs: formatCost(baselineCosts.warehouse_costs.total_labor_costs),
      rent_and_overhead: formatCost(baselineCosts.warehouse_costs.rent_and_overhead),
      subtotal: formatCost(
        baselineCosts.warehouse_costs.operating_costs_other +
        baselineCosts.warehouse_costs.total_labor_costs +
        baselineCosts.warehouse_costs.rent_and_overhead
      )
    },
    transport_costs: {
      freight_costs: formatCost(baselineCosts.transport_costs.freight_costs)
    },
    inventory_costs: {
      total_inventory_costs: formatCost(baselineCosts.inventory_costs.total_inventory_costs)
    },
    total_baseline: formatCost(baselineCosts.total_baseline)
  };
}
