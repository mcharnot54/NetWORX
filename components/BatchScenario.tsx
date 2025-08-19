'use client';
import React, { useState } from 'react';
import { downloadWorkbook } from '@/lib/export/xlsx';

interface BatchScenarioProps {
  payload?: any;
}

export default function BatchScenario({ payload }: BatchScenarioProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minNodes, setMinNodes] = useState(1);
  const [maxNodes, setMaxNodes] = useState(5);

  async function runBatch(customMin?: number, customMax?: number) {
    const actualMin = customMin || minNodes;
    const actualMax = customMax || maxNodes;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🚀 Running batch scenarios: ${actualMin}-${actualMax} nodes`);
      
      const batchPayload = payload || {
        config: {
          optimization: { 
            solver: 'JSLP_SOLVER', 
            weights: { cost: 0.6, utilization: 0.1, service_level: 0.3 } 
          },
          warehouse: {
            operating_days: 260,
            DOH: 14,
            cost_per_sqft_annual: 8.5,
            max_utilization: 0.85,
          },
          transportation: {
            fixed_cost_per_facility: 150000,
            cost_per_mile: 2.5,
            service_level_requirement: 0.95,
            max_distance_miles: 900,
            required_facilities: 1,
            max_facilities: 10,
            weights: { cost: 0.6, service_level: 0.3 }
          }
        },
        forecast: [
          { year: 2025, annual_units: 12_000_000 },
          { year: 2026, annual_units: 13_800_000 },
          { year: 2027, annual_units: 15_180_000 }
        ],
        skus: [
          { sku: 'A', annual_volume: 2_000_000, units_per_case: 6, cases_per_pallet: 42 },
          { sku: 'B', annual_volume: 1_200_000, units_per_case: 12, cases_per_pallet: 36 },
          { sku: 'C', annual_volume: 800_000, units_per_case: 24, cases_per_pallet: 35 }
        ]
      };

      const response = await fetch('/api/optimize/simple-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minNodes: actualMin,
          maxNodes: actualMax
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Batch run failed');
      }

      // Transform data for display
      const runData = data.scenarios.map((scenario: any) => ({
        Nodes: scenario.nodes,
        Total_Cost: scenario.kpis?.year1_total_cost || 0,
        Transport_Cost: scenario.kpis?.transport_cost || 0,
        Warehouse_Cost: scenario.kpis?.warehouse_cost || 0,
        Inventory_Cost: scenario.kpis?.inventory_cost || 0,
        Service_Level: scenario.kpis?.service_level || 0,
        Facilities_Opened: scenario.kpis?.facilities_opened || 0,
        Transport_Savings_Percent: scenario.kpis?.transport_savings_percent || 0,
        Error: scenario.error || null,
      }));

      setRuns(runData);
      console.log(`✅ Batch completed: ${runData.length} scenarios`);

    } catch (e: any) {
      console.error('❌ Batch run failed:', e);
      setError(e.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  function downloadXlsx() {
    if (!runs.length) return;

    const exportData = runs.map(r => ({
      Nodes: r.Nodes,
      'Total Cost': `$${Math.round(r.Total_Cost).toLocaleString()}`,
      'Transport Cost': `$${Math.round(r.Transport_Cost).toLocaleString()}`,
      'Warehouse Cost': `$${Math.round(r.Warehouse_Cost).toLocaleString()}`,
      'Inventory Cost': `$${Math.round(r.Inventory_Cost).toLocaleString()}`,
      'Service Level': `${(r.Service_Level * 100).toFixed(1)}%`,
      'Facilities Opened': r.Facilities_Opened,
      'Transport Savings': `${r.Transport_Savings_Percent.toFixed(1)}%`,
      Status: r.Error ? 'Failed' : 'Success'
    }));

    downloadWorkbook({ 'Batch Results': exportData }, 'batch_results.xlsx');
  }

  const successfulRuns = runs.filter(r => !r.Error);
  const bestRun = successfulRuns.length > 0 
    ? successfulRuns.reduce((best, current) => 
        current.Total_Cost < best.Total_Cost ? current : best
      )
    : null;

  return (
    <div className="rounded-2xl p-6 border shadow-sm bg-white">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Batch Scenario Runner</h2>
        <p className="text-sm text-gray-600">
          Run multiple optimization scenarios and compare results across different node configurations.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Min:</label>
          <input 
            type="number" 
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            value={minNodes} 
            onChange={e => setMinNodes(Math.max(1, Number(e.target.value)))}
            min="1" 
            max="10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Max:</label>
          <input 
            type="number" 
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            value={maxNodes} 
            onChange={e => setMaxNodes(Math.max(minNodes, Number(e.target.value)))}
            min={minNodes} 
            max="15"
          />
        </div>

        <button 
          onClick={() => runBatch()} 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Running...' : `Run ${minNodes}–${maxNodes} Nodes`}
        </button>

        <button 
          onClick={() => runBatch(1, 5)} 
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400"
          disabled={loading}
        >
          Quick Run (1–5)
        </button>

        {runs.length > 0 && (
          <button 
            onClick={downloadXlsx} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            📊 Download XLSX
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Running batch scenarios...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Best Result Highlight */}
      {bestRun && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-800 mb-2">🏆 Best Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-green-700">Nodes</div>
              <div className="font-bold text-green-900">{bestRun.Nodes}</div>
            </div>
            <div>
              <div className="text-green-700">Total Cost</div>
              <div className="font-bold text-green-900">
                ${Math.round(bestRun.Total_Cost).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-green-700">Service Level</div>
              <div className="font-bold text-green-900">
                {(bestRun.Service_Level * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-green-700">Transport Savings</div>
              <div className="font-bold text-green-900">
                {bestRun.Transport_Savings_Percent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {runs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nodes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Facilities</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transport Savings</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map((run, idx) => (
                <tr 
                  key={idx} 
                  className={`${
                    run === bestRun 
                      ? 'bg-green-50 border-l-4 border-green-400' 
                      : run.Error 
                        ? 'bg-red-50' 
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{run.Nodes}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {run.Error ? 'N/A' : `$${Math.round(run.Total_Cost).toLocaleString()}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {run.Error ? 'N/A' : `${(run.Service_Level * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {run.Error ? 'N/A' : run.Facilities_Opened}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {run.Error ? 'N/A' : `${run.Transport_Savings_Percent.toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {run.Error ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Success
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {runs.length > 0 && (
        <div className="mt-6 text-sm text-gray-600">
          <p>
            📊 Summary: {successfulRuns.length}/{runs.length} scenarios successful
            {successfulRuns.length > 1 && (
              <>
                {' • '}Cost range: ${Math.min(...successfulRuns.map(r => r.Total_Cost)).toLocaleString()} - 
                ${Math.max(...successfulRuns.map(r => r.Total_Cost)).toLocaleString()}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
