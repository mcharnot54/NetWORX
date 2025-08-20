'use client';
import React from 'react';
import { useState } from 'react';
import Navigation from '@/components/Navigation';
import ScenarioBuilder from '@/components/ScenarioBuilder';

export default function OptimizerPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun(payload: any) {
    setLoading(true);
    setError(null);
    try {
      // For now, we'll just run a single optimization
      const response = await fetch('/api/optimize/run-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          scenario: { minNodes: 2, maxNodes: 2 } // Single run
        })
      });
      
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Optimization failed');
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="p-6 grid gap-6">
          <div>
            <h1 className="text-2xl font-bold">Network Optimizer</h1>
            <p className="text-gray-600">Upload your data files and run network optimization scenarios.</p>
          </div>
          
          <ScenarioBuilder onRun={handleRun} />
          
          {loading && (
            <div className="rounded-2xl p-4 border shadow-sm">
              <div className="text-center">
                <div className="text-lg font-medium">Running optimization...</div>
                <div className="text-sm text-gray-500">This may take a moment</div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="rounded-2xl p-4 border border-red-200 bg-red-50 shadow-sm">
              <div className="text-red-700 font-medium">Error</div>
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          )}
          
          {result && (
            <div className="rounded-2xl p-4 border shadow-sm">
              <h2 className="text-xl font-semibold mb-3">Optimization Results</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Best Scenario</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Nodes:</strong> {result.best?.nodes}</div>
                    <div><strong>Service Level:</strong> {(result.best?.kpis?.weighted_service_level * 100).toFixed(1)}%</div>
                    <div><strong>Total Cost:</strong> ${result.best?.kpis?.total_network_cost_all_years?.toLocaleString()}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Summary</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Scenarios Run:</strong> {result.batch_summary?.scenarios_run}</div>
                    <div><strong>Successful:</strong> {result.batch_summary?.successful_scenarios}</div>
                    <div><strong>Transport Savings:</strong> {result.best?.kpis?.transport_savings_percent?.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="font-medium mb-2">All Scenarios</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 border-b">Nodes</th>
                        <th className="text-left px-3 py-2 border-b">Service Level</th>
                        <th className="text-left px-3 py-2 border-b">Total Cost</th>
                        <th className="text-left px-3 py-2 border-b">Transport Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scenarios?.map((s: any, i: number) => (
                        <tr key={i} className="odd:bg-white even:bg-gray-50">
                          <td className="px-3 py-1 border-b">{s.nodes}</td>
                          <td className="px-3 py-1 border-b">{(s.kpis?.weighted_service_level * 100).toFixed(1)}%</td>
                          <td className="px-3 py-1 border-b">${s.kpis?.total_network_cost_all_years?.toLocaleString()}</td>
                          <td className="px-3 py-1 border-b">${s.kpis?.total_transport_cost_all_years?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
