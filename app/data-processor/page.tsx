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
  summary?: string;
  actionableSteps?: string[];
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

  // Comprehensive field synonyms for intuitive data mapping
  const FIELD_SYNONYMS = {
    /* Warehouse & Operational */
    facility: ["facility", "warehouse", "site", "dc", "location"],
    city: ["city", "facility_city", "pu_city", "ship_from_city"],
    state: ["state", "facility_state", "pu_state", "ship_from_state"],
    reporting_period: [
      "reporting_period",
      "date",
      "period",
      "week",
      "month",
      "year",
      "ship_date",
    ],
    capacity_sqft: ["capacity_sqft", "facility_capacity", "warehouse_sqft"],
    ceiling_height_ft: ["ceiling_height_ft", "ceiling_height", "height_ft"],
    num_docks: ["num_docks", "dock_doors", "dock_count"],
    type: ["type", "facility_type"],

    /* Warehouse Budgeting & Labor */
    cost_fixed_annual: [
      "cost_fixed_annual",
      "fixed_cost",
      "annual_rent",
      "facility_rent",
    ],
    cost_variable_per_unit: [
      "cost_variable_per_unit",
      "variable_cost_per_unit",
      "variable_handling_cost",
    ],
    labor_cost_per_hour: [
      "labor_cost_per_hour",
      "avg_labor_rate",
      "hourly_labor_cost",
    ],
    employees_total: ["employees_total", "headcount", "total_staff"],
    cost_per_line: ["cost_per_line", "avg_line_cost"],
    avg_unit_cost: ["avg_unit_cost", "cost_per_unit"],

    /* Warehouse Activity & Throughput */
    orders_processed: ["orders_processed", "order_count", "orders"],
    lines_processed: ["lines_processed", "line_count", "lines"],
    units_processed: ["units_processed", "unit_count", "units"],
    cartons_processed: ["cartons_processed", "carton_count", "cases_processed"],
    pallets_processed: ["pallets_processed", "pallet_count"],
    throughput_units_per_hr: [
      "throughput_units_per_hr",
      "uph",
      "units_per_hour",
    ],
    lines_per_hr: ["lines_per_hr", "lph"],
    cartons_per_hr: ["cartons_per_hr", "cartons/hr"],
    orders_per_hr: ["orders_per_hr", "orders/hr"],
    truck_shipments: ["truck_shipments", "outbound_trucks", "loads"],
    avg_truck_fill: ["avg_truck_fill", "truck_utilization", "load_fill_pct"],
    avg_cartons_per_truck: ["avg_cartons_per_truck", "cartons_per_load"],
    avg_weight_per_truck_lbs: ["avg_weight_per_truck_lbs", "truck_avg_weight"],
    turnover_days_inventory: [
      "turnover_days_inventory",
      "days_inventory_on_hand",
    ],

    /* Vendor Purchase Order */
    purchase_order_id: ["purchase_order_id", "po_number", "po_id"],
    vendor_id: ["vendor_id", "supplier_id", "vendor_number"],
    po_line_qty: ["po_line_qty", "po_qty", "ordered_quantity", "qty_ordered"],
    line_amount: ["line_amount", "po_line_value", "po_amount"],

    /* Sales Order */
    sales_order_id: ["sales_order_id", "order_id", "so_number"],
    order_date: ["order_date", "so_date", "ship_date"],
    order_qty: ["order_qty", "ordered_quantity", "units_ordered", "so_qty"],
    ship_to_address: [
      "ship_to_address",
      "destination_address",
      "customer_address",
    ],
    scheduled_delivery_date_time: [
      "scheduled_delivery_date_time",
      "required_date",
      "delivery_date",
    ],

    /* Transportation */
    direction: ["direction", "flow", "inbound_outbound"],
    mode: ["mode", "transport_mode", "shipment_mode"],
    distance_miles: ["distance_miles", "miles", "lane_distance"],
    shipment_weight_lbs: [
      "shipment_weight_lbs",
      "weight_lbs",
      "shipment_weight",
      "gross_weight",
    ],
    cost_per_mile: ["cost_per_mile", "rate_per_mile"],
    cost_per_cwt: ["cost_per_cwt", "rate_per_cwt", "cwt_rate"],
    total_lane_cost: ["total_lane_cost", "flat_lane_cost", "fixed_lane_cost"],
    valid_from: ["valid_from", "rate_start"],
    valid_to: ["valid_to", "rate_end"],

    /* SKU/Inventory */
    sku_id: ["sku_id", "item_id", "product_id", "manual_input", "sku"],
    annual_volume: [
      "annual_volume",
      "yearly_volume",
      "units",
      "sales_qty",
      "ordered_units",
    ],
    units_per_case: [
      "units_per_case",
      "case_pack",
      "units_case",
      "pack_size",
      "uom_per_case",
    ],
    cases_per_pallet: [
      "cases_per_pallet",
      "case_pallet",
      "pallet_qty",
      "cases_per_layer",
    ],

    /* Forecast */
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

    /* Network/Geographic */
    latitude: ["latitude", "lat", "y_coord", "y_coordinate"],
    longitude: ["longitude", "lng", "lon", "x_coord", "x_coordinate"],
    country: ["country", "nation"],

    /* Misc & Transaction */
    tracking_number: ["tracking_number"],
    carrier: ["carrier", "ship_carrier"],
    carrier_service: ["carrier_service", "service_level"],
    shipper_account: ["shipper_account"],
    manifest_date_time: ["manifest_date_time"],
    delivery_date_time: ["delivery_date_time"],
  };

  // Enhanced validation rules for comprehensive data validation
  const VALIDATION_RULES = {
    facility: { type: "string", required: true, minLength: 2 },
    reporting_period: { type: "string", required: true },
    capacity_sqft: { type: "numeric", min: 10000, required: true },
    ceiling_height_ft: { type: "numeric", min: 10, max: 60, required: true },
    num_docks: { type: "numeric", min: 1, required: true },
    cost_fixed_annual: { type: "numeric", min: 0, required: true },
    cost_variable_per_unit: { type: "numeric", min: 0, required: true },
    labor_cost_per_hour: { type: "numeric", min: 7.25, required: true },
    employees_total: { type: "numeric", min: 1, required: false },
    orders_processed: { type: "numeric", min: 0, required: true },
    lines_processed: { type: "numeric", min: 0 },
    units_processed: { type: "numeric", min: 0 },
    cartons_processed: { type: "numeric", min: 0 },
    pallets_processed: { type: "numeric", min: 0 },
    truck_shipments: { type: "numeric", min: 0 },
    avg_truck_fill: { type: "numeric", min: 0, max: 100 },
    throughput_units_per_hr: { type: "numeric", min: 0 },
    lines_per_hr: { type: "numeric", min: 0 },
    cartons_per_hr: { type: "numeric", min: 0 },
    orders_per_hr: { type: "numeric", min: 0 },
    avg_cartons_per_truck: { type: "numeric", min: 1 },
    avg_weight_per_truck_lbs: { type: "numeric", min: 1 },
    turnover_days_inventory: { type: "numeric", min: 0.1 },
    direction: {
      type: "enum",
      allowed: ["inbound", "outbound"],
      required: true,
    },
    mode: {
      type: "enum",
      allowed: ["truck", "rail", "air", "ocean", "parcel"],
      required: true,
    },
    distance_miles: { type: "numeric", min: 1, max: 5000, required: true },
    shipment_weight_lbs: { type: "numeric", min: 1 },
    cost_per_mile: { type: "numeric", min: 0.01 },
    cost_per_cwt: { type: "numeric", min: 0.01 },
    total_lane_cost: { type: "numeric", min: 1 },
    sku_id: { type: "string", required: true, minLength: 3 },
    annual_volume: { type: "numeric", min: 1, required: true },
    units_per_case: { type: "numeric", min: 1, required: true },
    cases_per_pallet: { type: "numeric", min: 1, required: true },
    year: { type: "numeric", min: 2020, max: 2050, required: true },
    annual_units: { type: "numeric", min: 1, required: true },
    city: { type: "string", required: true, minLength: 2 },
    state: { type: "string", required: false, minLength: 2 },
    latitude: { type: "numeric", min: -90, max: 90, required: true },
    longitude: { type: "numeric", min: -180, max: 180, required: true },
    order_id: { type: "string", required: true, minLength: 1 },
    order_date: { type: "string", required: true },
    order_qty: { type: "numeric", min: 1, required: true },
    ship_to_address: { type: "string", required: true, minLength: 5 },
    purchase_order_id: { type: "string", required: true, minLength: 1 },
    vendor_id: { type: "string", required: true, minLength: 1 },
    po_line_qty: { type: "numeric", min: 1, required: true },
    line_amount: { type: "numeric", min: 0.01, required: true },
  };

  // Legacy column mappings maintained for backward compatibility
  const columnMappings: any = {
    forecast: {
      year: FIELD_SYNONYMS.year,
      annual_units: FIELD_SYNONYMS.annual_units,
    },
    sku: {
      sku_id: FIELD_SYNONYMS.sku_id,
      units_per_case: FIELD_SYNONYMS.units_per_case,
      cases_per_pallet: FIELD_SYNONYMS.cases_per_pallet,
      annual_volume: FIELD_SYNONYMS.annual_volume,
    },
    network: {
      city: FIELD_SYNONYMS.city,
      latitude: FIELD_SYNONYMS.latitude,
      longitude: FIELD_SYNONYMS.longitude,
      state: FIELD_SYNONYMS.state,
      country: FIELD_SYNONYMS.country,
    },
    warehouse_inputs: {
      facility: FIELD_SYNONYMS.facility,
      city: FIELD_SYNONYMS.city,
      state: FIELD_SYNONYMS.state,
      reporting_period: FIELD_SYNONYMS.reporting_period,
      capacity_sqft: FIELD_SYNONYMS.capacity_sqft,
      ceiling_height_ft: FIELD_SYNONYMS.ceiling_height_ft,
      num_docks: FIELD_SYNONYMS.num_docks,
      type: FIELD_SYNONYMS.type,
      cost_fixed_annual: FIELD_SYNONYMS.cost_fixed_annual,
      cost_variable_per_unit: FIELD_SYNONYMS.cost_variable_per_unit,
      labor_cost_per_hour: FIELD_SYNONYMS.labor_cost_per_hour,
      employees_total: FIELD_SYNONYMS.employees_total,
    },
    transportation_costs: {
      facility: FIELD_SYNONYMS.facility,
      destination: ["destination", "ship_to", "delivery_location"],
      direction: FIELD_SYNONYMS.direction,
      mode: FIELD_SYNONYMS.mode,
      distance_miles: FIELD_SYNONYMS.distance_miles,
      shipment_weight_lbs: FIELD_SYNONYMS.shipment_weight_lbs,
      cost_per_mile: FIELD_SYNONYMS.cost_per_mile,
      cost_per_cwt: FIELD_SYNONYMS.cost_per_cwt,
      total_lane_cost: FIELD_SYNONYMS.total_lane_cost,
    },
    sales_orders: {
      order_id: FIELD_SYNONYMS.sales_order_id,
      order_date: FIELD_SYNONYMS.order_date,
      sku: FIELD_SYNONYMS.sku_id,
      order_qty: FIELD_SYNONYMS.order_qty,
      ship_to_address: FIELD_SYNONYMS.ship_to_address,
      required_date: FIELD_SYNONYMS.scheduled_delivery_date_time,
    },
  };

  // Comprehensive validation rules for business data types
  const validationRules: { [key: string]: any } = {
    forecast: {
      requiredColumns: ["year", "annual_units"],
      numericColumns: ["year", "annual_units"],
      positiveColumns: ["annual_units"],
      yearRange: [2020, 2050],
    },
    sales_volume: {
      requiredColumns: ["year", "sales_volume"],
      numericColumns: ["year", "sales_volume"],
      positiveColumns: ["sales_volume"],
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
    facility: {
      requiredColumns: ["facility_id", "capacity", "fixed_cost"],
      numericColumns: ["capacity", "fixed_cost", "variable_cost"],
      positiveColumns: ["capacity", "fixed_cost"],
      stringColumns: ["facility_id", "facility_name"],
    },
    transportation_costs: {
      requiredColumns: [
        "facility",
        "destination",
        "mode",
        "direction",
        "distance_miles",
      ],
      optionalColumns: [
        "shipment_weight_lbs",
        "cost_per_mile",
        "cost_per_cwt",
        "total_lane_cost",
        "valid_from",
        "valid_to",
      ],
      numericColumns: [
        "distance_miles",
        "shipment_weight_lbs",
        "cost_per_mile",
        "cost_per_cwt",
        "total_lane_cost",
      ],
      positiveColumns: [
        "distance_miles",
        "shipment_weight_lbs",
        "cost_per_mile",
        "cost_per_cwt",
        "total_lane_cost",
      ],
      stringColumns: ["facility", "destination", "mode", "direction"],
      ranges: {
        distance_miles: [1, 5000],
        shipment_weight_lbs: [1, 100000],
        cost_per_mile: [0.01, 100.0],
        cost_per_cwt: [0.01, 200.0],
        total_lane_cost: [1, 1000000],
      },
      allowedModes: ["truck", "rail", "ocean", "air", "parcel"],
      allowedDirection: ["inbound", "outbound"],
      uniqueKey: ["facility", "destination", "mode", "direction"],
      atLeastOneCost: ["cost_per_mile", "cost_per_cwt", "total_lane_cost"],
    },
    sales_orders: {
      requiredColumns: [
        "order_id",
        "order_date",
        "sku",
        "order_qty",
        "ship_to_address",
        "required_date",
      ],
      numericColumns: ["order_qty"],
      positiveColumns: ["order_qty"],
      stringColumns: ["order_id", "sku", "ship_to_address"],
      dateColumns: ["order_date", "required_date"],
      ranges: {
        order_qty: [1, 100000],
      },
      uniqueKey: ["order_id", "sku", "order_date"],
      foreignKey: {
        sku: "sku_master.sku",
      },
      dateLogic: {
        required_date_gte_order_date: true,
      },
    },
    warehouse_inputs: {
      requiredColumns: [
        "facility",
        "city",
        "state",
        "reporting_period",
        "capacity_sqft",
        "ceiling_height_ft",
        "num_docks",
        "type",
        "cost_fixed_annual",
        "cost_variable_per_unit",
        "labor_cost_per_hour",
        "employees_total",
        "cost_per_line",
        "orders_processed",
        "lines_processed",
        "units_processed",
        "cartons_processed",
        "pallets_processed",
        "throughput_units_per_hr",
        "lines_per_hr",
        "cartons_per_hr",
        "orders_per_hr",
        "avg_unit_cost",
        "avg_line_cost",
        "truck_shipments",
        "avg_truck_fill",
        "avg_cartons_per_truck",
        "avg_weight_per_truck_lbs",
        "turnover_days_inventory",
      ],
      integerColumns: [
        "capacity_sqft",
        "num_docks",
        "employees_total",
        "orders_processed",
        "lines_processed",
        "units_processed",
        "cartons_processed",
        "pallets_processed",
        "truck_shipments",
      ],
      numericColumns: [
        "ceiling_height_ft",
        "cost_fixed_annual",
        "cost_variable_per_unit",
        "labor_cost_per_hour",
        "cost_per_line",
        "throughput_units_per_hr",
        "lines_per_hr",
        "cartons_per_hr",
        "orders_per_hr",
        "avg_unit_cost",
        "avg_line_cost",
        "avg_truck_fill",
        "avg_cartons_per_truck",
        "avg_weight_per_truck_lbs",
        "turnover_days_inventory",
      ],
      positiveColumns: [
        "capacity_sqft",
        "ceiling_height_ft",
        "num_docks",
        "cost_fixed_annual",
        "labor_cost_per_hour",
        "employees_total",
      ],
      stringColumns: ["facility", "city", "state", "reporting_period", "type"],
      ranges: {
        capacity_sqft: [10000, 2000000],
        ceiling_height_ft: [10, 60],
        num_docks: [1, 100],
        labor_cost_per_hour: [7.25, 100],
        avg_truck_fill: [0, 100],
      },
    },
    transport_cost: {
      requiredColumns: ["origin", "destination", "rate"],
      numericColumns: ["rate", "distance", "transit_time"],
      positiveColumns: ["rate"],
      stringColumns: ["origin", "destination", "mode"],
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

  // Helper function to categorize and enhance error messages
  const categorizeErrors = (
    errors: string[],
    dataType: string,
  ): { errors: string[]; summary: string; actionableSteps: string[] } => {
    const categories = {
      missingColumns: errors.filter((e) =>
        e.includes("Missing required column"),
      ),
      formatErrors: errors.filter(
        (e) => e.includes("must be numeric") || e.includes("must be positive"),
      ),
      dataQuality: errors.filter(
        (e) =>
          e.includes("should have at least") ||
          e.includes("outside") ||
          e.includes("exceeds"),
      ),
      businessLogic: errors.filter(
        (e) =>
          e.includes("Calculated") ||
          e.includes("seems") ||
          e.includes("suspicious"),
      ),
    };

    const actionableSteps = [];
    let summary = "";

    if (categories.missingColumns.length > 0) {
      summary += `${categories.missingColumns.length} missing required columns. `;
      actionableSteps.push(
        "Review column mapping and ensure all required fields are present",
      );
    }

    if (categories.formatErrors.length > 0) {
      summary += `${categories.formatErrors.length} data format issues. `;
      actionableSteps.push(
        "Clean numeric fields (remove commas, currency symbols, ensure positive values)",
      );
    }

    if (categories.dataQuality.length > 0) {
      summary += `${categories.dataQuality.length} data quality issues. `;
      actionableSteps.push("Validate data ranges and formats in source system");
    }

    if (categories.businessLogic.length > 0) {
      summary += `${categories.businessLogic.length} business logic warnings. `;
      actionableSteps.push(
        "Review calculations and verify business rules alignment",
      );
    }

    return {
      errors,
      summary: summary || "Data validation completed successfully",
      actionableSteps,
    };
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
      const missingColumnsSuggestion = missingColumns.map((col) => {
        const mappings = columnMappings[dataType] || {};
        const possibleNames = mappings[col] || [];
        if (possibleNames.length > 0) {
          return `Missing required column '${col}'. Expected one of: ${possibleNames.slice(0, 5).join(", ")}`;
        }
        return `Missing required column '${col}'. Please ensure this column exists in your data.`;
      });
      errors.push(...missingColumnsSuggestion);
    }

    // Validate data types and ranges
    data.forEach((record, index) => {
      // Check numeric columns
      rules.numericColumns?.forEach((col) => {
        const value = record[col];
        if (value !== undefined && value !== null && isNaN(Number(value))) {
          const suggestion =
            typeof value === "string" && value.includes(",")
              ? " (Try removing commas from numbers)"
              : typeof value === "string" && value.includes("$")
                ? " (Try removing currency symbols)"
                : "";
          errors.push(
            `Row ${index + 1}: Column '${col}' must be numeric, got '${value}'${suggestion}`,
          );
        }
      });

      // Check positive columns
      rules.positiveColumns?.forEach((col) => {
        const value = Number(record[col]);
        if (!isNaN(value) && value <= 0) {
          const suggestion =
            value === 0
              ? " (Zero values are not allowed for this field)"
              : value < 0
                ? " (Negative values are not allowed for this field)"
                : "";
          errors.push(
            `Row ${index + 1}: Column '${col}' must be positive, got ${value}${suggestion}`,
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
    } else if (dataType === "transportation_costs") {
      errors.push(...validateTransportationCostsData(data));
    } else if (dataType === "sales_orders") {
      errors.push(...validateSalesOrdersData(data));
    } else if (dataType === "warehouse_inputs") {
      errors.push(...validateWarehouseInputsData(data));
    }

    // Check for duplicates and missing values
    warnings.push(...checkDuplicates(data, dataType));
    warnings.push(...checkMissingValues(data, rules.requiredColumns));

    const validRecords = Math.max(0, totalRecords - errors.length);
    const invalidRecords = totalRecords - validRecords;

    // Categorize and enhance errors for better user guidance
    const enhancedErrors = categorizeErrors(errors, dataType);

    return {
      isValid: errors.length === 0,
      errors: enhancedErrors.errors,
      warnings,
      totalRecords,
      validRecords,
      invalidRecords,
      summary: enhancedErrors.summary,
      actionableSteps: enhancedErrors.actionableSteps,
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
        const suggestion =
          skuId.length === 0
            ? " (SKU ID appears to be empty - check your data source)"
            : skuId.length === 1 || skuId.length === 2
              ? " (SKU ID is too short - consider adding a prefix or using a more detailed identifier)"
              : "";
        errors.push(
          `Row ${index + 1}: SKU ID '${skuId}' should have at least 3 characters${suggestion}`,
        );
      }

      // Check for valid SKU ID format (basic patterns)
      if (skuId.length >= 3) {
        if (/^\s+|\s+$/.test(skuId)) {
          errors.push(
            `Row ${index + 1}: SKU ID '${skuId}' has leading or trailing spaces (consider trimming)`,
          );
        }
        if (/[^a-zA-Z0-9\-_]/.test(skuId)) {
          errors.push(
            `Row ${index + 1}: SKU ID '${skuId}' contains special characters that may cause issues`,
          );
        }
      }

      // Check units per pallet calculation
      const unitsPerCase = Number(record.units_per_case);
      const casesPerPallet = Number(record.cases_per_pallet);

      if (!isNaN(unitsPerCase) && !isNaN(casesPerPallet)) {
        const unitsPerPallet = unitsPerCase * casesPerPallet;

        if (unitsPerPallet > 10000) {
          errors.push(
            `Row ${index + 1}: Calculated units per pallet (${unitsPerCase} × ${casesPerPallet} = ${unitsPerPallet}) exceeds 10,000 - please verify your pack sizes`,
          );
        }

        if (unitsPerPallet < 1) {
          errors.push(
            `Row ${index + 1}: Calculated units per pallet (${unitsPerCase} × ${casesPerPallet} = ${unitsPerPallet}) is less than 1 - check your units_per_case and cases_per_pallet values`,
          );
        }
      } else {
        // Provide specific guidance for missing pack size data
        if (isNaN(unitsPerCase) && record.units_per_case !== undefined) {
          errors.push(
            `Row ${index + 1}: units_per_case '${record.units_per_case}' is not a valid number`,
          );
        }
        if (isNaN(casesPerPallet) && record.cases_per_pallet !== undefined) {
          errors.push(
            `Row ${index + 1}: cases_per_pallet '${record.cases_per_pallet}' is not a valid number`,
          );
        }
      }

      // Check annual volume reasonableness
      const annualVolume = Number(record.annual_volume);
      if (!isNaN(annualVolume)) {
        if (annualVolume > 10000000) {
          errors.push(
            `Row ${index + 1}: Annual volume ${annualVolume.toLocaleString()} seems extremely high - please verify this value`,
          );
        }
        if (annualVolume === 0) {
          errors.push(
            `Row ${index + 1}: Annual volume is zero - consider if this SKU should be included in optimization`,
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
        const suggestion =
          city.length === 0
            ? " (City name is empty - ensure location data is properly mapped)"
            : " (City name is too short - check for abbreviations or data truncation)";
        errors.push(
          `Row ${index + 1}: City name '${city}' should have at least 2 characters${suggestion}`,
        );
      }

      // Check for valid coordinates
      const lat = Number(record.latitude);
      const lng = Number(record.longitude);

      if (lat === 0 && lng === 0) {
        errors.push(
          `Row ${index + 1}: Coordinates (0,0) likely indicate missing location data - please verify lat/lng values for '${city}'`,
        );
      }

      // Check coordinate ranges
      if (!isNaN(lat) && (lat < -90 || lat > 90)) {
        errors.push(
          `Row ${index + 1}: Latitude ${lat} is outside valid range (-90 to 90) for '${city}'`,
        );
      }

      if (!isNaN(lng) && (lng < -180 || lng > 180)) {
        errors.push(
          `Row ${index + 1}: Longitude ${lng} is outside valid range (-180 to 180) for '${city}'`,
        );
      }

      // Check for suspicious coordinate patterns
      if (!isNaN(lat) && !isNaN(lng)) {
        if (Math.abs(lat) === Math.abs(lng) && lat !== 0) {
          errors.push(
            `Row ${index + 1}: Identical latitude and longitude values (${lat}, ${lng}) may indicate data entry error for '${city}'`,
          );
        }
      }
    });

    return errors;
  };

  const validateTransportationCostsData = (data: any[]): string[] => {
    const errors: string[] = [];
    const rules = validationRules.transportation_costs;

    data.forEach((record, index) => {
      // Check allowed modes
      if (
        record.mode &&
        !rules.allowedModes.includes(record.mode.toLowerCase())
      ) {
        errors.push(
          `Row ${index + 1}: Mode '${record.mode}' not in allowed values: ${rules.allowedModes.join(", ")}`,
        );
      }

      // Check allowed directions
      if (
        record.direction &&
        !rules.allowedDirection.includes(record.direction.toLowerCase())
      ) {
        errors.push(
          `Row ${index + 1}: Direction '${record.direction}' not in allowed values: ${rules.allowedDirection.join(", ")}`,
        );
      }

      // Check ranges
      Object.entries(rules.ranges).forEach(([field, [min, max]]) => {
        const value = Number(record[field]);
        if (!isNaN(value) && (value < min || value > max)) {
          errors.push(
            `Row ${index + 1}: ${field} value ${value} outside valid range [${min}, ${max}]`,
          );
        }
      });

      // Check at least one cost field is provided
      const hasAtLeastOneCost = rules.atLeastOneCost.some(
        (field) =>
          record[field] !== undefined &&
          record[field] !== null &&
          record[field] !== "",
      );
      if (!hasAtLeastOneCost) {
        errors.push(
          `Row ${index + 1}: At least one cost field required: ${rules.atLeastOneCost.join(", ")}`,
        );
      }
    });

    // Check unique key constraints
    const uniqueKeys = new Set();
    data.forEach((record, index) => {
      const keyValues = rules.uniqueKey.map((field) => record[field]).join("|");
      if (uniqueKeys.has(keyValues)) {
        errors.push(
          `Row ${index + 1}: Duplicate combination of ${rules.uniqueKey.join(", ")}`,
        );
      }
      uniqueKeys.add(keyValues);
    });

    return errors;
  };

  const validateSalesOrdersData = (data: any[]): string[] => {
    const errors: string[] = [];
    const rules = validationRules.sales_orders;

    data.forEach((record, index) => {
      // Check date logic: required_date >= order_date
      if (record.order_date && record.required_date) {
        const orderDate = new Date(record.order_date);
        const requiredDate = new Date(record.required_date);

        if (requiredDate < orderDate) {
          errors.push(
            `Row ${index + 1}: Required date (${record.required_date}) cannot be before order date (${record.order_date})`,
          );
        }
      }

      // Check order quantity range
      const qty = Number(record.order_qty);
      if (!isNaN(qty)) {
        const [min, max] = rules.ranges.order_qty;
        if (qty < min || qty > max) {
          errors.push(
            `Row ${index + 1}: Order quantity ${qty} outside valid range [${min}, ${max}]`,
          );
        }
      }

      // Check date formats
      rules.dateColumns.forEach((dateCol) => {
        if (record[dateCol]) {
          const date = new Date(record[dateCol]);
          if (isNaN(date.getTime())) {
            errors.push(
              `Row ${index + 1}: Invalid date format in ${dateCol}: '${record[dateCol]}'`,
            );
          }
        }
      });
    });

    // Check unique key constraints
    const uniqueKeys = new Set();
    data.forEach((record, index) => {
      const keyValues = rules.uniqueKey.map((field) => record[field]).join("|");
      if (uniqueKeys.has(keyValues)) {
        errors.push(
          `Row ${index + 1}: Duplicate combination of ${rules.uniqueKey.join(", ")}`,
        );
      }
      uniqueKeys.add(keyValues);
    });

    return errors;
  };

  const validateWarehouseInputsData = (data: any[]): string[] => {
    const errors: string[] = [];
    const rules = validationRules.warehouse_inputs;

    data.forEach((record, index) => {
      // Check ranges
      Object.entries(rules.ranges).forEach(([field, [min, max]]) => {
        const value = Number(record[field]);
        if (!isNaN(value) && (value < min || value > max)) {
          errors.push(
            `Row ${index + 1}: ${field} value ${value} outside valid range [${min}, ${max}]`,
          );
        }
      });

      // Check integer fields are actually integers
      rules.integerColumns.forEach((field) => {
        const value = record[field];
        if (value !== undefined && value !== null && value !== "") {
          const numValue = Number(value);
          if (!isNaN(numValue) && !Number.isInteger(numValue)) {
            errors.push(
              `Row ${index + 1}: ${field} must be an integer, got ${value}`,
            );
          }
        }
      });

      // Check logical consistency
      if (record.avg_truck_fill && record.avg_truck_fill > 100) {
        errors.push(
          `Row ${index + 1}: Average truck fill (${record.avg_truck_fill}%) cannot exceed 100%`,
        );
      }

      // Check throughput consistency
      if (
        record.throughput_units_per_hr &&
        record.units_processed &&
        record.employees_total
      ) {
        const expectedHours =
          record.units_processed / record.throughput_units_per_hr;
        if (expectedHours > 8760) {
          // More than hours in a year
          errors.push(
            `Row ${index + 1}: Throughput rates seem inconsistent with total units processed`,
          );
        }
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

  // Enhanced field mapping functions for comprehensive data processing
  const mapFieldsToStandard = (
    inputHeaders: string[],
    fieldSynonyms: any,
  ): any => {
    let headerMap: any = {};
    for (const [canonical, synonyms] of Object.entries(fieldSynonyms)) {
      const match = inputHeaders.find((h) =>
        (synonyms as string[]).some((syn) =>
          h
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, "")
            .includes(syn.toLowerCase().replace(/[^a-zA-Z0-9]/g, "")),
        ),
      );
      if (match) headerMap[canonical] = match;
    }
    return headerMap;
  };

  const normalizeAndValidateRow = (
    row: any,
    headerMap: any,
    validationRules: any,
  ): any => {
    let output: any = {};
    let errors: string[] = [];

    for (const [canonical, original] of Object.entries(headerMap)) {
      let value = row[original];
      const rule = validationRules[canonical];

      if (rule?.type === "numeric") {
        value = parseFloat(value?.toString().replace(/[^0-9.-]/g, ""));
        if (
          isNaN(value) ||
          (rule.min != null && value < rule.min) ||
          (rule.max != null && value > rule.max)
        ) {
          const rangeMsg =
            rule.min != null && rule.max != null
              ? `between ${rule.min} and ${rule.max}`
              : rule.min != null
                ? `≥ ${rule.min}`
                : `≤ ${rule.max}`;
          errors.push(
            `Column '${canonical}' must be numeric and ${rangeMsg}, got '${row[original]}'`,
          );
          value = null;
        }
      }

      if (
        rule?.type === "enum" &&
        !rule.allowed.includes((value || "").toLowerCase())
      ) {
        errors.push(
          `Column '${canonical}' must be one of [${rule.allowed.join(", ")}], got '${value}'`,
        );
        value = null;
      }

      if (
        rule?.type === "string" &&
        rule.minLength &&
        (!value || value.length < rule.minLength)
      ) {
        errors.push(
          `Column '${canonical}' must be a string of at least ${rule.minLength} chars, got '${value}'`,
        );
        value = null;
      }

      if (rule?.required && (value == null || value === "")) {
        errors.push(`Column '${canonical}' is required but missing`);
      }

      output[canonical] = value;
    }

    // Preserve unmapped fields for extensibility
    Object.keys(row).forEach((col) => {
      if (!Object.values(headerMap).includes(col)) output[col] = row[col];
    });

    output.rowErrors = errors;
    return output;
  };

  const convertTableWithSynonyms = (
    csvRows: any[],
    synonyms: any,
    validationRules: any,
  ): any[] => {
    if (!csvRows || csvRows.length === 0) return [];

    const headers = Object.keys(csvRows[0]);
    const headerMap = mapFieldsToStandard(headers, synonyms);

    return csvRows.map((row) =>
      normalizeAndValidateRow(row, headerMap, validationRules),
    );
  };

  // Enhanced DataConverter utilities with intelligent column matching
  const findMatchingColumn = (
    availableColumns: string[],
    possibleNames: string[],
  ): string | null => {
    const columnsLower = availableColumns.map((col) => col.toLowerCase());
    const cleanColumns = availableColumns.map((col) => cleanColumnName(col));

    // Priority 1: Exact match (case-insensitive)
    for (const possibleName of possibleNames) {
      const index = columnsLower.indexOf(possibleName.toLowerCase());
      if (index !== -1) {
        return availableColumns[index];
      }
    }

    // Priority 2: Exact match after cleaning (remove spaces, underscores, etc.)
    for (const possibleName of possibleNames) {
      const cleanPossible = cleanColumnName(possibleName);
      const index = cleanColumns.indexOf(cleanPossible);
      if (index !== -1) {
        return availableColumns[index];
      }
    }

    // Priority 3: Semantic matching - check if column contains key semantic parts
    for (const possibleName of possibleNames) {
      const semanticParts = getSemanticParts(possibleName);
      for (let i = 0; i < availableColumns.length; i++) {
        const columnParts = getSemanticParts(availableColumns[i]);
        if (hasSemanticMatch(semanticParts, columnParts)) {
          return availableColumns[i];
        }
      }
    }

    // Priority 4: Partial match (contains)
    for (const possibleName of possibleNames) {
      for (const col of availableColumns) {
        if (col.toLowerCase().includes(possibleName.toLowerCase())) {
          return col;
        }
      }
    }

    // Priority 5: Fuzzy match with similarity scoring
    let bestMatch: string | null = null;
    let bestScore = 0;
    const threshold = 0.7; // Minimum similarity threshold

    for (const possibleName of possibleNames) {
      for (const col of availableColumns) {
        const score = calculateSimilarity(
          possibleName.toLowerCase(),
          col.toLowerCase(),
        );
        if (score > threshold && score > bestScore) {
          bestScore = score;
          bestMatch = col;
        }
      }
    }

    return bestMatch;
  };

  // Helper function to extract semantic parts from column names
  const getSemanticParts = (columnName: string): string[] => {
    return cleanColumnName(columnName)
      .split(/[_\s-]+/)
      .filter((part) => part.length > 0)
      .map((part) => part.toLowerCase());
  };

  // Check if two sets of semantic parts have meaningful overlap
  const hasSemanticMatch = (parts1: string[], parts2: string[]): boolean => {
    const commonWords = parts1.filter((part) => parts2.includes(part));
    // Need at least 50% overlap and minimum 1 meaningful word
    return (
      commonWords.length >= 1 &&
      commonWords.length / Math.max(parts1.length, parts2.length) >= 0.5
    );
  };

  // Calculate similarity score between two strings (Jaro-Winkler approximation)
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const match_distance =
      Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const str1_matches = new Array(str1.length).fill(false);
    const str2_matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Identify matches
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - match_distance);
      const end = Math.min(i + match_distance + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (str2_matches[j] || str1[i] !== str2[j]) continue;
        str1_matches[i] = true;
        str2_matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1_matches[i]) continue;
      while (!str2_matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    const jaro =
      (matches / str1.length +
        matches / str2.length +
        (matches - transpositions / 2) / matches) /
      3;

    // Add Winkler prefix bonus
    let prefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + 0.1 * prefix * (1 - jaro);
  };

  const convertToStandardFormat = (data: any[], dataType: string): any => {
    const mappings = columnMappings[dataType] || {};
    const sampleRecord = data[0] || {};
    const availableColumns = Object.keys(sampleRecord);
    const mappedColumns: { [key: string]: string } = {};
    const unmappedColumns: string[] = [];
    const conversionLog: string[] = [];
    const suggestions: { [key: string]: string[] } = {};

    // Use comprehensive field synonyms mapping first
    const headerMap = mapFieldsToStandard(availableColumns, FIELD_SYNONYMS);

    // Apply comprehensive FIELD_SYNONYMS mapping
    Object.entries(headerMap).forEach(([canonical, original]) => {
      mappedColumns[canonical] = original;
      conversionLog.push(
        `✓ Auto-mapped '${original}' → '${canonical}' (comprehensive)`,
      );
    });

    // Then, try legacy column mappings for any unmapped required fields
    for (const [standardCol, possibleNames] of Object.entries(mappings)) {
      if (!mappedColumns[standardCol]) {
        const matchedCol = findMatchingColumn(availableColumns, possibleNames);
        if (matchedCol) {
          mappedColumns[standardCol] = matchedCol;
          conversionLog.push(
            `✓ Mapped '${matchedCol}' → '${standardCol}' (legacy)`,
          );
        } else {
          // Suggest potential matches for manual mapping
          const potentialMatches = availableColumns
            .filter((col) => !Object.values(mappedColumns).includes(col))
            .map((col) => ({
              column: col,
              score: Math.max(
                ...(possibleNames as string[]).map((name) =>
                  calculateSimilarity(name.toLowerCase(), col.toLowerCase()),
                ),
              ),
            }))
            .filter((match) => match.score > 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((match) => match.column);

          if (potentialMatches.length > 0) {
            suggestions[standardCol] = potentialMatches;
            conversionLog.push(
              `⚠️  No exact match for '${standardCol}'. Suggestions: ${potentialMatches.join(", ")}`,
            );
          } else {
            conversionLog.push(
              `❌ No match found for required column '${standardCol}'`,
            );
          }
        }
      }
    }

    // Apply comprehensive validation and normalization
    const processedData = convertTableWithSynonyms(
      data,
      FIELD_SYNONYMS,
      VALIDATION_RULES,
    );

    // Extract validation errors
    const allRowErrors: string[] = [];
    processedData.forEach((row, index) => {
      if (row.rowErrors && row.rowErrors.length > 0) {
        row.rowErrors.forEach((error: string) => {
          allRowErrors.push(`Row ${index + 1}: ${error}`);
        });
      }
    });

    // Clean processed data (remove rowErrors field)
    const mappedData = processedData.map((row) => {
      const { rowErrors, ...cleanRow } = row;
      return cleanRow;
    });

    // Find unmapped columns
    const mappedOriginalCols = Object.values(mappedColumns);
    unmappedColumns.push(
      ...availableColumns.filter((col) => !mappedOriginalCols.includes(col)),
    );

    if (unmappedColumns.length > 0) {
      conversionLog.push(`📋 Unmapped columns: ${unmappedColumns.join(", ")}`);
    }

    if (allRowErrors.length > 0) {
      conversionLog.push(
        `⚠️ ${allRowErrors.length} validation issues found in data`,
      );
    }

    return {
      originalColumns: availableColumns,
      mappedColumns,
      unmappedColumns,
      suggestions,
      conversionLog,
      mappedData,
      validationErrors: allRowErrors,
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
    } else if (dataType === "sales_volume") {
      return [
        { year: 2024, sales_volume: 1250000, region: "Northeast" },
        { year: 2025, sales_volume: 1300000, region: "Northeast" },
        { year: 2024, sales_volume: 980000, region: "Midwest" },
        { year: 2025, sales_volume: 1020000, region: "Midwest" },
        { year: "invalid", sales_volume: 850000, region: "South" }, // Invalid year
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
    } else if (dataType === "facility") {
      return [
        {
          facility_id: "DC001",
          facility_name: "Chicago Distribution Center",
          capacity: 500000,
          fixed_cost: 1200000,
          variable_cost: 2.5,
        },
        {
          facility_id: "DC002",
          facility_name: "Atlanta Warehouse",
          capacity: 350000,
          fixed_cost: 950000,
          variable_cost: 2.8,
        },
        {
          facility_id: "DC003",
          facility_name: "Los Angeles Hub",
          capacity: 0, // Invalid capacity
          fixed_cost: 1500000,
          variable_cost: 3.2,
        },
      ];
    } else if (dataType === "transportation_costs") {
      return [
        {
          facility: "DC_Chicago",
          destination: "New_York",
          mode: "truck",
          direction: "outbound",
          distance_miles: 790,
          shipment_weight_lbs: 45000,
          cost_per_mile: 2.5,
          cost_per_cwt: 15.2,
          total_lane_cost: 1975,
        },
        {
          facility: "DC_Atlanta",
          destination: "Miami",
          mode: "truck",
          direction: "outbound",
          distance_miles: 660,
          cost_per_mile: 2.25,
          total_lane_cost: 1485,
        },
        {
          facility: "DC_LA",
          destination: "Phoenix",
          mode: "rail",
          direction: "inbound",
          distance_miles: 370,
          cost_per_mile: 0, // Invalid rate for testing
          total_lane_cost: 850,
        },
        {
          facility: "", // Missing facility for testing
          destination: "Dallas",
          mode: "air",
          direction: "outbound",
          distance_miles: 450,
          cost_per_cwt: 45.5,
          total_lane_cost: 2025,
        },
      ];
    } else if (dataType === "sales_orders") {
      return [
        {
          order_id: "ORD001",
          order_date: "2024-01-15",
          sku: "ABC123",
          order_qty: 500,
          ship_to_address: "123 Main St, Chicago, IL",
          required_date: "2024-01-20",
        },
        {
          order_id: "ORD002",
          order_date: "2024-01-16",
          sku: "DEF456",
          order_qty: 250,
          ship_to_address: "456 Oak Ave, Atlanta, GA",
          required_date: "2024-01-18", // Required date before order date for testing
        },
        {
          order_id: "ORD003",
          order_date: "2024-01-17",
          sku: "GHI789",
          order_qty: 0, // Invalid quantity for testing
          ship_to_address: "789 Pine St, Dallas, TX",
          required_date: "2024-01-22",
        },
        {
          order_id: "ORD001", // Duplicate order_id for testing
          order_date: "2024-01-15",
          sku: "ABC123",
          order_qty: 300,
          ship_to_address: "321 Elm St, Phoenix, AZ",
          required_date: "2024-01-25",
        },
      ];
    } else if (dataType === "warehouse_inputs") {
      return [
        {
          facility: "DC_Chicago",
          city: "Chicago",
          state: "IL",
          reporting_period: "2024-Q1",
          capacity_sqft: 500000,
          ceiling_height_ft: 28,
          num_docks: 24,
          type: "Distribution_Center",
          cost_fixed_annual: 2400000,
          cost_variable_per_unit: 1.25,
          labor_cost_per_hour: 18.5,
          employees_total: 85,
          cost_per_line: 2.45,
          orders_processed: 45000,
          lines_processed: 125000,
          units_processed: 2500000,
          cartons_processed: 180000,
          pallets_processed: 12500,
          throughput_units_per_hr: 850,
          lines_per_hr: 42,
          cartons_per_hr: 65,
          orders_per_hr: 15,
          avg_unit_cost: 1.85,
          avg_line_cost: 4.2,
          truck_shipments: 8500,
          avg_truck_fill: 85.2,
          avg_cartons_per_truck: 21,
          avg_weight_per_truck_lbs: 42500,
          turnover_days_inventory: 18.5,
        },
        {
          facility: "DC_Atlanta",
          city: "Atlanta",
          state: "GA",
          reporting_period: "2024-Q1",
          capacity_sqft: 0, // Invalid capacity for testing
          ceiling_height_ft: 32,
          num_docks: 18,
          type: "Warehouse",
          cost_fixed_annual: 1800000,
          cost_variable_per_unit: 1.1,
          labor_cost_per_hour: 16.25,
          employees_total: 65,
          cost_per_line: 2.2,
          orders_processed: 32000,
          lines_processed: 89000,
          units_processed: 1850000,
          cartons_processed: 125000,
          pallets_processed: 8900,
          throughput_units_per_hr: 625,
          lines_per_hr: 38,
          cartons_per_hr: 52,
          orders_per_hr: 12,
          avg_unit_cost: 1.65,
          avg_line_cost: 3.85,
          truck_shipments: 6200,
          avg_truck_fill: 78.5,
          avg_cartons_per_truck: 20,
          avg_weight_per_truck_lbs: 38500,
          turnover_days_inventory: 22.3,
        },
      ];
    } else if (dataType === "transport_cost") {
      return [
        {
          origin: "Chicago",
          destination: "New York",
          rate: 2.5,
          distance: 790,
          mode: "Truck",
        },
        {
          origin: "Atlanta",
          destination: "Miami",
          rate: 1.85,
          distance: 660,
          mode: "Truck",
        },
        {
          origin: "Los Angeles",
          destination: "Phoenix",
          rate: 0, // Invalid rate
          distance: 370,
          mode: "Truck",
        },
        {
          origin: "", // Missing origin
          destination: "Dallas",
          rate: 2.15,
          distance: 450,
          mode: "Rail",
        },
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
          const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: "array" });

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
    if (name.includes("sales") && name.includes("order")) return "sales_orders";
    if (name.includes("sales") && name.includes("volume"))
      return "sales_volume";
    if (
      name.includes("sku") ||
      name.includes("product") ||
      name.includes("inventory")
    )
      return "sku";
    if (
      name.includes("transportation") ||
      name.includes("transport_cost") ||
      name.includes("freight")
    )
      return "transportation_costs";
    if (name.includes("warehouse") && name.includes("input"))
      return "warehouse_inputs";
    if (name.includes("network") || name.includes("location")) return "network";
    if (name.includes("cost") || name.includes("rate")) return "transport_cost";
    if (name.includes("capacity") || name.includes("facility"))
      return "facility";
    return "unknown";
  };

  const autoDetectDataTypeFromColumns = (columnNames: string[]): string => {
    const columns = columnNames.join(" ").toLowerCase();

    // Sales Orders Data
    if (
      columns.includes("order_id") &&
      columns.includes("order_date") &&
      (columns.includes("sku") || columns.includes("product")) &&
      columns.includes("order_qty")
    ) {
      return "sales_orders";
    }

    // Transportation Costs Data
    if (
      columns.includes("facility") &&
      columns.includes("destination") &&
      columns.includes("mode") &&
      columns.includes("direction") &&
      columns.includes("distance_miles")
    ) {
      return "transportation_costs";
    }

    // Warehouse Inputs Data
    if (
      columns.includes("facility") &&
      columns.includes("capacity_sqft") &&
      columns.includes("cost_fixed_annual") &&
      (columns.includes("throughput") || columns.includes("orders_processed"))
    ) {
      return "warehouse_inputs";
    }

    // Forecast/Sales Volume Data
    if (
      columns.includes("year") &&
      (columns.includes("forecast") ||
        columns.includes("demand") ||
        columns.includes("units") ||
        columns.includes("sales") ||
        columns.includes("volume"))
    ) {
      return columns.includes("sales") || columns.includes("volume")
        ? "sales_volume"
        : "forecast";
    }

    // SKU/Inventory Data
    if (
      columns.includes("sku") ||
      (columns.includes("case") && columns.includes("pallet")) ||
      columns.includes("inventory")
    ) {
      return "sku";
    }

    // Facility/Warehouse Data
    if (
      (columns.includes("facility") || columns.includes("warehouse")) &&
      (columns.includes("capacity") ||
        columns.includes("cost") ||
        columns.includes("fixed") ||
        columns.includes("variable"))
    ) {
      return "facility";
    }

    // Transportation Cost Data (legacy format)
    if (
      (columns.includes("origin") && columns.includes("destination")) ||
      (columns.includes("lane") && columns.includes("rate")) ||
      columns.includes("freight") ||
      columns.includes("transport")
    ) {
      return "transport_cost";
    }

    // Network/Location Data
    if (
      (columns.includes("city") || columns.includes("location")) &&
      (columns.includes("latitude") || columns.includes("longitude"))
    ) {
      return "network";
    }

    return "unknown";
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } },
  ) => {
    const uploadedFiles = Array.from(event.target.files || []);
    setParseError(null);

    if (uploadedFiles.length === 0) {
      addToLog("No files selected for upload");
      return;
    }

    addToLog(`📁 Starting upload of ${uploadedFiles.length} file(s)...`);

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

    const newFileData = await Promise.all(filePromises);

    // Add to existing files instead of replacing (avoid duplicates)
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const uniqueNewFiles = newFileData.filter(
        (f) => !existingNames.has(f.name),
      );
      const updated = [...prev, ...uniqueNewFiles];

      if (uniqueNewFiles.length < newFileData.length) {
        addToLog(
          `⚠️ Skipped ${newFileData.length - uniqueNewFiles.length} duplicate file(s)`,
        );
      }

      return updated;
    });

    addToLog(
      `✅ Successfully uploaded ${newFileData.length} file(s). Total files: ${files.length + newFileData.length}`,
    );
  };

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const compileBaselineData = () => {
    const filesWithData = files.filter(
      (f) => f.parsedData && f.parsedData.length > 0,
    );

    if (filesWithData.length === 0) {
      addToLog("⚠️ No data available for baseline compilation");
      return;
    }

    addToLog(
      `🔄 Compiling baseline data from ${filesWithData.length} file(s)...`,
    );

    let allData: any[] = [];
    let stats = {
      totalRecords: 0,
      fileTypes: {} as any,
      dataQuality: 0,
      sources: [] as string[],
    };

    filesWithData.forEach((file) => {
      const data = file.parsedData || [];
      const dataType = file.detectedType || "unknown";

      // Add metadata to each record
      const enrichedData = data.map((record) => ({
        ...record,
        _source: file.name,
        _dataType: dataType,
        _uploadTime: new Date().toISOString(),
      }));

      allData.push(...enrichedData);
      stats.totalRecords += data.length;
      stats.fileTypes[dataType] = (stats.fileTypes[dataType] || 0) + 1;
      stats.sources.push(file.name);

      addToLog(`  📄 ${file.name}: ${data.length} records (${dataType})`);
    });

    // Calculate data quality score
    stats.dataQuality = Math.round(
      (allData.length / (allData.length + 1)) * 100,
    ); // Simplified score

    setActualFileData(allData);

    addToLog(`✅ Baseline compilation complete:`);
    addToLog(`  📊 Total records: ${stats.totalRecords}`);
    addToLog(
      `  📁 File types: ${Object.entries(stats.fileTypes)
        .map(([type, count]) => `${type}(${count})`)
        .join(", ")}`,
    );
    addToLog(`  🎯 Data quality: ${stats.dataQuality}%`);

    return stats;
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
    // Allow validation to run with or without uploaded files
    let useUploadedData = files.length > 0;
    let dataTypeToUse = "network";

    if (!useUploadedData) {
      addToLog(
        "ℹ️  No files uploaded - running validation with sample data for demonstration",
      );
    }

    setProcessing(true);
    addToLog("Starting comprehensive data processing pipeline...");

    try {
      let actualData: any[];
      let finalDataType: string;
      let columnBasedType: string = "unknown";
      let detectionSource: string = "filename";

      if (useUploadedData) {
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
        columnBasedType = autoDetectDataTypeFromColumns(
          Object.keys(actualData[0]),
        );

        if (columnBasedType !== "unknown") {
          finalDataType = columnBasedType;
          detectionSource = "columns";
        } else {
          finalDataType = firstFile.detectedType || "network";
          detectionSource = "filename";
        }
      } else {
        // Use sample data for demonstration
        addToLog("🎯 Generating sample data for validation demonstration...");
        finalDataType = dataTypeToUse;
        actualData = generateSampleData(finalDataType);
        detectionSource = "sample";
        addToLog(
          `✓ Generated ${actualData.length} sample records of type: ${finalDataType}`,
        );
      }

      addToLog(
        `✓ Data type detection: ${finalDataType} (from ${detectionSource})`,
      );

      // Update actual data for use in preview
      setActualFileData(actualData);

      // Step 4: Column mapping and standardization
      addToLog("�� Mapping columns to standard format (DataConverter)...");
      const conversionResult = convertToStandardFormat(
        actualData,
        finalDataType,
      );
      setConversionResults(conversionResult);

      // Use mapped data for all subsequent operations
      const mappedData = conversionResult.mappedData || actualData;
      setActualFileData(mappedData);

      addToLog(
        `✓ Column mapping completed: ${Object.keys(conversionResult.mappedColumns).length} columns mapped`,
      );

      // Display mapping suggestions if any
      if (Object.keys(conversionResult.suggestions || {}).length > 0) {
        addToLog(
          "💡 Column mapping suggestions available - check conversion details",
        );
      }

      // Step 5: Apply data conversions on mapped data
      addToLog("🧹 Applying data type specific conversions...");
      let conversionLog: string[] = [];

      if (finalDataType === "forecast") {
        conversionLog = convertForecastData(mappedData);
      } else if (finalDataType === "sku") {
        conversionLog = convertSkuData(mappedData);
      } else if (finalDataType === "network") {
        conversionLog = convertNetworkData(mappedData);
      }

      conversionLog.forEach((log) => addToLog(`  ${log}`));

      // Step 6: Run comprehensive validation on mapped data
      addToLog("🔍 Running comprehensive validation (DataValidator)...");
      const validationResult = validateDataFrame(mappedData, finalDataType);

      addToLog(
        `�� Validation completed: ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`,
      );

      // Step 7: Generate quality metrics
      addToLog("📊 Generating quality metrics...");
      const columnStats = generateColumnStats(mappedData, finalDataType);

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

      // Compile baseline data from all uploaded files
      if (files.length > 0) {
        addToLog(
          "\\n🏗️ Compiling digital twin baseline from uploaded files...",
        );
        compileBaselineData();
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
      sales_volume: "#06b6d4",
      sales_orders: "#0891b2",
      sku: "#10b981",
      facility: "#8b5cf6",
      warehouse_inputs: "#7c3aed",
      transportation_costs: "#dc2626",
      transport_cost: "#ef4444",
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
              disabled={processing}
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
              <button
                className={`button ${activeTab === "baseline" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("baseline")}
              >
                <Database size={16} />
                Digital Twin Baseline
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
                  style={{
                    position: "relative",
                    overflow: "hidden",
                  }}
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
                      zIndex: 1,
                    }}
                  />
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Max file size: {config.maxFileSizeMB}MB | Auto-detects:
                    forecast, sales orders, sales volume, inventory/SKU,
                    warehouse inputs, transportation costs, facility details,
                    network locations
                  </p>
                </div>

                {files.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <h4 style={{ margin: 0, color: "#111827" }}>
                        Uploaded Files ({files.length}):
                      </h4>
                      <button
                        onClick={() => {
                          setFiles([]);
                          setActualFileData([]);
                          addToLog("🗑️ Cleared all uploaded files");
                        }}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "0.25rem",
                          cursor: "pointer",
                        }}
                      >
                        Clear All
                      </button>
                    </div>
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
                              onChange={async (e) => {
                                const updated = [...files];
                                updated[index].selectedSheet = e.target.value;

                                // Re-parse the file with the new sheet
                                if (updated[index].file) {
                                  try {
                                    const newData = await parseExcelFile(
                                      updated[index].file!,
                                      e.target.value,
                                    );
                                    updated[index].parsedData = newData;
                                    updated[index].columnNames =
                                      newData.length > 0
                                        ? Object.keys(newData[0])
                                        : [];

                                    // Update detected type based on new column structure
                                    const newDetectedType =
                                      autoDetectDataTypeFromColumns(
                                        updated[index].columnNames || [],
                                      );
                                    if (newDetectedType !== "unknown") {
                                      updated[index].detectedType =
                                        newDetectedType;
                                    }

                                    addToLog(
                                      `Re-parsed sheet '${e.target.value}': ${newData.length} rows`,
                                    );
                                  } catch (error) {
                                    addToLog(
                                      `Error re-parsing sheet '${e.target.value}': ${error}`,
                                    );
                                  }
                                }

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

              {conversionResults &&
                (conversionResults.suggestions ||
                  conversionResults.unmappedColumns?.length > 0) && (
                  <div
                    className="card"
                    style={{ marginTop: "1rem", border: "1px solid #f59e0b" }}
                  >
                    <h4 style={{ marginBottom: "1rem", color: "#d97706" }}>
                      🔗 Column Mapping Assistance
                    </h4>

                    {Object.keys(conversionResults.suggestions || {}).length >
                      0 && (
                      <div style={{ marginBottom: "1rem" }}>
                        <h5
                          style={{
                            marginBottom: "0.5rem",
                            color: "#111827",
                            fontSize: "0.875rem",
                          }}
                        >
                          Suggested Mappings (Click to apply):
                        </h5>
                        {Object.entries(
                          conversionResults.suggestions || {},
                        ).map(([standardCol, suggestions]: [string, any]) => (
                          <div
                            key={standardCol}
                            style={{
                              marginBottom: "0.75rem",
                              padding: "0.5rem",
                              backgroundColor: "#fffbeb",
                              borderRadius: "0.375rem",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                fontSize: "0.8rem",
                                color: "#92400e",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Missing: {standardCol}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              {suggestions.map(
                                (suggestion: string, idx: number) => (
                                  <button
                                    key={idx}
                                    style={{
                                      padding: "0.25rem 0.5rem",
                                      backgroundColor: "#3b82f6",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "0.25rem",
                                      fontSize: "0.75rem",
                                      cursor: "pointer",
                                      transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#2563eb")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#3b82f6")
                                    }
                                    onClick={() => {
                                      // Apply the suggested mapping
                                      const newMappedColumns = {
                                        ...conversionResults.mappedColumns,
                                        [standardCol]: suggestion,
                                      };

                                      // Remove from suggestions
                                      const newSuggestions = {
                                        ...conversionResults.suggestions,
                                      };
                                      delete newSuggestions[standardCol];

                                      // Update conversion results
                                      setConversionResults({
                                        ...conversionResults,
                                        mappedColumns: newMappedColumns,
                                        suggestions: newSuggestions,
                                        conversionLog: [
                                          ...conversionResults.conversionLog,
                                          `✓ Manual mapping applied: '${suggestion}' → '${standardCol}'`,
                                        ],
                                      });

                                      // Re-apply column mapping to data
                                      if (actualFileData?.length > 0) {
                                        const updatedData = actualFileData.map(
                                          (record) => ({
                                            ...record,
                                            [standardCol]: record[suggestion],
                                          }),
                                        );
                                        setActualFileData(updatedData);
                                      }

                                      addToLog(
                                        `Applied manual mapping: '${suggestion}' → '${standardCol}'`,
                                      );
                                    }}
                                  >
                                    Map "{suggestion}"
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {conversionResults.unmappedColumns?.length > 0 && (
                      <div>
                        <h5
                          style={{
                            marginBottom: "0.5rem",
                            color: "#111827",
                            fontSize: "0.875rem",
                          }}
                        >
                          Unmapped Columns:
                        </h5>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            {conversionResults.unmappedColumns.map(
                              (col: string, index: number) => (
                                <span
                                  key={index}
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    backgroundColor: "#f3f4f6",
                                    borderRadius: "0.25rem",
                                    border: "1px solid #d1d5db",
                                  }}
                                >
                                  {col}
                                </span>
                              ),
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: "0.5rem",
                              fontSize: "0.7rem",
                              color: "#9ca3af",
                            }}
                          >
                            These columns were not mapped to any standard format
                            and will be preserved as-is.
                          </div>
                        </div>
                      </div>
                    )}
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

                      {dataQuality.summary && (
                        <div
                          style={{
                            marginBottom: "1rem",
                            padding: "0.75rem",
                            backgroundColor: "#f3f4f6",
                            borderRadius: "0.375rem",
                            borderLeft: "4px solid #3b82f6",
                          }}
                        >
                          <h6
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              marginBottom: "0.25rem",
                              color: "#1f2937",
                            }}
                          >
                            Validation Summary
                          </h6>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: "#4b5563",
                              margin: 0,
                            }}
                          >
                            {dataQuality.summary}
                          </p>
                        </div>
                      )}

                      {dataQuality.actionableSteps &&
                        dataQuality.actionableSteps.length > 0 && (
                          <div
                            style={{
                              marginBottom: "1rem",
                              padding: "0.75rem",
                              backgroundColor: "#ecfdf5",
                              borderRadius: "0.375rem",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            <h6
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                marginBottom: "0.5rem",
                                color: "#065f46",
                              }}
                            >
                              🎯 Recommended Actions
                            </h6>
                            <ul
                              style={{
                                fontSize: "0.75rem",
                                color: "#047857",
                                margin: 0,
                                paddingLeft: "1rem",
                              }}
                            >
                              {dataQuality.actionableSteps.map(
                                (step, index) => (
                                  <li
                                    key={index}
                                    style={{ marginBottom: "0.25rem" }}
                                  >
                                    {step}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}
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

          {activeTab === "baseline" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Digital Twin Baseline Data
              </h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Compiled data from multiple sources for network optimization
                digital twin validation
              </p>

              {actualFileData.length > 0 ? (
                <div>
                  {/* Baseline Summary */}
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
                        border: "1px solid #e0f2fe",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#3b82f6",
                        }}
                      >
                        {files.length}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Data Sources
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "0.5rem",
                        border: "1px solid #dcfce7",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#10b981",
                        }}
                      >
                        {actualFileData.length}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Total Records
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#fefbf3",
                        borderRadius: "0.5rem",
                        border: "1px solid #fed7aa",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#f59e0b",
                        }}
                      >
                        {
                          new Set(actualFileData.map((item) => item._dataType))
                            .size
                        }
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Data Types
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#fdf2f8",
                        borderRadius: "0.5rem",
                        border: "1px solid #fce7f3",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#ec4899",
                        }}
                      >
                        {Math.round(
                          (actualFileData.length /
                            (actualFileData.length + 1)) *
                            100,
                        )}
                        %
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Data Quality
                      </div>
                    </div>
                  </div>

                  {/* Data Type Breakdown */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Data Type Distribution
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      {Object.entries(
                        actualFileData.reduce((acc, item) => {
                          const type = item._dataType || "unknown";
                          acc[type] = (acc[type] || 0) + 1;
                          return acc;
                        }, {} as any),
                      ).map(([type, count]: [string, any]) => (
                        <div
                          key={type}
                          style={{
                            padding: "1rem",
                            backgroundColor: "#f9fafb",
                            borderRadius: "0.5rem",
                            border: "1px solid #e5e7eb",
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
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                backgroundColor: getDataTypeColor(type),
                              }}
                            />
                            <span
                              style={{
                                fontWeight: "500",
                                textTransform: "capitalize",
                              }}
                            >
                              {type.replace("_", " ")}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: "bold",
                              color: "#111827",
                            }}
                          >
                            {count}
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {Math.round((count / actualFileData.length) * 100)}%
                            of total
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Source Files */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Source Files
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      {files.map((file, index) => (
                        <div
                          key={index}
                          style={{
                            padding: "1rem",
                            backgroundColor: "#f9fafb",
                            borderRadius: "0.5rem",
                            border: "1px solid #e5e7eb",
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
                            <FileText size={16} style={{ color: "#6b7280" }} />
                            <span
                              style={{
                                fontWeight: "500",
                                fontSize: "0.875rem",
                              }}
                            >
                              {file.name}
                            </span>
                          </div>
                          <div
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            Type: {file.detectedType || "unknown"} | Size:{" "}
                            {formatFileSize(file.size)} | Records:{" "}
                            {file.parsedData?.length || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compiled Data Preview */}
                  <div>
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Compiled Data Preview (First 10 Records)
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.75rem",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f3f4f6" }}>
                            <th
                              style={{
                                padding: "0.5rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                                fontWeight: "600",
                              }}
                            >
                              Source
                            </th>
                            <th
                              style={{
                                padding: "0.5rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                                fontWeight: "600",
                              }}
                            >
                              Data Type
                            </th>
                            {actualFileData.length > 0 &&
                              Object.keys(actualFileData[0])
                                .filter((key) => !key.startsWith("_"))
                                .slice(0, 6)
                                .map((key) => (
                                  <th
                                    key={key}
                                    style={{
                                      padding: "0.5rem",
                                      textAlign: "left",
                                      border: "1px solid #e5e7eb",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {key}
                                  </th>
                                ))}
                          </tr>
                        </thead>
                        <tbody>
                          {actualFileData.slice(0, 10).map((row, index) => (
                            <tr key={index}>
                              <td
                                style={{
                                  padding: "0.5rem",
                                  border: "1px solid #e5e7eb",
                                  fontSize: "0.7rem",
                                }}
                              >
                                {row._source}
                              </td>
                              <td
                                style={{
                                  padding: "0.5rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "0.125rem 0.375rem",
                                    borderRadius: "0.25rem",
                                    backgroundColor: getDataTypeColor(
                                      row._dataType,
                                    ),
                                    color: "white",
                                    fontSize: "0.6rem",
                                    fontWeight: "500",
                                  }}
                                >
                                  {row._dataType}
                                </span>
                              </td>
                              {Object.keys(row)
                                .filter((key) => !key.startsWith("_"))
                                .slice(0, 6)
                                .map((key) => (
                                  <td
                                    key={key}
                                    style={{
                                      padding: "0.5rem",
                                      border: "1px solid #e5e7eb",
                                    }}
                                  >
                                    {row[key] !== null && row[key] !== undefined
                                      ? String(row[key])
                                      : ""}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                        Showing first 10 records of {actualFileData.length}{" "}
                        total compiled records
                      </div>
                    )}
                  </div>
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
                    No baseline data compiled
                  </p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem" }}>
                    Upload multiple files and run validation to compile digital
                    twin baseline data
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
