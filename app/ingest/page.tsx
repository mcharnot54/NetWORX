"use client";
import { useState, useMemo } from "react";

interface MappingResult {
  rawHeader: string;
  mappedTo?: string;
  score: number;
  candidates: { field: string; score: number }[];
  classificationMethod?: string;
  transportAnalysis?: {
    isTransportColumn: boolean;
    extractedAmount: number;
    confidence: number;
  };
}

export default function IngestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("TRANSPORT");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("domain", domain);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const json = await res.json();
      setResult(json);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setBusy(false);
    }
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Smart Data Ingest & Learning System</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg border">
        <h2 className="font-semibold text-blue-900 mb-2">Enhanced Processing Features</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Smart header detection (skips logos and empty rows)</li>
          <li>• Column V detection for R&L files</li>
          <li>• Transport cost extraction and validation</li>
          <li>• Machine learning-based column classification</li>
          <li>• Multi-sheet Excel processing with best sheet selection</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-6 border rounded-lg bg-gray-50">
        <div>
          <label className="block text-sm font-medium mb-2">Upload File</label>
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} 
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Data Domain</label>
          <select 
            value={domain} 
            onChange={(e) => setDomain(e.target.value)} 
            className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="TRANSPORT">Transport & Logistics</option>
            <option value="WAREHOUSE">Warehouse Operations</option>
            <option value="INVENTORY">Inventory Management</option>
          </select>
        </div>
        
        <button 
          disabled={!file || busy} 
          className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {busy ? "Processing..." : "Upload & Analyze"}
        </button>
      </form>

      {result && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-700">{result.report.validRows}</div>
              <div className="text-sm text-green-600">Valid Rows</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-700">{result.report.totalRows}</div>
              <div className="text-sm text-blue-600">Total Rows</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border">
              <div className="text-2xl font-bold text-purple-700">{result.report.mappedFields.length}</div>
              <div className="text-sm text-purple-600">Mapped Fields</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-700">{result.report.errorCount}</div>
              <div className="text-sm text-orange-600">Validation Errors</div>
            </div>
          </div>

          {/* Transport Analysis */}
          {result.report.columnAnalysis?.bestTransportColumn && (
            <div className="bg-emerald-50 p-4 rounded-lg border">
              <h3 className="font-semibold text-emerald-900 mb-2">🚛 Transport Cost Detected</h3>
              <div className="text-emerald-800">
                <p><strong>Best Column:</strong> {result.report.columnAnalysis.bestTransportColumn.header}</p>
                <p><strong>Extracted Amount:</strong> {formatCurrency(result.report.columnAnalysis.bestTransportColumn.amount)}</p>
                <p><strong>Confidence:</strong> {(result.report.columnAnalysis.bestTransportColumn.confidence * 100).toFixed(1)}%</p>
              </div>
            </div>
          )}

          {/* Column Mapping Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <h3 className="font-semibold p-4 border-b bg-gray-50">Column Mapping Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium">Raw Header</th>
                    <th className="text-left p-3 font-medium">→ Canonical Field</th>
                    <th className="text-left p-3 font-medium">Confidence</th>
                    <th className="text-left p-3 font-medium">Method</th>
                    <th className="text-left p-3 font-medium">Transport Analysis</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.report.mappingPreview || []).map((m: MappingResult, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-3 font-mono text-gray-700">{m.rawHeader}</td>
                      <td className="p-3">
                        {m.mappedTo ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            {m.mappedTo}
                          </span>
                        ) : (
                          <em className="text-red-600">unmapped</em>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${m.score >= 0.8 ? 'bg-green-500' : m.score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${m.score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{(m.score * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-600">{m.classificationMethod || 'similarity'}</span>
                      </td>
                      <td className="p-3">
                        {m.transportAnalysis?.isTransportColumn && (
                          <div className="text-xs">
                            <div className="text-green-600 font-medium">
                              {formatCurrency(m.transportAnalysis.extractedAmount)}
                            </div>
                            <div className="text-gray-500">
                              {(m.transportAnalysis.confidence * 100).toFixed(0)}% confidence
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unmapped Headers Warning */}
          {result.report.unmappedHeaders?.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ Unmapped Headers</h4>
              <p className="text-yellow-700 mb-2">
                The following headers couldn't be automatically mapped:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.report.unmappedHeaders.map((header: string) => (
                  <span key={header} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    {header}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {result.report.sampleErrors?.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <h3 className="font-semibold p-4 border-b bg-red-50 text-red-900">
                Validation Issues ({result.report.errorCount} total)
              </h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3">Row</th>
                      <th className="text-left p-3">Field</th>
                      <th className="text-left p-3">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.report.sampleErrors.map((error: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-3 text-gray-600">#{error.row}</td>
                        <td className="p-3 font-mono text-sm">{error.field}</td>
                        <td className="p-3 text-red-600">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Raw Report Data (Collapsible) */}
          <details className="bg-gray-50 rounded-lg border">
            <summary className="p-4 cursor-pointer font-medium hover:bg-gray-100">
              📊 View Raw Analysis Report
            </summary>
            <pre className="text-xs bg-gray-800 text-green-400 p-4 m-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result.report, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
