/**
 * Enhanced Inventory Optimization Module
 * Includes safety stock, cycle stock, holding costs with statistical demand modeling
 */

import { ForecastRow, SKU } from '../types/advanced-optimization';

export type InventoryParams = {
  service_level: number; // e.g., 0.95
  lead_time_days: number; // average replenishment lead time
  holding_cost_per_unit_per_year: number; // $/unit/year
  demand_cv: number; // coefficient of variation of daily demand (sigma/mean)
  operating_days: number; // align with warehouse.operating_days
  safety_stock_factor?: number; // optional override
  cycle_stock_days?: number; // optional override
};

export type InventoryYearRow = {
  Year: number;
  Daily_Mean_Demand: number;
  Safety_Stock_Units: number;
  Cycle_Stock_Units: number;
  Avg_Inventory_Units: number;
  Annual_Holding_Cost: number;
  Service_Level_Achieved: number;
  Lead_Time_Demand_Std: number;
};

export type InventoryResult = {
  results: InventoryYearRow[];
  total_cost: number;
  avg_inventory_units: number;
  peak_inventory_units: number;
};

// Approximate inverse standard normal CDF (Acklam's approximation)
function invNorm(p: number): number {
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
  
  q = p - 0.5; 
  r = q * q;
  return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
    (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
}

export function optimizeInventory(
  params: InventoryParams,
  forecast: ForecastRow[],
  skus: SKU[]
): InventoryResult {
  console.log('🏭 Optimizing inventory with enhanced statistical modeling...');
  
  const z = invNorm(params.service_level);
  const results: InventoryYearRow[] = [];
  let total_cost = 0;
  let total_inventory = 0;
  let peak_inventory = 0;

  for (const f of forecast) {
    const dailyMean = f.annual_units / params.operating_days;
    const sigmaDaily = params.demand_cv * dailyMean;
    const sigmaLead = sigmaDaily * Math.sqrt(params.lead_time_days);
    
    // Calculate safety stock using service level
    const safetyStock = Math.max(0, z * sigmaLead);
    
    // Calculate cycle stock (average inventory between orders)
    const cycleStock = params.cycle_stock_days 
      ? dailyMean * params.cycle_stock_days
      : dailyMean * (params.lead_time_days / 2);
    
    const avgInventoryUnits = safetyStock + cycleStock;
    const annualHoldingCost = avgInventoryUnits * params.holding_cost_per_unit_per_year;
    
    total_cost += annualHoldingCost;
    total_inventory += avgInventoryUnits;
    peak_inventory = Math.max(peak_inventory, avgInventoryUnits);

    results.push({
      Year: f.year,
      Daily_Mean_Demand: Math.round(dailyMean),
      Safety_Stock_Units: Math.round(safetyStock),
      Cycle_Stock_Units: Math.round(cycleStock),
      Avg_Inventory_Units: Math.round(avgInventoryUnits),
      Annual_Holding_Cost: Math.round(annualHoldingCost),
      Service_Level_Achieved: params.service_level,
      Lead_Time_Demand_Std: Math.round(sigmaLead),
    });
  }

  const avgInventory = total_inventory / forecast.length;

  console.log(`✅ Inventory optimization complete:`);
  console.log(`- Average inventory: ${Math.round(avgInventory).toLocaleString()} units`);
  console.log(`- Peak inventory: ${Math.round(peak_inventory).toLocaleString()} units`);
  console.log(`- Total holding cost: $${Math.round(total_cost).toLocaleString()}`);
  console.log(`- Service level: ${(params.service_level * 100).toFixed(1)}%`);

  return {
    results,
    total_cost: Math.round(total_cost),
    avg_inventory_units: Math.round(avgInventory),
    peak_inventory_units: Math.round(peak_inventory),
  };
}

export function inventoryByYear(
  params: InventoryParams,
  forecast: ForecastRow[]
): InventoryYearRow[] {
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
      Daily_Mean_Demand: Math.round(dailyMean),
      Safety_Stock_Units: Math.round(safetyStock),
      Cycle_Stock_Units: Math.round(cycleStock),
      Avg_Inventory_Units: Math.round(avgInventoryUnits),
      Annual_Holding_Cost: Math.round(annualHoldingCost),
      Service_Level_Achieved: params.service_level,
      Lead_Time_Demand_Std: Math.round(sigmaLead),
    };
  });
}

// Calculate inventory turns and other KPIs
export function calculateInventoryKPIs(result: InventoryResult, forecast: ForecastRow[]): {
  inventory_turns: number;
  days_of_supply: number;
  fill_rate_estimate: number;
  total_investment: number;
} {
  const totalAnnualDemand = forecast.reduce((sum, f) => sum + f.annual_units, 0);
  const avgAnnualDemand = totalAnnualDemand / forecast.length;
  
  const inventory_turns = result.avg_inventory_units > 0 
    ? avgAnnualDemand / result.avg_inventory_units 
    : 0;
  
  const days_of_supply = inventory_turns > 0 ? 365 / inventory_turns : 0;
  
  // Rough estimate of fill rate based on safety stock levels
  const fill_rate_estimate = Math.min(0.999, 0.85 + (result.results[0]?.Service_Level_Achieved || 0.95) * 0.14);
  
  // Assuming $10/unit average cost for investment calculation
  const avg_unit_cost = 10;
  const total_investment = result.avg_inventory_units * avg_unit_cost;

  return {
    inventory_turns: Math.round(inventory_turns * 100) / 100,
    days_of_supply: Math.round(days_of_supply),
    fill_rate_estimate: Math.round(fill_rate_estimate * 10000) / 100, // percentage
    total_investment: Math.round(total_investment),
  };
}
