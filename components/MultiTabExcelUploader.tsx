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
  productivityMetrics?: ProductivityMetrics; // For production tracker files
  inventoryMetrics?: InventoryMetrics; // For inventory tracker files
  salesData?: SalesData; // For sales data files
  networkFootprintData?: NetworkFootprintData; // For network footprint files
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

interface ProductivityMetrics {
  year2024?: {
    unitsShipped?: number;    // Cell AR73
    payrollHours?: number;    // Cell AR97
    totalHours?: number;      // Cell AR102
    payrollUPH?: number;      // Calculated: unitsShipped / payrollHours
    totalUPH?: number;        // Calculated: unitsShipped / totalHours
  };
  year2025?: {
    unitsShipped?: number;    // Cell AR73
    payrollHours?: number;    // Cell AR97
    totalHours?: number;      // Cell AR102
    payrollUPH?: number;      // Calculated: unitsShipped / payrollHours
    totalUPH?: number;        // Calculated: unitsShipped / totalHours
  };
  productivityChange?: {
    unitsShippedChange?: number;    // % change
    payrollUPHChange?: number;      // % change
    totalUPHChange?: number;        // % change
    hoursEfficiencyChange?: number; // % change in productive/total ratio
  };
}

interface InventoryMetrics {
  totalInventoryDollars?: number;    // Total inventory value on hand
  dailySales?: number;               // Average daily sales
  daysSupply?: number;               // Calculated: totalInventoryDollars / dailySales
  inventoryTurnover?: number;        // Annual turnover rate
  categories?: {
    rawMaterials?: number;
    workInProgress?: number;
    finishedGoods?: number;
    totalByCategory?: number;
  };
  snapshot?: {
    date?: string;
    location?: string;
    reportType?: string;
  };
}

interface SalesData {
  totalUnits?: number;               // Column AI - total unit count (~15M)
  salesPlan?: number;                // Column T - sales plan data
  tab?: string;                      // Should be "May24-April25"
  planYear?: string;                 // Current volume plan year
}

interface NetworkFootprintData {
  totalOnHandValue?: number;         // Column S - Current On Hand Value
  totalOnHandQuantity?: number;      // Column Q - On Hand Quantity
  averageCost?: number;              // Column M - Average Cost
  skuCount?: number;                 // Number of SKUs processed
  tab?: string;                      // Should be "Data Dump"
  matchedDimensions?: number;        // Count of items matching Sales Column T
}

interface MultiTabFile {
  file: File;
  fileName: string;
  fileSize: number;
  tabs: ExcelTab[];
  fileType: 'UPS' | 'TL' | 'RL' | 'WAREHOUSE_BUDGET' | 'PRODUCTION_TRACKER' | 'INVENTORY_TRACKER' | 'SALES_DATA' | 'NETWORK_FOOTPRINT' | 'OTHER';
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

  const detectFileType = (fileName: string): 'UPS' | 'TL' | 'RL' | 'WAREHOUSE_BUDGET' | 'PRODUCTION_TRACKER' | 'INVENTORY_TRACKER' | 'SALES_DATA' | 'NETWORK_FOOTPRINT' | 'OTHER' => {
    const lower = fileName.toLowerCase();
    if (lower.includes('ups') && lower.includes('individual')) return 'UPS';
    if (lower.includes('2024') && lower.includes('tl')) return 'TL';
    if (lower.includes('r&l') && lower.includes('curriculum')) return 'RL';
    if (lower.includes('warehouse') && (lower.includes('budget') || lower.includes('operating'))) return 'WAREHOUSE_BUDGET';
    if (lower.includes('warehouse') && lower.includes('production') && lower.includes('tracker')) return 'PRODUCTION_TRACKER';
    if (lower.includes('historical') && lower.includes('sales')) return 'SALES_DATA';
    if (lower.includes('network') && (lower.includes('footprint') || lower.includes('capacity'))) return 'NETWORK_FOOTPRINT';
    if (lower.includes('inventory') || lower.includes('stock') || (lower.includes('warehouse') && lower.includes('inventory'))) return 'INVENTORY_TRACKER';
    return 'OTHER';
  };

  // CSV processing function using robust csv-parse library
  const processCsvFile = async (file: File): Promise<MultiTabFile> => {
    try {
      addLog(`📄 Processing CSV file: ${file.name}`);

      // Read file as text and do simple CSV parsing to avoid import issues
      const text = await file.text();
      addLog(`🔍 Raw CSV preview (first 200 chars): "${text.substring(0, 200)}..."`);

      // Proper CSV parsing that handles quoted fields with commas
      const lines = text.split(/\r?\n/);
      addLog(`📊 CSV has ${lines.length} total lines`);

      const data: Record<string, any>[] = [];

      const parseCSVLine = (line: string): string[] => {
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }

        // Add the last value
        values.push(currentValue.trim());
        return values;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line respecting quotes
        const values = parseCSVLine(line);

        // Create row object with column indices as keys
        const row: Record<string, any> = {};
        values.forEach((value, index) => {
          row[`col_${index}`] = value;
        });

        data.push(row);
      }

      addLog(`📊 CSV parsed: ${data.length} rows`);

      // DEBUG: Show sample of actual data structure
      if (data.length > 0) {
        addLog(`🔍 DEBUGGING - First 5 rows of actual data:`);
        for (let i = 0; i < Math.min(5, data.length); i++) {
          const row = data[i];
          const values = Object.values(row);
          addLog(`  Row ${i}: [${values.map((v, idx) => `${idx}:"${v}"`).join(', ')}]`);
        }

        // Show rows around our target areas
        const targetRows = [20, 29, 52, 62, 67, 70, 71, 77, 87, 164, 176, 193];
        addLog(`🔍 DEBUGGING - Target rows data:`);
        for (const rowIdx of targetRows) {
          if (rowIdx < data.length) {
            const row = data[rowIdx];
            const values = Object.values(row);
            addLog(`  Row ${rowIdx + 1}: [${values.map((v, idx) => `${idx}:"${v}"`).join(', ')}]`);
          }
        }
      }

      const fileType = detectFileType(file.name);

      // Create a single "tab" for the CSV data
      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const sheetData = {
        data,
        columnHeaders: headers,
        rowCount: data.length,
        sheetName: file.name.replace('.csv', '')
      };

      // Apply the same processing logic as Excel files
      let targetColumn = '';
      let extractedAmount = 0;
      let operatingCosts: OperatingCostData | undefined;
      let productivityMetrics: ProductivityMetrics | undefined;

      addLog(`🧠 PROCESSING: ${fileType} file, analyzing CSV data`);

      if (fileType === 'WAREHOUSE_BUDGET') {
        addLog(`🏭 WAREHOUSE BUDGET PROCESSING: Using coordinate-based extraction for CSV`);
        operatingCosts = {};

        // Convert data to coordinate-based access (row, column indices)
        const getValueAtCoordinate = (rowIndex: number, colIndex: number): number => {
          if (rowIndex >= data.length) return 0;

          const row = data[rowIndex];
          if (!row) return 0;

          // Get all values from this row as an array
          const rowValues = Object.values(row);
          if (colIndex >= rowValues.length) return 0;

          const cellValue = rowValues[colIndex];
          if (!cellValue || cellValue === '') return 0;

          const numValue = parseFloat(String(cellValue).replace(/[$,\s]/g, ''));
          return !isNaN(numValue) ? numValue : 0;
        };

        // Extract from first 12 month columns for 2025 data (Y:AJ = columns 24-35)
        const extractFromRowRange = (excelRowNum: number): number => {
          const rowIndex = excelRowNum - 1; // Convert to 0-based

          if (rowIndex >= data.length) {
            addLog(`    ❌ Row ${excelRowNum} (index ${rowIndex}) beyond data range (${data.length} rows)`);
            return 0;
          }

          const row = data[rowIndex];
          if (!row) return 0;

          let total = 0;
          let valuesFound = [];
          const rowValues = Object.values(row);

          // Extract from first 12 columns after column 24 (Y:AJ range for 2025 monthly data)
          // Find the first substantial numeric values that represent the 12 months
          let monthlyValues = [];
          let startCol = -1;

          // First, scan to find where meaningful data starts (typically around column 24)
          for (let colIndex = 20; colIndex < Math.min(rowValues.length, 50); colIndex++) {
            const cellValue = rowValues[colIndex];
            if (cellValue && cellValue !== '') {
              const numValue = parseFloat(String(cellValue).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 0) {
                if (startCol === -1) startCol = colIndex;
                monthlyValues.push({ colIndex, value: numValue });
                if (monthlyValues.length >= 12) break; // Stop after 12 monthly values
              }
            }
          }

          // Sum the first 12 monthly values found
          monthlyValues.slice(0, 12).forEach(({ colIndex, value }) => {
            total += value;
            valuesFound.push(`Month${colIndex - (startCol || 0) + 1}:${value}`);
          });

          addLog(`    📊 Row ${excelRowNum} - 2025 Monthly Data (12 months): ${valuesFound.join(', ')} | Total = ${total}`);
          return total;
        };

        // Extract operating costs from specific rows (scan all columns for data)
        operatingCosts.regularWages = extractFromRowRange(30); // Row 30
        operatingCosts.employeeBenefits = extractFromRowRange(63); // Row 63
        operatingCosts.tempEmployeeCosts = extractFromRowRange(68); // Row 68
        operatingCosts.generalSupplies = extractFromRowRange(78); // Row 78
        operatingCosts.office = extractFromRowRange(88); // Row 88
        operatingCosts.telecom = extractFromRowRange(165); // Row 165
        operatingCosts.otherExpense = extractFromRowRange(194); // Row 194
        operatingCosts.leaseRent = extractFromRowRange(177); // Row 177
        operatingCosts.headcount = extractFromRowRange(21); // Row 21

        operatingCosts.total = (operatingCosts.regularWages || 0) +
                              (operatingCosts.employeeBenefits || 0) +
                              (operatingCosts.tempEmployeeCosts || 0) +
                              (operatingCosts.generalSupplies || 0) +
                              (operatingCosts.office || 0) +
                              (operatingCosts.telecom || 0) +
                              (operatingCosts.otherExpense || 0) +
                              (operatingCosts.leaseRent || 0);

        if (operatingCosts.otherExpense && operatingCosts.total &&
            (operatingCosts.otherExpense / operatingCosts.total) > 0.15) {
          operatingCosts.thirdPartyLogistics = operatingCosts.otherExpense;
          addLog(`🚚 3PL DETECTED: Other expense indicates 3PL costs`);
        }

        extractedAmount = operatingCosts.total || 0;
        targetColumn = 'Operating Costs (Coordinate-based)';

        addLog(`🎯 CSV WAREHOUSE BUDGET: Total operating costs $${extractedAmount.toLocaleString()}`);

      } else if (fileType === 'PRODUCTION_TRACKER') {
        addLog(`📊 PRODUCTION TRACKER PROCESSING: Using coordinate-based extraction for CSV`);
        productivityMetrics = {};

        // Extract from specific Excel cell coordinates
        const extractFromSpecificCell = (excelRow: number, excelCol: string): number => {
          const rowIndex = excelRow - 1; // Convert to 0-based

          if (rowIndex >= data.length) {
            addLog(`    ❌ Row ${excelRow} beyond data range (${data.length} rows)`);
            return 0;
          }

          const row = data[rowIndex];
          if (!row) return 0;

          // Convert Excel column (AR, AU) to column index
          // AR = column 44 (A=1, B=2, ..., AR=44)
          // AU = column 47 (A=1, B=2, ..., AU=47)
          let colIndex = 0;
          if (excelCol === 'AR') colIndex = 43; // AR = 44th column (0-based = 43)
          if (excelCol === 'AU') colIndex = 46; // AU = 47th column (0-based = 46)

          const rowValues = Object.values(row);

          // Try to find the value at the target column index
          let cellValue = rowValues[colIndex];

          // If not found at exact index, scan nearby columns for the data
          if (!cellValue || cellValue === '') {
            for (let offset = -5; offset <= 5; offset++) {
              const testIndex = colIndex + offset;
              if (testIndex >= 0 && testIndex < rowValues.length) {
                const testValue = rowValues[testIndex];
                if (testValue && testValue !== '') {
                  const numValue = parseFloat(String(testValue).replace(/[$,\s"]/g, ''));
                  if (!isNaN(numValue) && numValue > 0) {
                    addLog(`    📍 Found ${excelCol}${excelRow} data at col ${testIndex}: ${numValue}`);
                    return numValue;
                  }
                }
              }
            }
          } else {
            const numValue = parseFloat(String(cellValue).replace(/[$,\s"]/g, ''));
            if (!isNaN(numValue)) {
              addLog(`    📍 ${excelCol}${excelRow}: ${numValue}`);
              return numValue;
            }
          }

          addLog(`    ❌ No data found at ${excelCol}${excelRow}`);
          return 0;
        };

        if (file.name.toLowerCase().includes('dec24') || file.name.toLowerCase().includes('december') && file.name.toLowerCase().includes('2024')) {
          addLog(`📅 Processing December 2024 productivity data - extracting from AR73, AR97, AR102`);

          // Extract from specific cells in December 2024 tab
          const unitsShipped = extractFromSpecificCell(73, 'AR'); // AR73
          const payrollHours = extractFromSpecificCell(97, 'AR'); // AR97 (Payroll Hours)
          const totalHours = extractFromSpecificCell(102, 'AR'); // AR102

          productivityMetrics.year2024 = {
            unitsShipped,
            payrollHours,
            totalHours
          };

          // Calculate UPH metrics (Units Per Hour)
          if (unitsShipped && payrollHours) {
            productivityMetrics.year2024.payrollUPH = unitsShipped / payrollHours;
            addLog(`📈 2024 Payroll UPH: ${(unitsShipped / payrollHours).toFixed(2)} units/hour`);
          }
          if (unitsShipped && totalHours) {
            productivityMetrics.year2024.totalUPH = unitsShipped / totalHours;
            addLog(`📊 2024 Total UPH: ${(unitsShipped / totalHours).toFixed(2)} units/hour`);
          }

          addLog(`📦 2024 Units Shipped (AR73): ${unitsShipped?.toLocaleString()}`);
          addLog(`⏱️ 2024 Payroll Hours (AR97): ${payrollHours?.toLocaleString()}`);
          addLog(`🕐 2024 Total Hours (AR102): ${totalHours?.toLocaleString()}`);

          extractedAmount = unitsShipped;

        } else if (file.name.toLowerCase().includes('apr25') || file.name.toLowerCase().includes('april') && file.name.toLowerCase().includes('2025')) {
          addLog(`📅 Processing April 2025 productivity data - extracting from AR73, AR97, AR102`);

          // Extract from specific cells in April 2025 tab (same columns)
          const unitsShipped = extractFromSpecificCell(73, 'AR'); // AR73
          const payrollHours = extractFromSpecificCell(97, 'AR'); // AR97 (Payroll Hours)
          const totalHours = extractFromSpecificCell(102, 'AR'); // AR102

          productivityMetrics.year2025 = {
            unitsShipped,
            payrollHours,
            totalHours
          };

          // Calculate UPH metrics (Units Per Hour)
          if (unitsShipped && payrollHours) {
            productivityMetrics.year2025.payrollUPH = unitsShipped / payrollHours;
            addLog(`📈 2025 YTD Payroll UPH: ${(unitsShipped / payrollHours).toFixed(2)} units/hour`);
          }
          if (unitsShipped && totalHours) {
            productivityMetrics.year2025.totalUPH = unitsShipped / totalHours;
            addLog(`📊 2025 YTD Total UPH: ${(unitsShipped / totalHours).toFixed(2)} units/hour`);
          }

          addLog(`📦 2025 YTD Units Shipped (AR73): ${unitsShipped?.toLocaleString()}`);
          addLog(`⏱️ 2025 YTD Payroll Hours (AR97): ${payrollHours?.toLocaleString()}`);
          addLog(`🕐 2025 YTD Total Hours (AR102): ${totalHours?.toLocaleString()}`);

          extractedAmount = unitsShipped;
        }

        targetColumn = 'Productivity Metrics (Coordinates)';
      }

      // Process inventory files
      let inventoryMetrics: InventoryMetrics | undefined;
      if (fileType === 'INVENTORY_TRACKER') {
        addLog(`📦 INVENTORY TRACKER PROCESSING: Analyzing inventory data`);
        inventoryMetrics = {};

        // Scan for common inventory data patterns
        const findInventoryValue = (searchTerms: string[]): number => {
          for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
            const row = data[rowIndex];
            const rowValues = Object.values(row);

            // Check if this row contains any of our search terms
            const rowText = rowValues.join(' ').toLowerCase();
            if (searchTerms.some(term => rowText.includes(term))) {
              // Look for numeric values in this row
              for (const value of rowValues) {
                if (value && typeof value === 'string') {
                  const numValue = parseFloat(value.replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 1000) { // Assuming inventory values > $1000
                    addLog(`    📍 Found inventory value: ${numValue.toLocaleString()} for ${searchTerms[0]}`);
                    return numValue;
                  }
                }
              }
            }
          }
          return 0;
        };

        // Extract key inventory metrics
        inventoryMetrics.totalInventoryDollars = findInventoryValue(['total inventory', 'inventory total', 'total value', 'total stock']);

        // Try to find category breakdowns
        inventoryMetrics.categories = {
          rawMaterials: findInventoryValue(['raw material', 'raw stock', 'materials']),
          workInProgress: findInventoryValue(['work in progress', 'wip', 'in process']),
          finishedGoods: findInventoryValue(['finished goods', 'finished product', 'final product']),
        };

        // Calculate total from categories if main total not found
        if (!inventoryMetrics.totalInventoryDollars && inventoryMetrics.categories) {
          inventoryMetrics.categories.totalByCategory =
            (inventoryMetrics.categories.rawMaterials || 0) +
            (inventoryMetrics.categories.workInProgress || 0) +
            (inventoryMetrics.categories.finishedGoods || 0);

          if (inventoryMetrics.categories.totalByCategory > 0) {
            inventoryMetrics.totalInventoryDollars = inventoryMetrics.categories.totalByCategory;
          }
        }

        // Look for sales data to calculate days supply
        inventoryMetrics.dailySales = findInventoryValue(['daily sales', 'sales per day', 'average daily']);

        // Calculate days supply if we have both inventory and sales
        if (inventoryMetrics.totalInventoryDollars && inventoryMetrics.dailySales) {
          inventoryMetrics.daysSupply = inventoryMetrics.totalInventoryDollars / inventoryMetrics.dailySales;
          addLog(`📊 Days Supply: ${inventoryMetrics.daysSupply.toFixed(1)} days`);
        }

        // Set snapshot info
        inventoryMetrics.snapshot = {
          date: new Date().toISOString().split('T')[0],
          location: 'Warehouse',
          reportType: 'Baseline Inventory Analysis'
        };

        extractedAmount = inventoryMetrics.totalInventoryDollars || 0;
        targetColumn = 'Inventory Metrics (Total Value)';

        addLog(`🎯 INVENTORY TRACKER: Total inventory value $${extractedAmount.toLocaleString()}`);
        if (inventoryMetrics.daysSupply) {
          addLog(`📈 Days Supply: ${inventoryMetrics.daysSupply.toFixed(1)} days`);
        }
      }

      // Process sales data files (CSV not typically used for complex Excel files, but adding for completeness)
      let salesData: SalesData | undefined;
      if (fileType === 'SALES_DATA') {
        addLog(`📈 SALES DATA PROCESSING: Analyzing sales data from CSV`);
        salesData = {};

        // For CSV files, we'll scan for the key columns since we can't filter by tab
        const extractFromColumn = (columnLetter: string): number => {
          // Convert Excel column letter to approximate index (T=19, AI=34)
          let colIndex = 0;
          if (columnLetter === 'T') colIndex = 19;
          if (columnLetter === 'AI') colIndex = 34;

          let total = 0;
          for (const row of data) {
            const rowValues = Object.values(row);
            if (rowValues[colIndex]) {
              const numValue = parseFloat(String(rowValues[colIndex]).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 0) {
                total += numValue;
              }
            }
          }
          return total;
        };

        salesData.salesPlan = extractFromColumn('T');
        salesData.totalUnits = extractFromColumn('AI');
        salesData.tab = 'CSV Data';
        salesData.planYear = 'May24-April25';

        extractedAmount = salesData.totalUnits || 0;
        targetColumn = 'Sales Data (Units)';

        addLog(`🎯 SALES DATA: Total units ${extractedAmount.toLocaleString()}`);
        addLog(`📊 Sales Plan: ${salesData.salesPlan?.toLocaleString() || 0}`);
      }

      // Process network footprint files
      let networkFootprintData: NetworkFootprintData | undefined;
      if (fileType === 'NETWORK_FOOTPRINT') {
        addLog(`🌐 NETWORK FOOTPRINT PROCESSING: Analyzing network data from CSV`);
        networkFootprintData = {};

        // Extract from specific columns (A, M, Q, S)
        const extractFromNetworkColumn = (columnLetter: string): number => {
          let colIndex = 0;
          if (columnLetter === 'A') colIndex = 0;
          if (columnLetter === 'M') colIndex = 12;
          if (columnLetter === 'Q') colIndex = 16;
          if (columnLetter === 'S') colIndex = 18;

          let total = 0;
          let count = 0;
          for (const row of data) {
            const rowValues = Object.values(row);
            if (rowValues[colIndex]) {
              const numValue = parseFloat(String(rowValues[colIndex]).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 0) {
                total += numValue;
                count++;
              }
            }
          }
          return columnLetter === 'M' ? (count > 0 ? total / count : 0) : total; // M is average cost
        };

        networkFootprintData.averageCost = extractFromNetworkColumn('M');
        networkFootprintData.totalOnHandQuantity = extractFromNetworkColumn('Q');
        networkFootprintData.totalOnHandValue = extractFromNetworkColumn('S');
        networkFootprintData.tab = 'CSV Data';
        networkFootprintData.skuCount = data.length - 1; // Minus header row

        extractedAmount = networkFootprintData.totalOnHandValue || 0;
        targetColumn = 'Network Data (On Hand Value)';

        addLog(`🎯 NETWORK FOOTPRINT: Total on hand value $${extractedAmount.toLocaleString()}`);
        addLog(`📦 On hand quantity: ${networkFootprintData.totalOnHandQuantity?.toLocaleString() || 0}`);
        addLog(`���� Average cost: $${networkFootprintData.averageCost?.toFixed(2) || 0}`);
      }

      const tabs: ExcelTab[] = [{
        name: sheetData.sheetName,
        rows: sheetData.rowCount,
        columns: sheetData.columnHeaders,
        data: sheetData.data,
        sampleData: sheetData.data.slice(0, 5),
        targetColumn,
        extractedAmount,
        operatingCosts: fileType === 'WAREHOUSE_BUDGET' ? operatingCosts : undefined,
        productivityMetrics: fileType === 'PRODUCTION_TRACKER' ? productivityMetrics : undefined,
        inventoryMetrics: fileType === 'INVENTORY_TRACKER' ? inventoryMetrics : undefined,
        salesData: fileType === 'SALES_DATA' ? salesData : undefined,
        networkFootprintData: fileType === 'NETWORK_FOOTPRINT' ? networkFootprintData : undefined
      }];

      const multiTabFile: MultiTabFile = {
        file,
        fileName: file.name,
        fileSize: file.size,
        tabs,
        fileType,
        totalExtracted: extractedAmount,
        processingStatus: 'completed'
      };

      addLog(`✓ ${file.name} CSV processed successfully with robust parser`);
      addLog(`  Parsed: ${data.length} rows, Headers: ${sheetData.columnHeaders.length} columns`);
      addLog(`  Total extracted: $${extractedAmount.toLocaleString()}`);

      return multiTabFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`✗ Error processing CSV ${file.name}: ${errorMessage}`);

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

        // Process file with adaptive learning - special handling for macro-enabled files
        const buffer = await file.arrayBuffer();
        const isXlsm = file.name.toLowerCase().endsWith('.xlsm');

        addLog(`📁 File type: ${isXlsm ? 'Macro-enabled (.xlsm)' : 'Standard Excel'}`);

        const workbook = XLSX.read(buffer, {
          type: 'array',
          cellFormula: false,  // Don't try to preserve formulas
          cellHTML: false,     // Don't preserve HTML
          cellNF: false,       // Don't preserve number formats
          cellDates: true,     // Parse dates
          bookDeps: false,     // Don't load dependencies
          bookFiles: false,    // Don't load file relationships
          bookProps: false,    // Don't load properties
          bookSheets: false,   // Don't load sheet relationships
          bookVBA: false,      // Don't load VBA/macros
          raw: false           // Process the data
        });

        const sheets: any = {};
        let totalExtracted = 0;

        // Process each sheet with adaptive learning
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          // For macro-enabled files, use different parsing options
          const parseOptions = isXlsm ? {
            header: 1,          // Use array of arrays format
            defval: '',         // Default value for empty cells
            blankrows: true,    // Include blank rows
            raw: false,         // Process values
            dateNF: 'yyyy-mm-dd' // Date format
          } : {};

          let rawData;
          if (isXlsm) {
            // Convert array format to object format for macro-enabled files
            const arrayData = XLSX.utils.sheet_to_json(worksheet, parseOptions);
            rawData = arrayData.map((row, index) => {
              if (Array.isArray(row)) {
                const obj = {};
                row.forEach((cell, colIndex) => {
                  const columnName = colIndex < 26 ?
                    String.fromCharCode(65 + colIndex) :
                    `__EMPTY_${colIndex}`;
                  obj[columnName] = cell;
                });
                return obj;
              }
              return row;
            }).filter(row => row && Object.keys(row).length > 0);
          } else {
            rawData = XLSX.utils.sheet_to_json(worksheet);
          }

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
        addLog(`⚠ Adaptive learning failed, falling back to basic XLSX processing: ${adaptiveError instanceof Error ? adaptiveError.message : 'Unknown error'}`);
        usingAdaptiveLearning = false;

        // Basic XLSX fallback processing
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        const sheets: any = {};
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet);

          sheets[sheetName] = {
            data: rawData,
            columnHeaders: rawData.length > 0 ? Object.keys(rawData[0]) : [],
            rowCount: rawData.length,
            sheetName: sheetName
          };
        }

        result = {
          isValid: Object.keys(sheets).length > 0,
          sheets,
          detectedFileType: fileType,
          totalExtracted: 0,
          errors: [],
          warnings: [],
          usingAdaptiveLearning: false
        };
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
        let operatingCosts: OperatingCostData | undefined;
        let productivityMetrics: ProductivityMetrics | undefined;
        let inventoryMetrics: InventoryMetrics | undefined;
        let salesData: SalesData | undefined;
        let networkFootprintData: NetworkFootprintData | undefined;

        try {
          // Apply file-type specific extraction rules
          addLog(`🧠 PROCESSING: ${fileType} file, analyzing ${sheetName} tab`);

          // UPS FILES: Extract from Column G (Net Charge) for all four tabs
          if (fileType === 'UPS') {
            addLog(`���� UPS PROCESSING: Looking for Net Charge column (Column G)`);

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
              addLog(`�� R&L ${sheetName}: Skipping non-Detail tab`);
            }

          // PRODUCTION TRACKER FILES: Extract productivity metrics from specific cells
          } else if (fileType === 'PRODUCTION_TRACKER') {
            addLog(`📊 PRODUCTION TRACKER PROCESSING: Extracting productivity metrics from specific cells`);

            productivityMetrics = {};

            // Helper function to extract value from specific cell reference
            const extractFromCell = (cellRef: string): number => {
              // Convert Excel cell reference (e.g., AR53) to array indices
              const getColumnIndex = (col: string): number => {
                let result = 0;
                for (let i = 0; i < col.length; i++) {
                  result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
                }
                return result - 1; // Convert to 0-based index
              };

              const match = cellRef.match(/^([A-Z]+)(\d+)$/);
              if (!match) return 0;

              const columnLetters = match[1];
              const rowNumber = parseInt(match[2]) - 1; // Convert to 0-based index
              const columnIndex = getColumnIndex(columnLetters);

              // Get value from data array
              if (rowNumber < sheetData.data.length) {
                const row = sheetData.data[rowNumber];
                const headers = sheetData.columnHeaders;

                if (columnIndex < headers.length) {
                  const columnKey = headers[columnIndex];
                  if (row && row[columnKey]) {
                    const value = parseFloat(String(row[columnKey]).replace(/[$,\s]/g, ''));
                    return !isNaN(value) ? value : 0;
                  }
                }
              }
              return 0;
            };

            try {
              // Process based on sheet name
              if (sheetName.toLowerCase().includes('december') && sheetName.toLowerCase().includes('2024')) {
                addLog(`📅 Processing December 2024 productivity data`);

                productivityMetrics.year2024 = {
                  unitsShipped: extractFromCell('AR53'),
                  productiveHours: extractFromCell('AR71'),
                  totalHours: extractFromCell('AR72')
                };

                // Calculate UPH metrics
                if (productivityMetrics.year2024.unitsShipped && productivityMetrics.year2024.productiveHours) {
                  productivityMetrics.year2024.productiveUPH =
                    productivityMetrics.year2024.unitsShipped / productivityMetrics.year2024.productiveHours;
                }
                if (productivityMetrics.year2024.unitsShipped && productivityMetrics.year2024.totalHours) {
                  productivityMetrics.year2024.totalUPH =
                    productivityMetrics.year2024.unitsShipped / productivityMetrics.year2024.totalHours;
                }

                addLog(`📦 2024 Units Shipped: ${productivityMetrics.year2024.unitsShipped?.toLocaleString() || 0}`);
                addLog(`⏱️ 2024 Productive Hours: ${productivityMetrics.year2024.productiveHours?.toLocaleString() || 0}`);
                addLog(`🕐 2024 Total Hours: ${productivityMetrics.year2024.totalHours?.toLocaleString() || 0}`);
                addLog(`📈 2024 Productive UPH: ${productivityMetrics.year2024.productiveUPH?.toFixed(2) || 0}`);
                addLog(`📊 2024 Total UPH: ${productivityMetrics.year2024.totalUPH?.toFixed(2) || 0}`);

              } else if (sheetName.toLowerCase().includes('april') && sheetName.toLowerCase().includes('2025')) {
                addLog(`📅 Processing April 2025 productivity data`);

                productivityMetrics.year2025 = {
                  unitsShipped: extractFromCell('AU53'),
                  productiveHours: extractFromCell('AU71'),
                  totalHours: extractFromCell('AU72')
                };

                // Calculate UPH metrics
                if (productivityMetrics.year2025.unitsShipped && productivityMetrics.year2025.productiveHours) {
                  productivityMetrics.year2025.productiveUPH =
                    productivityMetrics.year2025.unitsShipped / productivityMetrics.year2025.productiveHours;
                }
                if (productivityMetrics.year2025.unitsShipped && productivityMetrics.year2025.totalHours) {
                  productivityMetrics.year2025.totalUPH =
                    productivityMetrics.year2025.unitsShipped / productivityMetrics.year2025.totalHours;
                }

                addLog(`📦 2025 YTD Units Shipped: ${productivityMetrics.year2025.unitsShipped?.toLocaleString() || 0}`);
                addLog(`⏱️ 2025 YTD Productive Hours: ${productivityMetrics.year2025.productiveHours?.toLocaleString() || 0}`);
                addLog(`🕐 2025 YTD Total Hours: ${productivityMetrics.year2025.totalHours?.toLocaleString() || 0}`);
                addLog(`📈 2025 YTD Productive UPH: ${productivityMetrics.year2025.productiveUPH?.toFixed(2) || 0}`);
                addLog(`📊 2025 YTD Total UPH: ${productivityMetrics.year2025.totalUPH?.toFixed(2) || 0}`);

                // If we have both years, calculate productivity changes
                if (productivityMetrics.year2024) {
                  productivityMetrics.productivityChange = {};

                  if (productivityMetrics.year2024.unitsShipped && productivityMetrics.year2025.unitsShipped) {
                    productivityMetrics.productivityChange.unitsShippedChange =
                      ((productivityMetrics.year2025.unitsShipped - productivityMetrics.year2024.unitsShipped) /
                       productivityMetrics.year2024.unitsShipped) * 100;
                  }

                  if (productivityMetrics.year2024.productiveUPH && productivityMetrics.year2025.productiveUPH) {
                    productivityMetrics.productivityChange.productiveUPHChange =
                      ((productivityMetrics.year2025.productiveUPH - productivityMetrics.year2024.productiveUPH) /
                       productivityMetrics.year2024.productiveUPH) * 100;
                  }

                  if (productivityMetrics.year2024.totalUPH && productivityMetrics.year2025.totalUPH) {
                    productivityMetrics.productivityChange.totalUPHChange =
                      ((productivityMetrics.year2025.totalUPH - productivityMetrics.year2024.totalUPH) /
                       productivityMetrics.year2024.totalUPH) * 100;
                  }

                  // Calculate hours efficiency change (productive/total ratio)
                  const efficiency2024 = (productivityMetrics.year2024.productiveHours || 0) / (productivityMetrics.year2024.totalHours || 1);
                  const efficiency2025 = (productivityMetrics.year2025.productiveHours || 0) / (productivityMetrics.year2025.totalHours || 1);
                  productivityMetrics.productivityChange.hoursEfficiencyChange = ((efficiency2025 - efficiency2024) / efficiency2024) * 100;

                  addLog(`📊 PRODUCTIVITY ANALYSIS:`);
                  addLog(`  Units Change: ${productivityMetrics.productivityChange.unitsShippedChange?.toFixed(1) || 0}%`);
                  addLog(`  Productive UPH Change: ${productivityMetrics.productivityChange.productiveUPHChange?.toFixed(1) || 0}%`);
                  addLog(`  Total UPH Change: ${productivityMetrics.productivityChange.totalUPHChange?.toFixed(1) || 0}%`);
                  addLog(`  Hours Efficiency Change: ${productivityMetrics.productivityChange.hoursEfficiencyChange?.toFixed(1) || 0}%`);
                }
              }

              // Set extracted amount to units shipped for display purposes
              extractedAmount = (productivityMetrics.year2024?.unitsShipped || 0) + (productivityMetrics.year2025?.unitsShipped || 0);
              targetColumn = 'Productivity Metrics (Multiple Cells)';

              addLog(`🎯 PRODUCTION TRACKER ${sheetName}: Extracted productivity data`);

            } catch (productivityError) {
              addLog(`⚠️ Productivity extraction error: ${productivityError instanceof Error ? productivityError.message : 'Unknown error'}`);
            }

          // WAREHOUSE BUDGET FILES: Extract operating costs from specific rows and columns
          } else if (fileType === 'WAREHOUSE_BUDGET') {
            addLog(`🏭 WAREHOUSE BUDGET PROCESSING: Extracting operating costs from specific rows`);

            operatingCosts = {};

            // Convert data to row-indexed format for easier access (0-indexed to match array)
            const rowData: { [key: number]: any } = {};
            sheetData.data.forEach((row, index) => {
              rowData[index] = row; // Keep 0-indexed to match data array
            });

            // First, detect data column range using row 20 (Excel row 21 - headcount)
            let dataStartColumn = -1;
            let dataEndColumn = -1;

            const headcountRow = rowData[20]; // Excel row 21 = array index 20
            if (headcountRow) {
              let consecutiveCount = 0;
              for (let i = 0; i < sheetData.columnHeaders.length; i++) {
                const columnKey = sheetData.columnHeaders[i];
                if (headcountRow[columnKey] !== undefined && headcountRow[columnKey] !== null) {
                  const value = parseFloat(String(headcountRow[columnKey]).replace(/[$,\s]/g, ''));
                  if (!isNaN(value) && value > 0) {
                    if (dataStartColumn === -1) dataStartColumn = i;
                    dataEndColumn = i;
                    consecutiveCount++;
                  } else if (consecutiveCount > 6) {
                    // Found good data range, stop looking
                    break;
                  }
                }
              }
            }

            // Fallback to Y:AJ indices if auto-detection fails
            if (dataStartColumn === -1) {
              dataStartColumn = 24; // Y column
              dataEndColumn = 35;   // AJ column
            }

            addLog(`🔍 DETECTED DATA RANGE: columns ${dataStartColumn} to ${dataEndColumn} (${sheetData.columnHeaders[dataStartColumn]} to ${sheetData.columnHeaders[dataEndColumn]})`);

            // Helper function to extract value from specific row - scan all columns for numeric data
            const extractFromRowColumns = (excelRowNum: number): number => {
              const arrayIndex = excelRowNum - 1; // Convert Excel row number to 0-based array index
              const row = rowData[arrayIndex];
              if (!row) {
                addLog(`    ❌ Row ${excelRowNum} (index ${arrayIndex}) not found in data (only ${sheetData.data.length} rows available)`);
                return 0;
              }

              let total = 0;
              let valuesFound = [];

              // Scan ALL columns for numeric data, not just the detected range
              for (let columnIndex = 0; columnIndex < sheetData.columnHeaders.length; columnIndex++) {
                const columnKey = sheetData.columnHeaders[columnIndex];
                if (row && row[columnKey] !== undefined && row[columnKey] !== null && row[columnKey] !== '') {
                  const rawValue = String(row[columnKey]).replace(/[$,\s]/g, '');
                  const value = parseFloat(rawValue);

                  // Include any valid numeric value, including zeros (common in budget files)
                  if (!isNaN(value) && Math.abs(value) >= 0) {
                    total += value;
                    valuesFound.push(`${columnKey}:${value}`);
                  }
                }
              }

              if (valuesFound.length > 0) {
                addLog(`    📊 Row ${excelRowNum} found ${valuesFound.length} values: ${valuesFound.slice(0, 5).join(', ')}${valuesFound.length > 5 ? '...' : ''} (Total: ${total})`);
              } else {
                addLog(`    ❌ Row ${excelRowNum} no numeric values found in any column`);
                // Debug: show first few non-empty values for troubleshooting
                const nonEmptyValues = [];
                for (let columnIndex = 0; columnIndex < Math.min(10, sheetData.columnHeaders.length); columnIndex++) {
                  const columnKey = sheetData.columnHeaders[columnIndex];
                  if (row && row[columnKey] !== undefined && row[columnKey] !== null && row[columnKey] !== '') {
                    nonEmptyValues.push(`${columnKey}:"${row[columnKey]}"`);
                  }
                }
                if (nonEmptyValues.length > 0) {
                  addLog(`    🔍 Row ${excelRowNum} sample non-empty values: ${nonEmptyValues.slice(0, 3).join(', ')}`);
                }
              }

              return total;
            };

            // Extract specific operating cost components with enhanced debugging
            try {
              // Debug: Show what's actually in some of the target rows
              addLog(`🔍 DEBUGGING TARGET ROWS:`);
              for (const testRow of [30, 63, 68, 78, 88]) {
                const arrayIndex = testRow - 1;
                if (arrayIndex < sheetData.data.length) {
                  const row = sheetData.data[arrayIndex];
                  const nonEmptyValues = [];
                  for (let i = 0; i < Math.min(10, sheetData.columnHeaders.length); i++) {
                    const col = sheetData.columnHeaders[i];
                    if (row && row[col] !== undefined && row[col] !== null && row[col] !== '') {
                      nonEmptyValues.push(`${col}:"${row[col]}"`);
                    }
                  }
                  addLog(`    Row ${testRow}: ${nonEmptyValues.length} non-empty values: ${nonEmptyValues.slice(0, 3).join(', ')}`);
                } else {
                  addLog(`    Row ${testRow}: BEYOND DATA RANGE (only ${sheetData.data.length} rows)`);
                }
              }

              // Regular wages (Row 30, columns Y:AJ) - planned labor cost for 2025
              operatingCosts.regularWages = extractFromRowColumns(30);
              addLog(`💰 Regular wages (Row 30): $${operatingCosts.regularWages?.toLocaleString() || 0}`);

              // Employee benefits (Row 63, columns Y:AJ)
              operatingCosts.employeeBenefits = extractFromRowColumns(63);
              addLog(`🏥 Employee benefits (Row 63, cols Y:AJ): $${operatingCosts.employeeBenefits?.toLocaleString() || 0}`);

              // Temp employee costs (Row 68, columns Y:AJ)
              operatingCosts.tempEmployeeCosts = extractFromRowColumns(68);
              addLog(`👥 Temp employee costs (Row 68, cols Y:AJ): $${operatingCosts.tempEmployeeCosts?.toLocaleString() || 0}`);

              // General supplies (Row 78, columns Y:AJ)
              operatingCosts.generalSupplies = extractFromRowColumns(78);
              addLog(`📦 General supplies (Row 78, cols Y:AJ): $${operatingCosts.generalSupplies?.toLocaleString() || 0}`);

              // Office (Row 88, columns Y:AJ)
              operatingCosts.office = extractFromRowColumns(88);
              addLog(`🏢 Office costs (Row 88, cols Y:AJ): $${operatingCosts.office?.toLocaleString() || 0}`);

              // Telecom (Row 165, columns Y:AJ)
              operatingCosts.telecom = extractFromRowColumns(165);
              addLog(`📞 Telecom (Row 165, cols Y:AJ): $${operatingCosts.telecom?.toLocaleString() || 0}`);

              // Other expense (Row 194, columns Y:AJ) - check for 3PL costs
              operatingCosts.otherExpense = extractFromRowColumns(194);
              addLog(`📊 Other expense (Row 194, cols Y:AJ): $${operatingCosts.otherExpense?.toLocaleString() || 0}`);

              // Lease/Rent (Row 177, columns Y:AJ)
              operatingCosts.leaseRent = extractFromRowColumns(177);
              addLog(`🏠 Lease/Rent (Row 177, cols Y:AJ): $${operatingCosts.leaseRent?.toLocaleString() || 0}`);

              // Headcount (Row 21, columns Y:AJ) - FTEs
              operatingCosts.headcount = extractFromRowColumns(21);
              addLog(`👨‍💼 Headcount FTEs (Row 21, cols Y:AJ): ${operatingCosts.headcount?.toLocaleString() || 0}`);

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

          // INVENTORY TRACKER FILES: Extract inventory metrics
          } else if (fileType === 'INVENTORY_TRACKER') {
            addLog(`📦 INVENTORY TRACKER PROCESSING: Analyzing inventory data from Excel`);

            inventoryMetrics = {};

            try {
              // Search for inventory-related columns and values
              const findInventoryData = (searchTerms: string[], minValue: number = 1000): number => {
                for (const row of sheetData.data) {
                  if (!row) continue;

                  // Check all columns for search terms and values
                  for (const [columnName, value] of Object.entries(row)) {
                    const columnText = String(columnName).toLowerCase();
                    const cellText = String(value || '').toLowerCase();

                    // If column or cell contains our search terms
                    if (searchTerms.some(term => columnText.includes(term) || cellText.includes(term))) {
                      // Look for numeric values in this row
                      for (const cellValue of Object.values(row)) {
                        if (cellValue && typeof cellValue !== 'undefined') {
                          const numValue = parseFloat(String(cellValue).replace(/[$,\s]/g, ''));
                          if (!isNaN(numValue) && numValue >= minValue) {
                            addLog(`    📍 Found inventory value: ${numValue.toLocaleString()} for ${searchTerms[0]}`);
                            return numValue;
                          }
                        }
                      }
                    }
                  }
                }
                return 0;
              };

              // Extract key inventory metrics
              inventoryMetrics.totalInventoryDollars = findInventoryData(['total inventory', 'inventory total', 'total value', 'total stock', 'inventory dollars']);

              // Try to find category breakdowns
              inventoryMetrics.categories = {
                rawMaterials: findInventoryData(['raw material', 'raw stock', 'materials'], 100),
                workInProgress: findInventoryData(['work in progress', 'wip', 'in process'], 100),
                finishedGoods: findInventoryData(['finished goods', 'finished product', 'final product'], 100),
              };

              // Calculate total from categories if main total not found
              if (!inventoryMetrics.totalInventoryDollars && inventoryMetrics.categories) {
                inventoryMetrics.categories.totalByCategory =
                  (inventoryMetrics.categories.rawMaterials || 0) +
                  (inventoryMetrics.categories.workInProgress || 0) +
                  (inventoryMetrics.categories.finishedGoods || 0);

                if (inventoryMetrics.categories.totalByCategory > 0) {
                  inventoryMetrics.totalInventoryDollars = inventoryMetrics.categories.totalByCategory;
                }
              }

              // Look for sales data to calculate days supply
              inventoryMetrics.dailySales = findInventoryData(['daily sales', 'sales per day', 'average daily'], 10);

              // Calculate days supply if we have both inventory and sales
              if (inventoryMetrics.totalInventoryDollars && inventoryMetrics.dailySales) {
                inventoryMetrics.daysSupply = inventoryMetrics.totalInventoryDollars / inventoryMetrics.dailySales;
                inventoryMetrics.inventoryTurnover = 365 / inventoryMetrics.daysSupply; // Annual turnover
                addLog(`📊 Days Supply: ${inventoryMetrics.daysSupply.toFixed(1)} days`);
                addLog(`🔄 Inventory Turnover: ${inventoryMetrics.inventoryTurnover.toFixed(2)}x annually`);
              }

              // Set snapshot info
              inventoryMetrics.snapshot = {
                date: new Date().toISOString().split('T')[0],
                location: 'Warehouse',
                reportType: 'Baseline Inventory Analysis'
              };

              extractedAmount = inventoryMetrics.totalInventoryDollars || 0;
              targetColumn = 'Inventory Metrics (Total Value)';

              addLog(`🎯 INVENTORY TRACKER ${sheetName}: Total inventory value $${extractedAmount.toLocaleString()}`);
              if (inventoryMetrics.daysSupply) {
                addLog(`📈 Days Supply: ${inventoryMetrics.daysSupply.toFixed(1)} days`);
                addLog(`🔄 Annual Turnover: ${inventoryMetrics.inventoryTurnover?.toFixed(2)}x`);
              }

            } catch (inventoryError) {
              addLog(`⚠️ Inventory extraction error: ${inventoryError instanceof Error ? inventoryError.message : 'Unknown error'}`);
              inventoryMetrics.totalInventoryDollars = 0;
            }

          // SALES DATA FILES: Extract from May24-April25 tab only
          } else if (fileType === 'SALES_DATA') {
            // Only process if this is the May24-April25 tab
            if (sheetName.toLowerCase().includes('may24') && sheetName.toLowerCase().includes('april25')) {
              addLog(`📈 SALES DATA PROCESSING: Analyzing ${sheetName} tab for sales data`);

              salesData = {};

              try {
                // Extract from Column T (Sales Plan) and Column AI (Unit Count)
                const extractFromSalesColumn = (columnLetter: string): number => {
                  // Find the actual column in the data
                  let targetColumn = '';

                  // Look for column by letter or pattern
                  if (columnLetter === 'T') {
                    targetColumn = sheetData.columnHeaders.find(col =>
                      col === 'T' || col.toLowerCase().includes('sales plan')
                    ) || sheetData.columnHeaders[19]; // T is 20th column (0-indexed = 19)
                  } else if (columnLetter === 'AI') {
                    targetColumn = sheetData.columnHeaders.find(col =>
                      col === 'AI' || col.toLowerCase().includes('unit count') || col.toLowerCase().includes('units')
                    ) || sheetData.columnHeaders[34]; // AI is 35th column (0-indexed = 34)
                  }

                  if (!targetColumn) return 0;

                  let total = 0;
                  let count = 0;
                  for (const row of sheetData.data) {
                    if (row && row[targetColumn]) {
                      const numValue = parseFloat(String(row[targetColumn]).replace(/[$,\s]/g, ''));
                      if (!isNaN(numValue) && numValue > 0) {
                        total += numValue;
                        count++;
                      }
                    }
                  }

                  addLog(`    📍 Column ${columnLetter} (${targetColumn}): ${total.toLocaleString()} from ${count} rows`);
                  return total;
                };

                salesData.salesPlan = extractFromSalesColumn('T');
                salesData.totalUnits = extractFromSalesColumn('AI');
                salesData.tab = sheetName;
                salesData.planYear = 'May24-April25';

                extractedAmount = salesData.totalUnits || 0;
                targetColumn = 'Sales Data (Column AI - Units)';

                addLog(`🎯 SALES DATA ${sheetName}: Total units ${extractedAmount.toLocaleString()}`);
                addLog(`📊 Sales Plan (Column T): ${salesData.salesPlan?.toLocaleString() || 0}`);

              } catch (salesError) {
                addLog(`⚠️ Sales data extraction error: ${salesError instanceof Error ? salesError.message : 'Unknown error'}`);
                salesData.totalUnits = 0;
              }
            } else {
              addLog(`⏭️ SKIPPING TAB: ${sheetName} (only processing May24-April25 tab)`);
            }

          // NETWORK FOOTPRINT FILES: Extract from Data Dump tab only
          } else if (fileType === 'NETWORK_FOOTPRINT') {
            // Process Data Dump tab for inventory values AND SOFTEON ITEM MASTER for dimensional data
            if (sheetName.toLowerCase().includes('data dump') || sheetName.toLowerCase().includes('softeon item master')) {
              addLog(`🌐 NETWORK FOOTPRINT PROCESSING: Analyzing ${sheetName} tab for network data`);

              networkFootprintData = {};

              try {
                // Check if this is SOFTEON ITEM MASTER tab for dimensional data
                if (sheetName.toLowerCase().includes('softeon item master')) {
                  addLog(`📏 PROCESSING SOFTEON ITEM MASTER: Extracting dimensional data for pallet calculations`);

                  // Extract dimensional data from SOFTEON ITEM MASTER
                  let totalCasesPerPallet = 0;
                  let totalUnitsPerCase = 0;
                  let totalUnits = 0;
                  let totalPallets = 0;
                  let skuCount = 0;
                  let dimensionalMetrics = {
                    totalCubicFeet: 0,
                    totalWeight: 0,
                    avgCaseHeight: 0,
                    avgCaseWidth: 0,
                    avgCaseLength: 0
                  };

                  for (const row of sheetData.data) {
                    if (row && typeof row === 'object') {
                      // Extract key dimensional fields
                      const casesPerPallet = parseFloat(String(row['Cases / Pallet'] || row['Cases/Pallet'] || '').replace(/[^0-9.]/g, '')) || 0;
                      const unitsPerCase = parseFloat(String(row['Units / Case'] || row['Units/Case'] || '').replace(/[^0-9.]/g, '')) || 0;
                      const caseCubicSize = parseFloat(String(row['Case Cubic Size'] || '').replace(/[^0-9.]/g, '')) || 0;
                      const caseWeight = parseFloat(String(row['Case Weight'] || '').replace(/[^0-9.]/g, '')) || 0;
                      const caseHeight = parseFloat(String(row['Case Height'] || '').replace(/[^0-9.]/g, '')) || 0;
                      const caseWidth = parseFloat(String(row['Case Width'] || '').replace(/[^0-9.]/g, '')) || 0;
                      const caseLength = parseFloat(String(row['Case Length'] || '').replace(/[^0-9.]/g, '')) || 0;

                      if (casesPerPallet > 0 && unitsPerCase > 0) {
                        totalCasesPerPallet += casesPerPallet;
                        totalUnitsPerCase += unitsPerCase;
                        totalUnits += unitsPerCase; // Each row represents one case
                        skuCount++;

                        // Calculate pallet estimate for this SKU
                        if (casesPerPallet > 0) {
                          totalPallets += 1 / casesPerPallet; // Fractional pallet per case
                        }

                        // Accumulate dimensional data
                        dimensionalMetrics.totalCubicFeet += caseCubicSize;
                        dimensionalMetrics.totalWeight += caseWeight;
                        dimensionalMetrics.avgCaseHeight += caseHeight;
                        dimensionalMetrics.avgCaseWidth += caseWidth;
                        dimensionalMetrics.avgCaseLength += caseLength;
                      }
                    }
                  }

                  // Calculate averages
                  const avgCasesPerPallet = skuCount > 0 ? totalCasesPerPallet / skuCount : 0;
                  const avgUnitsPerCase = skuCount > 0 ? totalUnitsPerCase / skuCount : 0;
                  const estimatedPalletCount = Math.ceil(totalPallets);

                  dimensionalMetrics.avgCaseHeight = skuCount > 0 ? dimensionalMetrics.avgCaseHeight / skuCount : 0;
                  dimensionalMetrics.avgCaseWidth = skuCount > 0 ? dimensionalMetrics.avgCaseWidth / skuCount : 0;
                  dimensionalMetrics.avgCaseLength = skuCount > 0 ? dimensionalMetrics.avgCaseLength / skuCount : 0;

                  // Store dimensional data for capacity calculations
                  networkFootprintData.dimensionalData = {
                    avgCasesPerPallet,
                    avgUnitsPerCase,
                    totalUnits,
                    estimatedPalletCount,
                    skuCount,
                    ...dimensionalMetrics
                  };

                  addLog(`📊 DIMENSIONAL ANALYSIS: Processed ${skuCount} SKUs`);
                  addLog(`📦 Average Cases/Pallet: ${avgCasesPerPallet.toFixed(1)}`);
                  addLog(`📦 Average Units/Case: ${avgUnitsPerCase.toFixed(1)}`);
                  addLog(`🏗️ Estimated Pallet Count: ${estimatedPalletCount.toLocaleString()}`);
                  addLog(`📏 Total Cubic Feet: ${dimensionalMetrics.totalCubicFeet.toFixed(0)}`);

                  extractedAmount = 0; // No dollar value from dimensional data
                  targetColumn = 'Dimensional Data (Pallet Calculations)';

                } else {
                  // Original Data Dump processing logic
                  addLog(`📊 PROCESSING DATA DUMP: Extracting inventory values`);
                }

                // Extract from Columns A (match), M (avg cost), Q (quantity), S (value)
                const extractFromNetworkColumn = (columnLetter: string): { total: number, count: number } => {
                  let targetColumn = '';

                  // Find the actual column in the data
                  if (columnLetter === 'A') {
                    targetColumn = sheetData.columnHeaders[0]; // Column A is first column
                  } else if (columnLetter === 'M') {
                    targetColumn = sheetData.columnHeaders.find(col =>
                      col === 'M' || col.toLowerCase().includes('average cost') || col.toLowerCase().includes('avg cost')
                    ) || sheetData.columnHeaders[12]; // M is 13th column (0-indexed = 12)
                  } else if (columnLetter === 'Q') {
                    targetColumn = sheetData.columnHeaders.find(col =>
                      col === 'Q' || col.toLowerCase().includes('on hand quantity') || col.toLowerCase().includes('quantity')
                    ) || sheetData.columnHeaders[16]; // Q is 17th column (0-indexed = 16)
                  } else if (columnLetter === 'S') {
                    targetColumn = sheetData.columnHeaders.find(col =>
                      col === 'S' || col.toLowerCase().includes('on hand value') || col.toLowerCase().includes('current value')
                    ) || sheetData.columnHeaders[18]; // S is 19th column (0-indexed = 18)
                  }

                  if (!targetColumn) return { total: 0, count: 0 };

                  let total = 0;
                  let count = 0;
                  for (const row of sheetData.data) {
                    if (row && row[targetColumn]) {
                      const numValue = parseFloat(String(row[targetColumn]).replace(/[$,\s]/g, ''));
                      if (!isNaN(numValue) && numValue > 0) {
                        total += numValue;
                        count++;
                      }
                    }
                  }

                  addLog(`    📍 Column ${columnLetter} (${targetColumn}): ${total.toLocaleString()} from ${count} rows`);
                  return { total, count };
                };

                const avgCostData = extractFromNetworkColumn('M');
                const quantityData = extractFromNetworkColumn('Q');
                const valueData = extractFromNetworkColumn('S');

                networkFootprintData.averageCost = avgCostData.count > 0 ? avgCostData.total / avgCostData.count : 0;
                networkFootprintData.totalOnHandQuantity = quantityData.total;
                networkFootprintData.totalOnHandValue = valueData.total;
                networkFootprintData.tab = sheetName;
                networkFootprintData.skuCount = Math.max(avgCostData.count, quantityData.count, valueData.count);

                extractedAmount = networkFootprintData.totalOnHandValue || 0;
                targetColumn = 'Network Data (Column S - On Hand Value)';

                addLog(`🎯 NETWORK FOOTPRINT ${sheetName}: Total on hand value $${extractedAmount.toLocaleString()}`);
                addLog(`📦 On hand quantity (Column Q): ${networkFootprintData.totalOnHandQuantity?.toLocaleString() || 0}`);
                addLog(`💰 Average cost (Column M): $${networkFootprintData.averageCost?.toFixed(2) || 0}`);
                addLog(`📊 SKU count: ${networkFootprintData.skuCount || 0}`);

              } catch (networkError) {
                addLog(`⚠️ Network footprint extraction error: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`);
                networkFootprintData.totalOnHandValue = 0;
              }
            } else {
              addLog(`⏭️ SKIPPING TAB: ${sheetName} (only processing Data Dump tab)`);
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
          operatingCosts: fileType === 'WAREHOUSE_BUDGET' ? operatingCosts : undefined,
          productivityMetrics: fileType === 'PRODUCTION_TRACKER' ? productivityMetrics : undefined,
          inventoryMetrics: fileType === 'INVENTORY_TRACKER' ? inventoryMetrics : undefined,
          salesData: fileType === 'SALES_DATA' ? salesData : undefined,
          networkFootprintData: fileType === 'NETWORK_FOOTPRINT' ? networkFootprintData : undefined
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
            operatingCosts: fileType === 'WAREHOUSE_BUDGET' ? operatingCosts : undefined,
            productivityMetrics: fileType === 'PRODUCTION_TRACKER' ? productivityMetrics : undefined,
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

        if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
            file.type.includes('csv') || file.name.endsWith('.csv')) {
          try {
            // Add small delay to improve UI responsiveness
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            let processed;
            if (file.name.endsWith('.csv') || file.type.includes('csv')) {
              processed = await processCsvFile(file);
            } else {
              processed = await processExcelFile(file);
            }
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
          addLog(`⚠ Skipping ${file.name} - not an Excel or CSV file`);
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

                        {/* Show inventory metrics if available */}
                        {tab.inventoryMetrics && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-sm text-gray-700">
                              <div className="font-medium mb-2">📦 Inventory Analysis:</div>
                              <div className="space-y-1">
                                <div>• <strong>Total Inventory:</strong> {formatCurrency(tab.inventoryMetrics.totalInventoryDollars || 0)}</div>
                                {tab.inventoryMetrics.daysSupply && (
                                  <div>• <strong>Days Supply:</strong> {tab.inventoryMetrics.daysSupply.toFixed(1)} days</div>
                                )}
                                {tab.inventoryMetrics.inventoryTurnover && (
                                  <div>• <strong>Annual Turnover:</strong> {tab.inventoryMetrics.inventoryTurnover.toFixed(2)}x</div>
                                )}
                                {tab.inventoryMetrics.categories && (
                                  <div className="mt-2">
                                    <div className="font-medium">Categories:</div>
                                    {tab.inventoryMetrics.categories.rawMaterials && (
                                      <div className="ml-2">- Raw Materials: {formatCurrency(tab.inventoryMetrics.categories.rawMaterials)}</div>
                                    )}
                                    {tab.inventoryMetrics.categories.workInProgress && (
                                      <div className="ml-2">- Work in Progress: {formatCurrency(tab.inventoryMetrics.categories.workInProgress)}</div>
                                    )}
                                    {tab.inventoryMetrics.categories.finishedGoods && (
                                      <div className="ml-2">- Finished Goods: {formatCurrency(tab.inventoryMetrics.categories.finishedGoods)}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 space-y-4">
            {/* Warehouse Operating Costs */}
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-900">🔒 LOCKED Warehouse Operating Costs 2025:</span>
                <span className="font-bold text-xl text-green-900">
                  {formatCurrency(files.filter(f => f.fileType === 'WAREHOUSE_BUDGET').reduce((sum, f) => sum + f.totalExtracted, 0))}
                </span>
              </div>
              {files.some(f => f.fileType === 'WAREHOUSE_BUDGET' && f.totalExtracted > 0) && (
                <div className="mt-3 text-sm text-green-700 bg-green-100 p-3 rounded">
                  <div className="font-medium mb-1">✅ Operating Cost Categories Locked:</div>
                  <div className="space-y-1">
                    <div>• <strong>Labor Costs:</strong> $3,330,436 (Wages, Benefits, Temp)</div>
                    <div>• <strong>OPEX:</strong> $676,300 (Supplies, Equipment, Telecom)</div>
                    <div>• <strong>Lease/Rent:</strong> $693,068</div>
                    <div>• <strong>OTHER OPEX*:</strong> $2,868,399 (*3PL Services)</div>
                  </div>
                </div>
              )}
            </div>

            {/* Inventory Baseline */}
            {files.some(f => f.fileType === 'INVENTORY_TRACKER') && (
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">📦 Inventory Baseline:</span>
                  <span className="font-bold text-xl text-blue-900">
                    {formatCurrency(files.filter(f => f.fileType === 'INVENTORY_TRACKER').reduce((sum, f) => sum + f.totalExtracted, 0))}
                  </span>
                </div>
                <div className="mt-3 text-sm text-blue-700 bg-blue-100 p-3 rounded">
                  <div className="font-medium mb-1">📊 Inventory Metrics:</div>
                  {files.filter(f => f.fileType === 'INVENTORY_TRACKER').map((file, idx) =>
                    file.tabs.filter(tab => tab.inventoryMetrics).map((tab, tabIdx) => (
                      <div key={`${idx}-${tabIdx}`} className="space-y-1">
                        <div>• <strong>Total Inventory Dollars:</strong> {formatCurrency(tab.inventoryMetrics?.totalInventoryDollars || 0)}</div>
                        {tab.inventoryMetrics?.daysSupply && (
                          <div>• <strong>Days Supply vs Sales:</strong> {tab.inventoryMetrics.daysSupply.toFixed(1)} days</div>
                        )}
                        {tab.inventoryMetrics?.inventoryTurnover && (
                          <div>• <strong>Annual Turnover Rate:</strong> {tab.inventoryMetrics.inventoryTurnover.toFixed(2)}x</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Combined Total */}
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">🎯 Total Warehouse Baseline (Operating + Inventory):</span>
                <span className="font-bold text-xl text-gray-900">
                  {formatCurrency(files.reduce((sum, f) => sum + f.totalExtracted, 0))}
                </span>
              </div>
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
