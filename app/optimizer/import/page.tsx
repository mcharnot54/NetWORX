'use client';
import { useState } from "react";
import ColumnMapper from "@/components/ColumnMapper";
import { mapDemandAoA, mapCostAoA, mapCapacityAoA, DemandMapping, CostMapping, CapacityMapping } from "@/lib/importers/map";

export default function ImportPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; totalRows: number } | null>(null);
  const [mappingKind, setMappingKind] = useState<'demand' | 'demand-per-year' | 'cost' | 'capacity' | null>(null);
  const [status, setStatus] = useState<string>('');
  const [mappedData, setMappedData] = useState<any>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'demand' | 'demand-per-year' | 'cost' | 'capacity') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Uploading file...');
    setMappingKind(kind);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const rows = data.rows || [];
      const fileHeaders = (rows[0] || []).map((h: any) => String(h || '').trim());
      
      setHeaders(fileHeaders);
      setPreview(rows);
      setFileInfo({ name: data.name, totalRows: data.totalRows });
      setStatus(`File uploaded successfully. ${data.totalRows} total rows, showing first ${rows.length} for preview.`);
    } catch (err: any) {
      setStatus(`Upload error: ${err.message}`);
    }
  };

  const handleMapping = (mapping: DemandMapping | CostMapping | CapacityMapping) => {
    if (!preview.length || !mappingKind) return;

    try {
      if (mappingKind === 'demand' || mappingKind === 'demand-per-year') {
        const result = mapDemandAoA(preview, mapping as DemandMapping);
        setMappedData(result);
        setStatus(`✅ Demand mapping completed. ${result.base ? Object.keys(result.base).length : Object.keys(result.byYear || {}).length} destinations processed.`);
      } else if (mappingKind === 'cost') {
        const result = mapCostAoA(preview, mapping as CostMapping);
        setMappedData(result);
        setStatus(`✅ Cost matrix mapping completed. ${result.rows.length} origins × ${result.cols.length} destinations.`);
      } else if (mappingKind === 'capacity') {
        const result = mapCapacityAoA(preview, mapping as CapacityMapping);
        setMappedData(result);
        setStatus(`✅ Capacity mapping completed. ${Object.keys(result).length} facilities processed.`);
      }
    } catch (err: any) {
      setStatus(`❌ Mapping error: ${err.message}`);
    }
  };

  const exportMappedData = () => {
    if (!mappedData || !fileInfo) return;
    
    const dataStr = JSON.stringify(mappedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileInfo.name.split('.')[0]}_mapped_${mappingKind}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setHeaders([]);
    setPreview([]);
    setFileInfo(null);
    setMappingKind(null);
    setMappedData(null);
    setStatus('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🗂️ Data Import Wizard</h1>
          <p className="text-gray-600">
            Upload large CSV/XLSX/XLSB files and map columns to your data schema. 
            Perfect for handling real datasets with custom column names.
          </p>
        </div>

        {!fileInfo ? (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Data File</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <div className="text-sm font-medium text-gray-700 mb-2">Demand (Baseline)</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleUpload(e, 'demand')}
                  className="w-full text-xs"
                />
                <div className="text-xs text-gray-500 mt-1">Single year demand by destination</div>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <div className="text-sm font-medium text-gray-700 mb-2">Demand (Multi-Year)</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleUpload(e, 'demand-per-year')}
                  className="w-full text-xs"
                />
                <div className="text-xs text-gray-500 mt-1">Demand by destination and year</div>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <div className="text-sm font-medium text-gray-700 mb-2">Transportation Costs</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleUpload(e, 'cost')}
                  className="w-full text-xs"
                />
                <div className="text-xs text-gray-500 mt-1">Origin-destination cost matrix</div>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <div className="text-sm font-medium text-gray-700 mb-2">Facility Capacity</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb"
                  onChange={(e) => handleUpload(e, 'capacity')}
                  className="w-full text-xs"
                />
                <div className="text-xs text-gray-500 mt-1">Warehouse/DC capacity limits</div>
              </div>
            </div>
            
            {status && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                {status}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">📁 {fileInfo.name}</h2>
                  <p className="text-sm text-gray-600">
                    {fileInfo.totalRows.toLocaleString()} total rows • {mappingKind} data type
                  </p>
                </div>
                <button
                  onClick={resetImport}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Upload Different File
                </button>
              </div>
            </div>

            {/* Preview Table */}
            {preview.length > 1 && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-3">📊 Data Preview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {headers.map((h, i) => (
                          <th key={i} className="border px-2 py-1 text-left font-medium">
                            {h || `Column ${i}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1, 11).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {headers.map((_, ci) => (
                            <td key={ci} className="border px-2 py-1">
                              {String(row[ci] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Showing first 10 rows of {preview.length} preview rows
                </div>
              </div>
            )}

            {/* Column Mapping */}
            {mappingKind && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-3">🔗 Column Mapping</h3>
                <ColumnMapper
                  headers={headers}
                  kind={mappingKind}
                  onApply={handleMapping}
                  initialData={preview}
                />
              </div>
            )}

            {/* Results */}
            {mappedData && (
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">✅ Mapping Results</h3>
                  <button
                    onClick={exportMappedData}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Export JSON
                  </button>
                </div>
                <div className="bg-gray-50 rounded p-3 overflow-auto max-h-64">
                  <pre className="text-xs">{JSON.stringify(mappedData, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Status */}
            {status && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                {status}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-xl border shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-3">📚 How to Use</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">File Requirements:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Supports CSV, XLSX, XLS, XLSB formats</li>
                <li>• First row should contain column headers</li>
                <li>• Large files (100MB+) are supported</li>
                <li>• Unicode and special characters are preserved</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Mapping Process:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Smart suggestions auto-detect likely columns</li>
                <li>• Save/load mapping profiles for reuse</li>
                <li>• Preview shows selected columns highlighted</li>
                <li>• Export mapped data as JSON for integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
