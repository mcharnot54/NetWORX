"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Navigation from "@/components/Navigation";
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
} from "lucide-react";

interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sheets?: string[];
  selectedSheet?: string;
  detectedType?: string;
  file?: File;
  parsedData?: any[];
  columnNames?: string[];
}

interface ProcessingConfig {
  dataType: string;
  autoDetectType: boolean;
  validateSchema: boolean;
  convertUnits: boolean;
  fillMissingValues: boolean;
  removeOutliers: boolean;
  cleanColumnNames: boolean;
  backupOriginal: boolean;
  outputFormat: "excel" | "csv" | "json";
  csvEncoding: "utf-8" | "latin-1" | "cp1252";
  maxFileSizeMB: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

interface DataQuality {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityRate: number;
  errors: string[];
  warnings: string[];
  columnStats: any[];
  validationResult: ValidationResult;
}

interface ValidationRules {
  requiredColumns: string[];
  numericColumns: string[];
  positiveColumns: string[];
  stringColumns?: string[];
  yearRange?: [number, number];
  coordinateRanges?: { [key: string]: [number, number] };
}

export default function DataProcessor() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [config, setConfig] = useState<ProcessingConfig>({
    dataType: "auto",
    autoDetectType: true,
    validateSchema: true,
    convertUnits: true,
    fillMissingValues: false,
    removeOutliers: false,
    cleanColumnNames: true,
    backupOriginal: true,
    outputFormat: "csv",
    csvEncoding: "utf-8",
    maxFileSizeMB: 100,
  });
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [conversionResults, setConversionResults] = useState<any>(null);
  const [actualFileData, setActualFileData] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Column mappings matching Python DataConverter
  const columnMappings: any = {
    forecast: {
      year: ["year", "yr", "period", "time", "fiscal_year", "fy"],
      annual_units: [
        "annual_units",
        "units",
        "volume",
        "demand",
        "quantity",
        "annual_volume",
        "yearly_units",
        "total_units",
      ],
    },
    sku: {
      sku_id: [
        "sku_id",
        "sku",
        "item_id",
        "product_id",
        "part_number",
        "item_number",
      ],
      units_per_case: [
        "units_per_case",
        "units_case",
        "case_pack",
        "pack_size",
        "units_per_pack",
        "each_per_case",
      ],
      cases_per_pallet: [
        "cases_per_pallet",
        "case_pallet",
        "pallet_quantity",
        "cases_per_layer",
        "case_per_pallet",
      ],
      annual_volume: [
        "annual_volume",
        "yearly_volume",
        "annual_units",
        "total_volume",
        "volume_per_year",
      ],
    },
    network: {
      city: [
        "city",
        "location",
        "facility",
        "destination",
        "site",
        "warehouse",
      ],
      latitude: ["latitude", "lat", "y_coord", "y_coordinate"],
      longitude: ["longitude", "lng", "lon", "x_coord", "x_coordinate"],
      state: ["state", "province", "region"],
      country: ["country", "nation"],
    },
  };

  // Validation rules matching Python DataValidator
  const validationRules: { [key: string]: ValidationRules } = {
    forecast: {
      requiredColumns: ["year", "annual_units"],
      numericColumns: ["year", "annual_units"],
      positiveColumns: ["annual_units"],
      yearRange: [2020, 2050],
    },
    sku: {
      requiredColumns: [
        "sku_id",
        "units_per_case",
        "cases_per_pallet",
        "annual_volume",
      ],
      numericColumns: ["units_per_case", "cases_per_pallet", "annual_volume"],
      positiveColumns: ["units_per_case", "cases_per_pallet", "annual_volume"],
      stringColumns: ["sku_id"],
    },
    network: {
      requiredColumns: ["city", "latitude", "longitude"],
      numericColumns: ["latitude", "longitude"],
      stringColumns: ["city"],
      coordinateRanges: {
        latitude: [-90, 90],
        longitude: [-180, 180],
      },
    },
  };

  const validateDataFrame = (
    data: any[],
    dataType: string,
  ): ValidationResult => {
    const rules = validationRules[dataType];
    if (!rules) {
      return {
        isValid: false,
        errors: [`Unknown data type: ${dataType}`],
        warnings: [],
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: data.length,
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const totalRecords = data.length;

    // Check required columns
    const sampleRecord = data[0] || {};
    const availableColumns = Object.keys(sampleRecord).map((col) =>
      col.toLowerCase(),
    );

    const missingColumns = rules.requiredColumns.filter(
      (col) => !availableColumns.includes(col.toLowerCase()),
    );

    if (missingColumns.length > 0) {
      errors.push(
        ...missingColumns.map((col) => `Missing required column: ${col}`),
      );
    }

    // Validate data types and ranges
    data.forEach((record, index) => {
      // Check numeric columns
      rules.numericColumns?.forEach((col) => {
        const value = record[col];
        if (value !== undefined && value !== null && isNaN(Number(value))) {
          errors.push(
            `Row ${index + 1}: '${col}' must be numeric, got '${value}'`,
          );
        }
      });

      // Check positive columns
      rules.positiveColumns?.forEach((col) => {
        const value = Number(record[col]);
        if (!isNaN(value) && value <= 0) {
          errors.push(
            `Row ${index + 1}: '${col}' must be positive, got ${value}`,
          );
        }
      });

      // Check coordinate ranges
      if (rules.coordinateRanges) {
        Object.entries(rules.coordinateRanges).forEach(([col, [min, max]]) => {
          const value = Number(record[col]);
          if (!isNaN(value) && (value < min || value > max)) {
            errors.push(
              `Row ${index + 1}: '${col}' must be between ${min} and ${max}, got ${value}`,
            );
          }
        });
      }
    });

    // Data type specific validations
    if (dataType === "forecast") {
      errors.push(...validateForecastData(data));
    } else if (dataType === "sku") {
      errors.push(...validateSkuData(data));
    } else if (dataType === "network") {
      errors.push(...validateNetworkData(data));
    }

    // Check for duplicates and missing values
    warnings.push(...checkDuplicates(data, dataType));
    warnings.push(...checkMissingValues(data, rules.requiredColumns));

    const validRecords = Math.max(0, totalRecords - errors.length);
    const invalidRecords = totalRecords - validRecords;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalRecords,
      validRecords,
      invalidRecords,
    };
  };

  const validateForecastData = (data: any[]): string[] => {
    const errors: string[] = [];
    const currentYear = new Date().getFullYear();

    data.forEach((record, index) => {
      const year = Number(record.year);

      // Check reasonable year range
      if (
        !isNaN(year) &&
        (year < currentYear - 10 || year > currentYear + 30)
      ) {
        errors.push(
          `Row ${index + 1}: Year ${year} outside reasonable range (${currentYear - 10}-${currentYear + 30})`,
        );
      }

      // Check for extreme volume values
      const volume = Number(record.annual_units);
      if (!isNaN(volume) && volume > 1000000) {
        errors.push(
          `Row ${index + 1}: Annual units ${volume} seems unusually high`,
        );
      }
    });

    return errors;
  };

  const validateSkuData = (data: any[]): string[] => {
    const errors: string[] = [];

    data.forEach((record, index) => {
      // Check SKU ID format
      const skuId = String(record.sku_id || "");
      if (skuId.length < 3) {
        errors.push(
          `Row ${index + 1}: SKU ID '${skuId}' should have at least 3 characters`,
        );
      }

      // Check units per pallet calculation
      const unitsPerCase = Number(record.units_per_case);
      const casesPerPallet = Number(record.cases_per_pallet);

      if (!isNaN(unitsPerCase) && !isNaN(casesPerPallet)) {
        const unitsPerPallet = unitsPerCase * casesPerPallet;

        if (unitsPerPallet > 10000) {
          errors.push(
            `Row ${index + 1}: Calculated units per pallet (${unitsPerPallet}) exceeds 10,000`,
          );
        }

        if (unitsPerPallet < 1) {
          errors.push(
            `Row ${index + 1}: Calculated units per pallet (${unitsPerPallet}) is less than 1`,
          );
        }
      }
    });

    return errors;
  };

  const validateNetworkData = (data: any[]): string[] => {
    const errors: string[] = [];

    data.forEach((record, index) => {
      // Check city name format
      const city = String(record.city || "");
      if (city.length < 2) {
        errors.push(
          `Row ${index + 1}: City name '${city}' should have at least 2 characters`,
        );
      }

      // Check for (0,0) coordinates
      const lat = Number(record.latitude);
      const lng = Number(record.longitude);

      if (lat === 0 && lng === 0) {
        errors.push(
          `Row ${index + 1}: Coordinates (0,0) likely indicate missing location data`,
        );
      }
    });

    return errors;
  };

  const checkDuplicates = (data: any[], dataType: string): string[] => {
    const warnings: string[] = [];

    if (dataType === "forecast") {
      const years = data.map((r) => r.year).filter((y) => y !== undefined);
      const uniqueYears = new Set(years);
      if (years.length !== uniqueYears.size) {
        warnings.push("Duplicate years found in forecast data");
      }
    } else if (dataType === "sku") {
      const skuIds = data.map((r) => r.sku_id).filter((id) => id !== undefined);
      const uniqueSkuIds = new Set(skuIds);
      if (skuIds.length !== uniqueSkuIds.size) {
        warnings.push("Duplicate SKU IDs found");
      }
    } else if (dataType === "network") {
      const cities = data.map((r) => r.city).filter((c) => c !== undefined);
      const uniqueCities = new Set(cities);
      if (cities.length !== uniqueCities.size) {
        warnings.push("Duplicate cities found in network data");
      }
    }

    return warnings;
  };

  const checkMissingValues = (
    data: any[],
    requiredColumns: string[],
  ): string[] => {
    const warnings: string[] = [];

    requiredColumns.forEach((col) => {
      const missingCount = data.filter(
        (record) =>
          record[col] === undefined ||
          record[col] === null ||
          record[col] === "",
      ).length;

      if (missingCount > 0) {
        warnings.push(`Column '${col}' has ${missingCount} missing values`);
      }
    });

    return warnings;
  };

  // DataConverter utilities matching Python implementation
  const findMatchingColumn = (
    availableColumns: string[],
    possibleNames: string[],
  ): string | null => {
    const columnsLower = availableColumns.map((col) => col.toLowerCase());

    // Exact match
    for (const possibleName of possibleNames) {
      const index = columnsLower.indexOf(possibleName.toLowerCase());
      if (index !== -1) {
        return availableColumns[index];
      }
    }

    // Partial match
    for (const possibleName of possibleNames) {
      for (const col of availableColumns) {
        if (col.toLowerCase().includes(possibleName.toLowerCase())) {
          return col;
        }
      }
    }

    return null;
  };

  const convertToStandardFormat = (data: any[], dataType: string): any => {
    const mappings = columnMappings[dataType] || {};
    const sampleRecord = data[0] || {};
    const availableColumns = Object.keys(sampleRecord);
    const mappedColumns: { [key: string]: string } = {};
    const unmappedColumns: string[] = [];
    const conversionLog: string[] = [];

    // Map columns to standard names
    for (const [standardCol, possibleNames] of Object.entries(mappings)) {
      const matchedCol = findMatchingColumn(availableColumns, possibleNames);
      if (matchedCol) {
        mappedColumns[standardCol] = matchedCol;
        conversionLog.push(`Mapped '${matchedCol}' to '${standardCol}'`);
      } else {
        conversionLog.push(
          `Warning: No match found for standard column '${standardCol}'`,
        );
      }
    }

    // Find unmapped columns
    const mappedOriginalCols = Object.values(mappedColumns);
    unmappedColumns.push(
      ...availableColumns.filter((col) => !mappedOriginalCols.includes(col)),
    );

    if (unmappedColumns.length > 0) {
      conversionLog.push(`Unmapped columns: ${unmappedColumns.join(", ")}`);
    }

    return {
      originalColumns: availableColumns,
      mappedColumns,
      unmappedColumns,
      conversionLog,
    };
  };

  const convertForecastData = (data: any[]): string[] => {
    const conversionLog: string[] = [];

    data.forEach((record, index) => {
      // Convert year to integer
      if (record.year !== undefined) {
        const yearStr = String(record.year).replace(/[^0-9]/g, "");
        const year = parseInt(yearStr);
        if (!isNaN(year)) {
          record.year = year;
        } else {
          conversionLog.push(
            `Row ${index + 1}: Invalid year value '${record.year}'`,
          );
        }
      }

      // Convert annual units - clean string values
      if (record.annual_units !== undefined) {
        let units = String(record.annual_units);
        units = units.replace(/[,$()]/g, "").replace(/\((.*)\)/, "-$1");
        const numericUnits = parseFloat(units);
        if (!isNaN(numericUnits) && numericUnits >= 0) {
          record.annual_units = numericUnits;
        } else {
          conversionLog.push(
            `Row ${index + 1}: Invalid annual units value '${record.annual_units}'`,
          );
        }
      }
    });

    conversionLog.push("Forecast data conversion completed");
    return conversionLog;
  };

  const convertSkuData = (data: any[]): string[] => {
    const conversionLog: string[] = [];

    data.forEach((record, index) => {
      // Clean SKU ID - standardize to uppercase
      if (record.sku_id !== undefined) {
        record.sku_id = String(record.sku_id).trim().toUpperCase();
      }

      // Convert numeric columns
      const numericCols = [
        "units_per_case",
        "cases_per_pallet",
        "annual_volume",
      ];

      numericCols.forEach((col) => {
        if (record[col] !== undefined) {
          let value = String(record[col]).replace(/[,$]/g, "");
          const numericValue = parseFloat(value);
          if (!isNaN(numericValue) && numericValue > 0) {
            record[col] = numericValue;
          } else {
            conversionLog.push(
              `Row ${index + 1}: Invalid ${col} value '${record[col]}'`,
            );
          }
        }
      });

      // Calculate units per pallet if not present
      if (
        record.units_per_case &&
        record.cases_per_pallet &&
        !record.units_per_pallet
      ) {
        record.units_per_pallet =
          record.units_per_case * record.cases_per_pallet;
        conversionLog.push(
          `Row ${index + 1}: Calculated units_per_pallet = ${record.units_per_pallet}`,
        );
      }
    });

    conversionLog.push("SKU data conversion completed");
    return conversionLog;
  };

  const convertNetworkData = (data: any[]): string[] => {
    const conversionLog: string[] = [];

    data.forEach((record, index) => {
      // Clean city names - title case formatting
      if (record.city !== undefined) {
        const cleanCity = String(record.city).trim();
        record.city = cleanCity
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");

        if (record.city.length < 2) {
          conversionLog.push(
            `Row ${index + 1}: City name '${record.city}' too short`,
          );
        }
      }

      // Convert coordinates to numeric
      ["latitude", "longitude"].forEach((coord) => {
        if (record[coord] !== undefined) {
          const numericCoord = parseFloat(String(record[coord]));
          if (!isNaN(numericCoord)) {
            record[coord] = numericCoord;

            // Validate coordinate ranges
            if (
              coord === "latitude" &&
              (numericCoord < -90 || numericCoord > 90)
            ) {
              conversionLog.push(
                `Row ${index + 1}: Latitude ${numericCoord} out of range (-90 to 90)`,
              );
            }
            if (
              coord === "longitude" &&
              (numericCoord < -180 || numericCoord > 180)
            ) {
              conversionLog.push(
                `Row ${index + 1}: Longitude ${numericCoord} out of range (-180 to 180)`,
              );
            }
          } else {
            conversionLog.push(
              `Row ${index + 1}: Invalid ${coord} value '${record[coord]}'`,
            );
          }
        }
      });

      // Check for (0,0) coordinates which may indicate missing data
      if (record.latitude === 0 && record.longitude === 0) {
        conversionLog.push(
          `Row ${index + 1}: Warning - (0,0) coordinates may indicate missing data`,
        );
      }
    });

    conversionLog.push("Network data conversion completed");
    return conversionLog;
  };

  const generateSampleData = (dataType: string): any[] => {
    // Generate realistic sample data for testing validation
    if (dataType === "forecast") {
      return [
        { year: 2024, annual_units: 125000 },
        { year: 2025, annual_units: 130000 },
        { year: 2026, annual_units: 135000 },
        { year: "invalid", annual_units: 140000 }, // Invalid year for testing
        { year: 2028, annual_units: -5000 }, // Negative units for testing
      ];
    } else if (dataType === "sku") {
      return [
        {
          sku_id: "ABC123",
          units_per_case: 24,
          cases_per_pallet: 40,
          annual_volume: 50000,
        },
        {
          sku_id: "DEF456",
          units_per_case: 12,
          cases_per_pallet: 80,
          annual_volume: 75000,
        },
        {
          sku_id: "GH",
          units_per_case: 6,
          cases_per_pallet: 120,
          annual_volume: 30000,
        }, // Short SKU ID
        {
          sku_id: "IJK789",
          units_per_case: 500,
          cases_per_pallet: 25,
          annual_volume: 60000,
        }, // High units per pallet
        {
          sku_id: "LMN012",
          units_per_case: 0,
          cases_per_pallet: 40,
          annual_volume: 45000,
        }, // Zero units per case
      ];
    } else {
      // network
      return [
        { city: "New York", latitude: 40.7128, longitude: -74.006 },
        { city: "Chicago", latitude: 41.8781, longitude: -87.6298 },
        { city: "Los Angeles", latitude: 34.0522, longitude: -118.2437 },
        { city: "X", latitude: 29.7604, longitude: -95.3698 }, // Short city name
        { city: "Houston", latitude: 0, longitude: 0 }, // Invalid coordinates
        { city: "Phoenix", latitude: 91, longitude: -112.074 }, // Invalid latitude
      ];
    }
  };

  const generateColumnStats = (data: any[], dataType: string): any[] => {
    if (data.length === 0) return [];

    const sampleRecord = data[0];
    const columns = Object.keys(sampleRecord);

    return columns.map((col) => {
      const values = data
        .map((record) => record[col])
        .filter((val) => val !== undefined && val !== null && val !== "");
      const numericValues = values
        .filter((val) => !isNaN(Number(val)))
        .map((val) => Number(val));
      const missing = data.length - values.length;

      const stats: any = {
        name: col,
        type: numericValues.length === values.length ? "numeric" : "string",
        missing,
        unique: new Set(values).size,
      };

      if (numericValues.length > 0) {
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);
        stats.avg =
          Math.round(
            (numericValues.reduce((a, b) => a + b, 0) / numericValues.length) *
              100,
          ) / 100;
      }

      return stats;
    });
  };

  const parseFileContent = async (fileData: FileData): Promise<any[]> => {
    if (!fileData.file) return [];

    try {
      if (fileData.file.name.endsWith(".csv")) {
        return await parseCSVFile(fileData.file);
      } else if (
        fileData.file.name.endsWith(".xlsx") ||
        fileData.file.name.endsWith(".xls")
      ) {
        return await parseExcelFile(
          fileData.file,
          fileData.selectedSheet || "Sheet1",
        );
      }
      return [];
    } catch (error) {
      addToLog(`Error parsing file ${fileData.file.name}: ${error}`);
      throw error;
    }
  };

  const parseCSVFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim());

          if (lines.length === 0) {
            resolve([]);
            return;
          }

          // Parse CSV with basic comma separation (handles quoted fields)
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];

              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const headers = parseCSVLine(lines[0]).map((h) =>
            h.replace(/"/g, "").trim(),
          );
          const cleanHeaders = headers.map((header) => cleanColumnName(header));

          const data = lines
            .slice(1)
            .map((line) => {
              const values = parseCSVLine(line);
              const row: any = {};

              cleanHeaders.forEach((header, index) => {
                let value = values[index] || "";
                value = value.replace(/"/g, "").trim();

                // Try to convert to number if it looks numeric
                if (value && !isNaN(Number(value)) && value !== "") {
                  row[header] = Number(value);
                } else {
                  row[header] = value;
                }
              });

              return row;
            })
            .filter((row) => {
              // Filter out completely empty rows
              return Object.values(row).some(
                (value) =>
                  value !== "" && value !== null && value !== undefined,
              );
            });

          addToLog(
            `Parsed CSV file: ${data.length} rows, ${cleanHeaders.length} columns`,
          );
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const parseExcelFile = async (
    file: File,
    sheetName: string,
  ): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          if (!workbook.SheetNames.includes(sheetName)) {
            sheetName = workbook.SheetNames[0];
          }

          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            resolve([]);
            return;
          }

          // Extract headers and clean them
          const headers = (jsonData[0] as any[]).map((h: any) =>
            cleanColumnName(String(h || "").trim()),
          );

          // Convert remaining rows to objects
          const data = (jsonData.slice(1) as any[][])
            .map((row) => {
              const rowObj: any = {};
              headers.forEach((header, index) => {
                let value = row[index];

                // Handle Excel date values
                if (
                  typeof value === "number" &&
                  value > 25569 &&
                  value < 50000
                ) {
                  // Likely a date serial number
                  const date = XLSX.SSF.parse_date_code(value);
                  if (date) {
                    value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
                  }
                }

                // Clean string values
                if (typeof value === "string") {
                  value = value.trim();
                }

                rowObj[header] = value;
              });
              return rowObj;
            })
            .filter((row) => {
              // Filter out completely empty rows
              return Object.values(row).some(
                (value) =>
                  value !== "" && value !== null && value !== undefined,
              );
            });

          addToLog(
            `Parsed Excel file (${sheetName}): ${data.length} rows, ${headers.length} columns`,
          );
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read Excel file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const cleanColumnName = (columnName: string): string => {
    if (!columnName || columnName.trim() === "") {
      return "unnamed_column";
    }

    // Convert to string and clean
    let cleanName = String(columnName).trim();

    // Remove special characters and replace with underscores
    cleanName = cleanName.replace(/[^\w\s]/g, "_");

    // Replace multiple spaces/underscores with single underscore
    cleanName = cleanName.replace(/[\s_]+/g, "_");

    // Convert to lowercase
    cleanName = cleanName.toLowerCase();

    // Remove leading/trailing underscores
    cleanName = cleanName.replace(/^_+|_+$/g, "");

    return cleanName || "unnamed_column";
  };

  const autoDetectDataType = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes("forecast") || name.includes("demand")) return "forecast";
    if (name.includes("sku") || name.includes("product")) return "sku";
    if (name.includes("network") || name.includes("location")) return "network";
    if (name.includes("cost") || name.includes("rate")) return "cost";
    if (name.includes("capacity") || name.includes("warehouse"))
      return "capacity";
    return "unknown";
  };

  const autoDetectDataTypeFromColumns = (columnNames: string[]): string => {
    const columns = columnNames.join(" ").toLowerCase();

    if (
      columns.includes("year") &&
      (columns.includes("forecast") ||
        columns.includes("demand") ||
        columns.includes("units"))
    ) {
      return "forecast";
    }

    if (
      columns.includes("sku") ||
      (columns.includes("case") && columns.includes("pallet"))
    ) {
      return "sku";
    }

    if (
      (columns.includes("city") || columns.includes("location")) &&
      (columns.includes("latitude") || columns.includes("longitude"))
    ) {
      return "network";
    }

    return "unknown";
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const uploadedFiles = Array.from(event.target.files || []);
    setParseError(null);

    const filePromises = uploadedFiles.map(async (file) => {
      try {
        let sheets: string[] | undefined;
        let columnNames: string[] = [];

        // For Excel files, detect actual sheets
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer);
          sheets = workbook.SheetNames;
        }

        const fileData: FileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file,
          sheets,
          selectedSheet: sheets ? sheets[0] : undefined,
          detectedType: autoDetectDataType(file.name),
          columnNames,
        };

        // Parse the file immediately to get column names
        const parsedData = await parseFileContent(fileData);
        if (parsedData.length > 0) {
          fileData.columnNames = Object.keys(parsedData[0]);
          fileData.parsedData = parsedData;
        }

        return fileData;
      } catch (error) {
        addToLog(`Error processing file ${file.name}: ${error}`);
        setParseError(`Error processing file ${file.name}: ${error}`);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          file,
          detectedType: autoDetectDataType(file.name),
        };
      }
    });

    const fileData = await Promise.all(filePromises);
    setFiles(fileData);
    addToLog(`Uploaded and parsed ${fileData.length} file(s)`);
  };

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // Create a fake event to reuse the existing upload logic
      const fakeEvent = {
        target: { files: droppedFiles },
      } as any;
      await handleFileUpload(fakeEvent);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      addToLog("ERROR: No files uploaded for validation");
      return;
    }

    setProcessing(true);
    addToLog("Starting comprehensive data processing pipeline...");

    try {
      const firstFile = files[0];
      addToLog(`Processing file: ${firstFile.name}`);
      addToLog(`File size: ${formatFileSize(firstFile.size)}`);
      addToLog(`Initial detected type: ${firstFile.detectedType}`);

      // Step 1: Validate file existence and size
      addToLog("✓ Validating file existence and size");
      if (firstFile.size > config.maxFileSizeMB * 1024 * 1024) {
        addToLog(`ERROR: File size exceeds ${config.maxFileSizeMB}MB limit`);
        setProcessing(false);
        return;
      }

      // Step 2: Parse file content
      addToLog("📄 Reading and parsing file content...");
      let actualData: any[];

      if (firstFile.parsedData && firstFile.parsedData.length > 0) {
        actualData = firstFile.parsedData;
        addToLog(`✓ Using pre-parsed data: ${actualData.length} records`);
      } else {
        actualData = await parseFileContent(firstFile);
        addToLog(`✓ Parsed file content: ${actualData.length} records`);
      }

      if (actualData.length === 0) {
        addToLog("WARNING: No data found in file");
        setProcessing(false);
        return;
      }

      // Step 3: Auto-detect data type from column structure
      const columnBasedType = autoDetectDataTypeFromColumns(
        Object.keys(actualData[0]),
      );
      const finalDataType =
        columnBasedType !== "unknown"
          ? columnBasedType
          : firstFile.detectedType || "network";
      addToLog(
        `✓ Data type detection: ${finalDataType} (from ${columnBasedType !== "unknown" ? "columns" : "filename"})`,
      );

      // Update actual data for use in preview
      setActualFileData(actualData);

      // Step 4: Column mapping and standardization
      addToLog("🔄 Mapping columns to standard format (DataConverter)...");
      const conversionResult = convertToStandardFormat(
        actualData,
        finalDataType,
      );
      setConversionResults(conversionResult);
      addToLog(
        `✓ Column mapping completed: ${Object.keys(conversionResult.mappedColumns).length} columns mapped`,
      );

      // Step 5: Apply data conversions
      addToLog("🧹 Applying data type specific conversions...");
      let conversionLog: string[] = [];

      if (finalDataType === "forecast") {
        conversionLog = convertForecastData(actualData);
      } else if (finalDataType === "sku") {
        conversionLog = convertSkuData(actualData);
      } else if (finalDataType === "network") {
        conversionLog = convertNetworkData(actualData);
      }

      conversionLog.forEach((log) => addToLog(`  ${log}`));

      // Step 6: Run comprehensive validation
      addToLog("🔍 Running comprehensive validation (DataValidator)...");
      const validationResult = validateDataFrame(actualData, finalDataType);

      addToLog(
        `✓ Validation completed: ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`,
      );

      // Step 7: Generate quality metrics
      addToLog("📊 Generating quality metrics...");
      const columnStats = generateColumnStats(actualData, finalDataType);

      const qualityRate =
        validationResult.totalRecords > 0
          ? (validationResult.validRecords / validationResult.totalRecords) *
            100
          : 0;

      setDataQuality({
        totalRecords: validationResult.totalRecords,
        validRecords: validationResult.validRecords,
        invalidRecords: validationResult.invalidRecords,
        qualityRate: Math.round(qualityRate * 10) / 10,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        validationResult,
        columnStats,
      });

      // Step 8: Summary
      if (validationResult.isValid) {
        addToLog(
          "✅ All validation checks passed - Data is ready for processing",
        );
      } else {
        addToLog(
          `⚠️  Validation found ${validationResult.errors.length} critical issues that need attention`,
        );
      }

      addToLog("🎯 Data processing pipeline completed successfully");
    } catch (error) {
      addToLog(`❌ Error during processing: ${error}`);
      setParseError(`Processing failed: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDataTypeColor = (type: string) => {
    const colors: any = {
      forecast: "#3b82f6",
      sku: "#10b981",
      network: "#f59e0b",
      cost: "#ef4444",
      capacity: "#8b5cf6",
      unknown: "#6b7280",
    };
    return colors[type] || "#6b7280";
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <h2 className="card-title">Advanced Data Processor</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Excel/CSV processing with comprehensive validation framework.
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={handleProcess}
              disabled={files.length === 0 || processing}
            >
              {processing && <div className="loading-spinner"></div>}
              <Play size={16} />
              {processing ? "Processing..." : "Run Validation"}
            </button>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className={`button ${activeTab === "upload" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("upload")}
              >
                <Upload size={16} />
                File Upload
              </button>
              <button
                className={`button ${activeTab === "config" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("config")}
              >
                <Settings size={16} />
                Validation Config
              </button>
              <button
                className={`button ${activeTab === "preview" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("preview")}
              >
                <Eye size={16} />
                Data Preview
              </button>
              <button
                className={`button ${activeTab === "conversion" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("conversion")}
              >
                <Database size={16} />
                Data Conversion
              </button>
              <button
                className={`button ${activeTab === "quality" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("quality")}
              >
                <BarChart3 size={16} />
                Validation Report
              </button>
            </div>
          </div>

          {activeTab === "upload" && (
            <div className="grid grid-cols-2">
              <div>
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  File Upload & Auto-Detection
                </h3>
                <div
                  className="file-upload"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload
                    size={48}
                    style={{ color: "#6b7280", margin: "0 auto 1rem" }}
                  />
                  <p style={{ marginBottom: "1rem", color: "#374151" }}>
                    Drop Excel/CSV files here or click to upload
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    style={{
                      opacity: 0,
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      cursor: "pointer",
                    }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Max file size: {config.maxFileSizeMB}MB | Auto-detects:
                    forecast, sku, network, cost, capacity
                  </p>
                </div>

                {files.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <h4 style={{ marginBottom: "0.5rem", color: "#111827" }}>
                      Files with Auto-Detection:
                    </h4>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "0.75rem",
                          backgroundColor:
                            selectedFile === index ? "#eff6ff" : "#f9fafb",
                          borderRadius: "0.375rem",
                          marginBottom: "0.5rem",
                          border:
                            selectedFile === index
                              ? "1px solid #3b82f6"
                              : "1px solid #e5e7eb",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedFile(index)}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <FileText size={16} style={{ color: "#6b7280" }} />
                          <span
                            style={{
                              flex: 1,
                              fontSize: "0.875rem",
                              fontWeight: "500",
                            }}
                          >
                            {file.name}
                          </span>
                          <span
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {formatFileSize(file.size)}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              backgroundColor: getDataTypeColor(
                                file.detectedType || "unknown",
                              ),
                              color: "white",
                              fontSize: "0.6rem",
                            }}
                          >
                            {file.detectedType?.toUpperCase() || "UNKNOWN"}
                          </span>

                          {file.sheets && (
                            <select
                              value={file.selectedSheet}
                              onChange={(e) => {
                                const updated = [...files];
                                updated[index].selectedSheet = e.target.value;
                                setFiles(updated);
                              }}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {file.sheets.map((sheet) => (
                                <option key={sheet} value={sheet}>
                                  {sheet}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Processing Log
                </h3>
                <div
                  style={{
                    backgroundColor: "#1f2937",
                    color: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    height: "300px",
                    overflowY: "auto",
                    border: "1px solid #374151",
                  }}
                >
                  {processingLog.length === 0 ? (
                    <div
                      style={{
                        color: "#6b7280",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Comprehensive validation log will appear here...
                    </div>
                  ) : (
                    processingLog.map((log, index) => (
                      <div
                        key={index}
                        style={{ marginBottom: "0.25rem", color: "#10b981" }}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "config" && (
            <div>
              {parseError && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #ef4444",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <AlertCircle size={20} style={{ color: "#ef4444" }} />
                    <span style={{ fontWeight: "600", color: "#dc2626" }}>
                      File Processing Error
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#dc2626",
                      margin: 0,
                    }}
                  >
                    {parseError}
                  </p>
                </div>
              )}

              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Validation Configuration
              </h3>
              <div className="grid grid-cols-3">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Forecast Validation
                  </h4>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      color: "#6b7280",
                    }}
                  >
                    Required: year, annual_units
                    <br />
                    Numeric: year, annual_units
                    <br />
                    Positive: annual_units
                    <br />
                    Year Range: 2020-2050
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Year Range Validation
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Volume Outlier Detection
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Duplicate Year Check
                    </label>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    SKU Validation
                  </h4>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      color: "#6b7280",
                    }}
                  >
                    Required: sku_id, units_per_case, cases_per_pallet,
                    annual_volume
                    <br />
                    String: sku_id
                    <br />
                    Positive: all numeric fields
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      SKU ID Format Check
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Units per Pallet Validation
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Duplicate SKU Check
                    </label>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Network Validation
                  </h4>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      marginBottom: "1rem",
                      color: "#6b7280",
                    }}
                  >
                    Required: city, latitude, longitude
                    <br />
                    Numeric: latitude, longitude
                    <br />
                    Coordinate Ranges: lat(-90,90), lng(-180,180)
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Coordinate Range Check
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      City Name Format Check
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Zero Coordinate Detection
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Data Preview
              </h3>

              {actualFileData.length > 0 && (
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #10b981",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <CheckCircle size={20} style={{ color: "#10b981" }} />
                    <span style={{ fontWeight: "600", color: "#065f46" }}>
                      Real File Data Preview
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#065f46",
                      margin: 0,
                    }}
                  >
                    Showing actual parsed data from your uploaded file.{" "}
                    {actualFileData.length} records loaded.
                  </p>
                </div>
              )}
              {selectedFile !== null && files[selectedFile] ? (
                <div>
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.375rem",
                    }}
                  >
                    <h4 style={{ marginBottom: "0.5rem" }}>
                      File: {files[selectedFile].name}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      <span>Type: {files[selectedFile].detectedType}</span>
                      <span>
                        Sheet: {files[selectedFile].selectedSheet || "N/A"}
                      </span>
                      <span>
                        Size: {formatFileSize(files[selectedFile].size)}
                      </span>
                      <span>
                        Validation Rules:{" "}
                        {validationRules[
                          files[selectedFile].detectedType || "network"
                        ]
                          ? "Available"
                          : "Generic"}
                      </span>
                    </div>
                  </div>

                  {actualFileData.length > 0 ? (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.875rem",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f3f4f6" }}>
                            {Object.keys(actualFileData[0]).map(
                              (header, index) => (
                                <th
                                  key={index}
                                  style={{
                                    padding: "0.75rem",
                                    textAlign: "left",
                                    border: "1px solid #e5e7eb",
                                    fontWeight: "600",
                                  }}
                                >
                                  {header}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {actualFileData.slice(0, 10).map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {Object.values(row).map(
                                (cell: any, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    style={{
                                      padding: "0.75rem",
                                      border: "1px solid #e5e7eb",
                                    }}
                                  >
                                    {cell !== null && cell !== undefined
                                      ? String(cell)
                                      : ""}
                                  </td>
                                ),
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {actualFileData.length > 10 && (
                        <div
                          style={{
                            padding: "1rem",
                            textAlign: "center",
                            color: "#6b7280",
                            fontSize: "0.875rem",
                            backgroundColor: "#f9fafb",
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          Showing first 10 rows of {actualFileData.length} total
                          records
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "3rem",
                        color: "#6b7280",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.5rem",
                        border: "2px dashed #d1d5db",
                      }}
                    >
                      <Database
                        size={48}
                        style={{ margin: "0 auto 1rem", color: "#9ca3af" }}
                      />
                      <p style={{ margin: 0, fontSize: "1rem" }}>
                        No data available
                      </p>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
                        Upload a file and run validation to see parsed data
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  Select a file from the upload tab to preview its data
                </div>
              )}
            </div>
          )}

          {activeTab === "conversion" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Data Conversion & Standardization
              </h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Standardize different input formats with automatic column
                mapping and data type conversion
              </p>

              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Column Mapping Configuration
                  </h4>

                  <div style={{ marginBottom: "1rem" }}>
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: "#111827",
                        fontSize: "0.875rem",
                      }}
                    >
                      Forecast Data Mappings:
                    </h5>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        fontFamily: "monospace",
                        backgroundColor: "#f9fafb",
                        padding: "0.5rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      year: {columnMappings.forecast.year.join(", ")}
                      <br />
                      annual_units:{" "}
                      {columnMappings.forecast.annual_units.join(", ")}
                    </div>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: "#111827",
                        fontSize: "0.875rem",
                      }}
                    >
                      SKU Data Mappings:
                    </h5>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        fontFamily: "monospace",
                        backgroundColor: "#f9fafb",
                        padding: "0.5rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      sku_id: {columnMappings.sku.sku_id.join(", ")}
                      <br />
                      units_per_case:{" "}
                      {columnMappings.sku.units_per_case.join(", ")}
                      <br />
                      cases_per_pallet:{" "}
                      {columnMappings.sku.cases_per_pallet.join(", ")}
                    </div>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: "#111827",
                        fontSize: "0.875rem",
                      }}
                    >
                      Network Data Mappings:
                    </h5>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        fontFamily: "monospace",
                        backgroundColor: "#f9fafb",
                        padding: "0.5rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      city: {columnMappings.network.city.join(", ")}
                      <br />
                      latitude: {columnMappings.network.latitude.join(", ")}
                      <br />
                      longitude: {columnMappings.network.longitude.join(", ")}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Conversion Rules
                  </h4>

                  <div style={{ marginBottom: "1rem" }}>
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: "#10b981",
                        fontSize: "0.875rem",
                      }}
                    >
                      ✓ Forecast Conversions:
                    </h5>
                    <ul
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        listStyle: "none",
                        paddingLeft: "1rem",
                      }}
                    >
                      <li>• Convert year to integer format</li>
                      <li>
                        • Clean annual units (remove $, commas, parentheses)
                      </li>
                      <li>• Handle negative values in parentheses</li>
                      <li>• Sort data by year ascending</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: "#3b82f6",
                        fontSize: "0.875rem",
                      }}
                    >
                      ✓ SKU Conversions:
                    </h5>
                    <ul
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        listStyle: "none",
                        paddingLeft: "1rem",
                      }}
                    >
                      <li>• Standardize SKU IDs to uppercase</li>
                      <li>• Clean numeric fields (remove $, commas)</li>
                      <li>• Calculate units per pallet automatically</li>
                      <li>• Remove duplicate SKUs (keep first)</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <h5
                      style={{
                        marginBottom: "0.5rem",
                        color: "#f59e0b",
                        fontSize: "0.875rem",
                      }}
                    >
                      ✓ Network Conversions:
                    </h5>
                    <ul
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        listStyle: "none",
                        paddingLeft: "1rem",
                      }}
                    >
                      <li>• Format city names to Title Case</li>
                      <li>• Validate coordinate ranges</li>
                      <li>• Convert coordinates to numeric</li>
                      <li>• Detect missing location data (0,0)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {conversionResults && (
                <div className="card" style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Conversion Results
                  </h4>

                  <div className="grid grid-cols-3">
                    <div>
                      <h5
                        style={{
                          marginBottom: "0.5rem",
                          color: "#111827",
                          fontSize: "0.875rem",
                        }}
                      >
                        Original Columns:
                      </h5>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {conversionResults.originalColumns.map(
                          (col: string, index: number) => (
                            <div
                              key={index}
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "#f3f4f6",
                                borderRadius: "0.25rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              {col}
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <h5
                        style={{
                          marginBottom: "0.5rem",
                          color: "#111827",
                          fontSize: "0.875rem",
                        }}
                      >
                        Column Mappings:
                      </h5>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {Object.entries(conversionResults.mappedColumns).map(
                          (
                            [standard, original]: [string, any],
                            index: number,
                          ) => (
                            <div
                              key={index}
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: "#eff6ff",
                                borderRadius: "0.25rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              {original} → {standard}
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div>
                      <h5
                        style={{
                          marginBottom: "0.5rem",
                          color: "#111827",
                          fontSize: "0.875rem",
                        }}
                      >
                        Conversion Log:
                      </h5>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {conversionResults.conversionLog.map(
                          (log: string, index: number) => (
                            <div
                              key={index}
                              style={{
                                padding: "0.25rem 0.5rem",
                                backgroundColor: log.includes("Warning")
                                  ? "#fef3c7"
                                  : "#f0fdf4",
                                borderRadius: "0.25rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              {log}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!conversionResults && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  Run data processing to see conversion results and column
                  mappings
                </div>
              )}
            </div>
          )}

          {activeTab === "quality" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Comprehensive Validation Report
              </h3>
              {dataQuality ? (
                <div>
                  <div
                    className="grid grid-cols-4"
                    style={{ marginBottom: "1.5rem" }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0f9ff",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#3b82f6",
                        }}
                      >
                        {dataQuality.totalRecords}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Records</div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: dataQuality.validationResult.isValid
                          ? "#f0fdf4"
                          : "#fef2f2",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: dataQuality.validationResult.isValid
                            ? "#10b981"
                            : "#ef4444",
                        }}
                      >
                        {dataQuality.validationResult.isValid ? "✓" : "✗"}
                      </div>
                      <div style={{ color: "#6b7280" }}>Validation Status</div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#10b981",
                        }}
                      >
                        {dataQuality.qualityRate}%
                      </div>
                      <div style={{ color: "#6b7280" }}>Quality Rate</div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#fef2f2",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#ef4444",
                        }}
                      >
                        {dataQuality.errors.length}
                      </div>
                      <div style={{ color: "#6b7280" }}>Critical Errors</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Validation Issues
                      </h4>
                      <div style={{ marginBottom: "1rem" }}>
                        <h5
                          style={{
                            color: "#ef4444",
                            fontSize: "0.875rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Errors ({dataQuality.errors.length})
                        </h5>
                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {dataQuality.errors.map((error, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem",
                                backgroundColor: "#fef2f2",
                                borderRadius: "0.25rem",
                                marginBottom: "0.25rem",
                                fontSize: "0.875rem",
                              }}
                            >
                              <AlertCircle
                                size={16}
                                style={{ color: "#ef4444" }}
                              />
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5
                          style={{
                            color: "#f59e0b",
                            fontSize: "0.875rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Warnings ({dataQuality.warnings.length})
                        </h5>
                        <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                          {dataQuality.warnings.map((warning, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.5rem",
                                backgroundColor: "#fffbeb",
                                borderRadius: "0.25rem",
                                marginBottom: "0.25rem",
                                fontSize: "0.875rem",
                              }}
                            >
                              <AlertCircle
                                size={16}
                                style={{ color: "#f59e0b" }}
                              />
                              {warning}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Column Statistics
                      </h4>
                      <div style={{ overflowY: "auto", maxHeight: "400px" }}>
                        {dataQuality.columnStats.map((col, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "0.75rem",
                              backgroundColor: "#f9fafb",
                              borderRadius: "0.375rem",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <span style={{ fontWeight: "500" }}>
                                {col.name}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#6b7280",
                                }}
                              >
                                {col.type}
                              </span>
                            </div>
                            <div
                              style={{ fontSize: "0.75rem", color: "#6b7280" }}
                            >
                              {col.missing > 0 && (
                                <span>Missing: {col.missing} | </span>
                              )}
                              {col.unique && (
                                <span>Unique: {col.unique} | </span>
                              )}
                              {col.min !== undefined && (
                                <span>
                                  Range: {col.min} - {col.max} |{" "}
                                </span>
                              )}
                              {col.avg !== undefined && (
                                <span>Avg: {col.avg}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  Run validation to view comprehensive data quality report
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
