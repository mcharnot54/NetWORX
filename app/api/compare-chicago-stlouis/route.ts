import { NextRequest, NextResponse } from 'next/server';
import { DemandMap, CapacityMap, TransportParams } from '@/types/advanced-optimization';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Comparing Chicago, IL vs St. Louis, MO as 2nd node...');

    // Major markets for delivery optimization
    const destinations = [
      'New York, NY',
      'Chicago, IL', 
      'Dallas, TX',
      'Los Angeles, CA',
      'Atlanta, GA',
      'Seattle, WA',
      'Denver, CO',
      'Phoenix, AZ',
      'Houston, TX',
      'Miami, FL'
    ];

    // Test both scenarios: Littleton + Chicago vs Littleton + St. Louis
    const scenarioChicago = ['Littleton, MA', 'Chicago, IL'];
    const scenarioStLouis = ['Littleton, MA', 'St. Louis, MO'];

    // Get baseline transportation cost
    const actualTransportBaseline = 6560000; // $6.56M verified baseline

    // Generate cost matrices for both scenarios
    console.log('📊 Generating cost matrix for Littleton + Chicago...');
    const costMatrixChicago = await generateCostMatrix(
      scenarioChicago, 
      destinations, 
      actualTransportBaseline
    );

    console.log('📊 Generating cost matrix for Littleton + St. Louis...');
    const costMatrixStLouis = await generateCostMatrix(
      scenarioStLouis, 
      destinations, 
      actualTransportBaseline
    );

    // Create demand map (13M units distributed across destinations)
    const totalDemand = 13_000_000;
    const demandPerDest = totalDemand / destinations.length;
    const demand: DemandMap = Object.fromEntries(
      destinations.map(dest => [dest, demandPerDest])
    );

    // Create capacity map
    const capacityChicago: CapacityMap = {
      'Littleton, MA': totalDemand,
      'Chicago, IL': totalDemand * 0.8
    };

    const capacityStLouis: CapacityMap = {
      'Littleton, MA': totalDemand, 
      'St. Louis, MO': totalDemand * 0.8
    };

    // Transportation parameters
    const transportParams: TransportParams = {
      fixed_cost_per_facility: 250000,
      cost_per_mile: 2.85,
      service_level_requirement: 0.85,  // Relaxed for feasibility
      max_distance_miles: 1200,         // Increased max distance
      required_facilities: 1,           // Minimum 1 (Littleton mandatory)
      max_facilities: 2,
      max_capacity_per_facility: 20_000_000,  // Increased capacity
      mandatory_facilities: ['Littleton, MA'],
      weights: {
        cost: 0.6,
        service_level: 0.4
      }
    };

    // Run optimization for Chicago scenario
    console.log('🚛 Optimizing transport network: Littleton + Chicago...');
    const resultChicago = optimizeTransport(
      transportParams,
      costMatrixChicago,
      demand,
      capacityChicago,
      { minFacilities: 2, maxFacilities: 2 },
      { current_cost: actualTransportBaseline, target_savings: 40 }
    );

    // Run optimization for St. Louis scenario  
    console.log('🚛 Optimizing transport network: Littleton + St. Louis...');
    const resultStLouis = optimizeTransport(
      transportParams,
      costMatrixStLouis,
      demand,
      capacityStLouis,
      { minFacilities: 2, maxFacilities: 2 },
      { current_cost: actualTransportBaseline, target_savings: 40 }
    );

    // Calculate detailed cost comparison
    const chicagoTotalCost = resultChicago.network_metrics.total_transportation_cost;
    const stLouisTotalCost = resultStLouis.network_metrics.total_transportation_cost;
    const costDifference = chicagoTotalCost - stLouisTotalCost;
    const costDifferencePercent = ((costDifference / chicagoTotalCost) * 100);

    // Calculate savings vs baseline
    const chicagoSavings = actualTransportBaseline - chicagoTotalCost;
    const chicagoSavingsPercent = (chicagoSavings / actualTransportBaseline) * 100;
    const stLouisSavings = actualTransportBaseline - stLouisTotalCost;
    const stLouisSavingsPercent = (stLouisSavings / actualTransportBaseline) * 100;

    // Distance analysis
    const avgDistanceChicago = resultChicago.network_metrics.weighted_avg_distance;
    const avgDistanceStLouis = resultStLouis.network_metrics.weighted_avg_distance;

    console.log('✅ COST COMPARISON RESULTS:');
    console.log(`Chicago Total Cost: $${chicagoTotalCost.toLocaleString()}`);
    console.log(`St. Louis Total Cost: $${stLouisTotalCost.toLocaleString()}`);
    console.log(`Cost Difference: $${Math.abs(costDifference).toLocaleString()} (${costDifferencePercent.toFixed(1)}%)`);
    console.log(`${costDifference > 0 ? 'St. Louis is BETTER' : 'Chicago is BETTER'} by $${Math.abs(costDifference).toLocaleString()}`);

    const response = {
      success: true,
      comparison_summary: {
        baseline_cost: actualTransportBaseline,
        chicago_scenario: {
          total_cost: chicagoTotalCost,
          savings_vs_baseline: chicagoSavings,
          savings_percentage: chicagoSavingsPercent,
          avg_distance: avgDistanceChicago,
          facilities: resultChicago.open_facilities,
          service_level: resultChicago.network_metrics.service_level_achievement
        },
        stlouis_scenario: {
          total_cost: stLouisTotalCost,
          savings_vs_baseline: stLouisSavings,
          savings_percentage: stLouisSavingsPercent,
          avg_distance: avgDistanceStLouis,
          facilities: resultStLouis.open_facilities,
          service_level: resultStLouis.network_metrics.service_level_achievement
        },
        cost_difference: {
          absolute_difference: Math.abs(costDifference),
          percentage_difference: Math.abs(costDifferencePercent),
          winner: costDifference > 0 ? 'St. Louis, MO' : 'Chicago, IL',
          winner_advantage: `$${Math.abs(costDifference).toLocaleString()} (${Math.abs(costDifferencePercent).toFixed(1)}% better)`
        }
      },
      detailed_results: {
        chicago_optimization: resultChicago,
        stlouis_optimization: resultStLouis
      },
      cost_matrices: {
        chicago_matrix: costMatrixChicago,
        stlouis_matrix: costMatrixStLouis
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Cost comparison failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cost comparison failed',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}
