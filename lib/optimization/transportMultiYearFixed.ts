// Fixed-lease multi-year transport optimizer (single facility set across years)
import { ForecastRow, DemandMap, CapacityMap, CostMatrix, TransportParams, TransportResult, LpModel } from '@/types/advanced-optimization';
import { solve, addCoef } from '@/lib/advanced-solver';

export function optimizeTransportMultiYearFixed(
  params: TransportParams,
  matrix: CostMatrix,
  forecast: ForecastRow[],
  options: {
    baselineDemand?: DemandMap;
    demandByYear?: Record<number, DemandMap>;
    capacity?: CapacityMap;
    bounds?: { minFacilities?: number; maxFacilities?: number };
  } = {}
) {
  const cities = matrix.rows;
  const dests = matrix.cols;
  const years = forecast.map(f => f.year);

  // Build demand per year (scale baseline shares if per-year not provided)
  function scaleDemandFromBaseline(baseline: DemandMap, totalUnits: number): DemandMap {
    const sum = Object.values(baseline).reduce((s, v) => s + (v || 0), 0);
    if (sum <= 0) {
      const avg = totalUnits / Math.max(1, Object.keys(baseline).length);
      return Object.fromEntries(Object.keys(baseline).map(k => [k, avg]));
    }
    const out: DemandMap = {};
    for (const [k, v] of Object.entries(baseline)) out[k] = (v / sum) * totalUnits;
    return out;
  }

  const demandByYear: Record<number, DemandMap> = {};
  for (const f of forecast) {
    if (options.demandByYear?.[f.year]) demandByYear[f.year] = options.demandByYear[f.year];
    else if (options.baselineDemand) demandByYear[f.year] = scaleDemandFromBaseline(options.baselineDemand, f.annual_units);
    else demandByYear[f.year] = scaleDemandFromBaseline(Object.fromEntries(dests.map(d => [d, 1])), f.annual_units);
  }

  // LP model bits
  const vars: Record<string, Record<string, number>> = {};
  const binaries: Record<string, 1> = {};
  const constraints: Record<string, { max?: number; min?: number; equal?: number }> = {};
  const OBJ = 'OBJ';

  // Facility count bounds
  const minF = options.bounds?.minFacilities ?? params.required_facilities;
  const maxF = options.bounds?.maxFacilities ?? params.max_facilities;
  constraints['Min_Facilities'] = { min: minF };
  constraints['Max_Facilities'] = { max: maxF };

  // Serve each destination exactly once per year
  for (const y of years) for (const d of dests) constraints[`Serve_${d}_${y}`] = { equal: 1 };

  // Service-level (demand-weighted) across all years
  const totalDemandAllYears = years.reduce((s, y) => s + Object.values(demandByYear[y]).reduce((a,b)=>a+b,0), 0);
  constraints['Service_Level'] = { min: totalDemandAllYears * (params.service_level_requirement ?? 0.95) };

  // x_i (open facility across horizon)
  for (const ci of cities) {
    const x = `x_${ci}`;
    vars[x] = { [OBJ]: (params.weights?.cost ?? 0.6) * (params.fixed_cost_per_facility ?? 100000) * years.length };
    binaries[x] = 1;
    addCoef(vars[x], 'Min_Facilities', 1);
    addCoef(vars[x], 'Max_Facilities', 1);
  }

  // Capacity per facility per year
  const capacityMap: CapacityMap = options.capacity ?? Object.fromEntries(cities.map(c => [c, params.max_capacity_per_facility ?? 1_000_000]));
  for (const ci of cities) for (const y of years) constraints[`Cap_${ci}_${y}`] = { max: 0 };

  // y_{i,j,t} + objective and linking
  for (let i = 0; i < cities.length; i++) {
    const ci = cities[i];
    for (let j = 0; j < dests.length; j++) {
      const dj = dests[j];
      for (const y of years) {
        const yv = `y_${ci}__${dj}__${y}`;
        binaries[yv] = 1;
        if (!vars[yv]) vars[yv] = {};

        // Serve exactly once
        addCoef(vars[yv], `Serve_${dj}_${y}`, 1);

        // Link to open x_i
        const link = `Link_${ci}_${y}`;
        if (!constraints[link]) constraints[link] = { max: 0 };
        addCoef(vars[yv], link, 1);
        addCoef(vars[`x_${ci}`], link, -1);

        // Capacity
        const dem = demandByYear[y][dj] ?? 0;
        addCoef(vars[yv], `Cap_${ci}_${y}`, dem);
        addCoef(vars[`x_${ci}`], `Cap_${ci}_${y}`, - (capacityMap[ci] ?? 0));

        // Objective (transport cost + soft penalty for being over max distance)
        const unitCost = matrix.cost[i][j]; // interpreted as $/unit for this model
        vars[yv][OBJ] = (vars[yv][OBJ] ?? 0) + (params.weights?.cost ?? 0.6) * unitCost * dem;

        const dist = (params.cost_per_mile ?? 2.5) > 0 ? unitCost / (params.cost_per_mile ?? 2.5) : unitCost;
        const over = Math.max(0, dist - (params.max_distance_miles ?? 1000));
        const penalty = (params.weights?.service_level ?? 0.3) * 10 * over * dem;
        vars[yv][OBJ] += penalty;

        // Service within threshold
        if (dist <= (params.max_distance_miles ?? 1000)) addCoef(vars[yv], 'Service_Level', dem);
      }
    }
  }

  const model: LpModel = { optimize: OBJ, opType: 'min', constraints, variables: vars, binaries };
  const sol = solve(model);
  if (!sol.feasible) throw new Error('Fixed-lease transport optimization infeasible');

  const open: string[] = [];
  for (const ci of cities) if (Number(sol[`x_${ci}`] || 0) > 0.5) open.push(ci);

  // Build per-year TransportResult (compat with existing UI)
  function buildYearResult(y: number): TransportResult {
    const assignments: any[] = [];
    let totalCost = 0;

    for (let i = 0; i < cities.length; i++) {
      for (let j = 0; j < dests.length; j++) {
        const v = Number(sol[`y_${cities[i]}__${dests[j]}__${y}`] || 0);
        if (v > 0.5) {
          const dem = demandByYear[y][dests[j]] ?? 0;
          const unitCost = matrix.cost[i][j];
          const dist = (params.cost_per_mile ?? 2.5) > 0 ? unitCost / (params.cost_per_mile ?? 2.5) : unitCost;
          assignments.push({ Facility: cities[i], Destination: dests[j], Demand: dem, Cost: unitCost, Distance: dist });
          totalCost += unitCost * dem;
        }
      }
    }

    const capMap = capacityMap;
    const metrics = open.map((ci) => {
      const served = assignments.filter(a => a.Facility === ci);
      const totalDem = served.reduce((s, a) => s + a.Demand, 0);
      const avgDist = served.length ? served.reduce((s, a) => s + a.Distance, 0) / served.length : 0;
      const cap = capMap[ci] ?? (params.max_capacity_per_facility ?? 1_000_000);
      const cost = served.reduce((s, a) => s + a.Cost * a.Demand, 0);
      return { Facility: ci, Destinations_Served: served.length, Total_Demand: totalDem, Capacity_Utilization: cap > 0 ? totalDem / cap : 0, Average_Distance: avgDist, Total_Cost: cost, Cost_Per_Unit: totalDem ? cost / totalDem : 0 };
    });

    const served = assignments.reduce((s,a)=>s+a.Demand,0);
    const within = assignments.filter(a => a.Distance <= (params.max_distance_miles ?? 1000)).reduce((s,a)=>s+a.Demand,0);
    const totalCapacity = open.reduce((s,c)=>s+(capMap[c] ?? (params.max_capacity_per_facility ?? 1_000_000)),0);

    return {
      open_facilities: open,
      assignments,
      facility_metrics: metrics,
      optimization_summary: {
        status: 'Optimal',
        objective_value: sol.result ?? null,
        solve_time: 0,
        facilities_opened: open.length,
        total_demand_served: served,
        total_transportation_cost: totalCost
      },
      network_metrics: {
        service_level_achievement: served ? within / served : 0,
        avg_cost_per_unit: served ? totalCost / served : 0,
        weighted_avg_distance: served ? assignments.reduce((s,a)=>s+a.Distance*a.Demand,0)/served : 0,
        avg_facility_utilization: metrics.length ? metrics.reduce((s,m)=>s+m.Capacity_Utilization,0)/metrics.length : 0,
        network_utilization: totalCapacity ? served/totalCapacity : 0,
        destinations_per_facility: metrics.length ? metrics.reduce((s,m)=>s+m.Destinations_Served,0)/metrics.length : 0,
        total_transportation_cost: totalCost,
        demand_within_service_limit: within,
        total_demand_served: served,
        facilities_opened: open.length,
        total_capacity_available: totalCapacity
      }
    } as TransportResult;
  }

  const perYear = years.map(y => ({ year: y, transport: buildYearResult(y) }));
  const totalCost = perYear.reduce((s,yr)=>s+yr.transport.optimization_summary.total_transportation_cost,0);
  const totalDem = perYear.reduce((s,yr)=>s+yr.transport.optimization_summary.total_demand_served,0);
  const weightedSvc = totalDem ? perYear.reduce((s,yr)=>s+yr.transport.network_metrics.service_level_achievement*yr.transport.optimization_summary.total_demand_served,0)/totalDem : 0;
  const avgCPU = totalDem ? totalCost/totalDem : 0;

  return {
    open_facilities: open,
    perYear,
    totals: { total_transportation_cost: totalCost, weighted_service_level: weightedSvc, total_demand: totalDem, avg_cost_per_unit: avgCPU }
  };
}
