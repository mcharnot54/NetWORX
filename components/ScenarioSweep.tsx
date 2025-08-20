'use client';
import React from 'react';
import { useState } from 'react';
import { downloadWorkbook } from '@/lib/export/xlsx';

export default function ScenarioSweep() {
  const [minNodes, setMinNodes] = useState(1);
  const [maxNodes, setMaxNodes] = useState(6);
  const [leaseYears, setLeaseYears] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [best, setBest] = useState<any | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const demo = await buildDemoPayload();
      // Apply lease years to transportation config
      (demo.config.transportation as any).lease_years = leaseYears;
      const batchRes = await fetch('/api/optimize/run-batch', {
        method: 'POST',
        body: JSON.stringify({ ...demo, scenario: { minNodes, maxNodes } })
      });
      const data = await batchRes.json();
      if (!data.ok) throw new Error(data.error || 'Run failed');

      const table = data.scenarios.map((s: any) => ({
        Nodes: s.nodes,
        Weighted_Service: (s.kpis.weighted_service_level * 100).toFixed(2) + '%',
        Transport_All_Years: Math.round(s.kpis.total_transport_cost_all_years),
        Warehouse_All_Years: Math.round(s.kpis.total_warehouse_cost_all_years),
        Network_All_Years: Math.round(s.kpis.total_network_cost_all_years),
      }));
      setRows(table);
      setBest(data.best);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  function exportXLSX() {
    if (!rows.length) return;
    downloadWorkbook({ 'Scenario Sweep (All Years)': rows }, 'scenario_sweep_all_years.xlsx');
  }

  return (
    <div className="rounded-2xl p-4 border shadow-sm grid gap-3">
      <h2 className="text-xl font-semibold">Scenario Sweep (Nodes, Multi-Year)</h2>
      <div className="flex gap-2 items-end">
        <label className="text-sm">Min
          <input type="number" className="ml-2 border rounded px-2 py-1 w-20" value={minNodes} onChange={e=>setMinNodes(Number(e.target.value))} />
        </label>
        <label className="text-sm">Max
          <input type="number" className="ml-2 border rounded px-2 py-1 w-20" value={maxNodes} onChange={e=>setMaxNodes(Number(e.target.value))} />
        </label>
        <label className="text-sm">Lease Years
          <input type="number" className="ml-2 border rounded px-2 py-1 w-20" value={leaseYears} onChange={e=>setLeaseYears(Number(e.target.value))} />
        </label>
        <button className="px-3 py-2 rounded-xl bg-black text-white" onClick={run}>Run Sweep</button>
        <button className="px-3 py-2 rounded-xl border" onClick={exportXLSX} disabled={!rows.length}>Download XLSX</button>
      </div>
      {loading && <div className="text-sm text-gray-500">Running…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!!rows.length && (
        <table className="text-sm border rounded overflow-hidden">
          <thead className="bg-gray-50"><tr>
            {Object.keys(rows[0]).map(h => <th key={h} className="text-left px-3 py-2 border-b">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-gray-50">
                {Object.values(r).map((v,i) => <td key={i} className="px-3 py-1 border-b">{String(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {best && (
        <div className="space-y-4">
          <div className="text-sm bg-green-50 border border-green-200 rounded p-3">
            <div className="font-medium text-green-800 mb-2">🏆 Recommended Configuration</div>
            <div><strong>Optimal Nodes:</strong> {best.nodes}</div>
            <div><strong>Weighted Service Level:</strong> {(best.kpis.weighted_service_level*100).toFixed(2)}%</div>
            <div><strong>Total Network Cost (All Years):</strong> ${Math.round(best.kpis.total_network_cost_all_years).toLocaleString()}</div>
          </div>

          <button
            onClick={() => openDetailedAnalysis(best)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>📊</span>
            View Detailed Multi-Year Analysis
          </button>
        </div>
      )}
    </div>
  );
}

async function buildDemoPayload() {
  const config = {
    optimization: { solver: 'JSLP_SOLVER', weights: { cost: 0.6, utilization: 0.1, service_level: 0.3 } },
    warehouse: {
      operating_days: 260, DOH: 10, pallet_length_inches: 48, pallet_width_inches: 40,
      ceiling_height_inches: 432, rack_height_inches: 96, aisle_factor: 0.35,
      outbound_pallets_per_door_per_day: 800, inbound_pallets_per_door_per_day: 800,
      max_outbound_doors: 40, max_inbound_doors: 40, outbound_area_per_door: 1200, inbound_area_per_door: 1200,
      min_office: 5000, min_battery: 3000, min_packing: 6000, max_utilization: 0.85, initial_facility_area: 250000,
      case_pick_area_fixed: 15000, each_pick_area_fixed: 8000, min_conveyor: 6000, facility_design_area: 400000,
      cost_per_sqft_annual: 8.5, thirdparty_cost_per_sqft: 12, max_facilities: 8,
    },
    transportation: {
      fixed_cost_per_facility: 150000, cost_per_mile: 2.5, service_level_requirement: 0.95, max_distance_miles: 900,
      required_facilities: 1, max_facilities: 10, max_capacity_per_facility: 5_000_000, mandatory_facilities: [],
      weights: { cost: 0.6, service_level: 0.3 }, lease_years: 7,
    }
  } as any;
  const forecast = [ { year: 2026, annual_units: 12_000_000 }, { year: 2027, annual_units: 13_800_000 }, { year: 2028, annual_units: 15_180_000 } ];
  const skus = [ { sku: 'A', annual_volume: 2_000_000, units_per_case: 6, cases_per_pallet: 42 }, { sku: 'B', annual_volume: 1_200_000, units_per_case: 12, cases_per_pallet: 36 }, { sku: 'C', annual_volume: 800_000, units_per_case: 24, cases_per_pallet: 35 } ];
  const costMatrix = { rows: ['St. Louis, MO', 'Reno, NV', 'Atlanta, GA'], cols: ['Seattle, WA', 'Dallas, TX', 'Chicago, IL', 'Miami, FL'], cost: [[6.2,3.1,2.0,4.8],[2.7,4.6,5.7,7.9],[6.5,2.3,1.8,2.1]] };
  return { config, forecast, skus, costMatrix };
}
