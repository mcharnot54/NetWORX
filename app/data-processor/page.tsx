"use client";

import { useState, useEffect, Suspense } from "react";
import Navigation from "@/components/Navigation";
import dynamic from 'next/dynamic';

const ProjectScenarioManager = dynamic(() => import("@/components/ProjectScenarioManager"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg">Loading project manager...</div>,
  ssr: false
});
import ErrorBoundary from "@/components/ErrorBoundary";
import { useData } from "@/context/DataContext";
import { DataValidator } from "@/lib/data-validator";
import { DataProcessingUtils, EnhancedDataProcessingUtils } from "@/lib/data-processing-utils";
import { robustFetch, robustFetchJson } from "@/lib/fetch-utils";
import { MissingDataAnalyzer } from "@/components/MissingDataAnalyzer";
import { ProductionDataProcessorComponent } from "@/components/ProductionDataProcessor";
import { EnhancedDataProcessor, type SmartProcessingResult } from "@/lib/enhanced-data-processor";
import {
  ComprehensiveOperationalData,
  DataMappingTemplate,
  ProcessingResult,
  DATA_MAPPING_TEMPLATES
} from "@/types/data-schema";
import { AdaptiveTemplate } from "@/lib/adaptive-data-validator";
import { FileStorageUtils } from "@/lib/file-storage-utils";
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
  X,
  Trash2,
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
  id?: number;
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
  saved?: boolean;
  fileContent?: string; // Base64 encoded file content
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
  const [smartProcessingResult, setSmartProcessingResult] = useState<SmartProcessingResult | null>(null);
  const [showMissingDataAnalyzer, setShowMissingDataAnalyzer] = useState(false);
  const [loadingSavedFiles, setLoadingSavedFiles] = useState(false);
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null);
  const [settingUpDatabase, setSettingUpDatabase] = useState(false);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  // Check database readiness on component mount
  useEffect(() => {
    checkDatabaseReadiness();
  }, []);

  const checkDatabaseReadiness = async () => {
    try {
      const response = await fetch('/api/test-db');
      const result = await response.json();
      setDatabaseReady(result.success);
      if (!result.success) {
        addToLog('⚠ Database connection issue detected');
      }
    } catch (error) {
      setDatabaseReady(false);
      addToLog('⚠ Could not check database status');
    }
  };

  const setupDatabase = async () => {
    setSettingUpDatabase(true);
    addToLog('Setting up database tables...');

    try {
      const response = await fetch('/api/setup-db', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        setDatabaseReady(true);
        addToLog('✓ Database setup completed successfully');
      } else {
        addToLog(`✗ Database setup failed: ${result.error}`);
      }
    } catch (error) {
      addToLog(`✗ Database setup error: ${error}`);
    } finally {
      setSettingUpDatabase(false);
    }
  };

  // Load saved files when scenario changes
  useEffect(() => {
    if (selectedScenario?.id) {
      loadSavedFiles(selectedScenario.id);
    } else {
      setFiles([]);
    }
  }, [selectedScenario]);

  const loadSavedFiles = async (scenarioId: number) => {
    setLoadingSavedFiles(true);
    addToLog('Loading previously uploaded files...');

    try {
      console.log('Loading files for scenario:', scenarioId);
      const responseData = await robustFetchJson(`/api/files?scenarioId=${scenarioId}`, {
        timeout: 30000, // 30 second timeout for file loading
        retries: 3 // Retry up to 3 times for reliability
      });

      console.log('Files API response:', responseData);

      const { files: savedFiles } = responseData;

      if (savedFiles && savedFiles.length > 0) {
        addToLog(`Found ${savedFiles.length} saved files`);

        const reconstructedFiles: FileData[] = await Promise.all(
          savedFiles.map(async (savedFile: any) => {
            // For now, just create basic file data without content reconstruction
            // The content will be loaded separately when needed for processing
            return {
              id: savedFile.id,
              name: savedFile.file_name,
              size: savedFile.file_size || 0,
              type: savedFile.file_type,
              lastModified: new Date(savedFile.upload_date).getTime(),
              detectedType: savedFile.data_type,
              detectedTemplate: null, // Will be re-detected if needed
              scenarioId: savedFile.scenario_id,
              file: undefined, // Will be loaded when needed
              parsedData: undefined, // Will be loaded when needed
              columnNames: savedFile.original_columns || [],
              processingResult: undefined, // Will be loaded when needed
              validationStatus: savedFile.processing_status === 'completed' ? 'validated' :
                              savedFile.processing_status === 'failed' ? 'error' : 'pending',
              saved: true,
              fileContent: undefined // Will be loaded when needed
            } as FileData;
          })
        );

        setFiles(reconstructedFiles);
        addToLog(`✓ Loaded ${reconstructedFiles.length} previously uploaded file(s)`);
      } else {
        addToLog('No previously uploaded files found');
      }
    } catch (error) {
      console.error('Error loading saved files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToLog(`⚠ Could not load previously uploaded files: ${errorMessage}`);

      // Check if it's a database/table issue
      if (errorMessage.includes('404') || errorMessage.includes('table') || errorMessage.includes('database')) {
        addToLog('ℹ This might be a database setup issue. Try setting up the database first.');
      }
    } finally {
      setLoadingSavedFiles(false);
    }
  };

  // Handle duplicate file conflicts
  const handleDuplicateFile = async (fileName: string, conflictData: any): Promise<'skip' | 'replace' | 'force' | 'cancel'> => {
    return new Promise((resolve) => {
      const message = `File "${fileName}" already exists!\n\n` +
        `Existing file:\n` +
        `- ID: ${conflictData.existing_file?.id}\n` +
        `- Status: ${conflictData.existing_file?.status}\n` +
        `- Created: ${new Date(conflictData.existing_file?.created_at).toLocaleDateString()}\n\n` +
        `Choose an action:\n` +
        `• SKIP - Don't upload this file\n` +
        `• REPLACE - Replace the existing file\n` +
        `• DUPLICATE - Upload as duplicate anyway`;

      const choice = prompt(message + '\n\nEnter: skip, replace, or duplicate');

      switch (choice?.toLowerCase()) {
        case 'skip':
        case 's':
          resolve('skip');
          break;
        case 'replace':
        case 'r':
          resolve('replace');
          break;
        case 'duplicate':
        case 'd':
        case 'force':
          resolve('force');
          break;
        default:
          resolve('cancel');
      }
    });
  };

  const saveFileToDatabase = async (fileData: FileData) => {
    if (!fileData.file || !selectedScenario) return;

    try {
      // Convert file to base64 for storage
      addToLog(`Converting ${fileData.name} to base64...`);
      const fileContent = await FileStorageUtils.fileToBase64(fileData.file);
      addToLog(`File content converted: ${fileContent ? `${fileContent.length} characters` : 'NO CONTENT'}`);
      addToLog(`Uploading ${fileData.name} to database (may take up to 45 seconds)...`);

      const saveData = {
        scenario_id: selectedScenario.id,
        file_name: fileData.name,
        file_type: fileData.type,
        file_size: fileData.size,
        data_type: fileData.detectedType || 'unknown',
        processing_status: 'pending',
        validation_result: {},
        processed_data: {
          file_content: fileContent,
          parsedData: fileData.parsedData,
          columnNames: fileData.columnNames,
          processingResult: fileData.processingResult
        },
        original_columns: fileData.columnNames,
        mapped_columns: {}
      };

      const response = await robustFetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
        timeout: 45000, // 45 second timeout for file uploads
        retries: 2
      });

      // Handle duplicate file conflicts (409 status)
      if (response.status === 409) {
        const conflictData = await response.json();

        // Ask user what to do with duplicate
        const action = await handleDuplicateFile(fileData.name, conflictData);

        if (action === 'skip') {
          addToLog(`Skipped duplicate file: ${fileData.name}`);
          return null;
        } else if (action === 'replace') {
          // Retry with replace_existing flag
          const retryData = { ...saveData, replace_existing: true };
          const retryResult = await robustFetchJson('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(retryData),
            timeout: 30000,
            retries: 1
          });

          addToLog(`Replaced existing file: ${fileData.name}`);
          return retryResult.file.id;
        } else if (action === 'force') {
          // Retry with force_upload flag
          const forceData = { ...saveData, force_upload: true };
          const forceResult = await robustFetchJson('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(forceData),
            timeout: 30000,
            retries: 1
          });

          addToLog(`Force uploaded duplicate file: ${fileData.name}`);
          return forceResult.file.id;
        }

        return null; // User cancelled
      }

      // robustFetch handles errors internally, so if we get here, it succeeded
      let responseData;
      try {
        responseData = await response.json();
        addToLog(`✓ File saved successfully: ${fileData.name}`);
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        throw new Error(`Server returned invalid response format`);
      }

      return responseData.file.id;
    } catch (error) {
      console.error('Error saving file to database:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addToLog(`⚠ Could not save ${fileData.name} to database: ${errorMessage}`);
      return null;
    }
  };

  const updateFileInDatabase = async (fileId: number, updateData: any) => {
    try {
      console.log('Updating file in database:', { fileId, updateData });

      const responseData = await robustFetchJson('/api/files', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: fileId, ...updateData }),
        timeout: 15000, // 15 second timeout for database updates
        retries: 1 // Only retry once for database updates
      });

      console.log('File updated successfully:', responseData);
      return responseData;

    } catch (error) {
      console.error('Error updating file in database:', error);

      // Handle different types of errors
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      // Check if it's a timeout or network issue (non-critical)
      if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout') ||
          errorMessage.includes('204') || errorMessage.includes('cancelled')) {
        addToLog(`⚠ Warning: Database update timed out (non-critical): ${errorMessage}`);
      } else {
        addToLog(`⚠ Warning: Could not update file status in database: ${errorMessage}`);
      }

      // Don't re-throw the error to prevent breaking the flow
    }
  };

  const removeFile = async (fileIndex: number) => {
    const file = files[fileIndex];

    // Remove from database if it was saved
    if (file.id) {
      try {
        const response = await fetch(`/api/files/${file.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete file from database');
        }

        addToLog(`✓ Removed ${file.name} from database`);
      } catch (error) {
        console.error('Error deleting file from database:', error);
        addToLog(`⚠ Could not remove ${file.name} from database`);
      }
    }

    // Remove from local state
    const updatedFiles = files.filter((_, index) => index !== fileIndex);
    setFiles(updatedFiles);
    addToLog(`Removed ${file.name} from current session`);
  };

  const autoDetectDataType = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes("forecast") || name.includes("demand")) return "forecast";
    if (name.includes("sku") || name.includes("product")) return "sku";
    if (name.includes("network") || name.includes("location")) return "network";
    if (name.includes("operational") || name.includes("reporting")) return "capacity";
    if (name.includes("financial") || name.includes("cost")) return "cost";
    if (name.includes("sales") || name.includes("historical")) return "forecast";
    return "network"; // Default to network instead of unknown
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProject || !selectedScenario) {
      alert('Please select a project and scenario first');
      return;
    }

    if (databaseReady === false) {
      alert('Please setup the database first using the "Setup Database" button above');
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
          validationStatus: 'pending',
          saved: false
        };

        // Save file to database
        const savedFileId = await saveFileToDatabase(fileData);
        if (savedFileId) {
          fileData.id = savedFileId;
          fileData.saved = true;
          addToLog(`✓ Saved ${file.name} to database`);
        }

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

    setFiles(prevFiles => [...prevFiles, ...processedFiles]);
    addToLog(`Upload complete. ${processedFiles.length} files added, ${files.length + processedFiles.length} total files ready for validation.`);
  };

  const validateFileData = async (fileIndex: number) => {
    const file = files[fileIndex];

    addToLog(`Loading and validating data in ${file.name}...`);

    // Update status to processing
    const updatedFiles = [...files];
    updatedFiles[fileIndex].validationStatus = 'processing';
    setFiles(updatedFiles);

    try {
      // First, load the full file data if needed
      const fullFileData = await loadFullFileData(file);

      if (!fullFileData.parsedData) {
        addToLog(`Cannot validate ${file.name} - no parsed data available`);
        updatedFiles[fileIndex].validationStatus = 'error';
        setFiles(updatedFiles);
        return;
      }

      // Auto-detect template if not already detected
      if (!fullFileData.detectedTemplate) {
        const detectedTemplate = DataValidator.detectDataTemplate(fullFileData.columnNames || []);
        updatedFiles[fileIndex].detectedTemplate = detectedTemplate;
        if (detectedTemplate) {
          addToLog(`✓ Detected template: ${detectedTemplate.name} for ${file.name}`);
        }
      }

      const templateToUse = updatedFiles[fileIndex].detectedTemplate;
      if (!templateToUse) {
        addToLog(`⚠ No template detected for ${file.name} - processing as generic data`);
      }

      const result = templateToUse
        ? DataValidator.processDataWithTemplate(fullFileData.parsedData, templateToUse)
        : { success: true, data: fullFileData.parsedData, summary: { dataQuality: { validRecords: (fullFileData.parsedData?.length || 0), totalRecords: (fullFileData.parsedData?.length || 0) } } };

      // CRITICAL FIX: Separate Excel parsing success from template validation
      const hasExcelData = fullFileData.parsedData && Array.isArray(fullFileData.parsedData) && fullFileData.parsedData.length > 0;
      const templateValidationPassed = result.success;

      // Update the file data with loaded information
      updatedFiles[fileIndex] = {
        ...updatedFiles[fileIndex],
        ...fullFileData,
        processingResult: result,
        validationStatus: hasExcelData ? 'validated' : 'error'
      };
      setFiles(updatedFiles);

      // Update file in database if it was saved
      if (file.id) {
        try {
          await updateFileInDatabase(file.id, {
            // Mark as completed if we have Excel data, regardless of template validation
            processing_status: hasExcelData ? 'completed' : 'failed',
            validation_result: {
              ...result,
              excel_parsing_success: hasExcelData,
              template_validation_success: templateValidationPassed,
              note: hasExcelData ? 'Excel data preserved successfully' : 'Excel parsing failed'
            },
            processed_data: {
              // Always preserve the original parsed Excel data
              parsedData: fullFileData.parsedData,
              columnNames: fullFileData.columnNames,
              file_content: fullFileData.fileContent,
              processingResult: result,
              excel_preserved: hasExcelData
            }
          });
          addToLog(`✓ File status updated in database`);
        } catch (updateError) {
          addToLog(`⚠ Warning: Database update failed but file processing completed`);
          console.error('Database update error:', updateError);
        }
      }

      // Updated logging to reflect Excel-first approach
      if (hasExcelData) {
        addToLog(`✓ Excel data processed for ${file.name} (${fullFileData.parsedData?.length || 0} rows)`);
        if (templateValidationPassed) {
          addToLog(`✓ Template validation also passed`);
          try {
            addToLog(DataProcessingUtils.formatDataQuality(result.summary?.dataQuality || result.dataQuality));
          } catch (formatError) {
            addToLog(`✓ Template validation completed (formatting issue)`);
          }
        } else {
          addToLog(`⚠ Template validation failed but Excel data preserved`);
          addToLog(`ℹ File marked as completed - data available for baseline calculations`);
        }
      } else {
        addToLog(`✗ Excel parsing failed for ${file.name}`);
        try {
          addToLog(DataProcessingUtils.formatValidationResults(result.data?.metadata?.validationResults || []));
        } catch (formatError) {
          addToLog(`✗ Validation failed (details unavailable)`);
        }
      }

    } catch (error) {
      console.error('Validation error details:', error);
      addToLog(`✗ Validation error for ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      updatedFiles[fileIndex].validationStatus = 'error';
      setFiles(updatedFiles);
    }
  };

  // Function to load full file data when needed for processing
  const loadFullFileData = async (fileData: FileData): Promise<FileData> => {
    if (!fileData.id || fileData.file) {
      addToLog(`${fileData.name}: Already loaded or no ID`);
      return fileData; // Already loaded or no ID
    }

    try {
      addToLog(`Loading content for ${fileData.name} (ID: ${fileData.id})...`);
      addToLog(`Please wait, this may take up to 20 seconds...`);

      // Load file content using robust fetch
      const contentData = await robustFetchJson(`/api/files/${fileData.id}/content`, {
        timeout: 20000, // 20 second timeout for content loading
        retries: 2 // Retry twice on failure
      });

      addToLog(`Content API succeeded`);
      const fileContent = contentData.file_content;
      addToLog(`File content length: ${fileContent?.length || 0}`);

      if (fileContent) {
        addToLog(`Reconstructing file object for ${fileData.name}...`);

        // Reconstruct File object
        const file = FileStorageUtils.base64ToFile(
          fileContent,
          fileData.name,
          fileData.type
        );

        addToLog(`Parsing file data for ${fileData.name}...`);

        // Re-parse the file data
        const { data, columnHeaders } = await DataValidator.parseFile(file);

        addToLog(`✓ Successfully loaded ${fileData.name}: ${data.length} rows, ${columnHeaders.length} columns`);

        return {
          ...fileData,
          file,
          parsedData: data,
          columnNames: columnHeaders,
          fileContent
        };
      } else {
        addToLog(`��� No file content returned for ${fileData.name}`);
      }
    } catch (error) {
      console.warn(`Could not load full data for ${fileData.name}:`, error);
      addToLog(`✗ Error loading ${fileData.name}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return fileData;
  };

  const validateAllFiles = async () => {
    addToLog('Starting validation of all files...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.validationStatus === 'pending' || file.validationStatus === 'error') {
        await validateFileData(i);
      }
    }

    addToLog('✓ All file validation completed');
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

      if (file.validationStatus !== 'validated') {
        addToLog(`Skipping ${file.name} - not validated`);
        continue;
      }

      // Load full file data if needed
      const fullFileData = await loadFullFileData(file);
      if (!fullFileData.processingResult?.data) {
        addToLog(`Skipping ${file.name} - no processing result data`);
        continue;
      }

      const fileData = fullFileData.processingResult.data;
      
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
      const fileQuality = fullFileData.processingResult.summary.dataQuality;
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
            <Suspense fallback={
              <div className="animate-pulse bg-gray-200 h-32 rounded-lg flex items-center justify-center">
                <span className="text-gray-600">Loading project manager...</span>
              </div>
            }>
              <ErrorBoundary fallback={({ error, retry }) => (
                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Project Manager</h3>
                  <p className="text-red-600 mb-4">{error.message}</p>
                  <button
                    onClick={retry}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}>
                <ProjectScenarioManager
                  selectedProject={selectedProject}
                  selectedScenario={selectedScenario}
                  onSelectProject={setSelectedProject}
                  onSelectScenario={setSelectedScenario}
                />
              </ErrorBoundary>
            </Suspense>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              {
                id: 'production',
                label: 'Production Processing',
                description: 'Process database data',
                icon: Database,
                color: 'indigo'
              },
              {
                id: 'missing-data',
                label: 'Missing Data AI',
                description: 'Advanced ML/DL imputation',
                icon: Target,
                color: 'red'
              },
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
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600',
                red: isActive
                  ? 'bg-red-50 border-red-200 text-red-700 shadow-lg shadow-red-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600',
                indigo: isActive
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-lg shadow-indigo-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'
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

          {/* Production Processing Tab */}
          {activeTab === 'production' && selectedProject && selectedScenario && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <Database className="text-indigo-600" size={24} />
                  <div>
                    <h3 className="text-xl font-semibold">Production Data Processing</h3>
                    <p className="text-gray-600 text-sm">
                      Process data directly from database with advanced imputation and automatic calculations
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-indigo-800 mb-2">🚀 Production-Ready Processing</h4>
                  <div className="text-indigo-700 text-sm space-y-2">
                    <p><strong>Database Integration:</strong> Processes data directly from your scenario database</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Automatic Calculations:</strong> Derives values like units_per_pallet = units_per_carton × cartons_per_pallet</li>
                      <li><strong>Advanced Imputation:</strong> Fills missing data using ML/DL algorithms</li>
                      <li><strong>Quality Assessment:</strong> Real-time color-coded data quality monitoring</li>
                      <li><strong>Production Logging:</strong> Tracks all processing steps and results</li>
                    </ul>
                    <p className="mt-2"><strong>Ready for Production:</strong> Processes real business data with enterprise-grade reliability and transparency.</p>
                  </div>
                </div>

                <ProductionDataProcessorComponent
                  projectId={selectedProject.id}
                  scenarioId={selectedScenario.id}
                  onProcessingComplete={(result) => {
                    if (result.success && result.processedData.length > 0) {
                      setValidatedData({
                        operationalReporting: {},
                        businessFinancials: {},
                        salesGrowthTrajectory: {},
                        metadata: {
                          lastProcessed: new Date().toISOString(),
                          dataQuality: {
                            completeness: result.qualityAssessment.originalDataPercentage,
                            accuracy: result.qualityAssessment.originalDataPercentage,
                            consistency: 95,
                            timeliness: 100,
                            validRecords: result.processedData.length,
                            totalRecords: result.originalData.length,
                            missingFields: [],
                            invalidValues: []
                          },
                          validationResults: [],
                          productionProcessing: {
                            calculationResults: result.calculationResults,
                            qualityAssessment: result.qualityAssessment,
                            processingTime: result.processingTime
                          }
                        }
                      });
                      setProcessedData(result.processedData as any);
                      addToLog('✓ Production processing completed successfully');
                      addToLog(`Processed ${result.processedData.length} records with ${result.calculationResults.calculationsPerformed} calculations`);
                      if (result.imputationResult) {
                        addToLog(`Imputation: ${result.imputationResult.statistics.totalImputed} values using ${result.imputationResult.statistics.methodsUsed.join(', ')}`);
                      }
                      setActiveTab('results');
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Missing Data Analyzer Tab */}
          {activeTab === 'missing-data' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="text-red-600" size={24} />
                  <div>
                    <h3 className="text-xl font-semibold">AI-Powered Missing Data Analysis</h3>
                    <p className="text-gray-600 text-sm">
                      Advanced ML/DL imputation using Random Forests, XGBoost, Neural Networks, and MICE
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-red-800 mb-2">🧠 Advanced Methodology Implemented</h4>
                  <div className="text-red-700 text-sm space-y-2">
                    <p><strong>Machine Learning Approaches:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li><strong>Random Forests & XGBoost:</strong> Tree-based models for complex pattern recognition</li>
                      <li><strong>Neural Networks:</strong> MissForest and GAIN architectures for high-dimensional data</li>
                      <li><strong>MICE:</strong> Multiple Imputation by Chained Equations for iterative modeling</li>
                      <li><strong>KNN & Regression:</strong> Traditional methods for baseline comparisons</li>
                    </ul>
                    <p className="mt-2"><strong>Smart Implementation:</strong> Automatically diagnoses missing data patterns and selects optimal imputation strategy based on data characteristics.</p>
                  </div>
                </div>

                <MissingDataAnalyzer
                  onDataProcessed={(result) => {
                    setSmartProcessingResult(result);
                    if (result.success && result.data) {
                      setValidatedData(result.data);
                      setProcessedData(result.data as any);
                      addToLog('✓ Smart processing with imputation completed successfully');
                      if (result.imputationSummary) {
                        addToLog(`Imputation: ${result.imputationSummary.totalValuesImputed} values using ${result.imputationSummary.methodUsed}`);
                      }
                    }
                  }}
                  className="w-full"
                />

                {smartProcessingResult && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={20} />
                      Advanced Processing Complete
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-700">Data Quality Improvement:</span>
                        <span className="ml-2 text-green-600">
                          {smartProcessingResult.processingMetrics.originalDataQuality.toFixed(1)}% → {smartProcessingResult.processingMetrics.finalDataQuality.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Processing Time:</span>
                        <span className="ml-2 text-green-600">{smartProcessingResult.processingMetrics.processingTime}ms</span>
                      </div>
                      <div>
                        <span className="font-medium text-green-700">Status:</span>
                        <span className="ml-2 text-green-600">{smartProcessingResult.success ? 'Success' : 'Failed'}</span>
                      </div>
                    </div>
                    {smartProcessingResult.recommendations.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-green-700">Recommendations:</span>
                        <ul className="list-disc list-inside text-green-600 text-sm mt-1">
                          {smartProcessingResult.recommendations.slice(0, 3).map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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

              {/* Persistent Storage Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Save className="text-green-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-green-800 mb-1">Persistent File Storage</h4>
                    <p className="text-green-700 text-sm mb-2">
                      Files uploaded to this scenario are automatically saved and will be available when you return.
                    </p>
                    <div className="text-xs text-green-600 space-y-1">
                      <div>• Files are stored securely in the database</div>
                      <div>�� No need to re-upload files when switching between scenarios</div>
                      <div>• Validation results and processing status are preserved</div>
                      <div>• Green dot indicates files are saved 🟢</div>
                    </div>
                  </div>
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
                    <p className="text-sm text-gray-400 mt-2">Files will be automatically saved, analyzed and validated</p>
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
                    <div>• <strong>Persistent storage:</strong> Files are automatically saved and will persist between sessions</div>
                    <div className="text-xs text-blue-600 mt-2">
                      💡 Check the "Data Templates" tab to see required column structures
                    </div>
                  </div>
                </div>
              </div>

              {(files.length > 0 || loadingSavedFiles) && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Files ({files.length})</h4>
                    {loadingSavedFiles && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <RefreshCw className="animate-spin" size={16} />
                        <span className="text-sm">Loading saved files...</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <FileText className="text-blue-500" size={20} />
                            {file.saved && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" title="File saved to database" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-600">
                              {Math.round(file.size / 1024)}KB • {file.detectedType}
                              {file.detectedTemplate && ` • ${file.detectedTemplate.name}`}
                              {file.saved && ' • Saved'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusIcon(file.validationStatus)}
                          <div className="flex items-center gap-2">
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
                            <button
                              onClick={() => removeFile(index)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                              title="Remove this file"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Validate All Files Button */}
                  {files.length > 0 && files.some(f => f.validationStatus === 'pending' || f.validationStatus === 'error') && (
                    <div className="mt-6 flex justify-center">
                      <div className="group relative">
                        <button
                          onClick={validateAllFiles}
                          className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          title="Validate all uploaded files"
                        >
                          <Zap size={20} />
                          Validate All Files
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900 text-white p-3 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                          <div className="font-semibold mb-1">Batch Validation:</div>
                          <div>Validates all uploaded files, loads their content, and marks them ready for processing</div>
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                  )}

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

                      {/* Debug: Test Server Connection */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            const startTime = Date.now();
                            addToLog('Testing server connection...');

                            try {
                              const response = await robustFetchJson('/api/health', {
                                timeout: 10000,
                                retries: 1
                              });

                              const duration = Date.now() - startTime;
                              addToLog(`✓ Server connection OK (${duration}ms)`);
                              addToLog(`Server status: ${response.status || 'healthy'}`);

                            } catch (error) {
                              const duration = Date.now() - startTime;
                              addToLog(`✗ Server connection failed after ${duration}ms`);
                              addToLog(`Error: ${error}`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          title="Test server connection and response time"
                        >
                          🌐 Test Connection
                        </button>
                      </div>

                      {/* Debug: Test File Count */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            if (!selectedScenario) return;

                            try {
                              addToLog('Testing file count...');
                              const response = await robustFetchJson(`/api/files/count?scenarioId=${selectedScenario.id}`, {
                                timeout: 15000,
                                retries: 2
                              });

                              addToLog(`Total files: ${response.total_files}`);
                              addToLog(`Completed files: ${response.completed_files}`);
                              addToLog(`Files with content: ${response.files_with_content}`);
                            } catch (error) {
                              addToLog(`Error testing file count: ${error}`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Test file count to check database connectivity"
                        >
                          📊 Test File Count
                        </button>
                      </div>

                      {/* Debug: Test File Content Loading */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            if (!selectedScenario) return;

                            try {
                              addToLog('Testing file content loading...');
                              const response = await fetch(`/api/test-file-content?scenarioId=${selectedScenario.id}`);
                              const result = await response.json();

                              addToLog(`Files with content: ${result.summary.with_content}/${result.total_files}`);
                              addToLog(`Files with completed status: ${result.summary.completed_status}/${result.total_files}`);

                              if (result.files) {
                                result.files.forEach((file: any) => {
                                  addToLog(`${file.name}: status=${file.processing_status}, content=${file.file_content_available ? 'YES' : 'NO'}`);
                                });
                              }
                            } catch (error) {
                              addToLog(`Error testing file content: ${error}`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                          title="Test if file content is properly loaded"
                        >
                          🔍 Test File Content
                        </button>
                      </div>

                      {/* Debug: Test Single File Content API */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            if (files.length === 0) {
                              addToLog('No files available to test');
                              return;
                            }

                            const firstFile = files[0];
                            if (!firstFile.id) {
                              addToLog('First file has no ID');
                              return;
                            }

                            try {
                              addToLog(`Testing content API for ${firstFile.name} (ID: ${firstFile.id})...`);
                              const response = await fetch(`/api/files/${firstFile.id}/content`);
                              addToLog(`API Response status: ${response.status}`);

                              if (response.ok) {
                                const result = await response.json();
                                addToLog(`Content available: ${result.has_content ? 'YES' : 'NO'}`);
                                addToLog(`Content length: ${result.content_length || 0}`);
                                addToLog(`File name from API: ${result.file_name}`);
                              } else {
                                const errorText = await response.text();
                                addToLog(`API Error: ${response.status} - ${errorText}`);
                              }
                            } catch (error) {
                              addToLog(`Test failed: ${error}`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                          title="Test content API for first file"
                        >
                          🔧 Test File API
                        </button>
                      </div>

                      {/* Debug: Clear All Files */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            if (!selectedScenario) return;

                            const confirmed = confirm(
                              `Clear all ${files.length} files from scenario "${selectedScenario.name}"?\n\n` +
                              'This will permanently delete all uploaded files so you can re-upload them with content.\n\n' +
                              'Click OK to proceed or Cancel to keep the files.'
                            );

                            if (!confirmed) return;

                            try {
                              addToLog('Clearing all files...');

                              for (const file of files) {
                                if (file.id) {
                                  const response = await fetch(`/api/files/${file.id}`, {
                                    method: 'DELETE'
                                  });

                                  if (response.ok) {
                                    addToLog(`✓ Deleted ${file.name}`);
                                  } else {
                                    addToLog(`⚠ Failed to delete ${file.name}`);
                                  }
                                }
                              }

                              // Clear the files from UI
                              setFiles([]);
                              addToLog('✓ All files cleared. You can now re-upload your files.');
                              addToLog('Files uploaded now will have content stored properly.');

                            } catch (error) {
                              addToLog(`Error clearing files: ${error}`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          title="Clear all files so you can re-upload them with content"
                        >
                          🗑️ Clear All Files
                        </button>
                      </div>

                      {/* Debug: Analyze Excel Structure */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            if (files.length === 0) {
                              addToLog('No files available to analyze');
                              return;
                            }

                            // Find UPS file
                            const upsFile = files.find(f => f.name.toLowerCase().includes('ups'));
                            if (!upsFile || !upsFile.id) {
                              addToLog('UPS file not found or has no ID');
                              return;
                            }

                            try {
                              addToLog(`Analyzing Excel structure for ${upsFile.name}...`);
                              const response = await robustFetchJson('/api/analyze-excel-structure', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileId: upsFile.id }),
                                timeout: 15000,
                                retries: 2
                              });

                              addToLog(`=== EXCEL ANALYSIS: ${response.fileName} ===`);
                              addToLog(`Total tabs: ${response.totalTabs}`);

                              response.analysis.forEach((tab: any) => {
                                addToLog(`\n--- TAB: ${tab.tabName} ---`);
                                addToLog(`Rows: ${tab.rowCount}, Columns: ${tab.columnCount}`);

                                if (tab.costColumns.length > 0) {
                                  addToLog('Potential cost columns:');
                                  tab.costColumns.forEach((col: any) => {
                                    addToLog(`  ${col.column} - ${col.confidence} confidence - ${col.reason}`);
                                    if (col.sampleValues.length > 0) {
                                      addToLog(`    Sample values: ${col.sampleValues.join(', ')}`);
                                    }
                                  });
                                }

                                if (tab.totalValues.length > 0) {
                                  addToLog('Top value columns:');
                                  tab.totalValues.slice(0, 3).forEach((total: any) => {
                                    addToLog(`  ${total.column}: $${total.total.toLocaleString()} (${total.validValues} values)`);
                                  });
                                }
                              });

                              addToLog('\n=== RECOMMENDATIONS ===');
                              response.recommendations.forEach((rec: any) => {
                                addToLog(`${rec.tab}: ${rec.recommendedColumn}`);
                                addToLog(`  Reason: ${rec.reason}`);
                                if (rec.total > 0) {
                                  addToLog(`  Total value: $${rec.total.toLocaleString()}`);
                                }
                              });
                              addToLog('==============================');

                            } catch (error) {
                              addToLog(`Analysis failed: ${error}`);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          title="Analyze Excel file structure and identify cost columns"
                        >
                          📊 Analyze UPS File
                        </button>
                      </div>

                      {/* Debug: Test File Storage Process */}
                      <div className="group relative">
                        <button
                          onClick={async () => {
                            addToLog('=== TESTING FILE STORAGE PROCESS ===');

                            if (files.length === 0) {
                              addToLog('No files to test. Please upload files first.');
                              return;
                            }

                            for (const file of files) {
                              if (!file.id) {
                                addToLog(`${file.name}: No ID - not saved to database`);
                                continue;
                              }

                              try {
                                const contentData = await robustFetchJson(`/api/files/${file.id}/content`, {
                                  timeout: 10000,
                                  retries: 1
                                });

                                const hasContent = contentData.file_content && contentData.file_content.length > 0;
                                addToLog(`${file.name} (ID: ${file.id}): ${hasContent ? 'HAS CONTENT' : 'NO CONTENT'} (${contentData.content_length || 0} chars)`);

                              } catch (error) {
                                addToLog(`${file.name}: Error loading content - ${error}`);
                              }
                            }

                            addToLog('=== END FILE STORAGE TEST ===');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                          title="Test current file storage status"
                        >
                          🔍 Test File Storage
                        </button>
                      </div>

                      {/* Debug: Diagnose Issue */}
                      <div className="group relative">
                        <button
                          onClick={() => {
                            addToLog('=== FILE UPLOAD DIAGNOSIS ===');
                            addToLog('Files are being saved to database but content is missing.');
                            addToLog('Solution: Clear files and re-upload with improved upload process.');
                            addToLog('New upload process uses robustFetch for better reliability.');
                            addToLog('Use "Test File Storage" to check current file status.');
                            addToLog('================================');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                          title="Show diagnosis of file upload issue"
                        >
                          🩺 Diagnose Issue
                        </button>
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
                      <li>��� Order Shipment Data</li>
                      <li>• Performance Metrics</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-800">Business Financials:</strong>
                    <ul className="text-blue-600 mt-1 space-y-1">
                      <li>• Cost & Financial Data</li>
                      <li>�� Operating Expenses</li>
                      <li>• Lease & Purchase Costs</li>
                      <li>• Carrier Costs</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-800">Sales Growth Trajectory:</strong>
                    <ul className="text-blue-600 mt-1 space-y-1">
                      <li>• Historical Sales Data</li>
                      <li>• Demand Projection</li>
                      <li>��� Growth Forecasts</li>
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

          {/* Database Setup Warning */}
          {databaseReady === false && (
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-yellow-600" size={24} />
                <div>
                  <h3 className="text-xl font-semibold text-yellow-800">Database Setup Required</h3>
                  <p className="text-yellow-700">The database is not properly initialized. Please set it up before uploading files.</p>
                </div>
              </div>
              <button
                onClick={setupDatabase}
                disabled={settingUpDatabase}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                {settingUpDatabase ? <RefreshCw className="animate-spin" size={16} /> : <Database size={16} />}
                {settingUpDatabase ? 'Setting up...' : 'Setup Database'}
              </button>
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
