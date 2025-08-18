'use client';

import { useState, useEffect } from 'react';
import Navigation from "@/components/Navigation";

export default function TestBaseline() {
  const [baselineData, setBaselineData] = useState<any>(null);
  const [fileData, setFileData] = useState<any>(null);
  const [validationData, setValidationData] = useState<any>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingBaseline, setLoadingBaseline] = useState(false);
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [loadingRlSearch, setLoadingRlSearch] = useState(false);
  const [rlSearchData, setRlSearchData] = useState<any>(null);
  const [loadingUpsDiagnostic, setLoadingUpsDiagnostic] = useState(false);
  const [upsDiagnosticData, setUpsDiagnosticData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testFileData = async () => {
    if (loadingFiles) return; // Prevent multiple simultaneous calls

    setLoadingFiles(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch('/api/test-file-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setFileData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch file data';
        setError(errorMessage);
      }
      console.error('File data fetch error:', err);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoadingFiles(false);
    }
  };

  const testDebugStructure = async () => {
    if (loadingDebug) return;

    setLoadingDebug(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/debug-file-structure', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDebugData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Debug request timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch debug data';
        setError(errorMessage);
      }
      console.error('Debug fetch error:', err);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoadingDebug(false);
    }
  };

  const searchRlFile = async () => {
    if (loadingRlSearch) return;

    setLoadingRlSearch(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/search-rl-file', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRlSearchData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('R&L search timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search for R&L file';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingRlSearch(false);
    }
  };

  const testTransportValidation = async () => {
    if (loadingValidation) return;

    setLoadingValidation(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/validate-transport-extraction', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setValidationData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Validation request timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch validation data';
        setError(errorMessage);
      }
      console.error('Validation fetch error:', err);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setLoadingValidation(false);
    }
  };

  const testBaselineCosts = async () => {
    if (loadingBaseline) return; // Prevent multiple simultaneous calls

    setLoadingBaseline(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch('/api/current-baseline-costs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBaselineData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch baseline costs';
        setError(errorMessage);
      }
      console.error('Baseline costs fetch error:', err);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
        await testDebugStructure();
      }
      if (mounted) {
        await testTransportValidation();
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
          
          <div className="flex gap-4 mb-6 flex-wrap">
            <button
              onClick={testFileData}
              disabled={loadingFiles}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingFiles ? 'Loading Files...' : 'Refresh File Data'}
            </button>
            <button
              onClick={testDebugStructure}
              disabled={loadingDebug}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loadingDebug ? 'Debugging...' : 'Debug File Structure'}
            </button>
            <button
              onClick={testTransportValidation}
              disabled={loadingValidation}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingValidation ? 'Validating...' : 'Validate Transport Extraction'}
            </button>
            <button
              onClick={testBaselineCosts}
              disabled={loadingBaseline}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loadingBaseline ? 'Loading Costs...' : 'Refresh Baseline Costs'}
            </button>
            <button
              onClick={searchRlFile}
              disabled={loadingRlSearch}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {loadingRlSearch ? 'Searching...' : 'Search R&L File'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Debug Data Structure */}
          {debugData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">🔍 File Structure Debug</h2>
              {debugData.success ? (
                <div className="space-y-4">
                  {debugData.file_analysis?.map((analysis: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-bold text-lg">{analysis.file_name}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        <div><strong>Data Location:</strong> {analysis.data_location}</div>
                        <div><strong>Total Rows:</strong> {analysis.total_rows}</div>
                        <div><strong>Structure:</strong> {analysis.data_structure}</div>
                        <div><strong>Columns:</strong> {analysis.all_columns?.length || 0}</div>
                      </div>

                      {analysis.all_columns && (
                        <div className="mt-2">
                          <strong>Available Columns:</strong>
                          <div className="text-xs bg-white p-2 rounded mt-1 max-h-20 overflow-auto">
                            {analysis.all_columns.join(', ')}
                          </div>
                        </div>
                      )}

                      {analysis.sample_rows && analysis.sample_rows.length > 0 && (
                        <div className="mt-2">
                          <strong>Sample Data:</strong>
                          <pre className="text-xs bg-white p-2 rounded mt-1 max-h-32 overflow-auto">
                            {JSON.stringify(analysis.sample_rows.slice(0, 2), null, 2)}
                          </pre>
                        </div>
                      )}

                      {analysis.error && (
                        <div className="mt-2 text-red-600">
                          <strong>Error:</strong> {analysis.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-red-600">
                  Debug Error: {debugData.error}
                </div>
              )}
            </div>
          )}

          {/* R&L File Search Results */}
          {rlSearchData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">R&L File Search Results</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Total Files:</strong> {rlSearchData.total_files || 0}</div>
                  <div><strong>R&L Files Found:</strong> {rlSearchData.rl_files_found?.length || 0}</div>
                </div>

                {rlSearchData.rl_files_found && rlSearchData.rl_files_found.length > 0 ? (
                  <div>
                    <strong>R&L Files Found:</strong>
                    <ul className="mt-2 space-y-2">
                      {rlSearchData.rl_files_found.map((file: any) => (
                        <li key={file.id} className="p-2 bg-green-50 rounded">
                          <div className="font-medium text-green-800">{file.file_name}</div>
                          <div className="text-sm text-green-600">
                            ID: {file.id} | Status: {file.processing_status} | Type: {file.data_type}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 rounded">
                    <div className="text-red-800 font-medium">No R&L files found!</div>
                    <div className="text-red-600 text-sm mt-1">
                      The R&L Curriculum Associates file from 2024 is missing from the database.
                    </div>
                  </div>
                )}

                {rlSearchData.all_files && (
                  <div>
                    <strong>All Files ({rlSearchData.total_files}):</strong>
                    <div className="max-h-40 overflow-y-auto mt-2 text-xs">
                      {rlSearchData.all_files.map((fileName: string, index: number) => (
                        <div key={index} className="py-1 border-b border-gray-100">
                          {fileName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

            {/* Transport Validation */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Transport Validation</h2>
              {validationData ? (
                <div className="space-y-4">
                  {validationData.success ? (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="p-3 bg-blue-50 rounded">
                          <strong>Files Found:</strong> {validationData.files_found}
                        </div>

                        <div className="p-3 bg-green-50 rounded">
                          <strong>Transportation Totals (2024):</strong>
                          <div className="text-sm mt-1">
                            <div>TL: ${validationData.summary?.total_tl_cost?.toLocaleString() || '0'}</div>
                            <div>LTL: ${validationData.summary?.total_ltl_cost?.toLocaleString() || '0'}</div>
                            <div>Parcel: ${validationData.summary?.total_parcel_cost?.toLocaleString() || '0'}</div>
                            <div><strong>Total: ${((validationData.summary?.total_tl_cost || 0) + (validationData.summary?.total_ltl_cost || 0) + (validationData.summary?.total_parcel_cost || 0)).toLocaleString()}</strong></div>
                          </div>
                        </div>
                      </div>

                      {validationData.validation_results?.map((result: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 rounded">
                          <strong>{result.file_name}</strong>
                          <div className="text-sm mt-1">
                            <div>Target: {result.target_columns?.target} - {result.target_columns?.description}</div>
                            <div>Rows: {result.total_rows} | Values Found: {result.extracted_values?.length || 0}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-red-600">
                      Error: {validationData.error}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Click "Validate Transport Extraction" to check specific column extraction...</p>
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
