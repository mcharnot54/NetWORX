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
  const [loadingDeduplication, setLoadingDeduplication] = useState(false);
  const [deduplicationData, setDeduplicationData] = useState<any>(null);
  const [loadingUpsPrecise, setLoadingUpsPrecise] = useState(false);
  const [upsPreciseData, setUpsPreciseData] = useState<any>(null);
  const [loadingTransportBaseline, setLoadingTransportBaseline] = useState(false);
  const [transportBaselineData, setTransportBaselineData] = useState<any>(null);
  const [loadingCorrectedBaseline, setLoadingCorrectedBaseline] = useState(false);
  const [correctedBaselineData, setCorrectedBaselineData] = useState<any>(null);
  const [loadingTlDiagnostic, setLoadingTlDiagnostic] = useState(false);
  const [tlDiagnosticData, setTlDiagnosticData] = useState<any>(null);
  const [loadingInlineFix, setLoadingInlineFix] = useState(false);
  const [inlineFixData, setInlineFixData] = useState<any>(null);
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

  const diagnoseUpsDuplicates = async () => {
    if (loadingUpsDiagnostic) return;

    setLoadingUpsDiagnostic(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/diagnose-ups-duplicates', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUpsDiagnosticData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('UPS diagnostic timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to diagnose UPS duplicates';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingUpsDiagnostic(false);
    }
  };

  const previewDeduplication = async () => {
    if (loadingDeduplication) return;

    setLoadingDeduplication(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/deduplicate-files', {
        method: 'GET', // GET endpoint runs preview mode
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDeduplicationData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Deduplication preview timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to preview deduplication';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingDeduplication(false);
    }
  };

  const executeDeduplication = async () => {
    if (loadingDeduplication) return;

    if (!confirm('Are you sure you want to permanently remove duplicate files? This cannot be undone.')) {
      return;
    }

    setLoadingDeduplication(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/deduplicate-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDeduplicationData(data);

      // Refresh file data after deduplication
      await testFileData();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Deduplication execution timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to execute deduplication';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingDeduplication(false);
    }
  };

  const calculateUpsPrecise = async () => {
    if (loadingUpsPrecise) return;

    setLoadingUpsPrecise(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/calculate-ups-precise', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUpsPreciseData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('UPS calculation timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate UPS total';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingUpsPrecise(false);
    }
  };

  const calculateTransportBaseline = async () => {
    if (loadingTransportBaseline) return;

    setLoadingTransportBaseline(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/calculate-transport-baseline', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTransportBaselineData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Transport baseline calculation timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate transport baseline';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingTransportBaseline(false);
    }
  };

  const calculateCorrectedBaseline = async () => {
    if (loadingCorrectedBaseline) return;

    setLoadingCorrectedBaseline(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/baseline-with-corrected-transport', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCorrectedBaselineData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Corrected baseline calculation timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate corrected baseline';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingCorrectedBaseline(false);
    }
  };

  const diagnoseTlStructure = async () => {
    if (loadingTlDiagnostic) return;

    setLoadingTlDiagnostic(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/diagnose-tl-structure', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTlDiagnosticData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('TL diagnostic timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to diagnose TL structure';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingTlDiagnostic(false);
    }
  };

  const runInlineFix = async () => {
    if (loadingInlineFix) return;

    setLoadingInlineFix(true);
    setError(null);
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/fix-rl-tl-extraction', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setInlineFixData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Inline fix timed out - please try again');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to run inline fix';
        setError(errorMessage);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoadingInlineFix(false);
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
            <button
              onClick={diagnoseUpsDuplicates}
              disabled={loadingUpsDiagnostic}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {loadingUpsDiagnostic ? 'Analyzing...' : 'Diagnose UPS Duplicates'}
            </button>
          </div>

          <div className="flex gap-4 mb-6 flex-wrap">
            <button
              onClick={previewDeduplication}
              disabled={loadingDeduplication}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingDeduplication ? 'Analyzing...' : 'Preview Deduplication'}
            </button>
            <button
              onClick={executeDeduplication}
              disabled={loadingDeduplication || !deduplicationData?.preview_mode}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loadingDeduplication ? 'Removing...' : 'Execute Deduplication'}
            </button>
            <button
              onClick={calculateUpsPrecise}
              disabled={loadingUpsPrecise}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingUpsPrecise ? 'Calculating...' : 'Calculate UPS Precise Total'}
            </button>
            <button
              onClick={calculateTransportBaseline}
              disabled={loadingTransportBaseline}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loadingTransportBaseline ? 'Calculating...' : 'Calculate FULL Transport Baseline'}
            </button>
            <button
              onClick={calculateCorrectedBaseline}
              disabled={loadingCorrectedBaseline}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-bold"
            >
              {loadingCorrectedBaseline ? 'Calculating...' : '✅ Get CORRECTED Baseline ($2.9M UPS)'}
            </button>
            <button
              onClick={diagnoseTlStructure}
              disabled={loadingTlDiagnostic}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loadingTlDiagnostic ? 'Analyzing...' : 'Diagnose TL File Structure'}
            </button>
            <button
              onClick={runInlineFix}
              disabled={loadingInlineFix}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold disabled:opacity-50"
            >
              {loadingInlineFix ? 'Fixing...' : '🔧 FIX R&L + TL (Inline Results)'}
            </button>
            <button
              onClick={async () => {
                if (confirm('This will reprocess ALL failed Excel files to extract actual data. Continue?')) {
                  try {
                    setError('Processing all Excel files... this may take a moment...');
                    const response = await fetch('/api/fix-all-excel-files', { method: 'POST' });
                    const result = await response.json();

                    if (result.success) {
                      alert(`✅ EXCEL FIX COMPLETE!\n\nFixed: ${result.summary?.fixed || 0} files\nFailed: ${result.summary?.failed || 0} files\n\nPage will refresh to show updated data.`);
                      window.location.reload();
                    } else {
                      alert('❌ Fix failed: ' + result.error);
                    }
                    setError(null);
                  } catch (error) {
                    alert('❌ Failed to fix Excel files: ' + error);
                    setError(null);
                  }
                }
              }}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 font-bold"
            >
              🔥 FIX ALL EXCEL FILES
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

          {/* UPS Duplicate Diagnostic Results */}
          {upsDiagnosticData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">UPS File Duplicate Analysis</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><strong>Total UPS Files:</strong> {upsDiagnosticData.total_ups_files || 0}</div>
                  <div><strong>Total Extracted:</strong> ${upsDiagnosticData.total_extracted_value?.toLocaleString() || 0}</div>
                  <div><strong>Duplicates Found:</strong> {upsDiagnosticData.total_ups_files > 1 ? 'YES' : 'NO'}</div>
                </div>

                {upsDiagnosticData.file_analysis && upsDiagnosticData.file_analysis.length > 0 && (
                  <div>
                    <strong>File Analysis:</strong>
                    <div className="mt-2 space-y-3">
                      {upsDiagnosticData.file_analysis.map((file: any) => (
                        <div key={file.file_id} className={`p-3 rounded ${file.extracted_total > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <div className="font-medium">
                            File ID: {file.file_id} | Scenario: {file.scenario_id} | Status: {file.processing_status}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Data: {file.data_structure} | Rows: {file.rows_found} | Location: {file.data_location}
                          </div>
                          <div className={`text-sm font-medium mt-1 ${file.extracted_total > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                            Extracted: ${file.extracted_total?.toLocaleString() || 0}
                            {file.column_f_values && file.column_f_values.length > 0 && (
                              <span className="ml-2">({file.column_f_values.length} values found)</span>
                            )}
                          </div>
                          {file.column_f_values && file.column_f_values.length > 0 && (
                            <div className="mt-2 text-xs">
                              <strong>Sample values:</strong> {file.column_f_values.slice(0, 3).map((v: any) => `$${v.parsed_value.toLocaleString()}`).join(', ')}
                              {file.column_f_values.length > 3 && '...'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {upsDiagnosticData.duplicate_summary && (
                  <div className="p-3 bg-yellow-50 rounded">
                    <strong className="text-yellow-800">Summary:</strong>
                    <div className="text-yellow-700 text-sm mt-1">
                      Files by scenario: {JSON.stringify(upsDiagnosticData.duplicate_summary.files_by_scenario)}
                    </div>
                    {upsDiagnosticData.total_ups_files > 1 && (
                      <div className="text-yellow-800 text-sm mt-2 font-medium">
                        ⚠️ Multiple UPS files detected! This may cause double-counting in baseline calculations.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deduplication Results */}
          {deduplicationData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">File Deduplication Analysis</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><strong>Total Files:</strong> {deduplicationData.total_files}</div>
                  <div><strong>Unique Files:</strong> {deduplicationData.unique_files}</div>
                  <div><strong>Duplicates Found:</strong> {deduplicationData.total_duplicates}</div>
                  <div><strong>Mode:</strong> {deduplicationData.preview_mode ? 'Preview' : 'Executed'}</div>
                </div>

                <div className={`p-3 rounded ${deduplicationData.total_duplicates > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div className={`font-medium ${deduplicationData.total_duplicates > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    {deduplicationData.summary?.action_taken}
                  </div>
                  {deduplicationData.total_duplicates > 0 && (
                    <div className="text-red-600 text-sm mt-1">
                      Files with duplicates: {deduplicationData.summary?.files_with_duplicates}
                    </div>
                  )}
                </div>

                {deduplicationData.duplicate_analysis && deduplicationData.duplicate_analysis.length > 0 && (
                  <div>
                    <strong>Duplicate Files Analysis:</strong>
                    <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
                      {deduplicationData.duplicate_analysis.map((dup: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 rounded">
                          <div className="font-medium text-gray-800 mb-2">
                            📁 {dup.file_name} ({dup.total_copies} copies)
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-2 bg-green-100 rounded">
                              <div className="text-green-800 font-medium text-sm">✓ KEEP:</div>
                              <div className="text-xs text-green-700">
                                ID: {dup.keep_file.id} | Scenario: {dup.keep_file.scenario_id}
                              </div>
                              <div className="text-xs text-green-600">
                                Status: {dup.keep_file.status} | Has Data: {dup.keep_file.has_data ? 'Yes' : 'No'}
                              </div>
                            </div>

                            <div className="p-2 bg-red-100 rounded">
                              <div className="text-red-800 font-medium text-sm">✗ REMOVE ({dup.remove_files.length}):</div>
                              {dup.remove_files.map((file: any, idx: number) => (
                                <div key={idx} className="text-xs text-red-700">
                                  ID: {file.id} | Scenario: {file.scenario_id} | Status: {file.status}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deduplicationData.removal_results && deduplicationData.removal_results.length > 0 && (
                  <div className="p-3 bg-green-50 rounded">
                    <strong className="text-green-800">Removal Results:</strong>
                    {deduplicationData.removal_results.map((result: any, index: number) => (
                      <div key={index} className="text-green-700 text-sm mt-1">
                        Batch {result.batch}: Removed {result.removed_ids.length} files (IDs: {result.removed_ids.join(', ')})
                      </div>
                    ))}
                  </div>
                )}

                {deduplicationData.preview_mode && deduplicationData.total_duplicates > 0 && (
                  <div className="p-3 bg-blue-50 rounded">
                    <div className="text-blue-800 font-medium">Ready to Execute</div>
                    <div className="text-blue-700 text-sm mt-1">
                      Click "Execute Deduplication" to permanently remove {deduplicationData.files_to_remove} duplicate files.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Precise UPS Calculation Results */}
          {upsPreciseData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">UPS Invoice Precise Calculation</h2>
              {upsPreciseData.success ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-800 mb-2">
                      {upsPreciseData.calculation?.formatted_total}
                    </div>
                    <div className="text-emerald-700">
                      Total from single UPS file ({upsPreciseData.file_info?.total_rows} rows)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>File ID:</strong> {upsPreciseData.file_info?.id}</div>
                    <div><strong>Scenario:</strong> {upsPreciseData.file_info?.scenario_id}</div>
                    <div><strong>Total Rows:</strong> {upsPreciseData.file_info?.total_rows}</div>
                    <div><strong>Values Summed:</strong> {upsPreciseData.calculation?.values_summed}</div>
                  </div>

                  <div className={`p-3 rounded ${upsPreciseData.verification?.matches_expected ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <div className={`font-medium ${upsPreciseData.verification?.matches_expected ? 'text-green-800' : 'text-yellow-800'}`}>
                      Data Verification:
                    </div>
                    <div className={`text-sm ${upsPreciseData.verification?.matches_expected ? 'text-green-700' : 'text-yellow-700'}`}>
                      Expected: {upsPreciseData.verification?.expected_rows} rows |
                      Actual: {upsPreciseData.verification?.actual_rows} rows |
                      Match: {upsPreciseData.verification?.matches_expected ? 'YES ✓' : 'NO ⚠️'}
                    </div>
                  </div>

                  {upsPreciseData.sample_values && upsPreciseData.sample_values.length > 0 && (
                    <div>
                      <strong>Sample Values (first 10):</strong>
                      <div className="mt-2 bg-gray-50 rounded p-3 text-xs font-mono">
                        {upsPreciseData.sample_values.map((sample: any, index: number) => (
                          <div key={index} className="py-1">
                            Row {sample.row}: {sample.raw_value} → ${sample.parsed_value.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-600">
                    Extraction method: {upsPreciseData.calculation?.extraction_method}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-red-800 font-medium">Calculation Failed</div>
                  <div className="text-red-700 text-sm">{upsPreciseData.error}</div>
                </div>
              )}
            </div>
          )}

          {/* Transport Baseline Complete Calculation */}
          {transportBaselineData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">🚛 Complete Transport Baseline Calculation</h2>
              {transportBaselineData.success ? (
                <div className="space-y-6">
                  {/* Total Summary */}
                  <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="text-3xl font-bold text-blue-800 mb-2">
                      ${transportBaselineData.total_transport_baseline?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-blue-700 font-medium">
                      Total 2024 Transportation Baseline for 2025 Planning
                    </div>
                  </div>

                  {/* Breakdown by Category */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* UPS Parcel */}
                    <div className={`p-4 rounded-lg ${transportBaselineData.transport_totals.ups_parcel.status === 'calculated' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="font-semibold text-gray-800 mb-2">📦 UPS Parcel</div>
                      <div className={`text-lg font-bold ${transportBaselineData.transport_totals.ups_parcel.status === 'calculated' ? 'text-green-700' : 'text-gray-500'}`}>
                        ${transportBaselineData.transport_totals.ups_parcel.amount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {transportBaselineData.transport_totals.ups_parcel.status === 'calculated' ? (
                          <>
                            {transportBaselineData.transport_totals.ups_parcel.rows} rows, {transportBaselineData.transport_totals.ups_parcel.values_found} values
                            <br />File ID: {transportBaselineData.transport_totals.ups_parcel.file_id}
                          </>
                        ) : (
                          'Not found'
                        )}
                      </div>
                    </div>

                    {/* R&L LTL */}
                    <div className={`p-4 rounded-lg ${transportBaselineData.transport_totals.rl_ltl.status === 'calculated' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="font-semibold text-gray-800 mb-2">🚚 R&L LTL</div>
                      <div className={`text-lg font-bold ${transportBaselineData.transport_totals.rl_ltl.status === 'calculated' ? 'text-green-700' : 'text-gray-500'}`}>
                        ${transportBaselineData.transport_totals.rl_ltl.amount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {transportBaselineData.transport_totals.rl_ltl.status === 'calculated' ? (
                          <>
                            {transportBaselineData.transport_totals.rl_ltl.rows} rows, {transportBaselineData.transport_totals.rl_ltl.values_found} values
                            <br />File ID: {transportBaselineData.transport_totals.rl_ltl.file_id}
                          </>
                        ) : (
                          'Not found - R&L file may be missing'
                        )}
                      </div>
                    </div>

                    {/* TL Costs */}
                    <div className={`p-4 rounded-lg ${transportBaselineData.transport_totals.tl_costs.status === 'calculated' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="font-semibold text-gray-800 mb-2">🚛 TL (Truckload)</div>
                      <div className={`text-lg font-bold ${transportBaselineData.transport_totals.tl_costs.status === 'calculated' ? 'text-green-700' : 'text-gray-500'}`}>
                        ${transportBaselineData.transport_totals.tl_costs.amount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {transportBaselineData.transport_totals.tl_costs.status === 'calculated' ? (
                          <>
                            {transportBaselineData.transport_totals.tl_costs.rows} rows, {transportBaselineData.transport_totals.tl_costs.values_found} values
                            <br />File ID: {transportBaselineData.transport_totals.tl_costs.file_id}
                          </>
                        ) : (
                          'Check data structure - may be nested'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Files Analyzed */}
                  {transportBaselineData.files_analyzed && transportBaselineData.files_analyzed.length > 0 && (
                    <div>
                      <strong>Files Analyzed ({transportBaselineData.files_analyzed.length}):</strong>
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {transportBaselineData.files_analyzed.map((file: any, index: number) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium">📄 {file.name}</div>
                            <div className="text-gray-600 text-xs">
                              ID: {file.id} | Type: {file.file_type} | Rows: {file.rows} | Source: {file.data_source}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Quality Summary */}
                  <div className="p-3 bg-gray-50 rounded">
                    <strong>Data Quality Summary:</strong>
                    <div className="text-sm text-gray-700 mt-1">
                      UPS: {transportBaselineData.transport_totals.ups_parcel.status === 'calculated' ? '✅ Complete' : '❌ Missing'} |
                      R&L: {transportBaselineData.transport_totals.rl_ltl.status === 'calculated' ? '✅ Complete' : '❌ Missing'} |
                      TL: {transportBaselineData.transport_totals.tl_costs.status === 'calculated' ? '✅ Complete' : '❌ Missing'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-red-800 font-medium">Calculation Failed</div>
                  <div className="text-red-700 text-sm">{transportBaselineData.error}</div>
                </div>
              )}
            </div>
          )}

          {/* Inline R&L + TL Fix Results */}
          {inlineFixData && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">🔧 R&L + TL Extraction Fix Results</h2>
              {inlineFixData.success ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-800 mb-2">
                      ${(inlineFixData.total_rl_tl || 0).toLocaleString()}
                    </div>
                    <div className="text-blue-700">Combined R&L + TL Baseline</div>
                  </div>

                  {/* Individual Results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* R&L Results */}
                    <div className={`p-4 rounded-lg ${inlineFixData.rl_extraction.amount > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="font-semibold text-gray-800 mb-2">🚚 R&L LTL Results</div>
                      <div className={`text-lg font-bold ${inlineFixData.rl_extraction.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${inlineFixData.rl_extraction.amount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        File ID: {inlineFixData.rl_extraction.file_id || 'Not found'}<br/>
                        Rows: {inlineFixData.rl_extraction.rows_processed || 0} |
                        Values: {inlineFixData.rl_extraction.values_found || 0}<br/>
                        Status: {inlineFixData.rl_extraction.issue || 'Unknown'}
                      </div>
                    </div>

                    {/* TL Results */}
                    <div className={`p-4 rounded-lg ${inlineFixData.tl_extraction.amount > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="font-semibold text-gray-800 mb-2">🚛 TL Results</div>
                      <div className={`text-lg font-bold ${inlineFixData.tl_extraction.amount > 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${inlineFixData.tl_extraction.amount?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        File ID: {inlineFixData.tl_extraction.file_id || 'Not found'}<br/>
                        Rows: {inlineFixData.tl_extraction.rows_processed || 0} |
                        Values: {inlineFixData.tl_extraction.values_found || 0}<br/>
                        Status: {inlineFixData.tl_extraction.issue || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  {/* Debug Information */}
                  {inlineFixData.debug_info && inlineFixData.debug_info.length > 0 && (
                    <div>
                      <strong>Debug Information:</strong>
                      <div className="mt-2 space-y-3">
                        {inlineFixData.debug_info.map((debug: any, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded">
                            <div className="font-medium">📄 {debug.file_name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              File ID: {debug.file_id} | Arrays Found: {debug.arrays_found}
                            </div>
                            {debug.array_details && debug.array_details.length > 0 && (
                              <div className="mt-2 text-xs">
                                <strong>Data Arrays:</strong>
                                {debug.array_details.map((arr: any, idx: number) => (
                                  <div key={idx} className="ml-2 py-1">
                                    • {arr.path}: {arr.length} rows
                                    {arr.sample_keys.length > 0 && (
                                      <span className="text-gray-500"> | Columns: {arr.sample_keys.slice(0, 5).join(', ')}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Needed */}
                  {(inlineFixData.rl_extraction.amount === 0 || inlineFixData.tl_extraction.amount === 0) && (
                    <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                      <div className="text-yellow-800 font-medium">⚠️ Action Needed:</div>
                      <div className="text-yellow-700 text-sm mt-1">
                        {inlineFixData.rl_extraction.amount === 0 && 'R&L file data not accessible. '}
                        {inlineFixData.tl_extraction.amount === 0 && 'TL file data structure needs investigation. '}
                        Check file processing status and data structure.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-red-800 font-medium">Fix Failed</div>
                  <div className="text-red-700 text-sm">{inlineFixData.error}</div>
                </div>
              )}
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
