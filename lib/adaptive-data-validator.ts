// Enhanced Data Validator with Adaptive Template System
// This system learns from uploaded files and creates flexible mappings

import type {
  ComprehensiveOperationalData,
  DataQualityMetrics,
  ValidationResult,
  ProcessingResult,
  DataFieldMapping,
  DataMappingTemplate
} from '@/types/data-schema';

export interface ColumnAnalysis {
  columnName: string;
  sampleValues: any[];
  detectedType: 'string' | 'number' | 'boolean' | 'date' | 'mixed';
  nullCount: number;
  uniqueValues: number;
  avgLength?: number;
  containsNumbers: boolean;
  containsDates: boolean;
  patternAnalysis: {
    likelyId: boolean;
    likelyName: boolean;
    likelyAddress: boolean;
    likelyAmount: boolean;
    likelyDate: boolean;
    likelyCategory: boolean;
    likelyQuantity: boolean;
    likelyPercentage: boolean;
  };
}

export interface AdaptiveTemplate {
  id: string;
  name: string;
  description: string;
  confidence: number;
  sourceFileName: string;
  columnAnalysis: ColumnAnalysis[];
  suggestedMappings: Array<{
    sourceColumn: string;
    targetCategory: 'operationalReporting' | 'businessFinancials' | 'salesGrowthTrajectory';
    targetSubcategory: string;
    targetField: string;
    confidence: number;
    reasoning: string;
  }>;
  dataPatterns: {
    hasGeographicData: boolean;
    hasFinancialData: boolean;
    hasDateSequences: boolean;
    hasQuantities: boolean;
    hasCategories: boolean;
    hasPerformanceMetrics: boolean;
  };
}

export class AdaptiveDataValidator {
  
  // Comprehensive keyword patterns for different business data types
  private static readonly COLUMN_PATTERNS = {
    // Geographic/Location patterns
    geographic: [
      'state', 'region', 'city', 'zip', 'postal', 'country', 'location', 'address',
      'facility', 'warehouse', 'dc', 'distribution', 'center', 'site', 'branch'
    ],
    
    // Financial patterns
    financial: [
      'cost', 'price', 'amount', 'revenue', 'sales', 'expense', 'budget', 'profit',
      'total', 'value', 'dollar', 'usd', 'currency', 'invoice', 'payment', 'billing'
    ],
    
    // Quantity/Volume patterns
    quantity: [
      'quantity', 'qty', 'count', 'volume', 'units', 'pieces', 'each', 'tons',
      'pounds', 'kg', 'weight', 'capacity', 'throughput', 'demand'
    ],
    
    // Performance/Metrics patterns
    performance: [
      'percentage', 'percent', 'ratio', 'rate', 'accuracy', 'efficiency', 'utilization',
      'performance', 'metric', 'kpi', 'score', 'index', 'otd', 'delivery'
    ],
    
    // Date/Time patterns
    temporal: [
      'date', 'time', 'year', 'month', 'week', 'day', 'period', 'quarter',
      'created', 'updated', 'modified', 'start', 'end', 'due'
    ],
    
    // Identifier patterns
    identifier: [
      'id', 'number', 'code', 'ref', 'reference', 'sku', 'part', 'item',
      'order', 'invoice', 'po', 'tracking', 'serial'
    ],
    
    // Name/Description patterns
    descriptive: [
      'name', 'description', 'title', 'label', 'category', 'type', 'class',
      'group', 'segment', 'channel', 'method', 'mode'
    ],
    
    // Operational specific patterns
    operational: [
      'shipment', 'freight', 'carrier', 'route', 'delivery', 'receiving',
      'inventory', 'stock', 'fulfillment', 'processing', 'handling'
    ]
  };

  // Business context mappings for categorization
  private static readonly BUSINESS_CONTEXTS = {
    networkFootprint: ['facility', 'warehouse', 'dc', 'capacity', 'sqft', 'space', 'dock', 'doors'],
    orderManagement: ['order', 'customer', 'shipment', 'delivery', 'fulfillment'],
    inventory: ['inventory', 'stock', 'sku', 'units', 'throughput', 'turns'],
    financialOperations: ['cost', 'expense', 'budget', 'revenue', 'profit', 'pricing'],
    salesGrowth: ['sales', 'growth', 'forecast', 'demand', 'projection', 'historical'],
    performance: ['accuracy', 'efficiency', 'otd', 'quality', 'utilization', 'metrics']
  };

  /**
   * Analyze column structure and content to understand data patterns
   */
  static analyzeColumns(data: any[]): ColumnAnalysis[] {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0] || {});
    const analyses: ColumnAnalysis[] = [];

    for (const columnName of columns) {
      const values = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== '');
      const sampleValues = values.slice(0, Math.min(10, values.length));
      const nullCount = data.length - values.length;

      // Type detection
      const detectedType = this.detectColumnType(values);
      
      // Pattern analysis
      const patternAnalysis = this.analyzeColumnPatterns(columnName, sampleValues);

      analyses.push({
        columnName,
        sampleValues,
        detectedType,
        nullCount,
        uniqueValues: new Set(values).size,
        avgLength: this.calculateAverageLength(values),
        containsNumbers: this.containsNumbers(values),
        containsDates: this.containsDates(values),
        patternAnalysis
      });
    }

    return analyses;
  }

  /**
   * Create adaptive template from file analysis
   */
  static createAdaptiveTemplate(
    fileName: string,
    data: any[],
    columnAnalysis: ColumnAnalysis[]
  ): AdaptiveTemplate {
    const dataPatterns = this.detectDataPatterns(columnAnalysis);
    const suggestedMappings = this.generateColumnMappings(columnAnalysis, fileName);
    
    // Calculate overall confidence based on pattern matches
    const confidence = this.calculateTemplateConfidence(suggestedMappings);

    return {
      id: `adaptive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Adaptive Template for ${fileName}`,
      description: `Auto-generated template based on analysis of ${fileName}`,
      confidence,
      sourceFileName: fileName,
      columnAnalysis,
      suggestedMappings,
      dataPatterns
    };
  }

  /**
   * Process data using adaptive template with flexible validation
   */
  static processWithAdaptiveTemplate(
    data: any[],
    adaptiveTemplate: AdaptiveTemplate
  ): ProcessingResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validationResults: ValidationResult[] = [];
    const processedData: any[] = [];
    
    let validRows = 0;
    let skippedRows = 0;

    // Group mappings by target category
    const mappingsByCategory = this.groupMappingsByCategory(adaptiveTemplate.suggestedMappings);

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      const processedRow: any = {};
      let isValidRow = true;
      let hasAnyData = false;

      // Process each mapping with flexible validation
      for (const mapping of adaptiveTemplate.suggestedMappings) {
        const sourceValue = row[mapping.sourceColumn];
        
        if (sourceValue !== null && sourceValue !== undefined && sourceValue !== '') {
          hasAnyData = true;
          
          // Flexible validation - attempt to clean and convert data
          const cleanedValue = this.cleanValue(sourceValue, mapping.targetField);
          const validation = this.flexibleValidation(cleanedValue, mapping);
          
          validationResults.push(validation);
          
          if (!validation.isValid) {
            warnings.push(`Row ${rowIndex + 1}, Field '${mapping.targetField}': ${validation.errorMessage}`);
            // Don't mark row as invalid for minor issues, just log warning
          } else {
            processedRow[mapping.targetField] = validation.value;
          }
        }
      }

      // Only skip rows that have no useful data at all
      if (!hasAnyData) {
        skippedRows++;
        continue;
      }

      if (isValidRow || Object.keys(processedRow).length > 0) {
        processedData.push(processedRow);
        validRows++;
      } else {
        skippedRows++;
      }
    }

    // Build comprehensive data structure
    const comprehensiveData = this.buildComprehensiveData(processedData, mappingsByCategory);
    
    // Calculate flexible data quality metrics
    const dataQuality = this.calculateFlexibleDataQuality(data, validationResults, adaptiveTemplate);

    return {
      success: validRows > 0, // Success if we got any valid data
      data: comprehensiveData,
      errors,
      warnings,
      summary: {
        totalRows: data.length,
        validRows,
        skippedRows,
        dataQuality
      }
    };
  }

  // Helper methods for data analysis

  private static detectColumnType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'mixed' {
    if (values.length === 0) return 'string';

    const types = new Set();
    
    for (const value of values.slice(0, 20)) { // Sample first 20 values
      if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(value)))) {
        types.add('number');
      } else if (this.isDateLike(value)) {
        types.add('date');
      } else if (typeof value === 'boolean' || ['true', 'false', '1', '0', 'yes', 'no'].includes(String(value).toLowerCase())) {
        types.add('boolean');
      } else {
        types.add('string');
      }
    }

    if (types.size > 1) return 'mixed';
    return Array.from(types)[0] as any;
  }

  private static analyzeColumnPatterns(columnName: string, sampleValues: any[]): ColumnAnalysis['patternAnalysis'] {
    const name = columnName.toLowerCase();
    
    return {
      likelyId: this.matchesPatterns(name, this.COLUMN_PATTERNS.identifier),
      likelyName: this.matchesPatterns(name, this.COLUMN_PATTERNS.descriptive),
      likelyAddress: this.matchesPatterns(name, this.COLUMN_PATTERNS.geographic),
      likelyAmount: this.matchesPatterns(name, this.COLUMN_PATTERNS.financial),
      likelyDate: this.matchesPatterns(name, this.COLUMN_PATTERNS.temporal) || this.containsDates(sampleValues),
      likelyCategory: this.matchesPatterns(name, this.COLUMN_PATTERNS.descriptive),
      likelyQuantity: this.matchesPatterns(name, this.COLUMN_PATTERNS.quantity),
      likelyPercentage: name.includes('percent') || name.includes('%') || 
                       sampleValues.some(v => String(v).includes('%'))
    };
  }

  private static matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  private static detectDataPatterns(columnAnalysis: ColumnAnalysis[]): AdaptiveTemplate['dataPatterns'] {
    const columns = columnAnalysis.map(c => c.columnName.toLowerCase()).join(' ');
    
    return {
      hasGeographicData: this.matchesPatterns(columns, this.COLUMN_PATTERNS.geographic),
      hasFinancialData: this.matchesPatterns(columns, this.COLUMN_PATTERNS.financial),
      hasDateSequences: columnAnalysis.some(c => c.patternAnalysis.likelyDate),
      hasQuantities: this.matchesPatterns(columns, this.COLUMN_PATTERNS.quantity),
      hasCategories: this.matchesPatterns(columns, this.COLUMN_PATTERNS.descriptive),
      hasPerformanceMetrics: this.matchesPatterns(columns, this.COLUMN_PATTERNS.performance)
    };
  }

  private static generateColumnMappings(
    columnAnalysis: ColumnAnalysis[],
    fileName: string
  ): AdaptiveTemplate['suggestedMappings'] {
    const mappings: AdaptiveTemplate['suggestedMappings'] = [];

    for (const column of columnAnalysis) {
      const mapping = this.inferColumnMapping(column, fileName);
      if (mapping) {
        mappings.push(mapping);
      }
    }

    return mappings;
  }

  private static inferColumnMapping(
    column: ColumnAnalysis,
    fileName: string
  ): AdaptiveTemplate['suggestedMappings'][0] | null {
    const name = column.columnName.toLowerCase();
    const fileContext = fileName.toLowerCase();

    // Determine target category based on file name and column patterns
    let targetCategory: 'operationalReporting' | 'businessFinancials' | 'salesGrowthTrajectory';
    let targetSubcategory: string;
    let targetField: string;
    let confidence = 0;
    let reasoning = '';

    // Category inference logic
    if (this.matchesPatterns(fileContext, ['budget', 'expense', 'cost', 'financial']) ||
        column.patternAnalysis.likelyAmount) {
      targetCategory = 'businessFinancials';
      targetSubcategory = 'costFinancialData';
      confidence += 0.3;
      reasoning += 'Financial context detected; ';
    } else if (this.matchesPatterns(fileContext, ['sales', 'growth', 'forecast', 'demand']) ||
               this.matchesPatterns(name, ['sales', 'revenue', 'forecast', 'demand'])) {
      targetCategory = 'salesGrowthTrajectory';
      targetSubcategory = 'historicalSalesData';
      confidence += 0.3;
      reasoning += 'Sales/growth context detected; ';
    } else {
      targetCategory = 'operationalReporting';
      targetSubcategory = this.determineOperationalSubcategory(column, fileContext);
      confidence += 0.2;
      reasoning += 'Operational context detected; ';
    }

    // Field name mapping with flexible matching
    targetField = this.mapToTargetField(column, targetCategory, targetSubcategory);
    
    // Confidence scoring
    if (column.patternAnalysis.likelyAmount && targetCategory === 'businessFinancials') confidence += 0.4;
    if (column.patternAnalysis.likelyQuantity) confidence += 0.3;
    if (column.patternAnalysis.likelyPercentage) confidence += 0.2;
    if (column.nullCount / (column.nullCount + column.sampleValues.length) < 0.1) confidence += 0.1;

    reasoning += `Column type: ${column.detectedType}; Null rate: ${(column.nullCount / (column.nullCount + column.sampleValues.length) * 100).toFixed(1)}%`;

    return {
      sourceColumn: column.columnName,
      targetCategory,
      targetSubcategory,
      targetField,
      confidence: Math.min(confidence, 1),
      reasoning
    };
  }

  private static determineOperationalSubcategory(column: ColumnAnalysis, fileContext: string): string {
    const name = column.columnName.toLowerCase();
    
    if (this.matchesPatterns(name + ' ' + fileContext, this.BUSINESS_CONTEXTS.networkFootprint)) {
      return 'networkFootprintCapacity';
    } else if (this.matchesPatterns(name + ' ' + fileContext, this.BUSINESS_CONTEXTS.orderManagement)) {
      return 'orderPaymentData';
    } else if (this.matchesPatterns(name + ' ' + fileContext, this.BUSINESS_CONTEXTS.performance)) {
      return 'operationalPerformanceMetrics';
    } else {
      return 'orderShipmentData';
    }
  }

  private static mapToTargetField(
    column: ColumnAnalysis,
    category: string,
    subcategory: string
  ): string {
    // Create a standardized field name from the source column
    let fieldName = column.columnName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/\s+/g, '');

    // Add context-specific prefixes/suffixes
    if (column.patternAnalysis.likelyAmount) {
      if (!fieldName.includes('cost') && !fieldName.includes('amount') && !fieldName.includes('price')) {
        fieldName += 'Amount';
      }
    }
    
    if (column.patternAnalysis.likelyQuantity) {
      if (!fieldName.includes('qty') && !fieldName.includes('count') && !fieldName.includes('quantity')) {
        fieldName += 'Quantity';
      }
    }

    if (column.patternAnalysis.likelyPercentage) {
      if (!fieldName.includes('percent') && !fieldName.includes('rate')) {
        fieldName += 'Percentage';
      }
    }

    return fieldName;
  }

  private static groupMappingsByCategory(mappings: AdaptiveTemplate['suggestedMappings']) {
    const grouped: Record<string, AdaptiveTemplate['suggestedMappings']> = {};
    
    for (const mapping of mappings) {
      const key = `${mapping.targetCategory}.${mapping.targetSubcategory}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapping);
    }
    
    return grouped;
  }

  private static buildComprehensiveData(
    processedData: any[],
    mappingsByCategory: Record<string, AdaptiveTemplate['suggestedMappings']>
  ): ComprehensiveOperationalData {
    const result: ComprehensiveOperationalData = {
      metadata: {
        lastProcessed: new Date().toISOString()
      }
    };

    // Aggregate data by category
    const aggregatedData = this.aggregateProcessedData(processedData);

    for (const [categoryKey, mappings] of Object.entries(mappingsByCategory)) {
      const [category, subcategory] = categoryKey.split('.');
      
      if (category === 'operationalReporting') {
        if (!result.operationalReporting) result.operationalReporting = {};
        result.operationalReporting[subcategory] = aggregatedData;
      } else if (category === 'businessFinancials') {
        if (!result.businessFinancials) result.businessFinancials = {};
        result.businessFinancials[subcategory] = aggregatedData;
      } else if (category === 'salesGrowthTrajectory') {
        if (!result.salesGrowthTrajectory) result.salesGrowthTrajectory = {};
        result.salesGrowthTrajectory[subcategory] = aggregatedData;
      }
    }

    return result;
  }

  private static aggregateProcessedData(data: any[]): any {
    if (data.length === 0) return {};
    
    const aggregated: any = {};
    const keys = Object.keys(data[0]);
    
    for (const key of keys) {
      const values = data.map(row => row[key]).filter(val => val !== null && val !== undefined);
      
      if (values.length === 0) continue;
      
      if (typeof values[0] === 'number') {
        aggregated[key] = {
          total: values.reduce((sum, val) => sum + val, 0),
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          values: values
        };
      } else {
        aggregated[key] = {
          uniqueValues: Array.from(new Set(values)),
          count: values.length,
          values: values
        };
      }
    }
    
    return aggregated;
  }

  // Utility methods
  private static calculateAverageLength(values: any[]): number {
    const lengths = values.map(v => String(v).length);
    return lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
  }

  private static containsNumbers(values: any[]): boolean {
    return values.some(v => typeof v === 'number' || !isNaN(Number(v)));
  }

  private static containsDates(values: any[]): boolean {
    return values.some(v => this.isDateLike(v));
  }

  private static isDateLike(value: any): boolean {
    if (!value) return false;
    const str = String(value);
    return !isNaN(Date.parse(str)) || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) || /\d{4}-\d{2}-\d{2}/.test(str);
  }

  private static cleanValue(value: any, targetField: string): any {
    if (value === null || value === undefined) return value;
    
    let cleaned = value;
    
    // Remove common formatting
    if (typeof cleaned === 'string') {
      cleaned = cleaned.trim();
      
      // Clean currency symbols
      if (targetField.toLowerCase().includes('cost') || targetField.toLowerCase().includes('amount')) {
        cleaned = cleaned.replace(/[$,\s]/g, '');
      }
      
      // Clean percentages
      if (targetField.toLowerCase().includes('percent')) {
        cleaned = cleaned.replace(/%/g, '');
      }
    }
    
    return cleaned;
  }

  private static flexibleValidation(value: any, mapping: AdaptiveTemplate['suggestedMappings'][0]): ValidationResult {
    const result: ValidationResult = {
      field: mapping.targetField,
      value,
      isValid: true
    };

    if (value === null || value === undefined || value === '') {
      return result; // Allow empty values
    }

    // Try to convert to appropriate type based on target field
    try {
      if (mapping.targetField.includes('cost') || mapping.targetField.includes('amount') || 
          mapping.targetField.includes('quantity') || mapping.targetField.includes('count')) {
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          result.value = numValue;
        }
      } else if (mapping.targetField.includes('percent')) {
        const numValue = parseFloat(String(value));
        if (!isNaN(numValue)) {
          result.value = Math.min(Math.max(numValue, 0), 100); // Clamp to 0-100
        }
      } else if (mapping.targetField.includes('date')) {
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
          result.value = dateValue.toISOString();
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errorMessage = `Could not convert '${value}' to expected type`;
    }

    return result;
  }

  private static calculateTemplateConfidence(mappings: AdaptiveTemplate['suggestedMappings']): number {
    if (mappings.length === 0) return 0;
    
    const avgConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
    const coverageBonus = Math.min(mappings.length / 10, 0.2); // Bonus for more mappings
    
    return Math.min(avgConfidence + coverageBonus, 1);
  }

  private static calculateFlexibleDataQuality(
    rawData: any[],
    validationResults: ValidationResult[],
    template: AdaptiveTemplate
  ): DataQualityMetrics {
    const totalFields = rawData.length * template.suggestedMappings.length;
    const validFields = validationResults.filter(r => r.isValid).length;
    
    const nonEmptyFields = validationResults.filter(r => 
      r.value !== null && r.value !== undefined && r.value !== ''
    ).length;

    return {
      completeness: totalFields > 0 ? (nonEmptyFields / totalFields) * 100 : 100,
      accuracy: totalFields > 0 ? (validFields / totalFields) * 100 : 100,
      consistency: 95, // Optimistic for adaptive processing
      timeliness: 100,
      validRecords: Math.floor(validFields / template.suggestedMappings.length),
      totalRecords: rawData.length,
      missingFields: [],
      invalidValues: validationResults
        .filter(r => !r.isValid)
        .map(r => ({
          field: r.field,
          value: r.value,
          reason: r.errorMessage || 'Validation failed'
        }))
    };
  }
}
