"use client";

import { useState } from 'react';

export default function DebugExtraction() {
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const debugRLFile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-rl-specifically');
      const data = await response.json();
      setDebugData({ type: 'R&L', data });
    } catch (error) {
      setDebugData({ type: 'R&L', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setIsLoading(false);
  };

  const debugTLFile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/diagnose-tl-structure');
      const data = await response.json();
      setDebugData({ type: 'TL', data });
    } catch (error) {
      setDebugData({ type: 'TL', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setIsLoading(false);
  };

  const checkColumnStructure = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-tl-rl-columns');
      const data = await response.json();
      setDebugData({ type: 'Columns', data });
    } catch (error) {
      setDebugData({ type: 'Columns', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setIsLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug R&L and TL Extraction</h1>
      
      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">Debug Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={debugRLFile}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Debug R&L File (Column V)'}
          </button>
          
          <button
            onClick={debugTLFile}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Debug TL File (Total Rows)'}
          </button>
          
          <button
            onClick={checkColumnStructure}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Check Column Structure'}
          </button>
        </div>
      </div>

      {debugData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">
            Debug Results: {debugData.type}
          </h3>
          
          {debugData.error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded">
              Error: {debugData.error}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              {debugData.data?.summary && (
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(debugData.data.summary, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Column Analysis */}
              {debugData.data?.column_analysis && (
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Column Analysis</h4>
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(debugData.data.column_analysis, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Sample Data */}
              {debugData.data?.sample_data && (
                <div className="bg-yellow-50 p-4 rounded">
                  <h4 className="font-semibold mb-2">Sample Data</h4>
                  <pre className="text-sm overflow-x-auto max-h-64">
                    {JSON.stringify(debugData.data.sample_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Full Debug Data */}
              <details className="bg-gray-50 p-4 rounded">
                <summary className="font-semibold cursor-pointer">Full Debug Data (Click to expand)</summary>
                <pre className="text-xs overflow-x-auto max-h-96 mt-2">
                  {JSON.stringify(debugData.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Expected Issues:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>R&L File:</strong> Should extract from column V, currently extracting from consigneeaddress</li>
          <li><strong>TL File:</strong> Should exclude total rows at bottom, currently including them</li>
          <li><strong>Column V:</strong> May be missing, renamed, or not meeting validation criteria</li>
          <li><strong>Total Rows:</strong> May contain keywords like "TOTAL", "SUM", "GRAND TOTAL" that should be filtered</li>
        </ul>
      </div>
    </div>
  );
}
