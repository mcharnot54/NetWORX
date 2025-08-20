// Column Mapping utilities to transform AoA + mapping -> DemandMap / CostMatrix
import { CostMatrix, DemandMap } from '@/types/advanced-optimization';

export type DemandMapping = { 
  destinationCol: number; 
  demandCol: number; 
  yearCol?: number;
  unitCol?: number; // Optional units column for conversion
};

export type CostMapping = {
  originCol: number;
  destinationCol: number;
  // Either costCol, or (costPerMileCol + distanceCol), or (costPerCwtCol + weightCol)
  costCol?: number;
  costPerMileCol?: number;
  distanceCol?: number;
  costPerCwtCol?: number;
  weightCol?: number;
  modeCol?: number; // Transportation mode
  directionCol?: number; // Inbound/Outbound direction
};

export type CapacityMapping = {
  facilityCol: number;
  capacityCol: number;
  typeCol?: number; // Warehouse type
  utilizationCol?: number; // Max utilization
};

// Detect header types for smart suggestions
export function suggestColumnMapping(headers: string[]): {
  demand?: Partial<DemandMapping>;
  cost?: Partial<CostMapping>;
  capacity?: Partial<CapacityMapping>;
} {
  const lower = headers.map(h => h.toLowerCase());
  const suggestions: any = {};

  // Demand mapping suggestions
  const destIdx = lower.findIndex(h => h.includes('dest') || h.includes('city') || h.includes('location'));
  const demandIdx = lower.findIndex(h => h.includes('demand') || h.includes('volume') || h.includes('units') || h.includes('qty'));
  const yearIdx = lower.findIndex(h => h.includes('year') || h.includes('date') || h.includes('period'));
  
  if (destIdx >= 0 && demandIdx >= 0) {
    suggestions.demand = { destinationCol: destIdx, demandCol: demandIdx };
    if (yearIdx >= 0) suggestions.demand.yearCol = yearIdx;
  }

  // Cost mapping suggestions
  const originIdx = lower.findIndex(h => h.includes('origin') || h.includes('from') || h.includes('source'));
  const destCostIdx = lower.findIndex(h => h.includes('dest') || h.includes('to') || h.includes('destination'));
  const costIdx = lower.findIndex(h => h.includes('cost') || h.includes('rate') || h.includes('price'));
  const distanceIdx = lower.findIndex(h => h.includes('distance') || h.includes('miles') || h.includes('km'));
  const mileRateIdx = lower.findIndex(h => h.includes('per mile') || h.includes('mile rate'));

  if (originIdx >= 0 && destCostIdx >= 0) {
    suggestions.cost = { originCol: originIdx, destinationCol: destCostIdx };
    if (costIdx >= 0) suggestions.cost.costCol = costIdx;
    if (mileRateIdx >= 0 && distanceIdx >= 0) {
      suggestions.cost.costPerMileCol = mileRateIdx;
      suggestions.cost.distanceCol = distanceIdx;
    }
  }

  // Capacity mapping suggestions
  const facilityIdx = lower.findIndex(h => h.includes('facility') || h.includes('warehouse') || h.includes('location'));
  const capacityIdx = lower.findIndex(h => h.includes('capacity') || h.includes('max') || h.includes('limit'));
  
  if (facilityIdx >= 0 && capacityIdx >= 0) {
    suggestions.capacity = { facilityCol: facilityIdx, capacityCol: capacityIdx };
  }

  return suggestions;
}

export function mapDemandAoA(aoa: any[][], m: DemandMapping): { base?: DemandMap; byYear?: Record<number, DemandMap> } {
  const headerGuess = (aoa[0] || []).some((v) => String(v).toLowerCase().includes('dest') || String(v).toLowerCase().includes('demand') || String(v).toLowerCase().includes('year'));
  const start = headerGuess ? 1 : 0;

  if (m.yearCol !== undefined) {
    // Multi-year demand mapping
    const byYear: Record<number, DemandMap> = {};
    for (let r = start; r < aoa.length; r++) {
      const row = aoa[r]; if (!row) continue;
      const dest = String(row[m.destinationCol] ?? '').trim();
      const yr = Number(row[m.yearCol]);
      const dem = Number(row[m.demandCol]);
      if (!dest || !Number.isFinite(yr) || !Number.isFinite(dem)) continue;
      byYear[yr] = byYear[yr] || {};
      byYear[yr][dest] = (byYear[yr][dest] ?? 0) + dem;
    }
    return { byYear };
  }

  // Baseline demand mapping
  const base: DemandMap = {};
  for (let r = start; r < aoa.length; r++) {
    const row = aoa[r]; if (!row) continue;
    const dest = String(row[m.destinationCol] ?? '').trim();
    const dem = Number(row[m.demandCol]);
    if (!dest || !Number.isFinite(dem)) continue;
    base[dest] = (base[dest] ?? 0) + dem;
  }
  return { base };
}

export function mapCostAoA(aoa: any[][], m: CostMapping): CostMatrix {
  const headerGuess = (aoa[0] || []).some((v) => String(v).toLowerCase().includes('origin') || String(v).toLowerCase().includes('destination') || String(v).toLowerCase().includes('cost'));
  const start = headerGuess ? 1 : 0;

  const rowsSet = new Set<string>();
  const colsSet = new Set<string>();
  const triples: Array<[string,string,number]> = [];

  for (let r = start; r < aoa.length; r++) {
    const row = aoa[r]; if (!row) continue;
    const o = String(row[m.originCol] ?? '').trim();
    const d = String(row[m.destinationCol] ?? '').trim();
    if (!o || !d) continue;

    let cost = NaN;
    
    // Try direct cost column first
    if (m.costCol !== undefined && Number.isFinite(Number(row[m.costCol]))) {
      cost = Number(row[m.costCol]);
    } 
    // Try cost per mile * distance
    else if (m.costPerMileCol !== undefined && m.distanceCol !== undefined) {
      const cpm = Number(row[m.costPerMileCol]); 
      const dist = Number(row[m.distanceCol]);
      if (Number.isFinite(cpm) && Number.isFinite(dist)) {
        cost = cpm * dist;
      }
    } 
    // Try cost per CWT * weight
    else if (m.costPerCwtCol !== undefined && m.weightCol !== undefined) {
      const cwt = Number(row[m.costPerCwtCol]); 
      const w = Number(row[m.weightCol]);
      if (Number.isFinite(cwt) && Number.isFinite(w)) {
        cost = cwt * (w / 100); // Convert lbs to CWT
      }
    }
    
    if (!Number.isFinite(cost)) continue;

    rowsSet.add(o); 
    colsSet.add(d); 
    triples.push([o,d,cost]);
  }

  const rows = [...rowsSet];
  const cols = [...colsSet];
  const indexR = Object.fromEntries(rows.map((v,i)=>[v,i]));
  const indexC = Object.fromEntries(cols.map((v,i)=>[v,i]));
  const cost = Array.from({ length: rows.length }, () => Array(cols.length).fill(Infinity));
  
  for (const [o,d,c] of triples) {
    if (indexR[o] !== undefined && indexC[d] !== undefined) {
      cost[indexR[o]][indexC[d]] = c;
    }
  }
  
  return { rows, cols, cost };
}

export function mapCapacityAoA(aoa: any[][], m: CapacityMapping): Record<string, number> {
  const headerGuess = (aoa[0] || []).some((v) => String(v).toLowerCase().includes('facility') || String(v).toLowerCase().includes('capacity'));
  const start = headerGuess ? 1 : 0;

  const capacity: Record<string, number> = {};
  
  for (let r = start; r < aoa.length; r++) {
    const row = aoa[r]; if (!row) continue;
    const facility = String(row[m.facilityCol] ?? '').trim();
    const cap = Number(row[m.capacityCol]);
    if (!facility || !Number.isFinite(cap)) continue;
    
    // Apply utilization factor if provided
    let adjustedCap = cap;
    if (m.utilizationCol !== undefined) {
      const util = Number(row[m.utilizationCol]);
      if (Number.isFinite(util) && util > 0 && util <= 1) {
        adjustedCap = cap * util;
      }
    }
    
    capacity[facility] = adjustedCap;
  }
  
  return capacity;
}

// Validation helpers
export function validateMapping(headers: string[], mapping: any, type: 'demand' | 'cost' | 'capacity'): string[] {
  const errors: string[] = [];
  const maxCol = headers.length - 1;

  if (type === 'demand') {
    const dm = mapping as DemandMapping;
    if (dm.destinationCol < 0 || dm.destinationCol > maxCol) errors.push('Invalid destination column');
    if (dm.demandCol < 0 || dm.demandCol > maxCol) errors.push('Invalid demand column');
    if (dm.yearCol !== undefined && (dm.yearCol < 0 || dm.yearCol > maxCol)) errors.push('Invalid year column');
  } else if (type === 'cost') {
    const cm = mapping as CostMapping;
    if (cm.originCol < 0 || cm.originCol > maxCol) errors.push('Invalid origin column');
    if (cm.destinationCol < 0 || cm.destinationCol > maxCol) errors.push('Invalid destination column');
    
    // Must have at least one cost calculation method
    const hasCost = cm.costCol !== undefined;
    const hasMileRate = cm.costPerMileCol !== undefined && cm.distanceCol !== undefined;
    const hasCwtRate = cm.costPerCwtCol !== undefined && cm.weightCol !== undefined;
    
    if (!hasCost && !hasMileRate && !hasCwtRate) {
      errors.push('Must specify either direct cost, cost per mile + distance, or cost per CWT + weight');
    }
  } else if (type === 'capacity') {
    const cap = mapping as CapacityMapping;
    if (cap.facilityCol < 0 || cap.facilityCol > maxCol) errors.push('Invalid facility column');
    if (cap.capacityCol < 0 || cap.capacityCol > maxCol) errors.push('Invalid capacity column');
  }

  return errors;
}
