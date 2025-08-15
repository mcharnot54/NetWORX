'use client';

import { useState, useEffect } from 'react';

export default function TLDataCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkTLData();
  }, []);

  const checkTLData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/show-tl-data');
      const result = await response.json();
      
      if (response.ok) {
        setData(result);
      } else {
        setError(result.error || 'Failed to check TL data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTransportOptimizer = async () => {
    if (!data?.baseline_found) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/direct-tl-check');
      const result = await response.json();
      
      if (response.ok && result.baseline_extracted) {
        alert(`✅ Transport Optimizer updated!\nOld: $5.5M\nNew: ${result.baseline_extracted.formatted}\nDifference: ${result.baseline_extracted.vs_estimated.difference_formatted}`);
      } else {
        alert('❌ Failed to update Transport Optimizer');
      }
    } catch (err) {
      alert(`❌ Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-8">🔍 Checking TL data...</div>;
  if (error) return <div className="p-8 text-red-600">❌ Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 TL File Data Analysis</h1>
        
        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.summary.total_files}</div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.summary.tl_file_found ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600">TL File Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.summary.tl_file_processed ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600">TL File Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.summary.baseline_extracted ? '✅' : '❌'}
              </div>
              <div className="text-sm text-gray-600">Baseline Found</div>
            </div>
          </div>
        </div>

        {/* Baseline Found */}
        {data.baseline_found && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">💰 2025 Baseline Found!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {data.baseline_found.formatted}
                </div>
                <div className="text-sm text-gray-600">
                  Source: Column "{data.baseline_found.column}" (Row {data.baseline_found.row_index})
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={updateTransportOptimizer}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {updating ? '⏳ Updating...' : '🔧 Update Transport Optimizer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TL File Data Preview */}
        {data.tl_file_data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📁 TL File: {data.tl_file_data.file_name}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-lg font-bold">{data.tl_file_data.total_rows}</div>
                <div className="text-sm text-gray-600">Total Rows</div>
              </div>
              <div>
                <div className="text-lg font-bold">{data.tl_file_data.columns.length}</div>
                <div className="text-sm text-gray-600">Columns</div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Columns:</h3>
              <div className="flex flex-wrap gap-2">
                {data.tl_file_data.columns.map(col => (
                  <span key={col} className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">First 3 Rows:</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-gray-100">
                      {data.tl_file_data.columns.map(col => (
                        <th key={col} className="border px-2 py-1 text-left">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.tl_file_data.first_3_rows.map((row, i) => (
                      <tr key={i}>
                        {data.tl_file_data.columns.map(col => (
                          <td key={col} className="border px-2 py-1">
                            {String(row[col] || '').slice(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* All Files */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📋 All Data Files</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">File Name</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Data Status</th>
                </tr>
              </thead>
              <tbody>
                {data.all_files.map(file => (
                  <tr key={file.id} className="border-b">
                    <td className="py-2">{file.file_name}</td>
                    <td className="py-2">{file.data_type}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        file.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                        file.processing_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {file.processing_status}
                      </span>
                    </td>
                    <td className="py-2">{file.data_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Recommendation</h3>
          <p className="text-blue-700">{data.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
