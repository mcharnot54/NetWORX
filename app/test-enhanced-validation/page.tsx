"use client";

import { useState, useRef } from 'react';
import Navigation from "@/components/Navigation";
import { FileSpreadsheet, CheckCircle, AlertCircle, TrendingUp, Upload, Eye } from 'lucide-react';

interface ValidationResult {
  success: boolean;
  validation?: any;
  data?: any;
  sample?: any;
  error?: string;
}

export default function TestEnhancedValidationPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setLogs([]);
    
    addLog(`Starting enhanced validation of ${file.name}`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataType', detectDataType(file.name));

      const response = await fetch('/api/validate-excel-advanced', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        addLog(`✓ Validation completed successfully`);
        addLog(`  Data type: ${data.validation.detectedDataType}`);
        addLog(`  Completeness: ${(data.validation.dataQuality.completenessScore * 100).toFixed(1)}%`);
        addLog(`  Processing time: ${data.validation.processingTime}ms`);
        
        if (data.data.transportationTotals) {
          addLog(`  Transportation total: ${data.data.transportationTotals.formattedTotal}`);
        }
      } else {
        addLog(`✗ Validation failed: ${data.error}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Error: ${errorMessage}`);
      setResult({ success: false, error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const detectDataType = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes('ups') && lower.includes('individual')) return 'network';
    if (lower.includes('2024') && lower.includes('tl')) return 'transport';
    if (lower.includes('r&l') && lower.includes('curriculum')) return 'cost';
    if (lower.includes('forecast') || lower.includes('demand')) return 'forecast';
    if (lower.includes('sku') || lower.includes('product')) return 'sku';
    return 'unknown';
  };

  const formatDataQuality = (score: number) => {
    if (score >= 0.9) return { label: 'Excellent', color: 'text-green-600' };
    if (score >= 0.8) return { label: 'Good', color: 'text-blue-600' };
    if (score >= 0.6) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Enhanced Excel Validation Test
            </h1>
          </div>
          <p className="text-gray-600 max-w-3xl">
            Test the enhanced Excel validation system based on Python validation requirements. 
            This includes comprehensive data cleaning, multi-tab processing, and transportation-specific validation.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File for Validation</h3>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Drop Excel file here or <span className="text-blue-600">click to browse</span>
            </p>
            <p className="text-sm text-gray-500">
              Supports .xlsx and .xls files with advanced validation
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
          </div>
        </div>

        {/* Validation Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Validation Results
            </h3>

            {result.success && result.validation ? (
              <div className="space-y-6">
                {/* Overall Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Validation Status</div>
                    <div className={`text-lg font-bold ${result.validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {result.validation.isValid ? 'VALID' : 'INVALID'}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Data Type</div>
                    <div className="text-lg font-bold text-green-800">
                      {result.validation.detectedDataType.toUpperCase()}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 font-medium">Sheets Processed</div>
                    <div className="text-lg font-bold text-purple-800">
                      {result.validation.sheetsProcessed.length}
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm text-yellow-600 font-medium">Processing Time</div>
                    <div className="text-lg font-bold text-yellow-800">
                      {result.validation.processingTime}ms
                    </div>
                  </div>
                </div>

                {/* Data Quality Metrics */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Data Quality Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(result.validation.dataQuality).map(([key, value]) => {
                      if (typeof value === 'number' && key.includes('Score')) {
                        const quality = formatDataQuality(value);
                        return (
                          <div key={key} className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 font-medium">
                              {key.replace('Score', '').replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div className={`text-sm font-bold ${quality.color}`}>
                              {(value * 100).toFixed(1)}%
                            </div>
                            <div className={`text-xs ${quality.color}`}>
                              {quality.label}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>

                {/* Data Conversion Results */}
                {result.conversion && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Data Standardization Results
                    </h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white p-3 rounded">
                          <div className="text-sm text-blue-600 font-medium">Sheets Processed</div>
                          <div className="text-lg font-bold text-blue-800">
                            {result.conversion.standardizationSummary.totalSheets}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-sm text-blue-600 font-medium">Conversions Applied</div>
                          <div className="text-lg font-bold text-blue-800">
                            {result.conversion.standardizationSummary.totalConversions}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="text-sm text-blue-600 font-medium">Avg Completeness</div>
                          <div className="text-lg font-bold text-blue-800">
                            {(result.conversion.standardizationSummary.averageCompleteness * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Conversions Applied */}
                      {result.conversion.conversionsApplied.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-blue-900 mb-2">Conversions Applied:</h5>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(result.conversion.conversionsApplied)).map((conversion: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {conversion.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Column Mappings */}
                      <div>
                        <h5 className="font-medium text-blue-900 mb-2">Column Mappings:</h5>
                        <div className="space-y-2">
                          {Object.entries(result.conversion.columnMappings).map(([sheet, mappings]: [string, any], index: number) => (
                            <div key={index} className="bg-white p-2 rounded text-sm">
                              <div className="font-medium text-blue-800">{sheet}:</div>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                {Object.entries(mappings).slice(0, 6).map(([original, standard]: [string, any], mapIndex: number) => (
                                  <div key={mapIndex} className="text-xs">
                                    <span className="text-gray-600">{original}</span> → <span className="text-blue-600">{standard}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transportation Totals */}
                {result.data?.transportationTotals && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Transportation Cost Extraction
                    </h4>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-green-900">Total Extracted:</span>
                        <span className="text-2xl font-bold text-green-700">
                          {result.data.transportationTotals.formattedTotal}
                        </span>
                      </div>
                      <div className="text-sm text-green-700 mb-3">
                        Method: {result.data.transportationTotals.extractionMethod}
                      </div>

                      {/* Tab breakdown */}
                      <div className="space-y-2">
                        {result.data.transportationTotals.tabBreakdown.map((tab: any, index: number) => (
                          <div key={index} className="bg-white p-2 rounded text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{tab.sheetName} ({tab.rows} rows)</span>
                              <span className="text-green-600">{tab.formatted}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              From: {tab.targetColumn}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Errors and Warnings */}
                {(result.validation.errors.length > 0 || result.validation.warnings.length > 0) && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Issues Found</h4>
                    <div className="space-y-2">
                      {result.validation.errors.map((error: any, index: number) => (
                        <div key={index} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-800">Error</span>
                            <span className={`px-2 py-1 text-xs rounded-full bg-red-100 text-red-700`}>
                              {error.severity}
                            </span>
                          </div>
                          <div className="text-sm text-red-700 mt-1">{error.message}</div>
                        </div>
                      ))}
                      
                      {result.validation.warnings.map((warning: any, index: number) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium text-yellow-800">Warning</span>
                            <span className={`px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700`}>
                              {warning.severity}
                            </span>
                          </div>
                          <div className="text-sm text-yellow-700 mt-1">{warning.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.validation.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Recommendations</h4>
                    <ul className="space-y-1">
                      {result.validation.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                          💡 {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sample Data */}
                {result.sample && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Sample Data (First 3 rows)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-gray-50 rounded-lg overflow-hidden">
                        <thead className="bg-gray-100">
                          <tr>
                            {result.sample.columnHeaders.map((header: string, index: number) => (
                              <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.sample.sampleRows.map((row: any, rowIndex: number) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {result.sample.columnHeaders.map((header: string, colIndex: number) => (
                                <td key={colIndex} className="px-3 py-2 text-sm text-gray-700">
                                  {String(row[header] || '').slice(0, 50)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600">
                Error: {result.error}
              </div>
            )}
          </div>
        )}

        {/* Processing Logs */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Log</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
