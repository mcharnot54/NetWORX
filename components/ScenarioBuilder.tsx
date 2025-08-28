'use client';
import React from 'react';
import { useState } from 'react';
import { OptimizationConfig, ForecastRow, SKU, CostMatrix, DemandMap } from '@/types/advanced-optimization';
import clsx from 'clsx';
import { parseDemandFile, parseCostMatrixFile } from '@/lib/importers/parse';
import ColumnMapper from '@/components/ColumnMapper';
import { mapDemandAoA, mapCostAoA, mapCapacityAoA, DemandMapping, CostMapping, CapacityMapping } from '@/lib/importers/map';

export default function ScenarioBuilder({ onRun }: { onRun: (payload: any) => Promise<void> }) {
  const [config, setConfig] = useState<OptimizationConfig>({
    optimization: { solver: 'JSLP_SOLVER', weights: { cost: 0.6, utilization: 0.1, service_level: 0.3 } },
    warehouse: {
      operating_days: 260,
      DOH: 10,
      pallet_length_inches: 48,
      pallet_width_inches: 40,
      ceiling_height_inches: 432,
      rack_height_inches: 96,
      aisle_factor: 0.35,
      outbound_pallets_per_door_per_day: 800,
      inbound_pallets_per_door_per_day: 800,
      max_outbound_doors: 40,
      max_inbound_doors: 40,
      outbound_area_per_door: 1200,
      inbound_area_per_door: 1200,
      min_office: 5000,
      min_battery: 3000,
      min_packing: 6000,
      max_utilization: 0.85,
      initial_facility_area: 250000,
      case_pick_area_fixed: 15000,
      each_pick_area_fixed: 8000,
      min_conveyor: 6000,
      facility_design_area: 400000,
      cost_per_sqft_annual: 8.5,
      thirdparty_cost_per_sqft: 12,
      max_facilities: 8,
    },
    transportation: {
      fixed_cost_per_facility: 150000,
      cost_per_mile: 2.5,
      service_level_requirement: 0.95,
      max_distance_miles: 900,
      required_facilities: 1,
      max_facilities: 10,
      max_capacity_per_facility: 5_000_000,
      mandatory_facilities: [],
      weights: { cost: 0.6, service_level: 0.3 },
      lease_years: 7,
    },
  });
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [costMatrix, setCostMatrix] = useState<CostMatrix>({ rows: [], cols: [], cost: [] });
  const [baselineDemand, setBaselineDemand] = useState<DemandMap | undefined>(undefined);
  const [capacityMap, setCapacityMap] = useState<Record<string, number> | undefined>(undefined);
  const [status, setStatus] = useState<string>('');

  // Server upload state
  const [preview, setPreview] = useState<{ rows: any[][]; headers: string[] } | null>(null);
  const [mapKind, setMapKind] = useState<'demand' | 'demand-per-year' | 'cost' | 'capacity' | null>(null);

  // Legacy client-side upload functions
  async function onDemandUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      setStatus('Parsing demand…');
      const parsed = await parseDemandFile(f);
      if (parsed.byYear) {
        // If per-year provided, choose the first year in forecast if present
        const y = forecast[0]?.year; if (y && parsed.byYear[y]) setBaselineDemand(parsed.byYear[y]);
      } else if (parsed.base) {
        setBaselineDemand(parsed.base);
      }
      setStatus('Demand loaded');
    } catch (err:any) { setStatus('Demand parse error: ' + err.message); }
  }

  async function onMatrixUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      setStatus('Parsing matrix…');
      const m = await parseCostMatrixFile(f);
      setCostMatrix(m);
      setStatus('Matrix loaded');
    } catch (err:any) { setStatus('Matrix parse error: ' + err.message); }
  }

  // Enhanced server-side upload with preview
  async function serverPreview(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Upload failed');
    const rows: any[][] = data.rows || [];
    const headers = (rows[0] || []).map((h:any)=>String(h));
    setPreview({ rows, headers });
    return { rows, headers };
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>, kind: 'demand' | 'demand-per-year' | 'cost' | 'capacity') {
    const f = e.target.files?.[0]; if (!f) return;
    setMapKind(kind as any);
    setStatus('Uploading…');
    try { await serverPreview(f); setStatus('File loaded. Map the columns, then Apply.'); }
    catch (err:any) { setStatus('Upload error: ' + err.message); }
  }

  function applyMapping(mapping: DemandMapping | CostMapping | CapacityMapping) {
    if (!preview) return;
    try {
      if (mapKind === 'demand' || mapKind === 'demand-per-year') {
        const dem = mapDemandAoA(preview.rows, mapping as DemandMapping);
        const base = dem.base ?? (dem.byYear ? dem.byYear[forecast[0]?.year] : undefined);
        if (!base) throw new Error('No demand rows parsed.');
        setBaselineDemand(base);
        setStatus(`✅ Demand mapped: ${Object.keys(base).length} destinations, ${Object.values(base).reduce((s, v) => s + v, 0).toLocaleString()} total units.`);
      } else if (mapKind === 'cost') {
        const cm = mapCostAoA(preview.rows, mapping as CostMapping);
        setCostMatrix(cm);
        setStatus(`✅ Cost matrix mapped: ${cm.rows.length} origins × ${cm.cols.length} destinations.`);
      } else if (mapKind === 'capacity') {
        const cap = mapCapacityAoA(preview.rows, mapping as CapacityMapping);
        setCapacityMap(cap);
        setStatus(`✅ Capacity mapped: ${Object.keys(cap).length} facilities.`);
      }
      setPreview(null);
      setMapKind(null);
    } catch (err: any) {
      setStatus('❌ Mapping error: ' + err.message);
    }
  }

  const canRun = !!baselineDemand && costMatrix.rows.length > 0 && costMatrix.cols.length > 0;

  async function handleRunClick() {
    if (!canRun) {
      setStatus('Please upload and map Demand and Cost Matrix before running.');
      return;
    }

    setStatus('Running optimizer…');
    try {
      const payload = {
        config,
        forecast,
        skus,
        costMatrix,
        demand: baselineDemand,
        capacity: capacityMap
      };

      await onRun(payload);
      setStatus('Optimization submitted.');
    } catch (err:any) {
      console.error(err);
      setStatus('Optimization error: ' + (err?.message || String(err)));
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl p-4 border shadow-sm">
        <h2 className="text-xl font-semibold">Enhanced Scenario Builder</h2>
        <p className="text-sm text-gray-500">
          Upload large files with automatic column mapping. Perfect for CSV/XLSX/XLSB files that need field mapping.
        </p>

        <div className="mt-3 grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Upload Demand (baseline)</label>
            <input type="file" accept=".csv,.xlsx,.xls,.xlsb" onChange={(e)=>onUpload(e,'demand')} className="block mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Upload Demand (per-year)</label>
            <input type="file" accept=".csv,.xlsx,.xls,.xlsb" onChange={(e)=>onUpload(e,'demand-per-year')} className="block mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Upload Cost Matrix (long form)</label>
            <input type="file" accept=".csv,.xlsx,.xls,.xlsb" onChange={(e)=>onUpload(e,'cost')} className="block mt-1" />
          </div>
        </div>

        {preview && mapKind && (
          <div className="mt-3 grid gap-3">
            <div className="rounded-xl border p-2 overflow-auto">
              <div className="text-xs text-gray-500 mb-1">Preview (first 10 rows):</div>
              <table className="text-xs">
                <thead>
                  <tr>
                    {preview.headers.map((h,i)=>(<th key={i} className="px-2 py-1 border-b text-left">{h || '(blank)'}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(1, Math.min(11, preview.rows.length)).map((r,ri)=>(
                    <tr key={ri}>
                      {preview.headers.map((_,ci)=>(<td key={ci} className="px-2 py-1 border-b">{String(r[ci] ?? '')}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ColumnMapper headers={preview.headers} kind={mapKind} onApply={applyMapping} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            className={clsx('px-4 py-2 rounded-xl shadow', canRun ? 'bg-black text-white' : 'bg-gray-200 text-gray-500')}
            onClick={handleRunClick}
            disabled={!canRun}
          >
            Run Optimizer
          </button>
          <span className="text-xs text-gray-500">{status}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <pre className="rounded-2xl p-3 border bg-gray-50 overflow-auto text-xs">{JSON.stringify(config || {}, null, 2)}</pre>
        <pre className="rounded-2xl p-3 border bg-gray-50 overflow-auto text-xs">{JSON.stringify({ forecast, skus }, null, 2)}</pre>
        <pre className="rounded-2xl p-3 border bg-gray-50 overflow-auto text-xs md:col-span-2">{JSON.stringify({ costMatrix_preview: { origins: costMatrix.rows.length, destinations: costMatrix.cols.length }, demand_loaded: !!baselineDemand }, null, 2)}</pre>
      </div>
    </div>
  );
}
