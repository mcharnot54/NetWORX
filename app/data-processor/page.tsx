"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ProjectScenarioManager from "@/components/ProjectScenarioManager";
import { useData } from "@/context/DataContext";
import { DataValidator } from "@/lib/data-validator";
import { DataProcessingUtils, EnhancedDataProcessingUtils } from "@/lib/data-processing-utils";
import {
  ComprehensiveOperationalData,
  DataMappingTemplate,
  AdaptiveTemplate,
  ProcessingResult,
  DATA_MAPPING_TEMPLATES
} from "@/types/data-schema";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Database,
  Settings,
  Play,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
  Save,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Building,
} from "lucide-react";

interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'completed';
  owner_id?: string;
  project_duration_years: number;
  base_year: number;
}

interface Scenario {
  id: number;
  project_id: number;
  name: string;
  scenario_number: number;
  number_of_nodes?: number;
  cities?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_progress' | 'completed' | 'failed';
  capacity_analysis_completed: boolean;
  transport_optimization_completed: boolean;
  warehouse_optimization_completed: boolean;
}

interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sheets?: string[];
  selectedSheet?: string;
  detectedType?: string;
  detectedTemplate?: DataMappingTemplate | AdaptiveTemplate | null;
  scenarioId?: number;
  file?: File;
  parsedData?: any[];
  columnNames?: string[];
  processingResult?: ProcessingResult;
  validationStatus?: 'pending' | 'processing' | 'validated' | 'error';
}

export default function DataProcessor() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { setProcessedData } = useData();
  const [files, setFiles] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DataMappingTemplate | null>(null);
  const [validatedData, setValidatedData] = useState<ComprehensiveOperationalData | null>(null);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const autoDetectDataType = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes("forecast") || name.includes("demand")) return "forecast";
    if (name.includes("sku") || name.includes("product")) return "sku";
    if (name.includes("network") || name.includes("location")) return "network";
    if (name.includes("operational") || name.includes("reporting")) return "operational";
    if (name.includes("financial") || name.includes("cost")) return "financial";
    if (name.includes("sales") || name.includes("historical")) return "sales";
    return "unknown";
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject || !selectedScenario) {
      alert('Please select a project and scenario first');
      return;
    }

    const uploadedFiles = Array.from(event.target.files || []);
    if (uploadedFiles.length === 0) {
      addToLog("No files selected for upload");
      return;
    }

    addToLog(`Processing ${uploadedFiles.length} file(s)...`);
    const processedFiles: FileData[] = [];

    for (const file of uploadedFiles) {
      try {
        addToLog(`Analyzing file: ${file.name}`);
        
        // Parse file to extract data and columns
        const { data, columnHeaders } = await DataValidator.parseFile(file);
        
        // Auto-detect appropriate data template
        const detectedTemplate = DataValidator.detectDataTemplate(columnHeaders);
        
        const fileData: FileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          detectedType: autoDetectDataType(file.name),
          detectedTemplate,
          scenarioId: selectedScenario.id,
          file,
          parsedData: data,
          columnNames: columnHeaders,
          validationStatus: 'pending'
        };

        processedFiles.push(fileData);
        
        if (detectedTemplate) {
          addToLog(`✓ Detected template: ${detectedTemplate.name}`);
        } else {
          addToLog(`⚠ No template detected for ${file.name} - manual mapping required`);
        }
        
      } catch (error) {
        addToLog(`✗ Error processing ${file.name}: ${error}`);
      }
    }

    setFiles(processedFiles);
    addToLog(`Upload complete. ${processedFiles.length} files ready for validation.`);
  };

  const validateFileData = async (fileIndex: number) => {
    const file = files[fileIndex];
    if (!file.parsedData || !file.detectedTemplate) {
      addToLog(`Cannot validate ${file.name} - missing data or template`);
      return;
    }

    addToLog(`Validating data in ${file.name}...`);
    
    // Update status to processing
    const updatedFiles = [...files];
    updatedFiles[fileIndex].validationStatus = 'processing';
    setFiles(updatedFiles);

    try {
      const result = DataValidator.processDataWithTemplate(
        file.parsedData,
        file.detectedTemplate
      );

      // Update file with validation results
      updatedFiles[fileIndex].processingResult = result;
      updatedFiles[fileIndex].validationStatus = result.success ? 'validated' : 'error';
      setFiles(updatedFiles);

      if (result.success) {
        addToLog(`✓ Validation successful for ${file.name}`);
        addToLog(DataProcessingUtils.formatDataQuality(result.summary.dataQuality));
      } else {
        addToLog(`✗ Validation failed for ${file.name}`);
        addToLog(DataProcessingUtils.formatValidationResults(result.data?.metadata?.validationResults || []));
      }

    } catch (error) {
      addToLog(`✗ Validation error for ${file.name}: ${error}`);
      updatedFiles[fileIndex].validationStatus = 'error';
      setFiles(updatedFiles);
    }
  };

  const processAllFiles = async () => {
    if (files.length === 0) {
      addToLog("No files to process");
      return;
    }

    setProcessing(true);
    addToLog("Starting comprehensive data processing...");

    const mergedData: ComprehensiveOperationalData = {
      operationalReporting: {},
      businessFinancials: {},
      salesGrowthTrajectory: {},
      metadata: {
        lastProcessed: new Date().toISOString(),
        dataQuality: {
          completeness: 0,
          accuracy: 0,
          consistency: 0,
          timeliness: 100,
          validRecords: 0,
          totalRecords: 0,
          missingFields: [],
          invalidValues: []
        },
        validationResults: []
      }
    };

    let totalValidRecords = 0;
    let totalRecords = 0;

    // Process each validated file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.validationStatus !== 'validated' || !file.processingResult?.data) {
        addToLog(`Skipping ${file.name} - not validated`);
        continue;
      }

      const fileData = file.processingResult.data;
      
      // Merge data by category
      if (fileData.operationalReporting) {
        Object.assign(mergedData.operationalReporting!, fileData.operationalReporting);
      }
      if (fileData.businessFinancials) {
        Object.assign(mergedData.businessFinancials!, fileData.businessFinancials);
      }
      if (fileData.salesGrowthTrajectory) {
        Object.assign(mergedData.salesGrowthTrajectory!, fileData.salesGrowthTrajectory);
      }

      // Aggregate quality metrics
      const fileQuality = file.processingResult.summary.dataQuality;
      totalValidRecords += fileQuality.validRecords;
      totalRecords += fileQuality.totalRecords;
      
      if (fileData.metadata?.validationResults) {
        mergedData.metadata!.validationResults!.push(...fileData.metadata.validationResults);
      }
    }

    // Calculate overall data quality
    if (mergedData.metadata?.dataQuality) {
      mergedData.metadata.dataQuality.validRecords = totalValidRecords;
      mergedData.metadata.dataQuality.totalRecords = totalRecords;
      mergedData.metadata.dataQuality.accuracy = totalRecords > 0 ? (totalValidRecords / totalRecords) * 100 : 100;
      mergedData.metadata.dataQuality.completeness = totalRecords > 0 ? (totalValidRecords / totalRecords) * 100 : 100;
    }

    setValidatedData(mergedData);
    setProcessedData(mergedData as any); // Update context with processed data
    
    addToLog("✓ Data processing complete");
    addToLog(`Processed ${totalValidRecords}/${totalRecords} records successfully`);
    
    setProcessing(false);
    setActiveTab("results");
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'validated': return <CheckCircle className="text-green-500" size={16} />;
      case 'error': return <AlertCircle className="text-red-500" size={16} />;
      case 'processing': return <RefreshCw className="text-blue-500 animate-spin" size={16} />;
      default: return <Database className="text-gray-400" size={16} />;
    }
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-blue-600" size={32} />
            <div>
              <h2 className="card-title mb-1">Data Processor</h2>
              <p className="text-gray-600">Upload and validate operational data for your project scenarios</p>
            </div>
          </div>
          
          <div style={{ marginBottom: "2rem" }}>
            <ProjectScenarioManager
              selectedProject={selectedProject}
              selectedScenario={selectedScenario}
              onSelectProject={setSelectedProject}
              onSelectScenario={setSelectedScenario}
            />
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                id: 'upload',
                label: 'File Upload',
                description: 'Upload and analyze data files',
                icon: Upload,
                color: 'blue'
              },
              {
                id: 'validation',
                label: 'Data Validation',
                description: 'Review validation results',
                icon: Shield,
                color: 'green'
              },
              {
                id: 'templates',
                label: 'Data Templates',
                description: 'View supported data formats',
                icon: Settings,
                color: 'purple'
              },
              {
                id: 'results',
                label: 'Results',
                description: 'View processed data summary',
                icon: BarChart3,
                color: 'orange'
              }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const colorClasses = {
                blue: isActive
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-lg shadow-blue-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600',
                green: isActive
                  ? 'bg-green-50 border-green-200 text-green-700 shadow-lg shadow-green-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-green-50 hover:border-green-200 hover:text-green-600',
                purple: isActive
                  ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-lg shadow-purple-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600',
                orange: isActive
                  ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-lg shadow-orange-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600'
              };

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative p-8 rounded-xl border-2 transition-all duration-200 text-left w-full h-40 ${colorClasses[tab.color as keyof typeof colorClasses]} ${isActive ? 'transform scale-105' : 'hover:transform hover:scale-105'}`}
                  title={`Click to switch to ${tab.label} section`}
                >
                  <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
                    <div className={`p-4 rounded-full ${isActive ? `bg-${tab.color}-100` : 'bg-gray-100'}`}>
                      <tab.icon size={32} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{tab.label}</h3>
                      <p className="text-sm opacity-80 mt-1">{tab.description}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className={`absolute top-3 right-3 w-4 h-4 bg-${tab.color}-500 rounded-full`}></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && selectedProject && selectedScenario && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="text-blue-600" size={24} />
                <div>
                  <h3 className="text-xl font-semibold">File Upload & Analysis</h3>
                  <p className="text-gray-600 text-sm">
                    Selected: {selectedProject.name} → {selectedScenario.name}
                  </p>
                </div>
              </div>
              
              <div className="group relative">
                <div className="file-upload bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-lg font-medium text-gray-700 mb-2">Upload Operational Data Files</p>
                    <p className="text-gray-500">Supports Excel (.xlsx, .xls) and CSV files</p>
                    <p className="text-sm text-gray-400 mt-2">Files will be automatically analyzed and validated</p>
                  </label>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold cursor-help">
                  💡
                </div>
                <div className="absolute top-8 right-0 w-80 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="text-sm space-y-2">
                    <div className="font-semibold">File Upload Tips:</div>
                    <div>• <strong>Multiple files:</strong> You can upload several files at once</div>
                    <div>• <strong>Auto-detection:</strong> System automatically detects data types</div>
                    <div>• <strong>Supported formats:</strong> Excel (.xlsx, .xls) and CSV files</div>
                    <div>• <strong>Data types:</strong> Forecast, SKU, Network, Operational, Financial, Sales</div>
                    <div className="text-xs text-blue-600 mt-2">
                      💡 Check the "Data Templates" tab to see required column structures
                    </div>
                  </div>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-4">Uploaded Files ({files.length})</h4>
                  <div className="space-y-3">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="text-blue-500" size={20} />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-600">
                              {Math.round(file.size / 1024)}KB • {file.detectedType}
                              {file.detectedTemplate && ` • ${file.detectedTemplate.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusIcon(file.validationStatus)}
                          {file.validationStatus === 'pending' && (
                            <div className="group relative">
                              <button
                                onClick={() => validateFileData(index)}
                                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                title="Click to validate this file's data structure and quality"
                              >
                                <Zap size={14} />
                                Validate
                              </button>
                              <div className="absolute bottom-full mb-1 right-0 w-48 bg-gray-900 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                                Click to validate data structure, check for missing values, and ensure column mappings are correct
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {files.some(f => f.validationStatus === 'validated') && (
                    <div className="mt-6 flex justify-center">
                      <div className="group relative">
                        <button
                          onClick={processAllFiles}
                          disabled={processing}
                          className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          title="Merge and process all validated files into a unified dataset"
                        >
                          {processing ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                          {processing ? 'Processing...' : 'Process All Data'}
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900 text-white p-3 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          <div className="font-semibold mb-1">Final Processing Step:</div>
                          <div>Merges all validated files into a comprehensive dataset ready for optimization modules</div>
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-green-600" size={24} />
                <h3 className="text-xl font-semibold">Data Validation Results</h3>
              </div>

              {files.filter(f => f.processingResult).map((file, index) => (
                <div key={index} className="mb-6 p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="text-blue-500" size={20} />
                    <h4 className="font-semibold">{file.name}</h4>
                    {getStatusIcon(file.validationStatus)}
                  </div>
                  
                  {file.processingResult && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap">
                        {DataProcessingUtils.generateProcessingSummary(file.processingResult)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {files.filter(f => f.processingResult).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Shield size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No validation results yet. Upload and validate files first.</p>
                </div>
              )}
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="text-purple-600" size={24} />
                <h3 className="text-xl font-semibold">Data Mapping Templates</h3>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Supported Data Categories</h4>
                <p className="text-blue-700 mb-3">The system automatically detects and validates the following operational data categories based on your uploaded file structure:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong className="text-blue-800">Operational Reporting:</strong>
                    <ul className="text-blue-600 mt-1 space-y-1">
                      <li>• Network Footprint & Capacity</li>
                      <li>• Order & Payment Data</li>
                      <li>• Order Shipment Data</li>
                      <li>• Performance Metrics</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-800">Business Financials:</strong>
                    <ul className="text-blue-600 mt-1 space-y-1">
                      <li>• Cost & Financial Data</li>
                      <li>• Operating Expenses</li>
                      <li>• Lease & Purchase Costs</li>
                      <li>• Carrier Costs</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-800">Sales Growth Trajectory:</strong>
                    <ul className="text-blue-600 mt-1 space-y-1">
                      <li>• Historical Sales Data</li>
                      <li>• Demand Projection</li>
                      <li>• Growth Forecasts</li>
                      <li>• SKU Performance</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {DATA_MAPPING_TEMPLATES.map((template, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">{template.name}</h4>
                        <p className="text-gray-600 mb-2">{template.description}</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>Category: {template.targetCategory}</span>
                          <span>Required Fields: {template.requiredColumns.length}</span>
                          <span>Optional Fields: {template.optionalColumns.length}</span>
                        </div>
                        <div className="mt-2">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Show field mappings</summary>
                            <div className="mt-2 pl-4 border-l-2 border-gray-200">
                              <p className="font-medium text-gray-700 mb-1">Required columns:</p>
                              <ul className="text-gray-600 mb-2">
                                {template.requiredColumns.map((col, idx) => (
                                  <li key={idx}>• {col}</li>
                                ))}
                              </ul>
                              {template.optionalColumns.length > 0 && (
                                <>
                                  <p className="font-medium text-gray-700 mb-1">Optional columns:</p>
                                  <ul className="text-gray-600">
                                    {template.optionalColumns.map((col, idx) => (
                                      <li key={idx}>• {col}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>
                      <Target className="text-purple-500" size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="text-green-600" size={24} />
                <h3 className="text-xl font-semibold">Processing Results</h3>
              </div>

              {validatedData ? (
                <div className="space-y-6">
                  {/* Summary Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="text-blue-600" size={20} />
                        <h4 className="font-semibold">Data Quality</h4>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {validatedData.metadata?.dataQuality?.accuracy?.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Overall Accuracy</p>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="text-green-600" size={20} />
                        <h4 className="font-semibold">Valid Records</h4>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {validatedData.metadata?.dataQuality?.validRecords || 0}
                      </p>
                      <p className="text-sm text-gray-600">Successfully Processed</p>
                    </div>
                    
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-purple-600" size={20} />
                        <h4 className="font-semibold">Categories</h4>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {Object.keys(validatedData.operationalReporting || {}).length + 
                         Object.keys(validatedData.businessFinancials || {}).length + 
                         Object.keys(validatedData.salesGrowthTrajectory || {}).length}
                      </p>
                      <p className="text-sm text-gray-600">Data Categories</p>
                    </div>
                  </div>

                  {/* Data Category Breakdown */}
                  <div className="grid gap-4">
                    {validatedData.operationalReporting && Object.keys(validatedData.operationalReporting).length > 0 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                          <Settings className="text-blue-600" size={20} />
                          Operational Reporting Data
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {Object.entries(validatedData.operationalReporting).map(([key, value]) => (
                            <div key={key} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="text-gray-600">
                                {typeof value === 'object' && value ? `${Object.keys(value).length} metrics` : 'Data available'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {validatedData.businessFinancials && Object.keys(validatedData.businessFinancials).length > 0 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                          <TrendingUp className="text-green-600" size={20} />
                          Business Financials Data
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {Object.entries(validatedData.businessFinancials).map(([key, value]) => (
                            <div key={key} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="text-gray-600">
                                {typeof value === 'object' && value ? `${Object.keys(value).length} metrics` : 'Data available'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {validatedData.salesGrowthTrajectory && Object.keys(validatedData.salesGrowthTrajectory).length > 0 && (
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                          <BarChart3 className="text-purple-600" size={20} />
                          Sales Growth Trajectory Data
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {Object.entries(validatedData.salesGrowthTrajectory).map(([key, value]) => (
                            <div key={key} className="p-3 bg-gray-50 rounded">
                              <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="text-gray-600">
                                {typeof value === 'object' && value ? `${Object.keys(value).length} metrics` : 'Data available'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next Steps */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={20} />
                      Data Processing Complete - Ready for Optimization
                    </h4>
                    <p className="text-green-700 mb-4">
                      Your data has been successfully processed and is now available for use in the optimization modules.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="group relative">
                        <a
                          href="/capacity-optimizer"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center justify-center transition-colors"
                          title="Analyze network capacity and demand distribution"
                        >
                          <BarChart3 size={16} />
                          Capacity Optimizer
                        </a>
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 w-40 bg-gray-900 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          Optimize capacity allocation and demand distribution across your network
                        </div>
                      </div>
                      <div className="group relative">
                        <a
                          href="/warehouse-optimizer"
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center justify-center transition-colors"
                          title="Optimize warehouse locations, sizes, and configurations"
                        >
                          <Building size={16} />
                          Warehouse Optimizer
                        </a>
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 w-40 bg-gray-900 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          Find optimal warehouse locations, sizes, and operational configurations
                        </div>
                      </div>
                      <div className="group relative">
                        <a
                          href="/transport-optimizer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center justify-center transition-colors"
                          title="Optimize transportation routes and logistics"
                        >
                          <TrendingUp size={16} />
                          Transport Optimizer
                        </a>
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 w-40 bg-gray-900 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          Optimize transportation routes, carrier selection, and logistics costs
                        </div>
                      </div>
                      <div className="group relative">
                        <a
                          href="/inventory-optimizer"
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-center justify-center transition-colors"
                          title="Optimize inventory levels and stocking strategies"
                        >
                          <Target size={16} />
                          Inventory Optimizer
                        </a>
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 w-40 bg-gray-900 text-white p-2 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          Determine optimal inventory levels and stocking strategies
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 justify-center mt-4">
                      <button
                        onClick={() => setActiveTab('validation')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors"
                      >
                        <Eye size={16} />
                        View Validation Details
                      </button>
                      <button
                        onClick={() => {
                          const dataStr = JSON.stringify(validatedData, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `processed-data-${selectedProject?.name || 'project'}-${selectedScenario?.name || 'scenario'}-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded hover:bg-green-50 transition-colors"
                      >
                        <Download size={16} />
                        Export Data
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No processed data yet. Upload and process files first.</p>
                </div>
              )}
            </div>
          )}

          {/* No Project or Scenario Selected */}
          {(!selectedProject || !selectedScenario) && (
            <div className="group relative text-center py-8 text-gray-500 cursor-help">
              <Database size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Please select a project and scenario first to begin data processing.</p>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="text-sm space-y-2">
                  <div className="font-semibold">Getting Started:</div>
                  <div>1. <strong>New user?</strong> Click "New Project" above to create your first project</div>
                  <div>2. <strong>Have projects?</strong> Click on a project name to expand it</div>
                  <div>3. <strong>Select scenario:</strong> Choose an existing scenario or create a new one</div>
                  <div>4. <strong>Upload files:</strong> Once both are selected, you can upload data files</div>
                  <div className="text-xs text-blue-600 mt-2">
                    💡 Both a project AND scenario must be selected before you can upload files
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Log */}
          {processingLog.length > 0 && (
            <div className="card mt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="text-gray-600" size={20} />
                Processing Log
              </h4>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-auto">
                {processingLog.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
