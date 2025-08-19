import { NextRequest, NextResponse } from 'next/server';

import { CITY_COORDINATES_LOOKUP } from '@/lib/comprehensive-cities-database';

// Use comprehensive North American cities database
const CITY_COORDINATES = CITY_COORDINATES_LOOKUP;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateTransportCost(distance: number, demandUnits: number): number {
  const baseCostPerMile = 2.85;
  let costPerUnit = distance * baseCostPerMile;
  
  // Apply zone-based pricing
  if (distance <= 150) {
    costPerUnit *= 0.85; // Zone 1-2 discount
  } else if (distance <= 300) {
    costPerUnit *= 0.95; // Zone 3-4 moderate cost
  } else if (distance <= 600) {
    costPerUnit *= 1.10; // Zone 5-6 premium
  } else {
    costPerUnit *= 1.25; // Zone 7-8 high premium
  }
  
  // Add fuel surcharge
  costPerUnit += distance * 0.35; // $0.35/mile fuel surcharge
  
  return costPerUnit * demandUnits;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Simple comparison: Chicago vs St. Louis as 2nd node with Littleton, MA');

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

    // Assume equal demand distribution (13M units / 10 destinations)
    const demandPerDestination = 1_300_000;

    const littletonCoords = CITY_COORDINATES['Littleton, MA'];
    const chicagoCoords = CITY_COORDINATES['Chicago, IL'];
    const stLouisCoords = CITY_COORDINATES['St. Louis, MO'];

    let chicagoScenarioDetails: any[] = [];
    let stLouisScenarioDetails: any[] = [];
    let chicagoTotalCost = 0;
    let stLouisTotalCost = 0;

    console.log('📊 Calculating costs for all destinations...');

    for (const destination of destinations) {
      const destCoords = CITY_COORDINATES[destination];
      if (!destCoords) continue;

      // Distance from Littleton to destination
      const littletonToDest = calculateDistance(
        littletonCoords.lat, littletonCoords.lon,
        destCoords.lat, destCoords.lon
      );

      // Distance from Chicago to destination
      const chicagoToDest = calculateDistance(
        chicagoCoords.lat, chicagoCoords.lon,
        destCoords.lat, destCoords.lon
      );

      // Distance from St. Louis to destination
      const stLouisToDest = calculateDistance(
        stLouisCoords.lat, stLouisCoords.lon,
        destCoords.lat, destCoords.lon
      );

      // For each scenario, choose the cheaper option (Littleton vs 2nd facility)
      const littletonCost = calculateTransportCost(littletonToDest, demandPerDestination);
      const chicagoCost = calculateTransportCost(chicagoToDest, demandPerDestination);
      const stLouisCost = calculateTransportCost(stLouisToDest, demandPerDestination);

      // Chicago Scenario: choose cheaper between Littleton and Chicago
      const chicagoScenarioCost = Math.min(littletonCost, chicagoCost);
      const chicagoChosenFacility = littletonCost <= chicagoCost ? 'Littleton, MA' : 'Chicago, IL';
      const chicagoChosenDistance = littletonCost <= chicagoCost ? littletonToDest : chicagoToDest;

      chicagoScenarioDetails.push({
        destination,
        chosen_facility: chicagoChosenFacility,
        distance: chicagoChosenDistance,
        cost: chicagoScenarioCost,
        littleton_option: { distance: littletonToDest, cost: littletonCost },
        chicago_option: { distance: chicagoToDest, cost: chicagoCost }
      });
      chicagoTotalCost += chicagoScenarioCost;

      // St. Louis Scenario: choose cheaper between Littleton and St. Louis
      const stLouisScenarioCost = Math.min(littletonCost, stLouisCost);
      const stLouisChosenFacility = littletonCost <= stLouisCost ? 'Littleton, MA' : 'St. Louis, MO';
      const stLouisChosenDistance = littletonCost <= stLouisCost ? littletonToDest : stLouisToDest;

      stLouisScenarioDetails.push({
        destination,
        chosen_facility: stLouisChosenFacility,
        distance: stLouisChosenDistance,
        cost: stLouisScenarioCost,
        littleton_option: { distance: littletonToDest, cost: littletonCost },
        stlouis_option: { distance: stLouisToDest, cost: stLouisCost }
      });
      stLouisTotalCost += stLouisScenarioCost;
    }

    // Calculate summary metrics
    const costDifference = chicagoTotalCost - stLouisTotalCost;
    const costDifferencePercent = (Math.abs(costDifference) / Math.max(chicagoTotalCost, stLouisTotalCost)) * 100;
    const winner = costDifference > 0 ? 'St. Louis, MO' : 'Chicago, IL';

    // Distance from Littleton to each 2nd facility
    const littletonToChicago = calculateDistance(
      littletonCoords.lat, littletonCoords.lon,
      chicagoCoords.lat, chicagoCoords.lon
    );
    const littletonToStLouis = calculateDistance(
      littletonCoords.lat, littletonCoords.lon,
      stLouisCoords.lat, stLouisCoords.lon
    );

    console.log('✅ COMPARISON RESULTS:');
    console.log(`Chicago Total: $${chicagoTotalCost.toLocaleString()}`);
    console.log(`St. Louis Total: $${stLouisTotalCost.toLocaleString()}`);
    console.log(`${winner} wins by $${Math.abs(costDifference).toLocaleString()} (${costDifferencePercent.toFixed(1)}%)`);

    const response = {
      success: true,
      comparison_summary: {
        total_demand: demandPerDestination * destinations.length,
        chicago_scenario: {
          total_cost: chicagoTotalCost,
          avg_cost_per_unit: chicagoTotalCost / (demandPerDestination * destinations.length),
          distance_from_littleton: littletonToChicago
        },
        stlouis_scenario: {
          total_cost: stLouisTotalCost,
          avg_cost_per_unit: stLouisTotalCost / (demandPerDestination * destinations.length),
          distance_from_littleton: littletonToStLouis
        },
        cost_difference: {
          absolute_difference: Math.abs(costDifference),
          percentage_difference: costDifferencePercent,
          winner: winner,
          winner_saves: `$${Math.abs(costDifference).toLocaleString()} (${costDifferencePercent.toFixed(1)}% better)`
        }
      },
      detailed_breakdown: {
        chicago_scenario: chicagoScenarioDetails,
        stlouis_scenario: stLouisScenarioDetails
      },
      geographic_analysis: {
        littleton_to_chicago_miles: littletonToChicago,
        littleton_to_stlouis_miles: littletonToStLouis,
        chicago_more_central: littletonToStLouis < littletonToChicago,
        distance_advantage: `St. Louis is ${(littletonToChicago - littletonToStLouis).toFixed(0)} miles closer to Littleton`
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Comparison failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Comparison failed'
      }, 
      { status: 500 }
    );
  }
}
