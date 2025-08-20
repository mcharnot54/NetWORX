/**
 * Advanced Warehouse Capacity Optimizer for NetWORX Essentials
 * Uses Mixed Integer Programming (MIP) for optimal facility planning
 * Integrates with existing baseline data and infrastructure
 */

import { 
  ForecastRow, 
  SKU, 
  WarehouseParams, 
  OptimizationConfig, 
  WarehouseResult, 
  WarehouseYearRow 
} from '../types/advanced-optimization';
import { solve, addCoef, createConstraintBuilder, validateModel } from './advanced-solver';

export function prepareWarehouseData(
  forecast: ForecastRow[],
  skus: SKU[],
  p: WarehouseParams
) {
  if (!forecast.length || !skus.length) {
    throw new Error('Empty forecast or SKU data');
  }

  const baseUnits = skus.reduce((s, r) => s + r.annual_volume, 0);
  const years = [...new Set(forecast.map((f) => f.year))].sort((a, b) => a - b);

  const yearly: Record<number, any> = {};

  for (const f of forecast) {
    const demandFactor = baseUnits > 0 ? f.annual_units / baseUnits : 1;
    const adjusted = skus.map((s) => s.annual_volume * demandFactor);
    const unitsPerPallet = skus.map((s) => s.units_per_case * s.cases_per_pallet);
    const annualPallets = adjusted.reduce((sum, v, i) => sum + v / unitsPerPallet[i], 0);
    const dailyPallets = annualPallets / p.operating_days;
    const storagePallets = dailyPallets * p.DOH;

    const area = calcArea(storagePallets, dailyPallets, p);

    yearly[f.year] = {
      annual_units: f.annual_units,
      demand_factor: demandFactor,
      annual_pallets: annualPallets,
      daily_pallets: dailyPallets,
      storage_pallets: storagePallets,
      ...area,
    };
  }

  return { years, yearly, baseUnits };
}

function calcArea(storagePallets: number, dailyPallets: number, p: WarehouseParams) {
  const palletFt2 = (p.pallet_length_inches / 12) * (p.pallet_width_inches / 12);
  const levels = Math.floor(p.ceiling_height_inches / p.rack_height_inches) || 1;
  const storageArea = (storagePallets * palletFt2) / levels / (1 - p.aisle_factor);

  const outDoors = Math.min(
    Math.ceil(dailyPallets / p.outbound_pallets_per_door_per_day),
    p.max_outbound_doors
  );
  const inDoors = Math.min(
    Math.ceil(dailyPallets / p.inbound_pallets_per_door_per_day),
    p.max_inbound_doors
  );

  const outboundArea = outDoors * p.outbound_area_per_door;
  const inboundArea = inDoors * p.inbound_area_per_door;

  const outOverflow = Math.max(
    0,
    Math.ceil(dailyPallets / p.outbound_pallets_per_door_per_day) - p.max_outbound_doors
  ) * p.outbound_area_per_door;
  const inOverflow = Math.max(
    0,
    Math.ceil(dailyPallets / p.inbound_pallets_per_door_per_day) - p.max_inbound_doors
  ) * p.inbound_area_per_door;

  const supportArea = p.min_office + p.min_battery + p.min_packing;
  const net = storageArea + outboundArea + inboundArea + outOverflow + inOverflow + supportArea;
  const gross = net / p.max_utilization;

  return {
    storage_area: storageArea,
    outbound_area: outboundArea,
    inbound_area: inboundArea,
    outbound_overflow: outOverflow,
    inbound_overflow: inOverflow,
    support_area: supportArea,
    net_area: net,
    gross_area: gross,
    outbound_doors: outDoors,
    inbound_doors: inDoors,
  };
}

export function optimizeWarehouse(
  cfg: OptimizationConfig,
  forecast: ForecastRow[],
  skus: SKU[]
): WarehouseResult {
  const p = cfg.warehouse;
  const { years, yearly } = prepareWarehouseData(forecast, skus, p);

  console.log('🏭 Starting advanced warehouse capacity optimization...');
  console.log(`Years to optimize: ${years.join(', ')}`);
  console.log(`SKUs in analysis: ${skus.length}`);

  // Build MIP model using constraint builder
  const builder = createConstraintBuilder();
  const objectiveKey = 'OBJ';

  // Decision variables per year: add_facilities_y (binary), facility_size_y (int), thirdparty_space_y (cont)
  const serviceLevelReq = cfg.transportation.service_level_requirement ?? 0.95;
  const priorYears = (y: number) => years.filter((yr) => yr <= y);

  // Global facility limit constraint
  builder.addConstraint('Max_Facilities', { max: p.max_facilities ?? 8 });

  for (const y of years) {
    const addName = `add_${y}`;
    const sizeName = `size_${y}`;
    const thirdName = `third_${y}`;

    // Add decision variables
    builder.addVariable(addName, 'binary');
    builder.addVariable(sizeName, 'integer');
    builder.addVariable(thirdName, 'continuous');

    // Objective coefficients (weighted by config)
    const costWeight = cfg.optimization.weights?.cost ?? 0.6;
    const utilWeight = cfg.optimization.weights?.utilization ?? 0.1;
    const serviceWeight = cfg.optimization.weights?.service_level ?? 0.3;

    builder.setObjectiveCoef(addName, costWeight * 1_000_000, objectiveKey);
    builder.setObjectiveCoef(sizeName, utilWeight * 100, objectiveKey);
    builder.setObjectiveCoef(thirdName, serviceWeight * 0.01, objectiveKey);

    // Facility-size link constraint: size_y <= design_area * add_y
    const linkKey = `Facility_Size_Link_${y}`;
    builder.addConstraint(linkKey, { max: 0 });
    builder.setConstraintCoef(sizeName, linkKey, 1);
    builder.setConstraintCoef(addName, linkKey, -p.facility_design_area);

    // Capacity constraint per year
    const capKey = `Capacity_${y}`;
    builder.addConstraint(capKey, { max: 0 });

    const perFacility = p.case_pick_area_fixed + p.each_pick_area_fixed + p.min_conveyor;

    // Third party space contribution (negative because it reduces need)
    builder.setConstraintCoef(thirdName, capKey, -1);

    // Facility-dependent areas for all prior years
    for (const py of priorYears(y)) {
      const addP = `add_${py}`;
      builder.setConstraintCoef(addP, capKey, perFacility);
    }

    // Facility sizes for all prior years (negative because they provide capacity)
    for (const py of priorYears(y)) {
      const sizeP = `size_${py}`;
      builder.setConstraintCoef(sizeP, capKey, -1);
    }

    // Constant part: gross_area[y] - initial_facility_area moved to RHS
    const constBound = p.initial_facility_area - yearly[y].gross_area;
    builder.addConstraint(capKey, { max: constBound });

    // Service level capacity floor
    const slKey = `ServiceLevel_${y}`;
    builder.addConstraint(slKey, { max: -(yearly[y].gross_area * serviceLevelReq - p.initial_facility_area) });

    for (const py of priorYears(y)) {
      const sizeP = `size_${py}`;
      builder.setConstraintCoef(sizeP, slKey, -1);
    }
  }

  // Max facilities across horizon constraint
  for (const y of years) {
    const addName = `add_${y}`;
    builder.setConstraintCoef(addName, 'Max_Facilities', 1);
  }

  // Build and solve the model
  const model = builder.buildModel(objectiveKey, 'min');
  
  // Validate model before solving
  const validation = validateModel(model);
  if (!validation.valid) {
    console.warn('Model validation warnings:', validation.errors);
  }

  console.log('🔧 Solving warehouse capacity MIP...');
  const t0 = Date.now();
  const sol = solve(model);
  const solveTime = (Date.now() - t0) / 1000;

  if (!sol.feasible) {
    throw new Error('Warehouse optimization infeasible - check capacity constraints');
  }

  console.log(`✅ Warehouse optimization solved in ${solveTime.toFixed(2)}s`);
  console.log(`Objective value: ${sol.result?.toLocaleString()}`);

  // Extract decisions and compute per-year outputs
  const addMap: Record<number, number> = {};
  const sizeMap: Record<number, number> = {};
  const thirdMap: Record<number, number> = {};

  for (const y of years) {
    addMap[y] = Number(sol[`add_${y}`] || 0);
    sizeMap[y] = Number(sol[`size_${y}`] || 0);
    thirdMap[y] = Number(sol[`third_${y}`] || 0);
  }

  const rows: WarehouseYearRow[] = [];
  for (const y of years) {
    const cumFacilities = 1 + years.filter((py) => py <= y).reduce((s, py) => s + (addMap[py] > 0.5 ? 1 : 0), 0);
    const cumSize = p.initial_facility_area + years.filter((py) => py <= y).reduce((s, py) => s + sizeMap[py], 0);

    const yd = yearly[y];
    const casePick = cumFacilities * p.case_pick_area_fixed;
    const eachPick = cumFacilities * p.each_pick_area_fixed;
    const conveyor = cumFacilities * p.min_conveyor;

    const totalNet = yd.net_area + casePick + eachPick + conveyor;
    const totalGross = totalNet / p.max_utilization;

    const internalCost = cumSize * p.cost_per_sqft_annual;
    const thirdCost = thirdMap[y] * p.thirdparty_cost_per_sqft;
    const totalCost = internalCost + thirdCost;

    const utilization = cumSize > 0 ? totalNet / cumSize : 0;

    rows.push({
      Year: y,
      Storage_Pallets: yd.storage_pallets,
      Storage_Area_SqFt: yd.storage_area,
      Outbound_Dock_Area: yd.outbound_area,
      Inbound_Dock_Area: yd.inbound_area,
      Support_Area: yd.support_area,
      Case_Pick_Area: casePick,
      Each_Pick_Area: eachPick,
      Conveyor_Area: conveyor,
      Net_Area_SqFt: totalNet,
      Gross_Area_SqFt: totalGross,
      Facilities_Needed: cumFacilities,
      Facility_Size_Added: sizeMap[y],
      Cumulative_Facility_Size: cumSize,
      ThirdParty_SqFt_Required: thirdMap[y],
      Internal_Cost_Annual: internalCost,
      ThirdParty_Cost_Annual: thirdCost,
      Total_Cost_Annual: totalCost,
      Cost_Per_Unit: yd.annual_units > 0 ? totalCost / yd.annual_units : 0,
      Utilization_Percentage: utilization * 100,
      Outbound_Doors: yd.outbound_doors,
      Inbound_Doors: yd.inbound_doors,
    });
  }

  // Calculate performance metrics
  const first = rows[0];
  const last = rows[rows.length - 1];
  const span = Math.max(1, last.Year - first.Year);
  const volumeCAGR = span > 0 ? ((last.Storage_Pallets / Math.max(1e-9, first.Storage_Pallets)) ** (1 / span)) - 1 : 0;
  const costCAGR = span > 0 ? ((last.Total_Cost_Annual / Math.max(1e-9, first.Total_Cost_Annual)) ** (1 / span)) - 1 : 0;
  const avgUtil = rows.reduce((s, r) => s + r.Utilization_Percentage, 0) / rows.length;
  const avgCPU = rows.reduce((s, r) => s + r.Cost_Per_Unit, 0) / rows.length;

  const totalInternal = last.Cumulative_Facility_Size;
  const totalThird = rows.reduce((s, r) => s + r.ThirdParty_SqFt_Required, 0);
  const thirdDep = (totalThird) / Math.max(1e-9, (totalInternal + totalThird));

  console.log(`📊 Warehouse optimization results:`);
  console.log(`- Facilities added: ${years.reduce((s, y) => s + (addMap[y] > 0.5 ? 1 : 0), 0)}`);
  console.log(`- Total internal space: ${totalInternal.toLocaleString()} sq ft`);
  console.log(`- Average utilization: ${avgUtil.toFixed(1)}%`);

  return {
    results: rows,
    optimization_summary: {
      status: 'Optimal',
      objective_value: sol.result ?? null,
      solve_time: solveTime,
      total_facilities_added: years.reduce((s, y) => s + (addMap[y] > 0.5 ? 1 : 0), 0),
      total_facility_size_added: years.reduce((s, y) => s + sizeMap[y], 0),
      total_thirdparty_space: totalThird,
    },
    performance_metrics: {
      volume_cagr: volumeCAGR,
      cost_cagr: costCAGR,
      avg_utilization: avgUtil,
      avg_cost_per_unit: avgCPU,
      thirdparty_dependency: thirdDep,
      total_internal_space: totalInternal,
      total_thirdparty_space: totalThird,
    },
  };
}
