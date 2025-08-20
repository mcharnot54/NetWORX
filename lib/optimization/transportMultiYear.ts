// Re-optimizes Transport for each forecast year; aggregates totals
import { ForecastRow } from '@/types/advanced-optimization';
import { DemandMap, CapacityMap, CostMatrix } from '@/types/advanced-optimization';

// Define transport types since they may not exist yet
export type TransportParams = {
  fixed_cost_per_facility: number;
  cost_per_mile: number;
  service_level_requirement: number;
  max_distance_miles: number;
  required_facilities: number;
  max_facilities: number;
  max_capacity_per_facility: number;
  mandatory_facilities: string[];
  weights: {
    cost: number;
    service_level: number;
  };

  // NEW: minimum years a facility stays open (default 7)
  lease_years?: number;
};

export type TransportResult = {
  optimization_summary: {
    total_transportation_cost: number;
    total_demand_served: number;
    facilities_opened: number;
    status: string;
  };
  network_metrics: {
    service_level_achievement: number;
    avg_distance_miles: number;
    capacity_utilization: number;
  };
  facility_allocation: Array<{
    facility: string;
    demand_served: number;
    destinations_served: string[];
    utilization: number;
  }>;
  route_details: Array<{
    origin: string;
    destination: string;
    demand: number;
    distance: number;
    cost: number;
  }>;
};

export type TransportMultiYearResult = {
  perYear: Array<{ year: number; transport: TransportResult }>;
  totals: {
    total_transportation_cost: number;
    total_demand: number;
    weighted_service_level: number; // demand-weighted across years
    avg_cost_per_unit: number;
  };
};

function scaleDemandFromBaseline(baseline: DemandMap, totalUnits: number): DemandMap {
  const baseSum = Object.values(baseline).reduce((s, v) => s + (v || 0), 0);
  if (baseSum <= 0) return Object.fromEntries(Object.keys(baseline).map((k) => [k, totalUnits / Math.max(1, Object.keys(baseline).length)]));
  const out: DemandMap = {};
  for (const [k, v] of Object.entries(baseline)) out[k] = (v / baseSum) * totalUnits;
  return out;
}

// Simplified transport optimizer for multi-year use
function optimizeTransportSingle(
  params: TransportParams,
  matrix: CostMatrix,
  demand: DemandMap,
  capacity?: CapacityMap,
  bounds?: { minFacilities?: number; maxFacilities?: number }
): TransportResult {
  // Simplified greedy allocation for demonstration
  const facilities = matrix.rows;
  const destinations = matrix.cols;
  
  const minFacilities = bounds?.minFacilities || params.required_facilities;
  const maxFacilities = bounds?.maxFacilities || params.max_facilities;
  
  // Select best facilities by lowest average cost to all destinations
  const facilityScores = facilities.map((facility, fi) => {
    const avgCost = destinations.reduce((sum, dest, di) => sum + matrix.cost[fi][di], 0) / destinations.length;
    return { facility, index: fi, avgCost };
  }).sort((a, b) => a.avgCost - b.avgCost);
  
  const selectedFacilities = facilityScores.slice(0, Math.min(maxFacilities, Math.max(minFacilities, 2)));
  
  // Allocate demand to facilities
  let totalCost = 0;
  let totalServed = 0;
  let totalDistance = 0;
  const facilityAllocation: Array<{
    facility: string;
    demand_served: number;
    destinations_served: string[];
    utilization: number;
  }> = [];
  
  const routeDetails: Array<{
    origin: string;
    destination: string;
    demand: number;
    distance: number;
    cost: number;
  }> = [];

  for (const { facility, index: fi } of selectedFacilities) {
    let facilityDemand = 0;
    const destServed: string[] = [];
    
    for (const [dest, demandVol] of Object.entries(demand)) {
      const di = destinations.indexOf(dest);
      if (di === -1) continue;
      
      const cost = matrix.cost[fi][di];
      const distance = cost / params.cost_per_mile; // Estimate distance from cost
      const demandShare = demandVol / selectedFacilities.length; // Simple even split
      
      facilityDemand += demandShare;
      totalServed += demandShare;
      totalCost += cost * demandShare;
      totalDistance += distance * demandShare;
      destServed.push(dest);
      
      routeDetails.push({
        origin: facility,
        destination: dest,
        demand: demandShare,
        distance,
        cost: cost * demandShare
      });
    }
    
    facilityAllocation.push({
      facility,
      demand_served: facilityDemand,
      destinations_served: destServed,
      utilization: facilityDemand / params.max_capacity_per_facility
    });
  }
  
  // Add facility fixed costs
  totalCost += selectedFacilities.length * params.fixed_cost_per_facility;
  
  const avgDistance = totalServed > 0 ? totalDistance / totalServed : 0;
  const serviceLevel = Math.min(1.0, totalServed / Object.values(demand).reduce((s, v) => s + v, 0));
  
  return {
    optimization_summary: {
      total_transportation_cost: totalCost,
      total_demand_served: totalServed,
      facilities_opened: selectedFacilities.length,
      status: 'optimal'
    },
    network_metrics: {
      service_level_achievement: serviceLevel,
      avg_distance_miles: avgDistance,
      capacity_utilization: facilityAllocation.reduce((sum, f) => sum + f.utilization, 0) / facilityAllocation.length
    },
    facility_allocation: facilityAllocation,
    route_details: routeDetails
  };
}

export function optimizeTransportMultiYear(
  params: TransportParams,
  matrix: CostMatrix,
  forecast: ForecastRow[],
  options: {
    baselineDemand?: DemandMap;
    demandByYear?: Record<number, DemandMap>;
    capacity?: CapacityMap;
    bounds?: { minFacilities?: number; maxFacilities?: number };
  } = {}
): TransportMultiYearResult {
  const perYear: Array<{ year: number; transport: TransportResult }> = [];
  let totalCost = 0; let totalDem = 0; let svcNumerator = 0;

  for (const f of forecast) {
    let dem: DemandMap;
    if (options.demandByYear && options.demandByYear[f.year]) {
      dem = options.demandByYear[f.year];
    } else if (options.baselineDemand) {
      dem = scaleDemandFromBaseline(options.baselineDemand, f.annual_units);
    } else {
      // Default: equal split across all destinations
      dem = scaleDemandFromBaseline(Object.fromEntries(matrix.cols.map((d) => [d, 1])), f.annual_units);
    }

    const tr = optimizeTransportSingle(params, matrix, dem, options.capacity, options.bounds);
    perYear.push({ year: f.year, transport: tr });

    const served = tr.optimization_summary.total_demand_served;
    totalDem += served;
    totalCost += tr.optimization_summary.total_transportation_cost;
    svcNumerator += tr.network_metrics.service_level_achievement * served;
  }

  const weightedSvc = totalDem > 0 ? svcNumerator / totalDem : 0;
  const avgCPU = totalDem > 0 ? totalCost / totalDem : 0;

  return {
    perYear,
    totals: {
      total_transportation_cost: totalCost,
      total_demand: totalDem,
      weighted_service_level: weightedSvc,
      avg_cost_per_unit: avgCPU,
    },
  };
}
