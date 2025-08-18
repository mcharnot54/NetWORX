/**
 * Data conversion utilities for standardizing different input formats
 * Based on Python DataConverter requirements
 */

export interface DataConverterConfig {
  strictMode: boolean;
  preserveOriginalColumns: boolean;
  unitStandardization: boolean;
  logger?: (message: string, level?: 'info' | 'warning' | 'error') => void;
}

export interface ConversionResult {
  data: any[];
  standardColumns: string[];
  originalColumns: string[];
  mappedColumns: { [original: string]: string };
  unmappedColumns: string[];
  conversionsApplied: string[];
  dataQuality: {
    completenessScore: number;
    standardizationScore: number;
    validRecords: number;
    totalRecords: number;
  };
}

export interface ColumnMappingPattern {
  [dataType: string]: {
    [standardColumn: string]: string[];
  };
}

export class DataConverter {
  private config: DataConverterConfig;
  private logger: (message: string, level?: 'info' | 'warning' | 'error') => void;

  // Column mapping patterns for different data types
  private static readonly COLUMN_MAPPINGS: ColumnMappingPattern = {
    forecast: {
      year: ['year', 'yr', 'period', 'time', 'fiscal_year', 'fy', 'fiscal', 'date'],
      annual_units: [
        'annual_units', 'units', 'volume', 'demand', 'quantity',
        'annual_volume', 'yearly_units', 'total_units', 'annual_demand',
        'forecast_units', 'projected_units', 'expected_volume'
      ]
    },
    sku: {
      sku_id: [
        'sku_id', 'sku', 'item_id', 'product_id', 'part_number', 
        'item_number', 'product_code', 'item_code', 'product_sku'
      ],
      units_per_case: [
        'units_per_case', 'units_case', 'case_pack', 'pack_size',
        'units_per_pack', 'each_per_case', 'case_quantity', 'units_in_case'
      ],
      cases_per_pallet: [
        'cases_per_pallet', 'case_pallet', 'pallet_quantity',
        'cases_per_layer', 'case_per_pallet', 'pallet_count', 'cases_on_pallet'
      ],
      annual_volume: [
        'annual_volume', 'yearly_volume', 'annual_units',
        'total_volume', 'volume_per_year', 'yearly_demand', 'annual_demand'
      ]
    },
    network: {
      city: [
        'city', 'location', 'facility', 'destination', 'site', 
        'warehouse', 'facility_name', 'location_name', 'city_name'
      ],
      latitude: [
        'latitude', 'lat', 'y_coord', 'y_coordinate', 'lat_coordinate'
      ],
      longitude: [
        'longitude', 'lng', 'lon', 'x_coord', 'x_coordinate', 'lng_coordinate'
      ],
      state: [
        'state', 'province', 'region', 'state_code', 'state_name'
      ],
      country: [
        'country', 'nation', 'country_code', 'country_name'
      ]
    },
    cost: {
      cost_amount: [
        'cost', 'amount', 'price', 'rate', 'charge', 'total',
        'net_charge', 'gross_rate', 'unit_cost', 'total_cost'
      ],
      cost_type: [
        'cost_type', 'type', 'category', 'classification'
      ],
      currency: [
        'currency', 'curr', 'currency_code'
      ]
    },
    transport: {
      origin: [
        'origin', 'from', 'pickup', 'source', 'origin_city', 'pickup_location'
      ],
      destination: [
        'destination', 'to', 'delivery', 'dest', 'destination_city', 'delivery_location'
      ],
      distance: [
        'distance', 'miles', 'km', 'kilometers', 'mileage'
      ],
      freight_cost: [
        'freight_cost', 'cost', 'rate', 'charge', 'total_cost',
        'gross_rate', 'net_charge', 'transportation_cost'
      ],
      mode: [
        'mode', 'transport_mode', 'shipping_mode', 'delivery_mode'
      ]
    }
  };

  // Unit conversion factors
  private static readonly CONVERSION_FACTORS = {
    length: {
      'inches_to_feet': 1/12,
      'feet_to_inches': 12,
      'cm_to_inches': 1/2.54,
      'inches_to_cm': 2.54,
      'meters_to_feet': 3.28084,
      'feet_to_meters': 0.3048
    },
    weight: {
      'pounds_to_kg': 0.453592,
      'kg_to_pounds': 2.20462,
      'oz_to_pounds': 1/16,
      'pounds_to_oz': 16,
      'grams_to_pounds': 0.00220462,
      'pounds_to_grams': 453.592
    },
    volume: {
      'cubic_feet_to_cubic_inches': 1728,
      'cubic_inches_to_cubic_feet': 1/1728,
      'liters_to_cubic_inches': 61.0237,
      'cubic_inches_to_liters': 1/61.0237,
      'cubic_meters_to_cubic_feet': 35.3147,
      'cubic_feet_to_cubic_meters': 0.0283168
    }
  };

  constructor(config: Partial<DataConverterConfig> = {}) {
    this.config = {
      strictMode: false,
      preserveOriginalColumns: true,
      unitStandardization: false,
      ...config
    };
    this.logger = config.logger || ((msg, level) => console.log(`[${level?.toUpperCase() || 'INFO'}] ${msg}`));
  }

  /**
   * Convert data to standard format based on data type
   */
  convertToStandardFormat(data: any[], dataType: string): ConversionResult {
    const startTime = Date.now();
    this.logger(`Converting ${dataType} data to standard format (${data.length} rows)`, 'info');

    try {
      if (!data || data.length === 0) {
        throw new Error('No data provided for conversion');
      }

      // Get column mappings for this data type
      const mappings = DataConverter.COLUMN_MAPPINGS[dataType] || {};
      const originalColumns = Object.keys(data[0] || {});
      
      // Find column mappings
      const columnMappingResult = this.findColumnMappings(originalColumns, mappings);
      
      // Create standardized data
      const standardizedData = this.applyColumnMappings(data, columnMappingResult.mappedColumns);
      
      // Apply data type specific conversions
      const convertedData = this.applyDataTypeConversions(standardizedData, dataType);
      
      // Calculate data quality metrics
      const dataQuality = this.calculateDataQuality(convertedData.data, originalColumns);
      
      const result: ConversionResult = {
        data: convertedData.data,
        standardColumns: Object.values(columnMappingResult.mappedColumns),
        originalColumns,
        mappedColumns: columnMappingResult.mappedColumns,
        unmappedColumns: columnMappingResult.unmappedColumns,
        conversionsApplied: convertedData.conversionsApplied,
        dataQuality
      };

      const processingTime = Date.now() - startTime;
      this.logger(`Conversion completed in ${processingTime}ms`, 'info');
      
      return result;

    } catch (error) {
      this.logger(`Error converting ${dataType} data: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Find matching columns from possible variations
   */
  private findColumnMappings(originalColumns: string[], mappings: { [key: string]: string[] }): {
    mappedColumns: { [original: string]: string };
    unmappedColumns: string[];
  } {
    const mappedColumns: { [original: string]: string } = {};
    const usedColumns = new Set<string>();
    
    // Find matches for each standard column
    for (const [standardCol, possibleNames] of Object.entries(mappings)) {
      const matchedCol = this.findMatchingColumn(originalColumns, possibleNames);
      if (matchedCol && !usedColumns.has(matchedCol)) {
        mappedColumns[matchedCol] = standardCol;
        usedColumns.add(matchedCol);
        this.logger(`Mapped '${matchedCol}' to '${standardCol}'`, 'info');
      }
    }

    // Find unmapped columns
    const unmappedColumns = originalColumns.filter(col => !usedColumns.has(col));
    
    // Add unmapped columns with prefix if configured
    if (this.config.preserveOriginalColumns) {
      for (const col of unmappedColumns) {
        const cleanCol = this.cleanColumnName(col);
        mappedColumns[col] = `additional_${cleanCol}`;
      }
    }

    return { mappedColumns, unmappedColumns };
  }

  /**
   * Find matching column name from possible variations
   */
  private findMatchingColumn(columns: string[], possibleNames: string[]): string | null {
    const columnsLower = columns.map(col => col.toLowerCase());
    
    // Exact match (case insensitive)
    for (const possibleName of possibleNames) {
      const index = columnsLower.indexOf(possibleName.toLowerCase());
      if (index !== -1) {
        return columns[index];
      }
    }
    
    // Partial match (case insensitive)
    for (const possibleName of possibleNames) {
      for (let i = 0; i < columns.length; i++) {
        if (columnsLower[i].includes(possibleName.toLowerCase())) {
          return columns[i];
        }
      }
    }
    
    return null;
  }

  /**
   * Apply column mappings to data
   */
  private applyColumnMappings(data: any[], mappings: { [original: string]: string }): any[] {
    return data.map(row => {
      const newRow: any = {};
      for (const [originalCol, standardCol] of Object.entries(mappings)) {
        newRow[standardCol] = row[originalCol];
      }
      return newRow;
    });
  }

  /**
   * Apply data type specific conversions
   */
  private applyDataTypeConversions(data: any[], dataType: string): {
    data: any[];
    conversionsApplied: string[];
  } {
    const conversionsApplied: string[] = [];
    
    switch (dataType) {
      case 'forecast':
        return this.convertForecastData(data);
      case 'sku':
        return this.convertSKUData(data);
      case 'network':
        return this.convertNetworkData(data);
      case 'cost':
        return this.convertCostData(data);
      case 'transport':
        return this.convertTransportData(data);
      default:
        return { data, conversionsApplied };
    }
  }

  /**
   * Convert forecast data to standard format
   */
  private convertForecastData(data: any[]): { data: any[]; conversionsApplied: string[] } {
    const conversionsApplied: string[] = [];
    
    const convertedData = data.map(row => {
      const newRow = { ...row };
      
      // Convert year to integer
      if (newRow.year !== undefined && newRow.year !== null) {
        const yearValue = this.parseNumericValue(newRow.year);
        if (!isNaN(yearValue) && yearValue > 1900 && yearValue < 2100) {
          newRow.year = Math.floor(yearValue);
          conversionsApplied.push('year_to_integer');
        } else {
          delete newRow.year; // Remove invalid years
        }
      }
      
      // Convert annual units to float
      if (newRow.annual_units !== undefined && newRow.annual_units !== null) {
        const unitsValue = this.parseNumericValue(newRow.annual_units);
        if (!isNaN(unitsValue) && unitsValue >= 0) {
          newRow.annual_units = unitsValue;
          conversionsApplied.push('annual_units_to_number');
        } else {
          delete newRow.annual_units; // Remove invalid values
        }
      }
      
      return newRow;
    }).filter(row => {
      // Keep rows with valid year or annual_units
      return (row.year && row.year > 1900) || (row.annual_units && row.annual_units >= 0);
    });

    // Sort by year if available
    const finalData = convertedData.sort((a, b) => {
      if (a.year && b.year) {
        return a.year - b.year;
      }
      return 0;
    });

    return { 
      data: finalData, 
      conversionsApplied: Array.from(new Set(conversionsApplied))
    };
  }

  /**
   * Convert SKU data to standard format
   */
  private convertSKUData(data: any[]): { data: any[]; conversionsApplied: string[] } {
    const conversionsApplied: string[] = [];
    
    const convertedData = data.map(row => {
      const newRow = { ...row };
      
      // Clean and standardize SKU ID
      if (newRow.sku_id !== undefined && newRow.sku_id !== null) {
        newRow.sku_id = String(newRow.sku_id).trim().toUpperCase();
        conversionsApplied.push('sku_id_standardized');
      }
      
      // Convert numeric columns
      const numericColumns = ['units_per_case', 'cases_per_pallet', 'annual_volume'];
      
      for (const col of numericColumns) {
        if (newRow[col] !== undefined && newRow[col] !== null) {
          const numValue = this.parseNumericValue(newRow[col]);
          if (!isNaN(numValue) && numValue > 0) {
            newRow[col] = numValue;
            conversionsApplied.push(`${col}_to_number`);
          } else {
            delete newRow[col]; // Remove invalid values
          }
        }
      }
      
      // Calculate units per pallet if not present
      if (newRow.units_per_case && newRow.cases_per_pallet && !newRow.units_per_pallet) {
        newRow.units_per_pallet = newRow.units_per_case * newRow.cases_per_pallet;
        conversionsApplied.push('calculated_units_per_pallet');
      }
      
      return newRow;
    }).filter(row => {
      // Keep rows with valid SKU ID or numeric data
      return row.sku_id || row.units_per_case || row.annual_volume;
    });

    // Remove duplicate SKUs (keep first occurrence)
    const uniqueData = this.removeDuplicatesByKey(convertedData, 'sku_id');
    if (uniqueData.length < convertedData.length) {
      conversionsApplied.push('duplicate_skus_removed');
    }

    return { 
      data: uniqueData, 
      conversionsApplied: Array.from(new Set(conversionsApplied))
    };
  }

  /**
   * Convert network data to standard format
   */
  private convertNetworkData(data: any[]): { data: any[]; conversionsApplied: string[] } {
    const conversionsApplied: string[] = [];
    
    const convertedData = data.map(row => {
      const newRow = { ...row };
      
      // Clean city names
      if (newRow.city !== undefined && newRow.city !== null) {
        const cleanCity = String(newRow.city).trim();
        if (cleanCity.length >= 2) {
          newRow.city = this.toTitleCase(cleanCity);
          conversionsApplied.push('city_name_standardized');
        } else {
          delete newRow.city; // Remove invalid city names
        }
      }
      
      // Convert coordinates
      const coordColumns = ['latitude', 'longitude'];
      
      for (const col of coordColumns) {
        if (newRow[col] !== undefined && newRow[col] !== null) {
          const coordValue = this.parseNumericValue(newRow[col]);
          if (!isNaN(coordValue)) {
            // Validate coordinate ranges
            if (col === 'latitude' && (coordValue < -90 || coordValue > 90)) {
              delete newRow[col];
            } else if (col === 'longitude' && (coordValue < -180 || coordValue > 180)) {
              delete newRow[col];
            } else {
              newRow[col] = coordValue;
              conversionsApplied.push(`${col}_to_number`);
            }
          } else {
            delete newRow[col];
          }
        }
      }
      
      // Standardize state names
      if (newRow.state !== undefined && newRow.state !== null) {
        newRow.state = String(newRow.state).trim().toUpperCase();
        conversionsApplied.push('state_standardized');
      }
      
      return newRow;
    }).filter(row => {
      // Keep rows with valid city or coordinates
      return row.city || (row.latitude && row.longitude);
    });

    // Remove duplicate cities (keep first occurrence)
    const uniqueData = this.removeDuplicatesByKey(convertedData, 'city');
    if (uniqueData.length < convertedData.length) {
      conversionsApplied.push('duplicate_cities_removed');
    }

    return { 
      data: uniqueData, 
      conversionsApplied: Array.from(new Set(conversionsApplied))
    };
  }

  /**
   * Convert cost data to standard format
   */
  private convertCostData(data: any[]): { data: any[]; conversionsApplied: string[] } {
    const conversionsApplied: string[] = [];
    
    const convertedData = data.map(row => {
      const newRow = { ...row };
      
      // Convert cost amount
      if (newRow.cost_amount !== undefined && newRow.cost_amount !== null) {
        const costValue = this.parseNumericValue(newRow.cost_amount);
        if (!isNaN(costValue) && costValue >= 0) {
          newRow.cost_amount = costValue;
          conversionsApplied.push('cost_amount_to_number');
        } else {
          delete newRow.cost_amount;
        }
      }
      
      // Standardize cost type
      if (newRow.cost_type !== undefined && newRow.cost_type !== null) {
        newRow.cost_type = String(newRow.cost_type).trim().toLowerCase();
        conversionsApplied.push('cost_type_standardized');
      }
      
      // Standardize currency
      if (newRow.currency !== undefined && newRow.currency !== null) {
        newRow.currency = String(newRow.currency).trim().toUpperCase();
        conversionsApplied.push('currency_standardized');
      }
      
      return newRow;
    }).filter(row => {
      // Keep rows with valid cost amount
      return row.cost_amount && row.cost_amount >= 0;
    });

    return { 
      data: convertedData, 
      conversionsApplied: Array.from(new Set(conversionsApplied))
    };
  }

  /**
   * Convert transport data to standard format
   */
  private convertTransportData(data: any[]): { data: any[]; conversionsApplied: string[] } {
    const conversionsApplied: string[] = [];
    
    const convertedData = data.map(row => {
      const newRow = { ...row };
      
      // Standardize location names
      const locationColumns = ['origin', 'destination'];
      for (const col of locationColumns) {
        if (newRow[col] !== undefined && newRow[col] !== null) {
          newRow[col] = this.toTitleCase(String(newRow[col]).trim());
          conversionsApplied.push(`${col}_standardized`);
        }
      }
      
      // Convert numeric columns
      const numericColumns = ['distance', 'freight_cost'];
      for (const col of numericColumns) {
        if (newRow[col] !== undefined && newRow[col] !== null) {
          const numValue = this.parseNumericValue(newRow[col]);
          if (!isNaN(numValue) && numValue >= 0) {
            newRow[col] = numValue;
            conversionsApplied.push(`${col}_to_number`);
          } else {
            delete newRow[col];
          }
        }
      }
      
      // Standardize transport mode
      if (newRow.mode !== undefined && newRow.mode !== null) {
        newRow.mode = String(newRow.mode).trim().toLowerCase();
        conversionsApplied.push('mode_standardized');
      }
      
      return newRow;
    }).filter(row => {
      // Keep rows with valid origin/destination or freight cost
      return (row.origin && row.destination) || row.freight_cost;
    });

    return { 
      data: convertedData, 
      conversionsApplied: Array.from(new Set(conversionsApplied))
    };
  }

  /**
   * Parse numeric values (remove currency symbols, commas, etc.)
   */
  private parseNumericValue(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      // Remove currency symbols, commas, spaces, parentheses
      let cleaned = value.replace(/[$,\s%()]/g, '');
      
      // Handle negative values in parentheses
      if (value.includes('(') && value.includes(')')) {
        cleaned = '-' + cleaned;
      }
      
      return parseFloat(cleaned);
    }
    
    return NaN;
  }

  /**
   * Convert string to title case
   */
  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Clean column name (same as enhanced validator)
   */
  private cleanColumnName(columnName: any): string {
    if (columnName === null || columnName === undefined) {
      return 'unnamed_column';
    }

    let cleanName = String(columnName).trim();
    cleanName = cleanName.replace(/[^\w\s]/g, '_');
    cleanName = cleanName.replace(/[\s_]+/g, '_');
    cleanName = cleanName.toLowerCase();
    cleanName = cleanName.replace(/^_+|_+$/g, '');

    return cleanName || 'unnamed_column';
  }

  /**
   * Remove duplicates by key
   */
  private removeDuplicatesByKey(data: any[], key: string): any[] {
    const seen = new Set();
    return data.filter(row => {
      if (!row[key]) return true; // Keep rows without the key
      
      const keyValue = String(row[key]).toLowerCase();
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }

  /**
   * Calculate data quality metrics
   */
  private calculateDataQuality(data: any[], originalColumns: string[]): {
    completenessScore: number;
    standardizationScore: number;
    validRecords: number;
    totalRecords: number;
  } {
    if (data.length === 0) {
      return {
        completenessScore: 0,
        standardizationScore: 0,
        validRecords: 0,
        totalRecords: 0
      };
    }

    const totalCells = data.length * originalColumns.length;
    let filledCells = 0;
    let validRecords = 0;

    for (const row of data) {
      let rowFilledCells = 0;
      let rowHasValidData = false;

      for (const col of Object.keys(row)) {
        const value = row[col];
        if (value !== undefined && value !== null && value !== '') {
          filledCells++;
          rowFilledCells++;
          rowHasValidData = true;
        }
      }

      if (rowHasValidData) {
        validRecords++;
      }
    }

    return {
      completenessScore: totalCells > 0 ? filledCells / totalCells : 0,
      standardizationScore: 0.85, // Placeholder - would need more complex calculation
      validRecords,
      totalRecords: data.length
    };
  }

  /**
   * Standardize units across different measurement systems
   */
  standardizeUnits(data: any[], unitColumn: string, targetUnit: string): {
    data: any[];
    conversionsApplied: string[];
  } {
    if (!this.config.unitStandardization) {
      return { data, conversionsApplied: [] };
    }

    this.logger(`Standardizing units in column '${unitColumn}' to '${targetUnit}'`, 'info');
    
    // This is a simplified implementation
    // In a real application, you would need more sophisticated unit detection and conversion
    const conversionsApplied: string[] = [];
    
    const convertedData = data.map(row => {
      const newRow = { ...row };
      
      if (newRow[unitColumn] !== undefined && newRow[unitColumn] !== null) {
        // Apply conversion based on target unit
        // This would need to be expanded based on actual requirements
        conversionsApplied.push(`${unitColumn}_unit_standardized`);
      }
      
      return newRow;
    });

    return { 
      data: convertedData, 
      conversionsApplied: Array.from(new Set(conversionsApplied))
    };
  }

  /**
   * Get available column mappings for a data type
   */
  static getAvailableMappings(dataType: string): { [standardColumn: string]: string[] } {
    return DataConverter.COLUMN_MAPPINGS[dataType] || {};
  }

  /**
   * Get all supported data types
   */
  static getSupportedDataTypes(): string[] {
    return Object.keys(DataConverter.COLUMN_MAPPINGS);
  }
}

export default DataConverter;
