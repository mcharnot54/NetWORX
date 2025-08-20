import { ForecastRow } from '@/types/advanced-optimization';

export type InventoryParams = {
  service_level: number; // e.g., 0.95
  lead_time_days: number; // average replenishment lead time
  holding_cost_per_unit_per_year: number; // $/unit/year
  demand_cv: number; // coefficient of variation of daily demand (sigma/mean)
  operating_days: number; // align with warehouse.operating_days
};

// Approximate inverse standard normal CDF (Acklam's approximation)
function invNorm(p: number) {
  if (p <= 0 || p >= 1) return NaN;
  const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
  const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
  const b4 = 66.8013118877197, b5 = -13.2806815528857;
  const c1 = -0.00778489400243029, c2 = -0.322396458041136, c3 = -2.40075827716184;
  const c4 = -2.54973253934373, c5 = 4.37466414146497, c6 = 2.93816398269878;
  const d1 = 0.00778469570904146, d2 = 0.32246712907004, d3 = 2.44513413714299, d4 = 3.75440866190742;
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  if (phigh < p) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  q = p - 0.5; r = q * q;
  return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
    (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
}

export function inventoryByYear(
  params: InventoryParams,
  forecast: ForecastRow[]
) {
  const z = invNorm(params.service_level);
  return forecast.map(f => {
    const dailyMean = f.annual_units / params.operating_days;
    const sigmaDaily = params.demand_cv * dailyMean;
    const sigmaLead = sigmaDaily * Math.sqrt(params.lead_time_days);
    const safetyStock = Math.max(0, z * sigmaLead);
    const cycleStock = dailyMean * (params.lead_time_days / 2);
    const avgInventoryUnits = safetyStock + cycleStock;
    const annualHoldingCost = avgInventoryUnits * params.holding_cost_per_unit_per_year;
    return {
      Year: f.year,
      Daily_Mean_Demand: dailyMean,
      Safety_Stock_Units: safetyStock,
      Cycle_Stock_Units: cycleStock,
      Avg_Inventory_Units: avgInventoryUnits,
      Annual_Holding_Cost: annualHoldingCost,
    };
  });
}

// Legacy interface for compatibility
export type InventoryYearRow = {
  Year: number;
  Safety_Stock: number;
  Cycle_Stock: number;
  Total_Stock: number;
  Holding_Cost: number;
};

export type InventoryResult = {
  results: InventoryYearRow[];
  total_cost: number;
};

export function optimizeInventory(
  params: { holding_cost_per_unit: number; safety_stock_factor: number; cycle_stock_days: number },
  forecast: ForecastRow[],
  skus: any[]
): InventoryResult {
  const results: InventoryYearRow[] = [];
  let total_cost = 0;

  for (const f of forecast) {
    const avgDaily = f.annual_units / 365;
    const safety = f.annual_units * params.safety_stock_factor;
    const cycle = avgDaily * params.cycle_stock_days;
    const total = safety + cycle;
    const holding = total * params.holding_cost_per_unit;
    total_cost += holding;

    results.push({
      Year: f.year,
      Safety_Stock: safety,
      Cycle_Stock: cycle,
      Total_Stock: total,
      Holding_Cost: holding,
    });
  }

  return { results, total_cost };
}
