'use client';
import React, { useState } from 'react';
import { exportToXlsx } from '@/lib/export/xlsx';

export default function BatchScenario({ payload }: { payload: any }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function runBatch(minNodes: number, maxNodes: number) {
    setLoading(true);
    try {
      const res = await fetch('/api/optimize/run-batch', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, scenario: { minNodes, maxNodes } }) 
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setRuns(data.scenarios || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function downloadXlsx() {
    const flat = runs.map(r => ({ 
      Nodes: r.nodes, 
      Cost: r.kpis?.total_network_cost_all_years || 0,
      Service_Level: ((r.kpis?.weighted_service_level || 0) * 100).toFixed(2) + '%',
      Transport_Cost: r.kpis?.total_transport_cost_all_years || 0,
      Warehouse_Cost: r.kpis?.total_warehouse_cost_all_years || 0
    }));
    const blob = exportToXlsx({ Scenarios: flat });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_results.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl p-4 border shadow-sm">
      <h2 className="text-xl font-semibold">Batch Scenarios</h2>
      <div className="flex gap-2 mt-2">
        <button onClick={() => runBatch(1, 5)} className="px-4 py-2 bg-black text-white rounded-xl">Run 1–5 Nodes</button>
        {runs.length > 0 && <button onClick={downloadXlsx} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Download XLSX</button>}
      </div>
      {loading && <p className="text-sm text-gray-500">Running batch…</p>}
      {runs.length > 0 && (
        <pre className="mt-3 text-xs bg-gray-50 p-3 rounded-2xl overflow-auto">{JSON.stringify(runs, null, 2)}</pre>
      )}
    </div>
  );
}
