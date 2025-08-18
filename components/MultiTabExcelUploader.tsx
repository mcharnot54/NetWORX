"use client";

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Eye, Download, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';

interface ExcelTab {
  name: string;
  rows: number;
  columns: string[];
  data: any[];
  sampleData: any[];
  targetColumn?: string; // For transportation files
  extractedAmount?: number;
}

interface MultiTabFile {
  file: File;
  fileName: string;
  fileSize: number;
  tabs: ExcelTab[];
  fileType: 'UPS' | 'TL' | 'RL' | 'OTHER';
  totalExtracted: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

interface MultiTabExcelUploaderProps {
  onFilesProcessed: (files: MultiTabFile[]) => void;
  onFilesUploaded: (files: MultiTabFile[]) => void;
  scenarioId?: number;
}

export default function MultiTabExcelUploader({ onFilesProcessed, onFilesUploaded, scenarioId }: MultiTabExcelUploaderProps) {
  const [files, setFiles] = useState<MultiTabFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const detectFileType = (fileName: string): 'UPS' | 'TL' | 'RL' | 'OTHER' => {
    const lower = fileName.toLowerCase();
    if (lower.includes('ups') && lower.includes('individual')) return 'UPS';
    if (lower.includes('2024') && lower.includes('tl')) return 'TL';
    if (lower.includes('r&l') && lower.includes('curriculum')) return 'RL';
    return 'OTHER';
  };

  const extractTransportationCosts = (tab: ExcelTab, fileType: 'UPS' | 'TL' | 'RL' | 'OTHER'): { column: string; amount: number } => {
    let bestColumn = '';
    let bestAmount = 0;

    if (fileType === 'UPS') {
      // Extract from Net Charge column
      for (const row of tab.data) {
        if (row && row['Net Charge']) {
          const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 0.01) {
            bestAmount += numValue;
          }
        }
      }
      bestColumn = 'Net Charge';
    } else if (fileType === 'TL') {
      // Extract from Gross Rate column
      for (const row of tab.data) {
        if (row && row['Gross Rate']) {
          const numValue = parseFloat(String(row['Gross Rate']).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 100) {
            bestAmount += numValue;
          }
        }
      }
      bestColumn = 'Gross Rate';
    } else if (fileType === 'RL') {
      // Find best cost column
      for (const col of tab.columns) {
        let testAmount = 0;
        for (const row of tab.data) {
          if (row && row[col]) {
            const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 50) {
              testAmount += numValue;
            }
          }
        }
        if (testAmount > bestAmount) {
          bestAmount = testAmount;
          bestColumn = col;
        }
      }
    }

    return { column: bestColumn, amount: bestAmount };
  };

  const processExcelFile = async (file: File): Promise<MultiTabFile> => {
    try {
      // Use enhanced Excel validator
      const { EnhancedExcelValidator } = await import('@/lib/enhanced-excel-validator');

      const fileType = detectFileType(file.name);
      const expectedDataType = fileType === 'UPS' ? 'network' : fileType === 'TL' ? 'transport' : fileType === 'RL' ? 'cost' : undefined;

      const validator = new EnhancedExcelValidator({
        maxFileSizeMB: 200, // Increase for large transportation files
        backupOriginal: false, // Don't backup in browser
        validation: {
          strictMode: false,
          skipEmptyRows: true,
          skipEmptyColumns: true,
          autoDetectDataType: true
        }
      }, (message, level) => addLog(`[${level?.toUpperCase()}] ${message}`));

      addLog(`Processing ${file.name} with enhanced validation...`);

      const result = await validator.processExcelFile(file, expectedDataType);

      if (!result.validationResult.isValid) {
        const errors = result.validationResult.errors.map(e => e.message).join('; ');
        addLog(`⚠ Validation issues: ${errors}`);
      }

      // Log validation warnings
      if (result.validationResult.warnings.length > 0) {
        result.validationResult.warnings.forEach(warning => {
          addLog(`⚠ ${warning.message}`);
        });
      }

      // Log recommendations
      if (result.validationResult.recommendations.length > 0) {
        result.validationResult.recommendations.forEach(rec => {
          addLog(`💡 ${rec}`);
        });
      }

      // Log conversion results
      if (result.conversionResults) {
        const allConversions = Object.values(result.conversionResults).flatMap((conv: any) => conv.conversionsApplied);
        if (allConversions.length > 0) {
          addLog(`🔄 Applied ${allConversions.length} data standardization conversions`);
        }
      }

      const tabs: ExcelTab[] = [];
      let totalExtracted = 0;

      // Process multi-tab data if available
      const tabData = result.multiTabData || { [result.cleanedData.sheetName]: result.cleanedData };

      addLog(`Found ${Object.keys(tabData).length} sheets: ${Object.keys(tabData).join(', ')}`);

      for (const [sheetName, sheetData] of Object.entries(tabData)) {
        if (sheetData.data.length === 0) continue;

        // Extract transportation costs for this tab
        const { column: targetColumn, amount: extractedAmount } = extractTransportationCosts({
          name: sheetName,
          rows: sheetData.data.length,
          columns: sheetData.columnHeaders,
          data: sheetData.data,
          sampleData: sheetData.data.slice(0, 5)
        }, fileType);

        totalExtracted += extractedAmount;

        tabs.push({
          name: sheetName,
          rows: sheetData.data.length,
          columns: sheetData.columnHeaders,
          data: sheetData.data,
          sampleData: sheetData.data.slice(0, 5),
          targetColumn,
          extractedAmount
        });

        addLog(`  ${sheetName}: ${sheetData.data.length} rows, ${sheetData.columnHeaders.length} columns`);
        addLog(`    Extracted $${extractedAmount.toLocaleString()} from ${targetColumn}`);
        addLog(`    Cleaning: ${sheetData.cleaningReport.rowsRemoved} rows removed, ${sheetData.cleaningReport.valuesConverted} values converted`);
      }

      const multiTabFile: MultiTabFile = {
        file,
        fileName: file.name,
        fileSize: file.size,
        tabs,
        fileType,
        totalExtracted,
        processingStatus: 'completed'
      };

      // Add quality metrics to log
      const quality = result.validationResult.dataQuality;
      addLog(`✓ ${file.name} processed with ${(quality.completenessScore * 100).toFixed(1)}% data completeness`);
      addLog(`  Total extracted: $${totalExtracted.toLocaleString()} from ${tabs.length} tabs`);
      addLog(`  Processing time: ${result.validationResult.processingTime}ms`);

      return multiTabFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Error processing ${file.name}: ${errorMessage}`);

      return {
        file,
        fileName: file.name,
        fileSize: file.size,
        tabs: [],
        fileType: detectFileType(file.name),
        totalExtracted: 0,
        processingStatus: 'error',
        errorMessage
      };
    }
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsProcessing(true);
    addLog(`Starting processing of ${uploadedFiles.length} file(s)...`);

    try {
      const processedFiles: MultiTabFile[] = [];

      for (const file of Array.from(uploadedFiles)) {
        if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          try {
            const processed = await processExcelFile(file);
            processedFiles.push(processed);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            processedFiles.push({
              file,
              fileName: file.name,
              fileSize: file.size,
              tabs: [],
              fileType: 'OTHER',
              totalExtracted: 0,
              processingStatus: 'error',
              errorMessage
            });
          }
        } else {
          addLog(`⚠ Skipping ${file.name} - not an Excel file`);
        }
      }

      setFiles(processedFiles);
      addLog(`✓ Processing complete. ${processedFiles.length} files processed.`);
      
      // Calculate totals
      const grandTotal = processedFiles.reduce((sum, f) => sum + f.totalExtracted, 0);
      addLog(`📊 Grand Total Extracted: $${grandTotal.toLocaleString()}`);

      onFilesProcessed(processedFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Processing failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadToDatabase = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    addLog('Uploading files to database with preserved tab structure...');

    try {
      for (const file of files) {
        if (file.processingStatus === 'completed') {
          // Convert file to base64
          const reader = new FileReader();
          const base64Content = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file.file);
          });

          // Prepare multi-tab data structure
          const multiTabData = {
            file_content: base64Content,
            multi_tab_structure: {
              tabs: file.tabs.map(tab => ({
                name: tab.name,
                rows: tab.rows,
                columns: tab.columns,
                target_column: tab.targetColumn,
                extracted_amount: tab.extractedAmount,
                sample_data: tab.sampleData
              })),
              file_type: file.fileType,
              total_extracted: file.totalExtracted
            },
            excel_preserved: true
          };

          // Upload to database using multi-tab endpoint
          const uploadResponse = await fetch('/api/files/multi-tab-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.fileName,
              fileType: file.file.type,
              fileSize: file.fileSize,
              dataType: file.fileType === 'UPS' ? 'network' : file.fileType === 'TL' ? 'transport' : 'cost',
              scenarioId: scenarioId,
              processedData: multiTabData
            })
          });

          if (uploadResponse.ok) {
            addLog(`✓ ${file.fileName} uploaded with preserved tab structure`);
          } else {
            const errorData = await uploadResponse.text();
            addLog(`✗ Failed to upload ${file.fileName}: ${errorData}`);
          }
        }
      }

      addLog('✓ All files uploaded to database');
      onFilesUploaded(files);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Database upload failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount > 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount > 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Multi-Tab Excel File Upload
        </h3>
        
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Drop Excel files here or <span className="text-blue-600">click to browse</span>
            </p>
            <p className="text-sm text-gray-500">
              Supports .xlsx and .xls files with multiple tabs
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={uploadToDatabase}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload to Database
              </button>
              <button
                onClick={clearFiles}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear Files
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Processing Results */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Results</h3>
          
          <div className="space-y-4">
            {files.map((file, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {file.processingStatus === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">{file.fileName}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {file.fileType}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(file.totalExtracted)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {file.tabs.length} tabs
                    </div>
                  </div>
                </div>

                {file.processingStatus === 'error' && (
                  <div className="text-red-600 text-sm mb-3">
                    Error: {file.errorMessage}
                  </div>
                )}

                {file.tabs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Tabs:</div>
                    {file.tabs.map((tab, tabIndex) => (
                      <div key={tabIndex} className="bg-gray-50 rounded p-3 text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{tab.name}</span>
                            <span className="text-gray-500 ml-2">
                              ({tab.rows} rows, {tab.columns.length} columns)
                            </span>
                          </div>
                          <div className="text-right">
                            {tab.targetColumn && (
                              <div className="text-blue-600">
                                {tab.targetColumn}: {formatCurrency(tab.extractedAmount || 0)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-900">Total Transportation Baseline:</span>
              <span className="font-bold text-xl text-blue-900">
                {formatCurrency(files.reduce((sum, f) => sum + f.totalExtracted, 0))}
              </span>
            </div>
          </div>
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
  );
}
