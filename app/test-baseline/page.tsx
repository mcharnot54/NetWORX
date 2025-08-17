'use client';

import { useState, useEffect } from 'react';
import Navigation from "@/components/Navigation";

export default function TestBaseline() {
  const [baselineData, setBaselineData] = useState<any>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingBaseline, setLoadingBaseline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFileData = async () => {
    if (loadingFiles) return; // Prevent multiple simultaneous calls

    setLoadingFiles(true);
    setError(null);
    try {
      const response = await fetch('/api/test-file-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFileData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch file data';
      setError(errorMessage);
      console.error('File data fetch error:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const testBaselineCosts = async () => {
    if (loadingBaseline) return; // Prevent multiple simultaneous calls

    setLoadingBaseline(true);
    setError(null);
    try {
      const response = await fetch('/api/current-baseline-costs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBaselineData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch baseline costs';
      setError(errorMessage);
      console.error('Baseline costs fetch error:', err);
    } finally {
      setLoadingBaseline(false);
    }
  };

  useEffect(() => {
    // Only run once on mount
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        await testFileData();
      }
      if (mounted) {
        await testBaselineCosts();
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h1 className="text-2xl font-bold mb-6">Baseline Costs Test</h1>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={testFileData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test File Data'}
            </button>
            <button
              onClick={testBaselineCosts}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test Baseline Costs'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Data */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Uploaded Files Status</h2>
              {fileData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Total Files:</strong> {fileData.files_summary?.total_files || 0}
                    </div>
                    <div>
                      <strong>Processed Files:</strong> {fileData.files_summary?.processed_files || 0}
                    </div>
                  </div>
                  
                  <div>
                    <strong>Files:</strong>
                    <ul className="mt-2 space-y-2">
                      {fileData.files_summary?.files?.map((file: any) => (
                        <li key={file.id} className="p-2 bg-gray-50 rounded">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-gray-600">
                            Type: {file.type} | Status: {file.status} | Has Data: {file.has_data ? 'Yes' : 'No'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {fileData.sample_data && fileData.sample_data.length > 0 && (
                    <div>
                      <strong>Sample Data:</strong>
                      {fileData.sample_data.map((sample: any, index: number) => (
                        <div key={index} className="mt-3 p-3 bg-gray-50 rounded">
                          <div className="font-medium">{sample.file_name}</div>
                          <div className="text-sm text-gray-600">
                            Rows: {sample.rows} | Columns: {sample.columns?.length || 0}
                          </div>
                          {sample.columns && (
                            <div className="text-xs text-gray-500 mt-1">
                              Columns: {sample.columns.slice(0, 5).join(', ')}
                              {sample.columns.length > 5 && '...'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Loading file data...</p>
              )}
            </div>

            {/* Baseline Costs */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Baseline Costs</h2>
              {baselineData ? (
                <div className="space-y-4">
                  {baselineData.success ? (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-3 bg-blue-50 rounded">
                          <strong>Warehouse Costs:</strong>
                          <div className="text-sm mt-1">
                            <div>Operating: {baselineData.baseline_costs?.warehouse_costs?.operating_costs_other?.formatted || '$0'}</div>
                            <div>Labor: {baselineData.baseline_costs?.warehouse_costs?.total_labor_costs?.formatted || '$0'}</div>
                            <div>Rent: {baselineData.baseline_costs?.warehouse_costs?.rent_and_overhead?.formatted || '$0'}</div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-green-50 rounded">
                          <strong>Transport Costs:</strong>
                          <div className="text-sm mt-1">
                            Freight: {baselineData.baseline_costs?.transport_costs?.freight_costs?.formatted || '$0'}
                          </div>
                        </div>
                        
                        <div className="p-3 bg-purple-50 rounded">
                          <strong>Total Baseline:</strong>
                          <div className="text-lg font-bold mt-1">
                            {baselineData.baseline_costs?.total_baseline?.formatted || '$0'}
                          </div>
                        </div>
                      </div>

                      {baselineData.metadata?.data_sources && (
                        <div>
                          <strong>Data Sources ({baselineData.metadata.data_sources.length}):</strong>
                          <ul className="mt-2 space-y-1">
                            {baselineData.metadata.data_sources.map((source: any, index: number) => (
                              <li key={index} className="text-sm p-2 bg-gray-50 rounded">
                                <strong>{source.type}:</strong> {source.file_name || source.scenario}
                                {source.rows_processed && ` (${source.rows_processed} rows)`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-red-600">
                      Error: {baselineData.error}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Loading baseline costs...</p>
              )}
            </div>
          </div>

          {/* Raw Data */}
          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-4">Raw Data (Debug)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">File Data:</h3>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(fileData, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-medium mb-2">Baseline Data:</h3>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(baselineData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
