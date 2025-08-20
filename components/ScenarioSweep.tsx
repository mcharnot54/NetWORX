'use client';
import React, { useState } from 'react';
import { downloadWorkbook, exportOptimizationResults } from '@/lib/export/xlsx';

export default function ScenarioSweep() {
  const [minNodes, setMinNodes] = useState(1);
  const [maxNodes, setMaxNodes] = useState(6);
  const [criterion, setCriterion] = useState<'total_cost' | 'service_then_cost'>('total_cost');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  async function runSweep() {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Starting scenario sweep...');
      
      const payload = {
        scenario: { 
          minNodes, 
          maxNodes, 
          step: 1, 
          criterion 
        },
        config: {
          optimization: { 
            solver: 'JSLP_SOLVER', 
            weights: { cost: 0.6, utilization: 0.1, service_level: 0.3 } 
          },
          warehouse: {
            operating_days: 260,
            DOH: 14,
            pallet_length_inches: 48,
            pallet_width_inches: 40,
            ceiling_height_inches: 432,
            rack_height_inches: 96,
            aisle_factor: 0.35,
            outbound_pallets_per_door_per_day: 480,
            inbound_pallets_per_door_per_day: 480,
            max_outbound_doors: 15,
            max_inbound_doors: 12,
            outbound_area_per_door: 4000,
            inbound_area_per_door: 4000,
            min_office: 5000,
            min_battery: 3000,
            min_packing: 6000,
            max_utilization: 0.85,
            initial_facility_area: 352000,
            case_pick_area_fixed: 24000,
            each_pick_area_fixed: 44000,
            min_conveyor: 6000,
            facility_design_area: 400000,
            cost_per_sqft_annual: 8.5,
            thirdparty_cost_per_sqft: 12.0,
            max_facilities: 8,
          },
          transportation: {
            fixed_cost_per_facility: 250000,
            cost_per_mile: 2.85,
            service_level_requirement: 0.95,
            max_distance_miles: 800,
            required_facilities: 1,
            max_facilities: 10,
            max_capacity_per_facility: 15_000_000,
            mandatory_facilities: ['Littleton, MA'],
            weights: { cost: 0.6, service_level: 0.4 }
          }
        },
        forecast: [
          { year: 2025, annual_units: 13_000_000 },
          { year: 2026, annual_units: 15_600_000 },
          { year: 2027, annual_units: 18_720_000 },
        ],
        skus: [
          { sku: 'Educational_Materials_A', annual_volume: 4_000_000, units_per_case: 12, cases_per_pallet: 40 },
          { sku: 'Educational_Materials_B', annual_volume: 3_500_000, units_per_case: 24, cases_per_pallet: 35 },
          { sku: 'Educational_Materials_C', annual_volume: 2_800_000, units_per_case: 18, cases_per_pallet: 42 },
        ]
      };

      const response = await fetch('/api/optimize/simple-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minNodes, maxNodes, criterion })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Optimization failed');
      }

      setResults(data);

      // Format results for table display
      const tableData = data.scenarios
        .filter((s: any) => !s.error)
        .map((s: any) => ({
          Nodes: s.nodes,
          Facilities_Opened: s.kpis.facilities_opened,
          Service_Level: `${(s.kpis.service_level * 100).toFixed(1)}%`,
          Transport_Cost: `$${Math.round(s.kpis.transport_cost).toLocaleString()}`,
          Warehouse_Cost: `$${Math.round(s.kpis.warehouse_cost).toLocaleString()}`,
          Inventory_Cost: `$${Math.round(s.kpis.inventory_cost).toLocaleString()}`,
          Total_Cost: `$${Math.round(s.kpis.year1_total_cost).toLocaleString()}`,
          Transport_Savings: `${s.kpis.transport_savings_percent.toFixed(1)}%`,
          Avg_Distance: `${Math.round(s.kpis.avg_distance)} mi`,
          Facilities_Used: s.facilities_used?.join(', ') || 'N/A',
        }));

      setRows(tableData);
      console.log('✅ Scenario sweep completed successfully');

    } catch (e: any) {
      console.error('❌ Scenario sweep failed:', e);
      setError(e.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  function exportResults() {
    if (!results || !rows.length) return;

    try {
      exportOptimizationResults(
        results.scenarios,
        results.warehouse,
        results.inventory,
        'scenario_sweep_results.xlsx'
      );
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback to simple table export
      downloadWorkbook({ 'Scenario Results': rows }, 'scenario_sweep_fallback.xlsx');
    }
  }

  function exportSimpleXLSX() {
    if (!rows.length) return;
    downloadWorkbook({ 'Scenario Sweep': rows }, 'scenario_sweep.xlsx');
  }

  return (
    <div className="rounded-2xl p-6 border shadow-sm bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scenario Sweep Analysis</h2>
        <p className="text-gray-600">
          Evaluate network configurations from {minNodes} to {maxNodes} nodes and identify the optimal solution.
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Nodes
          </label>
          <input 
            type="number" 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={minNodes} 
            onChange={e => setMinNodes(Math.max(1, Number(e.target.value)))}
            min="1"
            max="10"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Nodes
          </label>
          <input 
            type="number" 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={maxNodes} 
            onChange={e => setMaxNodes(Math.max(minNodes, Number(e.target.value)))}
            min={minNodes}
            max="15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Optimization Criterion
          </label>
          <select 
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={criterion}
            onChange={e => setCriterion(e.target.value as 'total_cost' | 'service_then_cost')}
          >
            <option value="total_cost">Lowest Total Cost</option>
            <option value="service_then_cost">Service Level Then Cost</option>
          </select>
        </div>

        <div className="flex items-end">
          <button 
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={runSweep}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run Sweep'}
          </button>
        </div>
      </div>

      {/* Export Controls */}
      {rows.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            onClick={exportResults}
          >
            📊 Export Detailed Results
          </button>
          <button 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            onClick={exportSimpleXLSX}
          >
            📋 Export Table Only
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Running scenario analysis...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Optimization Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(rows[0]).map(header => (
                    <th 
                      key={header} 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`${
                      results?.best?.nodes === row.Nodes 
                        ? 'bg-green-50 border-l-4 border-green-400' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Best Scenario Summary */}
          {results?.best && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">🏆 Recommended Configuration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-green-700">Optimal Nodes</div>
                  <div className="text-2xl font-bold text-green-900">{results.best.nodes}</div>
                </div>
                <div>
                  <div className="font-medium text-green-700">Service Level</div>
                  <div className="text-2xl font-bold text-green-900">
                    {(results.best.kpis.service_level * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium text-green-700">Total Annual Cost</div>
                  <div className="text-2xl font-bold text-green-900">
                    ${Math.round(results.best.kpis.year1_total_cost).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-green-700">Transport Savings</div>
                  <div className="text-2xl font-bold text-green-900">
                    {results.best.kpis.transport_savings_percent.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {results.best.facilities_used && (
                <div className="mt-4">
                  <div className="font-medium text-green-700 mb-2">Selected Facilities</div>
                  <div className="text-sm text-green-800">
                    {results.best.facilities_used.join(' • ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Baseline Comparison */}
          {results?.baseline_integration && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Baseline Comparison</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-blue-700">Current Baseline</div>
                  <div className="font-bold text-blue-900">
                    ${Math.round(results.baseline_integration.transport_baseline).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-blue-700">Optimized Cost</div>
                  <div className="font-bold text-blue-900">
                    ${Math.round(results.baseline_integration.best_transport_cost).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-blue-700">Savings Achieved</div>
                  <div className="font-bold text-blue-900">
                    {results.baseline_integration.best_savings_percent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
