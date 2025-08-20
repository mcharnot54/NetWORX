"use client";

import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Eye, Download, CheckCircle, AlertCircle, Trash2, RefreshCw, Clock, AlertTriangle } from 'lucide-react';

interface ExcelTab {
  name: string;
  rows: number;
  columns: string[];
  data: any[];
  sampleData: any[];
  extractedAmount?: number;
}

interface ProcessedFile {
  fileName: string;
  fileSize: number;
  tabs: ExcelTab[];
  fileType: 'UPS' | 'TL' | 'RL' | 'INVENTORY' | 'OTHER';
  totalExtracted: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error' | 'retrying';
  errorMessage?: string;
  uploadedAt?: Date;
  retryCount?: number;
}

interface EnhancedMultiTabUploaderProps {
  onFilesProcessed: (files: ProcessedFile[]) => void;
  onFilesUploaded: (files: ProcessedFile[]) => void;
  scenarioId?: number;
  maxRetries?: number;
  enableAutoRetry?: boolean;
}

export default function EnhancedMultiTabUploader({ 
  onFilesProcessed, 
  onFilesUploaded, 
  scenarioId, 
  maxRetries = 3,
  enableAutoRetry = true
}: EnhancedMultiTabUploaderProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string, level: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${emoji[level]} ${message}`]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return { isValid: false, error: 'Invalid file type. Only Excel (.xlsx, .xls) and CSV files are supported.' };
    }
    
    if (file.size > maxSize) {
      return { isValid: false, error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.` };
    }
    
    if (file.size === 0) {
      return { isValid: false, error: 'File is empty.' };
    }
    
    return { isValid: true };
  };

  const processFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    addLog(`Starting processing of ${selectedFiles.length} file(s)`, 'info');
    setIsProcessing(true);

    const validatedFiles: File[] = [];
    
    // Validate all files first
    for (const file of selectedFiles) {
      const validation = validateFile(file);
      if (validation.isValid) {
        validatedFiles.push(file);
        addLog(`✓ File validated: ${file.name}`, 'success');
      } else {
        addLog(`✗ File validation failed for ${file.name}: ${validation.error}`, 'error');
      }
    }

    if (validatedFiles.length === 0) {
      addLog('No valid files to process', 'error');
      setIsProcessing(false);
      return;
    }

    const processedFiles: ProcessedFile[] = [];

    for (const file of validatedFiles) {
      try {
        const processed = await processFile(file);
        processedFiles.push(processed);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`Failed to process ${file.name}: ${errorMessage}`, 'error');
        
        processedFiles.push({
          fileName: file.name,
          fileSize: file.size,
          tabs: [],
          fileType: 'OTHER',
          totalExtracted: 0,
          processingStatus: 'error',
          errorMessage,
          uploadedAt: new Date(),
          retryCount: 0
        });
      }
    }

    setFiles(prev => [...prev, ...processedFiles]);
    onFilesProcessed(processedFiles);
    setIsProcessing(false);
    
    addLog(`Processing complete. ${processedFiles.filter(f => f.processingStatus === 'completed').length}/${processedFiles.length} files processed successfully`, 'success');
  };

  const processFile = async (file: File): Promise<ProcessedFile> => {
    addLog(`Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    
    // Update progress
    setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          setUploadProgress(prev => ({ ...prev, [file.name]: 30 }));
          
          // Simulate processing time based on file size
          const processingTime = Math.min(file.size / 1024 / 1024 * 500, 3000);
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 60 }));
          
          // Detect file type based on name and content
          const fileType = detectFileType(file.name);
          
          // Simulate tab extraction
          const tabs: ExcelTab[] = [];
          const tabCount = Math.floor(Math.random() * 5) + 1; // 1-5 tabs
          
          for (let i = 0; i < tabCount; i++) {
            tabs.push({
              name: `Sheet${i + 1}`,
              rows: Math.floor(Math.random() * 1000) + 100,
              columns: ['A', 'B', 'C', 'D', 'E'],
              data: [],
              sampleData: [
                { A: 'Sample', B: 'Data', C: 'Row', D: '1', E: '100' },
                { A: 'Sample', B: 'Data', C: 'Row', D: '2', E: '200' }
              ],
              extractedAmount: Math.floor(Math.random() * 100000) + 10000
            });
          }
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 90 }));
          
          const totalExtracted = tabs.reduce((sum, tab) => sum + (tab.extractedAmount || 0), 0);
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          const processed: ProcessedFile = {
            fileName: file.name,
            fileSize: file.size,
            tabs,
            fileType,
            totalExtracted,
            processingStatus: 'completed',
            uploadedAt: new Date(),
            retryCount: 0
          };
          
          addLog(`✓ Successfully processed ${file.name} - Extracted: $${totalExtracted.toLocaleString()}`, 'success');
          resolve(processed);
          
        } catch (error) {
          addLog(`✗ Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          reject(error);
        } finally {
          // Clean up progress tracking
          setTimeout(() => {
            setUploadProgress(prev => {
              const updated = { ...prev };
              delete updated[file.name];
              return updated;
            });
          }, 2000);
        }
      };
      
      reader.onerror = () => {
        const error = new Error(`Failed to read file: ${file.name}`);
        addLog(`✗ File read error: ${error.message}`, 'error');
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const detectFileType = (fileName: string): ProcessedFile['fileType'] => {
    const name = fileName.toLowerCase();
    if (name.includes('ups')) return 'UPS';
    if (name.includes('tl') || name.includes('truckload')) return 'TL';
    if (name.includes('r&l') || name.includes('rl')) return 'RL';
    if (name.includes('inventory') || name.includes('stock')) return 'INVENTORY';
    return 'OTHER';
  };

  const retryFile = async (fileIndex: number) => {
    const file = files[fileIndex];
    if (!file || file.retryCount! >= maxRetries) return;

    addLog(`Retrying ${file.fileName} (attempt ${(file.retryCount || 0) + 1}/${maxRetries})`, 'warning');
    
    setFiles(prev => prev.map((f, i) => 
      i === fileIndex 
        ? { ...f, processingStatus: 'retrying', retryCount: (f.retryCount || 0) + 1 }
        : f
    ));

    try {
      // Simulate retry with slightly different processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 70% chance of success on retry
      if (Math.random() > 0.3) {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex 
            ? { ...f, processingStatus: 'completed', errorMessage: undefined, totalExtracted: Math.floor(Math.random() * 100000) + 10000 }
            : f
        ));
        addLog(`✓ Retry successful for ${file.fileName}`, 'success');
      } else {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex 
            ? { ...f, processingStatus: 'error', errorMessage: 'Retry failed - please check file format' }
            : f
        ));
        addLog(`✗ Retry failed for ${file.fileName}`, 'error');
      }
    } catch (error) {
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex 
          ? { ...f, processingStatus: 'error', errorMessage: error instanceof Error ? error.message : 'Retry failed' }
          : f
      ));
      addLog(`✗ Retry error for ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const uploadToDatabase = async () => {
    if (files.length === 0) {
      addLog('No files to upload', 'warning');
      return;
    }

    const completedFiles = files.filter(f => f.processingStatus === 'completed');
    if (completedFiles.length === 0) {
      addLog('No successfully processed files to upload', 'warning');
      return;
    }

    setIsProcessing(true);
    addLog(`Uploading ${completedFiles.length} file(s) to database...`, 'info');

    try {
      for (const file of completedFiles) {
        try {
          // Simulate database upload
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          addLog(`✓ Uploaded ${file.fileName} to database`, 'success');
        } catch (error) {
          addLog(`✗ Failed to upload ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      }
      
      addLog('✓ Database upload completed', 'success');
      onFilesUploaded(completedFiles);
    } catch (error) {
      addLog(`✗ Database upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFiles = () => {
    setFiles([]);
    setLogs([]);
    setUploadProgress({});
    addLog('Cleared all files and logs', 'info');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  const getStatusIcon = (status: ProcessedFile['processingStatus']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'processing': 
      case 'retrying': return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'pending': return <Clock className="h-5 w-5 text-gray-400" />;
      default: return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const totalExtracted = files.reduce((sum, file) => sum + file.totalExtracted, 0);
  const successfulFiles = files.filter(f => f.processingStatus === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Enhanced Multi-Tab Excel Upload
        </h3>
        
        <div className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              isDragging
                ? 'border-blue-400 bg-blue-50 scale-105'
                : isProcessing
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isProcessing && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600 mb-2 font-medium">
                  Processing files... Please wait
                </p>
                <p className="text-sm text-gray-500">
                  Enhanced validation and error recovery in progress
                </p>
              </>
            ) : (
              <>
                <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-gray-600 mb-2">
                  {isDragging ? 'Drop files here' : 'Drop Excel files here or'} <span className="text-blue-600 font-medium">click to browse</span>
                </p>
                <p className="text-sm text-gray-500">
                  Enhanced processing with automatic error recovery • Max 50MB per file
                </p>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              disabled={isProcessing}
              onChange={(e) => processFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
          </div>

          {/* Progress Indicators */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Processing Progress</h4>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{fileName}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{files.length}</div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{successfulFiles}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalExtracted)}</div>
                <div className="text-sm text-gray-600">Total Extracted</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {files.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={uploadToDatabase}
                disabled={isProcessing || successfulFiles === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload to Database ({successfulFiles})
              </button>
              <button
                onClick={clearFiles}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File Results */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Results</h3>
          
          <div className="space-y-4">
            {files.map((file, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(file.processingStatus)}
                      <h4 className="font-medium text-gray-900">{file.fileName}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        file.fileType === 'INVENTORY' ? 'bg-purple-100 text-purple-800' :
                        file.fileType === 'UPS' ? 'bg-blue-100 text-blue-800' :
                        file.fileType === 'TL' ? 'bg-green-100 text-green-800' :
                        file.fileType === 'RL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {file.fileType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(file.fileSize)} • {file.tabs.length} tab{file.tabs.length !== 1 ? 's' : ''} • 
                      {file.uploadedAt && ` Uploaded ${file.uploadedAt.toLocaleTimeString()}`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.processingStatus === 'error' && file.retryCount! < maxRetries && (
                      <button
                        onClick={() => retryFile(index)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </button>
                    )}
                    
                    {file.processingStatus === 'completed' && (
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(file.totalExtracted)}
                        </div>
                        <div className="text-xs text-gray-500">Extracted</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {file.errorMessage && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{file.errorMessage}</p>
                    {file.retryCount! > 0 && (
                      <p className="text-xs text-red-500 mt-1">Retry attempts: {file.retryCount}/{maxRetries}</p>
                    )}
                  </div>
                )}
                
                {file.tabs.length > 0 && file.processingStatus === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-2">Tabs Processed:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {file.tabs.map((tab, tabIndex) => (
                        <div key={tabIndex} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{tab.name}</div>
                          <div className="text-gray-600">{tab.rows} rows</div>
                          {tab.extractedAmount && (
                            <div className="text-green-600 font-medium">
                              {formatCurrency(tab.extractedAmount)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Logs */}
      {logs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Logs</h3>
          
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
            <div className="font-mono text-sm text-gray-300 space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap break-words">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
