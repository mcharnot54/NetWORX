'use client';
import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import ColumnMapper from '@/components/ColumnMapper';
import { mapDemandAoA, mapCostAoA, mapCapacityAoA } from '@/lib/importers/map';
import { downloadWorkbook } from '@/lib/export/xlsx';

type FilePreview = {
  name: string;
  headers: string[];
  rows: any[][];
  stats: {
    totalRows: number;
    previewRows: number;
    totalColumns: number;
    fileSize: number;
    fileSizeFormatted: string;
    sheetNames?: string[];
  };
};

type ProcessedData = {
  demand?: Record<string, number>;
  costMatrix?: { rows: string[]; cols: string[]; cost: number[][] };
  capacity?: Record<string, number>;
  demandByYear?: Record<number, Record<string, number>>;
};

export default function ImportPage() {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [mapKind, setMapKind] = useState<'demand' | 'demand-per-year' | 'cost' | 'capacity' | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData>({});
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, kind: 'demand' | 'demand-per-year' | 'cost' | 'capacity') {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus(`Uploading ${file.name}...`);
    setMapKind(kind);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setPreview({
        name: data.name,
        headers: data.headers,
        rows: data.rows,
        stats: data.stats
      });

      setStatus(`✅ File uploaded: ${data.stats.totalRows} rows, ${data.stats.totalColumns} columns. Map the columns below.`);
    } catch (error: any) {
      setStatus(`❌ Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleMapping(mapping: any) {
    if (!preview) return;

    try {
      setStatus('Applying column mapping...');

      if (mapKind === 'demand') {
        const result = mapDemandAoA(preview.rows, mapping);
        if (result.base) {
          setProcessedData(prev => ({ ...prev, demand: result.base }));
          setStatus(`✅ Demand mapped: ${Object.keys(result.base).length} destinations, ${Object.values(result.base).reduce((s, v) => s + v, 0).toLocaleString()} total units`);
        } else {
          throw new Error('No demand data found');
        }
      } else if (mapKind === 'demand-per-year') {
        const result = mapDemandAoA(preview.rows, mapping);
        if (result.byYear) {
          setProcessedData(prev => ({ ...prev, demandByYear: result.byYear }));
          const years = Object.keys(result.byYear);
          setStatus(`✅ Multi-year demand mapped: ${years.length} years (${years.join(', ')})`);
        } else {
          throw new Error('No per-year demand data found');
        }
      } else if (mapKind === 'cost') {
        const result = mapCostAoA(preview.rows, mapping);
        setProcessedData(prev => ({ ...prev, costMatrix: result }));
        setStatus(`✅ Cost matrix mapped: ${result.rows.length} origins × ${result.cols.length} destinations`);
      } else if (mapKind === 'capacity') {
        const result = mapCapacityAoA(preview.rows, mapping);
        setProcessedData(prev => ({ ...prev, capacity: result }));
        setStatus(`✅ Capacity mapped: ${Object.keys(result).length} facilities`);
      }

      // Clear preview after successful mapping
      setPreview(null);
      setMapKind(null);
    } catch (error: any) {
      setStatus(`❌ Mapping failed: ${error.message}`);
    }
  }

  function exportProcessedData() {
    if (Object.keys(processedData).length === 0) return;

    const exportData: Record<string, any[]> = {};

    if (processedData.demand) {
      exportData['Demand_Data'] = Object.entries(processedData.demand).map(([dest, demand]) => ({
        Destination: dest,
        Demand: demand
      }));
    }

    if (processedData.demandByYear) {
      const yearData: any[] = [];
      for (const [year, yearDemand] of Object.entries(processedData.demandByYear)) {
        for (const [dest, demand] of Object.entries(yearDemand)) {
          yearData.push({
            Year: parseInt(year),
            Destination: dest,
            Demand: demand
          });
        }
      }
      exportData['Demand_By_Year'] = yearData;
    }

    if (processedData.costMatrix) {
      const costData: any[] = [];
      const { rows, cols, cost } = processedData.costMatrix;
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < cols.length; j++) {
          if (cost[i][j] !== Infinity) {
            costData.push({
              Origin: rows[i],
              Destination: cols[j],
              Cost: cost[i][j]
            });
          }
        }
      }
      exportData['Cost_Matrix'] = costData;
    }

    if (processedData.capacity) {
      exportData['Capacity_Data'] = Object.entries(processedData.capacity).map(([facility, capacity]) => ({
        Facility: facility,
        Capacity: capacity
      }));
    }

    downloadWorkbook(exportData, 'processed_optimization_data.xlsx');
    setStatus('✅ Data exported to Excel file');
  }

  function clearData() {
    setProcessedData({});
    setPreview(null);
    setMapKind(null);
    setStatus('Data cleared');
  }

  const hasProcessedData = Object.keys(processedData).length > 0;

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Import Wizard</h1>
            <p className="text-gray-600 mt-1">
              Upload CSV/XLSX/XLSB files and map columns to optimization data formats. Perfect for large files and custom schemas.
            </p>
          </div>

          {/* Upload Section */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">📍 Demand Data</div>
                <div className="text-sm text-gray-500 mb-3">Baseline destination demand</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleFileUpload(e, 'demand')}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 transition-colors">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">📅 Multi-Year Demand</div>
                <div className="text-sm text-gray-500 mb-3">Demand by year and destination</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleFileUpload(e, 'demand-per-year')}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 transition-colors">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">🚛 Cost Matrix</div>
                <div className="text-sm text-gray-500 mb-3">Transportation costs</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleFileUpload(e, 'cost')}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 transition-colors">
              <div className="text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">🏭 Capacity Data</div>
                <div className="text-sm text-gray-500 mb-3">Facility capacities</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleFileUpload(e, 'capacity')}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className={`p-3 rounded-lg text-sm ${
              status.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
              status.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {status}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div className="mt-2 text-sm text-gray-600">Processing file...</div>
            </div>
          )}

          {/* Column Mapping */}
          {preview && mapKind && !loading && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Map Columns for {preview.name}</h2>
              <ColumnMapper
                headers={preview.headers}
                kind={mapKind}
                onApply={handleMapping}
                initialData={preview.rows}
              />
            </div>
          )}

          {/* Processed Data Summary */}
          {hasProcessedData && (
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Processed Data Summary</h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportProcessedData}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Export to Excel
                  </button>
                  <button
                    onClick={clearData}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {processedData.demand && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-medium text-blue-600">Baseline Demand</h3>
                    <div className="text-2xl font-bold">{Object.keys(processedData.demand).length}</div>
                    <div className="text-sm text-gray-600">destinations</div>
                  </div>
                )}

                {processedData.demandByYear && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-medium text-green-600">Multi-Year Demand</h3>
                    <div className="text-2xl font-bold">{Object.keys(processedData.demandByYear).length}</div>
                    <div className="text-sm text-gray-600">years</div>
                  </div>
                )}

                {processedData.costMatrix && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-medium text-purple-600">Cost Matrix</h3>
                    <div className="text-2xl font-bold">
                      {processedData.costMatrix.rows.length}×{processedData.costMatrix.cols.length}
                    </div>
                    <div className="text-sm text-gray-600">origins × destinations</div>
                  </div>
                )}

                {processedData.capacity && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-medium text-orange-600">Facility Capacity</h3>
                    <div className="text-2xl font-bold">{Object.keys(processedData.capacity).length}</div>
                    <div className="text-sm text-gray-600">facilities</div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-center">
                <a
                  href="/optimizer"
                  className="inline-flex items-center px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 font-medium"
                >
                  Use This Data in Optimizer →
                </a>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 File Format Guide</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-800 mb-2">Demand Data Format:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>Baseline:</strong> Destination, Demand</li>
                  <li>• <strong>Multi-Year:</strong> Destination, Year, Demand</li>
                  <li>• CSV, XLSX, XLSB supported</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-blue-800 mb-2">Cost Matrix Format:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• <strong>Long:</strong> Origin, Destination, Cost</li>
                  <li>• <strong>Wide:</strong> Origins as rows, destinations as columns</li>
                  <li>• Supports cost/mile + distance calculations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
