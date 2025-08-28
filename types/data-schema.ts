// Comprehensive data schema types for NetWORX Essentials operational reporting

export interface DataField {
  primaryCategory: string;
  secondaryCategory: string;
  dataField: string;
  description: string;
  useReason: string;
}

// Operational Reporting Categories
export interface NetworkFootprintCapacity {
  dcSqFt?: number;
  facilityCapacity?: number;
  storageSpaceUtilized?: number;
  dockDoorAvailability?: number;
  skuCountPerDc?: number;
  shipmentsPerDay?: number;
  receivedPallets?: number;
  shippedPallets?: number;
  inventoryThroughput?: number;
  orderFulfillmentTime?: number;
  inventoryValue?: number;
}

export interface OrderPaymentData {
  customerName?: string;
  freightClass?: string;
  orderDeliveryQuantities?: number;
  shipmentWeight?: number;
  shipmentDimensions?: string;
  customerShipToRegion?: string;
  orderShipMethods?: string;
  customerOrderNumber?: number;
  locationShippingTo?: string;
  skuDemand?: number;
  totalNumberOfUnits?: number;
  inventoryOnHand?: number;
}

export interface OrderShipmentData {
  facilityDcRegLocation?: string;
  purchaseOrderNumber?: number;
  receivedShipmentLocations?: string;
  inboundPurchaseOrderData?: string;
  skuQuantityPerEach?: number;
  orderShipmentDataFromDc?: string;
  orderFulfillmentTime?: number;
  orderFulfillmentCycleSolution?: string;
  actualShipmentDataFromDc?: string;
  orderReceivedAtDc?: string;
  customerShipToRegion?: string;
  routeDcToCustomer?: string;
  skuDemand?: number;
}

export interface OperationalPerformanceMetrics {
  shipmentQualityPercentage?: number;
  lineItemAccuracy?: number;
  inventoryAccuracy?: number;
  inventoryCount?: number;
  onTimeDeliveryTime?: number;
  customerComplaint?: number;
  shippedPerfectOrder?: number;
  totalNumberOfUnitsOrOrder?: number;
  shipmentOtdPercentage?: number;
  inventoryTurns?: number;
  inventoryService?: number;
  capacityUtilization?: number;
  capacityUtilizationPercentage?: number;
}

// Business Financials Categories
export interface CostFinancialData {
  warehouseOperatingCost?: number;
  leaseOrPurchaseCost?: number;
  inventoryCarryingCost?: number;
  carrierCost?: number;
  freightCostPerLb?: number;
  operationalStatementRevActualBudget?: string;
  operationalStatements?: string;
}

// Sales Growth Trajectory Categories
export interface HistoricalSalesData {
  historicalSalesData?: number;
  historicalSalesDataCustomerLevel?: number;
  skuSalesVelocity?: number;
  customerOrderHistory?: number;
  skuTotalValue?: number;
  salesChannel?: string;
  forecastDemand?: number;
}

export interface DemandProjectionForecast {
  channelSegments?: string;
  demandForecast?: string;
  forecastUnits?: number;
}

export interface GrowthForecast {
  forecastUnits?: number;
}

// Combined operational data structure
export interface OperationalReportingData {
  networkFootprintCapacity?: NetworkFootprintCapacity;
  orderPaymentData?: OrderPaymentData;
  orderShipmentData?: OrderShipmentData;
  operationalPerformanceMetrics?: OperationalPerformanceMetrics;
}

export interface BusinessFinancialsData {
  costFinancialData?: CostFinancialData;
}

export interface SalesGrowthTrajectoryData {
  historicalSalesData?: HistoricalSalesData;
  demandProjectionForecast?: DemandProjectionForecast;
  growthForecast?: GrowthForecast;
}

// Master data structure for all categories
export interface ComprehensiveOperationalData {
  operationalReporting?: OperationalReportingData;
  businessFinancials?: BusinessFinancialsData;
  salesGrowthTrajectory?: SalesGrowthTrajectoryData;
  metadata?: {
    fileSource?: string;
    dataQuality?: DataQualityMetrics;
    validationResults?: ValidationResult[];
    lastProcessed?: string;
    imputationInfo?: {
      methodUsed: string[];
      totalImputed: number;
      averageConfidence: number;
      qualityMetrics: any;
      imputedFields: any[];
    };
    productionProcessing?: {
      calculationResults: any;
      qualityAssessment: any;
      processingTime: number;
    };
    [key: string]: any; // Allow additional dynamic properties
  };
}

// Data validation structures
export interface DataQualityMetrics {
  completeness: number; // Percentage of required fields filled
  accuracy: number; // Percentage of valid values
  consistency: number; // Percentage of consistent data across fields
  timeliness: number; // Data freshness score
  validRecords: number;
  totalRecords: number;
  missingFields: string[];
  invalidValues: { field: string; value: any; reason: string }[];
}

export interface ValidationResult {
  field: string;
  value: any;
  isValid: boolean;
  errorMessage?: string;
  suggestion?: string;
}

// File processing results
export interface ProcessingResult {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
  summary?: {
    totalRows: number;
    validRows: number;
    skippedRows: number;
    dataQuality: DataQualityMetrics;
  };
}

// Data mapping configuration for file imports
export interface DataFieldMapping {
  sourceColumn: string;
  targetField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: string[];
  };
  transformation?: {
    type: 'lowercase' | 'uppercase' | 'trim' | 'parseNumber' | 'parseDate';
    format?: string;
  };
}

export interface DataMappingTemplate {
  name: string;
  description: string;
  targetCategory: 'operationalReporting' | 'businessFinancials' | 'salesGrowthTrajectory';
  targetSubcategory: string;
  mappings: DataFieldMapping[];
  requiredColumns: string[];
  optionalColumns: string[];
}

// Predefined data mapping templates
export const DATA_MAPPING_TEMPLATES: DataMappingTemplate[] = [
  {
    name: 'Network Footprint & Capacity',
    description: 'DC square footage, facility capacity, storage utilization data',
    targetCategory: 'operationalReporting',
    targetSubcategory: 'networkFootprintCapacity',
    mappings: [
      { sourceColumn: 'DC Sq Ft', targetField: 'dcSqFt', dataType: 'number', required: true },
      { sourceColumn: 'Facility Capacity', targetField: 'facilityCapacity', dataType: 'number', required: true },
      { sourceColumn: 'Storage Space Utilized', targetField: 'storageSpaceUtilized', dataType: 'number', required: false },
      { sourceColumn: 'Dock Door Availability', targetField: 'dockDoorAvailability', dataType: 'number', required: false },
    ],
    requiredColumns: ['DC Sq Ft', 'Facility Capacity'],
    optionalColumns: ['Storage Space Utilized', 'Dock Door Availability', 'SKU Count per DC']
  },
  {
    name: 'Order & Payment Data',
    description: 'Customer orders, freight class, delivery quantities',
    targetCategory: 'operationalReporting',
    targetSubcategory: 'orderPaymentData',
    mappings: [
      { sourceColumn: 'Customer Name', targetField: 'customerName', dataType: 'string', required: true },
      { sourceColumn: 'Freight Class', targetField: 'freightClass', dataType: 'string', required: false },
      { sourceColumn: 'Order Delivery Quantities', targetField: 'orderDeliveryQuantities', dataType: 'number', required: true },
      { sourceColumn: 'Shipment Weight', targetField: 'shipmentWeight', dataType: 'number', required: false },
    ],
    requiredColumns: ['Customer Name', 'Order Delivery Quantities'],
    optionalColumns: ['Freight Class', 'Shipment Weight', 'Customer Ship-To Region']
  },
  {
    name: 'Cost & Financial Data',
    description: 'Warehouse operating costs, lease costs, inventory carrying costs',
    targetCategory: 'businessFinancials',
    targetSubcategory: 'costFinancialData',
    mappings: [
      { sourceColumn: 'Warehouse Operating Cost', targetField: 'warehouseOperatingCost', dataType: 'number', required: true },
      { sourceColumn: 'Lease or Purchase Cost', targetField: 'leaseOrPurchaseCost', dataType: 'number', required: false },
      { sourceColumn: 'Inventory Carrying Cost', targetField: 'inventoryCarryingCost', dataType: 'number', required: false },
      { sourceColumn: 'Carrier Cost', targetField: 'carrierCost', dataType: 'number', required: false },
    ],
    requiredColumns: ['Warehouse Operating Cost'],
    optionalColumns: ['Lease or Purchase Cost', 'Inventory Carrying Cost', 'Carrier Cost']
  },
  {
    name: 'Historical Sales Data',
    description: 'Historical sales data, customer-level data, SKU sales velocity',
    targetCategory: 'salesGrowthTrajectory',
    targetSubcategory: 'historicalSalesData',
    mappings: [
      { sourceColumn: 'Historical Sales Data', targetField: 'historicalSalesData', dataType: 'number', required: true },
      { sourceColumn: 'SKU Sales Velocity', targetField: 'skuSalesVelocity', dataType: 'number', required: false },
      { sourceColumn: 'Customer Order History', targetField: 'customerOrderHistory', dataType: 'number', required: false },
      { sourceColumn: 'SKU Total Value', targetField: 'skuTotalValue', dataType: 'number', required: false },
    ],
    requiredColumns: ['Historical Sales Data'],
    optionalColumns: ['SKU Sales Velocity', 'Customer Order History', 'SKU Total Value']
  }
];
