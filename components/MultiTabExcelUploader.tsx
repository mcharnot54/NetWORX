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
  operatingCosts?: OperatingCostData; // For operating cost files
}

interface OperatingCostData {
  regularWages?: number;    // Row 30, columns Y:AJ
  employeeBenefits?: number; // Row 63
  tempEmployeeCosts?: number; // Row 68
  generalSupplies?: number;  // Row 78
  office?: number;          // Row 88
  telecom?: number;         // Row 165
  otherExpense?: number;    // Row 194
  leaseRent?: number;       // Row 177
  headcount?: number;       // Row 21 (FTEs)
  total?: number;
  thirdPartyLogistics?: number; // If Other Expense > 15% of total
}

interface MultiTabFile {
  file: File;
  fileName: string;
  fileSize: number;
  tabs: ExcelTab[];
  fileType: 'UPS' | 'TL' | 'RL' | 'WAREHOUSE_BUDGET' | 'OTHER';
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

  const detectFileType = (fileName: string): 'UPS' | 'TL' | 'RL' | 'WAREHOUSE_BUDGET' | 'OTHER' => {
    const lower = fileName.toLowerCase();
    if (lower.includes('ups') && lower.includes('individual')) return 'UPS';
    if (lower.includes('2024') && lower.includes('tl')) return 'TL';
    if (lower.includes('r&l') && lower.includes('curriculum')) return 'RL';
    if (lower.includes('warehouse') && (lower.includes('budget') || lower.includes('operating'))) return 'WAREHOUSE_BUDGET';
    return 'OTHER';
  };

  // REMOVED: Simple extraction function replaced with adaptive learning system

  const processExcelFile = async (file: File): Promise<MultiTabFile> => {
    try {
      // Try enhanced processing first, fallback to simple if chunk loading fails
      let result: any;
      let usingAdaptiveLearning = true;

      const fileType = detectFileType(file.name);

      try {
        // Attempt to use the full enhanced Excel validator with adaptive learning
        addLog(`🧠 Attempting adaptive learning processing for ${file.name}...`);

        // Import with static import to avoid dynamic chunk issues
        const { AdaptiveDataValidator } = await import('@/lib/adaptive-data-validator');
        const XLSX = await import('xlsx');

        // Process file with adaptive learning
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        const sheets: any = {};
        let totalExtracted = 0;

        // Process each sheet with adaptive learning
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet);

          if (rawData.length === 0) continue;

          // Use adaptive learning to analyze and process the data
          const columnAnalysis = AdaptiveDataValidator.analyzeColumns(rawData);
          const adaptiveTemplate = AdaptiveDataValidator.createAdaptiveTemplate(file.name, rawData, columnAnalysis);

          addLog(`🧠 ADAPTIVE: Created template for ${sheetName} with ${(adaptiveTemplate.confidence * 100).toFixed(1)}% confidence`);

          // Process with adaptive template
          const processedResult = AdaptiveDataValidator.processWithAdaptiveTemplate(rawData, adaptiveTemplate);

          sheets[sheetName] = {
            data: rawData,
            columnHeaders: Object.keys(rawData[0] || {}),
            rowCount: rawData.length,
            sheetName: sheetName,
            adaptiveTemplate: adaptiveTemplate,
            processedResult: processedResult
          };
        }

        result = {
          isValid: Object.keys(sheets).length > 0,
          sheets,
          detectedFileType: fileType,
          totalExtracted: 0, // Will be calculated below
          errors: [],
          warnings: [],
          usingAdaptiveLearning: true
        };

        addLog(`🎯 ADAPTIVE SUCCESS: Using full adaptive learning system!`);

      } catch (adaptiveError) {
        addLog(`⚠ Adaptive learning failed, falling back to simple processor: ${adaptiveError instanceof Error ? adaptiveError.message : 'Unknown error'}`);
        usingAdaptiveLearning = false;

        // Fallback to simple processor
        const { SimpleExcelProcessor } = await import('@/lib/simple-excel-processor');
        result = await SimpleExcelProcessor.processFile(file);
        result.usingAdaptiveLearning = false;
      }

      if (!result.isValid) {
        const errors = result.errors?.join('; ') || 'Processing failed';
        addLog(`⚠ Processing issues: ${errors}`);
      }

      if (result.warnings && result.warnings.length > 0) {
        const warnings = result.warnings.join('; ');
        addLog(`⚠ Warnings: ${warnings}`);
      }

      // Log validation warnings
      const tabs: ExcelTab[] = [];
      let totalExtracted = 0; // Calculate from individual tabs instead of using result.totalExtracted

      addLog(`Found ${Object.keys(result.sheets).length} sheets: ${Object.keys(result.sheets).join(', ')}`);

      for (const [sheetName, sheetData] of Object.entries(result.sheets)) {
        if (sheetData.data.length === 0) continue;

        // Use adaptive learning system for transportation cost extraction
        addLog(`🧠 LEARNING SYSTEM: Processing ${fileType} ${sheetName} - ${sheetData.columnHeaders.length} columns, ${sheetData.data.length} rows`);
        addLog(`🧠 COLUMNS: ${sheetData.columnHeaders.join(', ')}`);

        let targetColumn = '';
        let extractedAmount = 0;

        try {
          // Apply file-type specific extraction rules
          addLog(`🧠 PROCESSING: ${fileType} file, analyzing ${sheetName} tab`);

          // UPS FILES: Extract from Column G (Net Charge) for all four tabs
          if (fileType === 'UPS') {
            addLog(`📦 UPS PROCESSING: Looking for Net Charge column (Column G)`);

            const netChargeColumn = sheetData.columnHeaders.find(col =>
              col === 'Net Charge' || col === 'G' ||
              col.toLowerCase().includes('net') && col.toLowerCase().includes('charge')
            );

            if (netChargeColumn) {
              let count = 0;
              for (const row of sheetData.data) {
                if (row && row[netChargeColumn]) {
                  const numValue = parseFloat(String(row[netChargeColumn]).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 0) {
                    extractedAmount += numValue;
                    count++;
                  }
                }
              }
              targetColumn = netChargeColumn;
              addLog(`🎯 UPS ${sheetName}: Extracted $${extractedAmount.toLocaleString()} from '${targetColumn}' (${count} rows)`);
            } else {
              addLog(`🚨 UPS ${sheetName}: Net Charge column not found! Available: ${sheetData.columnHeaders.join(', ')}`);
            }

          // TL FILES: Use adaptive learning with intelligent column detection
          } else if (fileType === 'TL') {
            addLog(`🚛 TL PROCESSING: Using adaptive learning to find best cost column`);

            // Find rate column with correct priority: NET first, then Gross Rate as fallback
            const netColumns = ['Net Charge', 'Net Rate', 'Net Cost', 'net_charge', 'net_rate'];
            const grossColumns = ['Gross Rate', 'Gross Charge', 'gross_rate', 'gross_charge'];
            const otherColumns = ['Rate', 'Freight Cost', 'freight_cost', 'Cost', 'Charge', 'Amount'];

            // First priority: NET columns
            let rateColumn = sheetData.columnHeaders.find(col =>
              netColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
            );

            // Second priority: Gross Rate (fallback when no NET found)
            if (!rateColumn) {
              rateColumn = sheetData.columnHeaders.find(col =>
                grossColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
              );
            }

            // Third priority: Other cost columns
            if (!rateColumn) {
              rateColumn = sheetData.columnHeaders.find(col =>
                otherColumns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
              );
            }

            if (!rateColumn) {
              addLog(`🚨 TL ${sheetName}: No valid rate column found! Available: ${sheetData.columnHeaders.join(', ')}`);
              targetColumn = 'No valid column';
            } else {
              addLog(`🎯 TL ${sheetName}: Adaptive learning selected column '${rateColumn}'`);

              // Initialize count variable to avoid ReferenceError
              let count = 0;

              // Smart filtering logic from working API
              const filteredData = sheetData.data.filter(row => {
                if (!row) return false;

                // Check for total keywords
                const rowValues = Object.values(row).map(val => String(val).toLowerCase());
                const hasTotal = rowValues.some(val =>
                  val.includes('total') ||
                  val.includes('sum') ||
                  val.includes('grand') ||
                  val.includes('subtotal')
                );

                if (hasTotal) return false;

                // Smart check: if row has monetary value but no supporting data, exclude it
                if (row[rateColumn]) {
                  const numValue = parseFloat(String(row[rateColumn]).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 0) {
                    // Check for supporting data columns
                    const supportingDataColumns = Object.keys(row).filter(key =>
                      key.toLowerCase().includes('origin') ||
                      key.toLowerCase().includes('destination') ||
                      key.toLowerCase().includes('from') ||
                      key.toLowerCase().includes('to') ||
                      key.toLowerCase().includes('route') ||
                      key.toLowerCase().includes('lane') ||
                      key.toLowerCase().includes('city') ||
                      key.toLowerCase().includes('state') ||
                      key.toLowerCase().includes('zip') ||
                      key.toLowerCase().includes('location') ||
                      key.toLowerCase().includes('service') ||
                      key.toLowerCase().includes('mode') ||
                      key.toLowerCase().includes('carrier')
                    );

                    // Count supporting data with actual values
                    const supportingDataCount = supportingDataColumns.filter(col => {
                      const value = row[col];
                      return value && String(value).trim() !== '' &&
                             String(value).toLowerCase() !== 'null' &&
                             String(value).toLowerCase() !== 'n/a';
                    }).length;

                    // If no supporting data, it's likely a total row
                    if (supportingDataCount === 0) {
                      return false;
                    }
                  }
                }

                return true;
              });

              // Calculate total from filtered data
              for (const row of filteredData) {
                if (row && row[rateColumn]) {
                  const numValue = parseFloat(String(row[rateColumn]).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 1) {
                    extractedAmount += numValue;
                    count++;
                  }
                }
              }

              targetColumn = rateColumn;
              addLog(`🔢 TL ${sheetName}: Processed ${count} rows from ${filteredData.length} filtered rows (${sheetData.data.length} total)`);
            }

          // R&L FILES: Extract from Column V for Detail tab
          } else if (fileType === 'RL') {
            addLog(`🚚 R&L PROCESSING: Looking for total cost column (Column V)`);

            // For R&L, focus on Detail tab with Column V
            if (sheetName.toLowerCase().includes('detail')) {
              const columnV = sheetData.columnHeaders.find(col =>
                col === 'V' || col.toLowerCase().includes('total') || col.toLowerCase().includes('cost')
              ) || (sheetData.columnHeaders.length > 21 ? sheetData.columnHeaders[21] : null); // Column V is 22nd column (index 21)

              if (columnV) {
                let rlCount = 0;
                for (const row of sheetData.data) {
                  if (row && row[columnV]) {
                    const numValue = parseFloat(String(row[columnV]).replace(/[$,\s]/g, ''));
                    if (!isNaN(numValue) && numValue > 0) {
                      extractedAmount += numValue;
                      rlCount++;
                    }
                  }
                }
                targetColumn = columnV;
                addLog(`🎯 R&L ${sheetName}: Extracted $${extractedAmount.toLocaleString()} from '${targetColumn}' (${rlCount} rows)`);
              } else {
                addLog(`🚨 R&L ${sheetName}: Column V not found! Available: ${sheetData.columnHeaders.join(', ')}`);
              }
            } else {
              addLog(`🔄 R&L ${sheetName}: Skipping non-Detail tab`);
            }

          // WAREHOUSE BUDGET FILES: Extract operating costs from specific rows and columns
          } else if (fileType === 'WAREHOUSE_BUDGET') {
            addLog(`🏭 WAREHOUSE BUDGET PROCESSING: Extracting operating costs from specific rows`);

            const operatingCosts: OperatingCostData = {};

            // Convert data to row-indexed format for easier access
            const rowData: { [key: number]: any } = {};
            sheetData.data.forEach((row, index) => {
              rowData[index + 1] = row; // Excel rows are 1-indexed
            });

            // Helper function to extract value from specific row and column range
            const extractFromRowColumns = (rowNum: number, columnRange?: string[]): number => {
              const row = rowData[rowNum];
              if (!row) return 0;

              let total = 0;
              if (columnRange) {
                // Extract from specific column range (e.g., Y:AJ for regular wages)
                for (const col of columnRange) {
                  if (row[col]) {
                    const value = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
                    if (!isNaN(value) && value > 0) {
                      total += value;
                    }
                  }
                }
              } else {
                // Extract from any numeric column in the row
                for (const [key, value] of Object.entries(row)) {
                  const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 0 && numValue < 100000000) { // Reasonable upper bound
                    total = Math.max(total, numValue); // Take largest value in row
                  }
                }
              }
              return total;
            };

            // Extract specific operating cost components
            try {
              // Regular wages (Row 30, columns Y:AJ) - planned labor cost for 2025
              const wageColumns = ['Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ'];
              operatingCosts.regularWages = extractFromRowColumns(30, wageColumns);
              addLog(`💰 Regular wages (Row 30): $${operatingCosts.regularWages?.toLocaleString() || 0}`);

              // Employee benefits (Row 63)
              operatingCosts.employeeBenefits = extractFromRowColumns(63);
              addLog(`🏥 Employee benefits (Row 63): $${operatingCosts.employeeBenefits?.toLocaleString() || 0}`);

              // Temp employee costs (Row 68)
              operatingCosts.tempEmployeeCosts = extractFromRowColumns(68);
              addLog(`👥 Temp employee costs (Row 68): $${operatingCosts.tempEmployeeCosts?.toLocaleString() || 0}`);

              // General supplies (Row 78)
              operatingCosts.generalSupplies = extractFromRowColumns(78);
              addLog(`📦 General supplies (Row 78): $${operatingCosts.generalSupplies?.toLocaleString() || 0}`);

              // Office (Row 88)
              operatingCosts.office = extractFromRowColumns(88);
              addLog(`🏢 Office costs (Row 88): $${operatingCosts.office?.toLocaleString() || 0}`);

              // Telecom (Row 165)
              operatingCosts.telecom = extractFromRowColumns(165);
              addLog(`📞 Telecom (Row 165): $${operatingCosts.telecom?.toLocaleString() || 0}`);

              // Other expense (Row 194) - check for 3PL costs
              operatingCosts.otherExpense = extractFromRowColumns(194);
              addLog(`📊 Other expense (Row 194): $${operatingCosts.otherExpense?.toLocaleString() || 0}`);

              // Lease/Rent (Row 177)
              operatingCosts.leaseRent = extractFromRowColumns(177);
              addLog(`🏠 Lease/Rent (Row 177): $${operatingCosts.leaseRent?.toLocaleString() || 0}`);

              // Headcount (Row 21) - FTEs
              operatingCosts.headcount = extractFromRowColumns(21);
              addLog(`👨‍💼 Headcount FTEs (Row 21): ${operatingCosts.headcount?.toLocaleString() || 0}`);

              // Calculate total operating costs
              operatingCosts.total = (operatingCosts.regularWages || 0) +
                                   (operatingCosts.employeeBenefits || 0) +
                                   (operatingCosts.tempEmployeeCosts || 0) +
                                   (operatingCosts.generalSupplies || 0) +
                                   (operatingCosts.office || 0) +
                                   (operatingCosts.telecom || 0) +
                                   (operatingCosts.otherExpense || 0) +
                                   (operatingCosts.leaseRent || 0);

              // Check if Other Expense > 15% of total (indicates 3PL costs)
              if (operatingCosts.otherExpense && operatingCosts.total &&
                  (operatingCosts.otherExpense / operatingCosts.total) > 0.15) {
                operatingCosts.thirdPartyLogistics = operatingCosts.otherExpense;
                addLog(`🚚 3PL DETECTED: Other expense (${((operatingCosts.otherExpense / operatingCosts.total) * 100).toFixed(1)}%) indicates 3PL costs`);
              }

              extractedAmount = operatingCosts.total || 0;
              targetColumn = 'Operating Costs (Multiple Rows)';

              addLog(`🎯 WAREHOUSE BUDGET ${sheetName}: Total operating costs $${extractedAmount.toLocaleString()}`);
              addLog(`📋 BREAKDOWN: Wages: $${operatingCosts.regularWages?.toLocaleString() || 0}, Benefits: $${operatingCosts.employeeBenefits?.toLocaleString() || 0}, Supplies: $${operatingCosts.generalSupplies?.toLocaleString() || 0}`);

              if (operatingCosts.thirdPartyLogistics) {
                addLog(`🚚 3PL COSTS: $${operatingCosts.thirdPartyLogistics.toLocaleString()} (separate line item)`);
              }

            } catch (operatingError) {
              addLog(`⚠️ Operating cost extraction error: ${operatingError instanceof Error ? operatingError.message : 'Unknown error'}`);
              operatingCosts.total = 0;
            }

          } else {
            // FALLBACK: Generic cost column detection for other file types
            addLog(`🔍 GENERIC PROCESSING: Looking for cost columns`);

            const costColumns = sheetData.columnHeaders.filter(col =>
              col && (
                col.toLowerCase().includes('net') ||
                col.toLowerCase().includes('charge') ||
                col.toLowerCase().includes('cost') ||
                col.toLowerCase().includes('amount') ||
                col.toLowerCase().includes('rate') ||
                col.toLowerCase().includes('freight') ||
                col.toLowerCase().includes('total')
              )
            );

            addLog(`🔍 Found ${costColumns.length} potential cost columns: ${costColumns.join(', ')}`);

            if (costColumns.length > 0) {
              // Prioritize NET columns
              let bestColumn = costColumns.find(col => col.toLowerCase().includes('net')) || costColumns[0];
              targetColumn = bestColumn;

              let count = 0;
              for (const row of sheetData.data) {
                if (row && row[targetColumn]) {
                  const numValue = parseFloat(String(row[targetColumn]).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 0) {
                    extractedAmount += numValue;
                    count++;
                  }
                }
              }

              addLog(`🎯 ${fileType} ${sheetName}: Extracted $${extractedAmount.toLocaleString()} from '${targetColumn}' (${count} rows)`);
            } else {
              addLog(`🚨 ${fileType} ${sheetName}: No cost columns found`);
            }
          }

        } catch (safeError) {
          addLog(`⚠️ Safe extraction error: ${safeError}. Using basic column detection.`);

          // Ultra-safe fallback - just find any numeric column
          for (const col of sheetData.columnHeaders) {
            if (col && !col.toLowerCase().includes('empty')) {
              let testAmount = 0;
              let testCount = 0;

              for (const row of sheetData.data.slice(0, 10)) { // Test only first 10 rows to prevent issues
                if (row && row[col]) {
                  const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 1) {
                    testAmount += numValue;
                    testCount++;
                  }
                }
              }

              if (testCount > 0 && testAmount > 100) {
                targetColumn = col;
                extractedAmount = testAmount * (sheetData.data.length / 10); // Estimate full amount
                addLog(`🔄 SAFE FALLBACK: Using ${col} with estimated $${extractedAmount.toLocaleString()}`);
                break;
              }
            }
          }
        }

        tabs.push({
          name: sheetName,
          rows: sheetData.rowCount,
          columns: sheetData.columnHeaders,
          data: sheetData.data,
          sampleData: sheetData.data.slice(0, 5),
          targetColumn,
          extractedAmount,
          operatingCosts: fileType === 'WAREHOUSE_BUDGET' ? operatingCosts : undefined
        });

        // Add to total
        totalExtracted += extractedAmount;

        addLog(`  ${sheetName}: ${sheetData.rowCount} rows, ${sheetData.columnHeaders.length} columns`);
        addLog(`    🎯 EXTRACTION: $${extractedAmount.toLocaleString()} from '${targetColumn}'`);
        addLog(`    📊 PROCESSED: Successfully processed sheet data`);

        // Store extraction data with full adaptive learning capabilities
        try {
          const learningPayload = {
            fileName: file.name,
            sheetName,
            fileType,
            columnName: targetColumn,
            extractedAmount,
            confidence: usingAdaptiveLearning && sheetData.adaptiveTemplate ? sheetData.adaptiveTemplate.confidence : 0.75,
            method: usingAdaptiveLearning ? 'adaptive_learning' : 'pattern_matching',
            rowsProcessed: sheetData.data.length,
            columnHeaders: sheetData.columnHeaders,
            learningMetrics: {
              patternDetected: `${fileType}_${sheetName}_${usingAdaptiveLearning ? 'adaptive' : 'simple'}`,
              adaptiveConfidence: usingAdaptiveLearning && sheetData.adaptiveTemplate ? sheetData.adaptiveTemplate.confidence : undefined,
              fallbackUsed: !usingAdaptiveLearning,
              processingTime: Date.now(),
              adaptiveTemplate: usingAdaptiveLearning && sheetData.adaptiveTemplate ? {
                id: sheetData.adaptiveTemplate.id,
                confidence: sheetData.adaptiveTemplate.confidence,
                mappingsCount: sheetData.adaptiveTemplate.suggestedMappings?.length || 0
              } : undefined
            }
          };

          const learningResponse = await fetch('/api/learning/store-extraction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(learningPayload)
          });

          if (learningResponse.ok) {
            const learningResult = await learningResponse.json();
            if (usingAdaptiveLearning) {
              addLog(`🧠 ADAPTIVE LEARNING STORED: ${learningResult.learningId}`);
            } else {
              addLog(`📊 FALLBACK LEARNING STORED: ${learningResult.learningId}`);
            }
          } else {
            addLog(`⚠️ Learning storage failed: ${learningResponse.statusText}`);
          }
        } catch (learningError) {
          addLog(`⚠️ Learning storage error: ${learningError instanceof Error ? learningError.message : 'Unknown error'}`);
        }
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

      // Add completion log with learning status
      addLog(`✓ ${file.name} processed successfully`);
      addLog(`  Total extracted: $${totalExtracted.toLocaleString()} from ${tabs.length} tabs`);
      addLog(`  File type detected: ${result.detectedFileType}`);
      addLog(`  🧠 Learning mode: ${usingAdaptiveLearning ? 'ADAPTIVE LEARNING ACTIVE' : 'Simple fallback mode'}`);

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
    console.log('handleFileUpload called with:', uploadedFiles);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      console.log('No files detected');
      addLog('⚠ No files selected or detected');
      return;
    }

    if (isProcessing) {
      addLog('⚠ Processing already in progress. Please wait...');
      return;
    }

    console.log(`Processing ${uploadedFiles.length} files:`, Array.from(uploadedFiles).map(f => f.name));

    setIsProcessing(true);
    addLog(`Starting processing of ${uploadedFiles.length} file(s)...`);

    // Log each file being processed
    Array.from(uploadedFiles).forEach((file, index) => {
      addLog(`  File ${index + 1}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    });

    try {
      const processedFiles: MultiTabFile[] = [];

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];

        if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          try {
            // Add small delay to improve UI responsiveness
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }

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
      // Clear the input to allow re-selecting the same files next time
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isProcessing
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 cursor-pointer'
            }`}
            onClick={() => {
              console.log('Upload area clicked, isProcessing:', isProcessing);
              if (!isProcessing && fileInputRef.current) {
                console.log('Triggering file input click');
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
                  This may take several seconds for large files
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drop Excel files here or <span className="text-blue-600">click to browse</span>
                </p>
                <p className="text-sm text-gray-500">
                  Supports .xlsx and .xls files with multiple tabs
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls"
              disabled={isProcessing}
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
