// Robust CSV/XLSX parsers for Demand and Cost Matrix
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { CostMatrix, DemandMap } from '@/types/advanced-optimization';

function rowsFromCsv(text: string) {
  const { data } = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
  return data as any[];
}

function sheetToAoA(ws: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
}

export async function parseFileToAoA(file: File): Promise<any[][]> {
  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = new TextDecoder().decode(buf);
    return rowsFromCsv(text);
  }
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return sheetToAoA(ws);
}

export async function parseDemandFile(file: File): Promise<{ base?: DemandMap; byYear?: Record<number, DemandMap> }> {
  const aoa = await parseFileToAoA(file);
  if (!aoa.length) throw new Error('Empty demand file');
  const header = (aoa[0] || []).map((h: any) => String(h || '').trim());
  const lower = header.map((h) => h.toLowerCase());

  const idxDest = lower.indexOf('destination') >= 0 ? lower.indexOf('destination') : 0;
  const idxYear = lower.indexOf('year');
  const idxDemand = lower.findIndex((h) => ['demand','units','volume'].includes(h));

  const hasHeader = lower.includes('destination') || lower.includes('demand') || lower.includes('units');
  const start = hasHeader ? 1 : 0;

  if (idxYear >= 0 && idxDemand >= 0) {
    // Per-year format: Destination, Year, Demand
    const byYear: Record<number, DemandMap> = {};
    for (let r = start; r < aoa.length; r++) {
      const row = aoa[r]; if (!row || row.length < 2) continue;
      const dest = String(row[idxDest] ?? '').trim();
      const yr = Number(row[idxYear]);
      const dem = Number(row[idxDemand]);
      if (!dest || !Number.isFinite(yr) || !Number.isFinite(dem)) continue;
      byYear[yr] = byYear[yr] || {};
      byYear[yr][dest] = (byYear[yr][dest] ?? 0) + dem;
    }
    return { byYear };
  }

  // Baseline format: Destination, Demand
  const base: DemandMap = {};
  const dIdx = idxDemand >= 0 ? idxDemand : 1;
  for (let r = start; r < aoa.length; r++) {
    const row = aoa[r]; if (!row || row.length < 2) continue;
    const dest = String(row[idxDest] ?? '').trim();
    const dem = Number(row[dIdx]);
    if (!dest || !Number.isFinite(dem)) continue;
    base[dest] = (base[dest] ?? 0) + dem;
  }
  return { base };
}

export async function parseCostMatrixFile(file: File): Promise<CostMatrix> {
  const aoa = await parseFileToAoA(file);
  if (!aoa.length) throw new Error('Empty cost matrix file');

  // Try long form: Origin,Destination,Cost
  const header = (aoa[0] || []).map((h: any) => String(h || '').trim());
  const lower = header.map((h) => h.toLowerCase());
  const hasLong = lower.includes('origin') && lower.includes('destination') && (lower.includes('cost') || lower.includes('cost_per_unit'));

  if (hasLong) {
    const iO = lower.indexOf('origin');
    const iD = lower.indexOf('destination');
    const iC = lower.includes('cost_per_unit') ? lower.indexOf('cost_per_unit') : lower.indexOf('cost');
    const rowsSet = new Set<string>();
    const colsSet = new Set<string>();
    const triples: Array<[string,string,number]> = [];
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r]; if (!row) continue;
      const o = String(row[iO] ?? '').trim();
      const d = String(row[iD] ?? '').trim();
      const c = Number(row[iC]);
      if (!o || !d || !Number.isFinite(c)) continue;
      rowsSet.add(o); colsSet.add(d); triples.push([o,d,c]);
    }
    const rows = [...rowsSet];
    const cols = [...colsSet];
    const indexR = Object.fromEntries(rows.map((v,i)=>[v,i]));
    const indexC = Object.fromEntries(cols.map((v,i)=>[v,i]));
    const cost = Array.from({ length: rows.length }, () => Array(cols.length).fill(Infinity));
    for (const [o,d,c] of triples) cost[indexR[o]][indexC[d]] = c;
    return { rows, cols, cost };
  }

  // Try wide matrix: first row headers are destinations, first column origins
  const first = aoa[0];
  const cols = (first.slice(1) as any[]).map((v) => String(v ?? '').trim()).filter(Boolean);
  const rows: string[] = [];
  const cost: number[][] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r]; if (!row) continue;
    const origin = String(row[0] ?? '').trim();
    if (!origin) continue;
    rows.push(origin);
    const line: number[] = [];
    for (let c = 1; c < row.length && c <= cols.length; c++) {
      const val = Number(row[c]);
      line.push(Number.isFinite(val) ? val : Infinity);
    }
    while (line.length < cols.length) line.push(Infinity);
    cost.push(line);
  }
  if (!rows.length || !cols.length) throw new Error('Cost matrix format not recognized');
  return { rows, cols, cost };
}
