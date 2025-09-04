import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { getBaseUrl } = await import('@/lib/url');
    const baseUrl = getBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/current-baseline-costs`);
    const data = await response.json();
    
    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get baseline costs',
        details: data
      });
    }

    const baseline = data.baseline_costs;
    
    return NextResponse.json({
      success: true,
      summary: {
        total_transportation_costs: baseline.transport_costs.freight_costs.raw,
        total_warehouse_costs: baseline.warehouse_costs.subtotal.raw,
        total_baseline_costs: baseline.total_baseline.raw,
        formatted_totals: {
          transportation: baseline.transport_costs.freight_costs.formatted,
          warehouse: baseline.warehouse_costs.subtotal.formatted,
          total: baseline.total_baseline.formatted
        }
      },
      extraction_status: {
        transportation_ready: baseline.transport_costs.freight_costs.raw > 0,
        warehouse_ready: baseline.warehouse_costs.subtotal.raw > 0,
        baseline_complete: baseline.total_baseline.raw > 0
      },
      metadata: data.metadata
    });

  } catch (error) {
    console.error('Error getting baseline summary:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
