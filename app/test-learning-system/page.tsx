"use client";
import { useState } from "react";

export default function TestLearningSystem() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCurrentFiles = async () => {
    setLoading(true);
    try {
      // Test the current transport baseline calculation
      const baselineRes = await fetch('/api/calculate-transport-baseline');
      const baseline = await baselineRes.json();
      
      // Test the enhanced multi-tab extraction
      const multiTabRes = await fetch('/api/extract-multi-tab-baseline');
      const multiTab = await multiTabRes.json();
      
      setResults({
        baseline,
        multiTab,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Test error:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testSmartProcessing = async () => {
    setLoading(true);
    try {
      // Test the smart header detection on current files
      const debugRes = await fetch('/api/debug-file-structure');
      const debug = await debugRes.json();
      
      // Test the analyze excel structure with fixed XLSX
      const analyzeRes = await fetch('/api/analyze-excel-structure');
      const analyze = await analyzeRes.json();
      
      setResults({
        debug,
        analyze,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Test error:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Learning System Testing</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={testCurrentFiles}
          disabled={loading}
          className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Current File Processing"}
        </button>
        
        <button
          onClick={testSmartProcessing}
          disabled={loading}
          className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Smart Header Detection"}
        </button>
      </div>

      {results && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          
          {results.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-600">{results.error}</p>
            </div>
          ) : (
            <>
              {results.baseline && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <h3 className="p-4 bg-blue-50 font-medium">Transport Baseline Results</h3>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ${results.baseline.transport_totals?.ups_parcel?.amount?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-gray-600">UPS Parcel</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          ${results.baseline.transport_totals?.rl_ltl?.amount?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-gray-600">R&L LTL</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          ${results.baseline.transport_totals?.tl_costs?.amount?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-gray-600">TL Costs</div>
                      </div>
                    </div>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                      {JSON.stringify(results.baseline, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {results.multiTab && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <h3 className="p-4 bg-green-50 font-medium">Multi-Tab Extraction Results</h3>
                  <div className="p-4">
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                      {JSON.stringify(results.multiTab, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {results.debug && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <h3 className="p-4 bg-yellow-50 font-medium">File Structure Debug</h3>
                  <div className="p-4">
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                      {JSON.stringify(results.debug, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {results.analyze && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <h3 className="p-4 bg-purple-50 font-medium">Excel Analysis Results</h3>
                  <div className="p-4">
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                      {JSON.stringify(results.analyze, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
          
          <div className="text-xs text-gray-500">
            Test completed at: {results.timestamp}
          </div>
        </div>
      )}
    </div>
  );
}
