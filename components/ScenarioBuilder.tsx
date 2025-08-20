'use client';
import React from 'react';
import { useState } from 'react';
import { OptimizationConfig, ForecastRow, SKU, CostMatrix, DemandMap } from '@/types/advanced-optimization';
import clsx from 'clsx';
import { parseDemandFile, parseCostMatrixFile } from '@/lib/importers/parse';
import ColumnMapper from '@/components/ColumnMapper';
import { mapDemandAoA, mapCostAoA, mapCapacityAoA, DemandMapping, CostMapping, CapacityMapping } from '@/lib/importers/map';

export default function ScenarioBuilder({ onRun }: { onRun: (payload: any) => Promise<void> }) {
  const [config, setConfig] = useState<OptimizationConfig>(defaultConfig);
  const [forecast, setForecast] = useState<ForecastRow[]>(defaultForecast);
  const [skus, setSkus] = useState<SKU[]>(defaultSkus);
  const [costMatrix, setCostMatrix] = useState<CostMatrix>(defaultMatrix);
  const [baselineDemand, setBaselineDemand] = useState<DemandMap | undefined>(undefined);
  const [capacityMap, setCapacityMap] = useState<Record<string, number> | undefined>(undefined);
  const [status, setStatus] = useState<string>('');

  // Server upload state
  const [preview, setPreview] = useState<{ rows: any[][]; headers: string[]; stats?: any } | null>(null);
  const [mapKind, setMapKind] = useState<'demand' | 'demand-per-year' | 'cost' | 'capacity' | null>(null);
  const [uploadMode, setUploadMode] = useState<'client' | 'server'>('server');

  // Legacy client-side upload functions
  async function onDemandUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      setStatus('Parsing demand…');
      const parsed = await parseDemandFile(f);
      if (parsed.byYear) {
        // If per-year provided, choose the first year that matches forecast[0]
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
    const headers = data.headers || (rows[0] || []).map((h: any) => String(h));

    setPreview({ rows, headers, stats: data.stats });
    return { rows, headers, stats: data.stats };
  }

  async function onServerUpload(e: React.ChangeEvent<HTMLInputElement>, kind: 'demand' | 'demand-per-year' | 'cost' | 'capacity') {
    const f = e.target.files?.[0]; if (!f) return;
    setMapKind(kind);
    setStatus('Uploading and processing file...');
    try {
      const result = await serverPreview(f);
      setStatus(`File processed: ${result.stats?.totalRows || 'unknown'} rows. Map columns and apply.`);
    }
    catch (err: any) { setStatus('Upload error: ' + err.message); }
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

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl p-4 border shadow-sm">
        <h2 className="text-xl font-semibold">Enhanced Scenario Builder</h2>
        <p className="text-sm text-gray-500">
          Upload large files with automatic column mapping. Perfect for CSV/XLSX/XLSB files that need field mapping.
        </p>

        {/* Upload Mode Toggle */}
        <div className="mt-3 flex gap-2 items-center">
          <span className="text-sm font-medium">Upload Mode:</span>
          <button
            onClick={() => setUploadMode('server')}
            className={clsx('px-3 py-1 text-xs rounded-lg',
              uploadMode === 'server' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            )}
          >
            Server (Big Files + Mapping)
          </button>
          <button
            onClick={() => setUploadMode('client')}
            className={clsx('px-3 py-1 text-xs rounded-lg',
              uploadMode === 'client' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            )}
          >
            Client (Auto-Parse)
          </button>
        </div>

        {uploadMode === 'server' ? (
          <div className="mt-4 space-y-3">
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Demand (Baseline)</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => onServerUpload(e, 'demand')}
                  className="block mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Demand (Per Year)</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => onServerUpload(e, 'demand-per-year')}
                  className="block mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Cost Matrix</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => onServerUpload(e, 'cost')}
                  className="block mt-1 text-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Facility Capacity</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => onServerUpload(e, 'capacity')}
                  className="block mt-1 text-xs"
                />
              </div>
            </div>

            {/* File Stats */}
            {preview?.stats && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <strong>File Stats:</strong> {preview.stats.fileSizeFormatted}, {preview.stats.totalRows} rows, {preview.stats.totalColumns} columns
                {preview.stats.sheetNames && ` (Sheets: ${preview.stats.sheetNames.join(', ')})`}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Upload Destination Demand (CSV/XLSX)</label>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={onDemandUpload} className="block mt-1" />
              {baselineDemand && <div className="text-xs text-green-700 mt-1">Loaded {Object.keys(baselineDemand).length} destinations.</div>}
            </div>
            <div>
              <label className="text-sm font-medium">Upload Cost Matrix (CSV/XLSX)</label>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={onMatrixUpload} className="block mt-1" />
              <div className="text-xs text-gray-600 mt-1">Supports wide (row=Origin, col=Destination) or long (Origin,Destination,Cost) formats.</div>
            </div>
          </div>
        )}

        {/* Column Mapping Interface */}
        {preview && mapKind && (
          <div className="mt-4">
            <ColumnMapper
              headers={preview.headers}
              kind={mapKind}
              onApply={applyMapping}
              initialData={preview.rows}
            />
          </div>
        )}

        {/* Status and Run Button */}
        <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
          <span className="text-xs text-gray-500 flex-grow">{status}</span>
          <button
            className={clsx('px-4 py-2 rounded-xl shadow', 'bg-black text-white hover:bg-gray-800')}
            onClick={() => onRun({
              config,
              forecast,
              skus,
              costMatrix,
              demand: baselineDemand,
              capacity: capacityMap
            })}
          >
            Run Optimizer
          </button>
        </div>

        {/* Data Summary */}
        <div className="mt-3 grid md:grid-cols-3 gap-2 text-xs">
          <div className={clsx('p-2 rounded border', baselineDemand ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
            <div className="font-medium">Demand Data</div>
            <div>{baselineDemand ? `${Object.keys(baselineDemand).length} destinations` : 'Not loaded'}</div>
          </div>
          <div className={clsx('p-2 rounded border', costMatrix.rows.length > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
            <div className="font-medium">Cost Matrix</div>
            <div>{costMatrix.rows.length > 0 ? `${costMatrix.rows.length}×${costMatrix.cols.length}` : 'Default matrix'}</div>
          </div>
          <div className={clsx('p-2 rounded border', capacityMap ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
            <div className="font-medium">Capacity Data</div>
            <div>{capacityMap ? `${Object.keys(capacityMap).length} facilities` : 'Not loaded'}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <pre className="rounded-2xl p-3 border bg-gray-50 overflow-auto text-xs">{JSON.stringify(config, null, 2)}</pre>
        <pre className="rounded-2xl p-3 border bg-gray-50 overflow-auto text-xs">{JSON.stringify({ forecast, skus }, null, 2)}</pre>
        <pre className="rounded-2xl p-3 border bg-gray-50 overflow-auto text-xs md:col-span-2">{JSON.stringify({ costMatrix, baselineDemand }, null, 2)}</pre>
      </div>
    </div>
  );
}

const defaultConfig: OptimizationConfig = {
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
  },
};

const defaultForecast: ForecastRow[] = [
  { year: 2026, annual_units: 12_000_000 },
  { year: 2027, annual_units: 13_800_000 },
  { year: 2028, annual_units: 15_180_000 },
];

const defaultSkus: SKU[] = [
  { sku: 'A', annual_volume: 2_000_000, units_per_case: 6, cases_per_pallet: 42 },
  { sku: 'B', annual_volume: 1_200_000, units_per_case: 12, cases_per_pallet: 36 },
  { sku: 'C', annual_volume: 800_000, units_per_case: 24, cases_per_pallet: 35 },
];

const defaultMatrix: CostMatrix = {
  rows: ['St. Louis, MO', 'Reno, NV', 'Atlanta, GA'],
  cols: ['Seattle, WA', 'Dallas, TX', 'Chicago, IL', 'Miami, FL'],
  cost: [ [6.2, 3.1, 2.0, 4.8], [2.7, 4.6, 5.7, 7.9], [6.5, 2.3, 1.8, 2.1] ],
};
