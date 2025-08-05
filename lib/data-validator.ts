// XLSX is imported dynamically in parseFile to avoid SSR issues
import type {
  ComprehensiveOperationalData,
  DataQualityMetrics,
  ValidationResult,
  ProcessingResult,
  DataFieldMapping,
  DataMappingTemplate
} from '@/types/data-schema';
import { DATA_MAPPING_TEMPLATES } from '@/types/data-schema';
import { AdaptiveDataValidator, type AdaptiveTemplate } from './adaptive-data-validator';

export class DataValidator {
  
  // Validate individual field values
  static validateFieldValue(
    value: any,
    mapping: DataFieldMapping
  ): ValidationResult {
    const result: ValidationResult = {
      field: mapping.targetField,
      value,
      isValid: true
    };

    // Check if required field is missing
    if (mapping.required && (value === null || value === undefined || value === '')) {
      result.isValid = false;
      result.errorMessage = `Required field '${mapping.targetField}' is missing`;
      return result;
    }

    // Skip validation for optional empty fields
    if (!mapping.required && (value === null || value === undefined || value === '')) {
      return result;
    }

    // Type validation
    switch (mapping.dataType) {
      case 'number':
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) {
          result.isValid = false;
          result.errorMessage = `Expected number, got '${value}'`;
          result.suggestion = 'Ensure this field contains only numeric values';
        } else {
          result.value = numValue;
          
          // Range validation
          if (mapping.validation?.min !== undefined && numValue < mapping.validation.min) {
            result.isValid = false;
            result.errorMessage = `Value ${numValue} is below minimum ${mapping.validation.min}`;
          }
          if (mapping.validation?.max !== undefined && numValue > mapping.validation.max) {
            result.isValid = false;
            result.errorMessage = `Value ${numValue} is above maximum ${mapping.validation.max}`;
          }
        }
        break;

      case 'string':
        const strValue = String(value).trim();
        result.value = strValue;
        
        // Pattern validation
        if (mapping.validation?.pattern) {
          const regex = new RegExp(mapping.validation.pattern);
          if (!regex.test(strValue)) {
            result.isValid = false;
            result.errorMessage = `Value '${strValue}' does not match required pattern`;
          }
        }
        
        // Allowed values validation
        if (mapping.validation?.allowedValues && 
            !mapping.validation.allowedValues.includes(strValue)) {
          result.isValid = false;
          result.errorMessage = `Value '${strValue}' is not in allowed values: ${mapping.validation.allowedValues.join(', ')}`;
        }
        break;

      case 'boolean':
        if (typeof value === 'boolean') {
          result.value = value;
        } else {
          const strValue = String(value).toLowerCase().trim();
          if (['true', '1', 'yes', 'y'].includes(strValue)) {
            result.value = true;
          } else if (['false', '0', 'no', 'n'].includes(strValue)) {
            result.value = false;
          } else {
            result.isValid = false;
            result.errorMessage = `Cannot convert '${value}' to boolean`;
          }
        }
        break;

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          result.isValid = false;
          result.errorMessage = `Invalid date format: '${value}'`;
        } else {
          result.value = dateValue.toISOString();
        }
        break;
    }

    return result;
  }

  // Process raw data using mapping template (traditional or adaptive)
  static processDataWithTemplate(
    rawData: any[],
    template: DataMappingTemplate | AdaptiveTemplate
  ): ProcessingResult {
    // Check if this is an adaptive template
    if ('suggestedMappings' in template) {
      return AdaptiveDataValidator.processWithAdaptiveTemplate(rawData, template as AdaptiveTemplate);
    }

    // Continue with traditional processing
    const errors: string[] = [];
    const warnings: string[] = [];
    const validationResults: ValidationResult[] = [];
    const processedData: any[] = [];
    
    let validRows = 0;
    let skippedRows = 0;

    for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
      const row = rawData[rowIndex];
      const processedRow: any = {};
      let isValidRow = true;
      let hasRequiredFields = false;

      // Check for required columns
      for (const requiredColumn of template.requiredColumns) {
        if (!(requiredColumn in row) || row[requiredColumn] === null || row[requiredColumn] === undefined || row[requiredColumn] === '') {
          errors.push(`Row ${rowIndex + 1}: Missing required column '${requiredColumn}'`);
          isValidRow = false;
        } else {
          hasRequiredFields = true;
        }
      }

      if (!hasRequiredFields) {
        skippedRows++;
        continue;
      }

      // Process each mapped field
      for (const mapping of template.mappings) {
        const sourceValue = row[mapping.sourceColumn];
        const validation = this.validateFieldValue(sourceValue, mapping);
        
        validationResults.push(validation);
        
        if (!validation.isValid) {
          errors.push(`Row ${rowIndex + 1}, Field '${mapping.targetField}': ${validation.errorMessage}`);
          isValidRow = false;
        } else {
          processedRow[mapping.targetField] = validation.value;
        }
      }

      if (isValidRow) {
        processedData.push(processedRow);
        validRows++;
      } else {
        skippedRows++;
      }
    }

    // Calculate data quality metrics
    const dataQuality = this.calculateDataQuality(rawData, validationResults, template);

    // Build comprehensive operational data structure
    const comprehensiveData: ComprehensiveOperationalData = {
      metadata: {
        dataQuality,
        validationResults,
        lastProcessed: new Date().toISOString()
      }
    };

    // Map processed data to appropriate category structure
    if (template.targetCategory === 'operationalReporting') {
      comprehensiveData.operationalReporting = {
        [template.targetSubcategory]: this.aggregateData(processedData)
      };
    } else if (template.targetCategory === 'businessFinancials') {
      comprehensiveData.businessFinancials = {
        [template.targetSubcategory]: this.aggregateData(processedData)
      };
    } else if (template.targetCategory === 'salesGrowthTrajectory') {
      comprehensiveData.salesGrowthTrajectory = {
        [template.targetSubcategory]: this.aggregateData(processedData)
      };
    }

    return {
      success: errors.length === 0,
      data: comprehensiveData,
      errors,
      warnings,
      summary: {
        totalRows: rawData.length,
        validRows,
        skippedRows,
        dataQuality
      }
    };
  }

  // Aggregate array data into summary metrics
  private static aggregateData(data: any[]): any {
    if (data.length === 0) return {};
    
    const aggregated: any = {};
    const keys = Object.keys(data[0]);
    
    for (const key of keys) {
      const values = data.map(row => row[key]).filter(val => val !== null && val !== undefined);
      
      if (values.length === 0) continue;
      
      const firstValue = values[0];
      
      if (typeof firstValue === 'number') {
        // For numeric fields, calculate statistics
        aggregated[key] = {
          total: values.reduce((sum, val) => sum + val, 0),
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          values: values // Keep individual values for detailed analysis
        };
      } else {
        // For non-numeric fields, keep unique values
        const uniqueValues = Array.from(new Set(values));
        aggregated[key] = {
          uniqueValues,
          count: values.length,
          values: values
        };
      }
    }
    
    return aggregated;
  }

  // Calculate comprehensive data quality metrics
  private static calculateDataQuality(
    rawData: any[],
    validationResults: ValidationResult[],
    template: DataMappingTemplate
  ): DataQualityMetrics {
    const totalFields = rawData.length * template.mappings.length;
    const validFields = validationResults.filter(r => r.isValid).length;
    const requiredFieldsCount = rawData.length * template.requiredColumns.length;
    const filledRequiredFields = validationResults.filter(r => 
      r.isValid && template.requiredColumns.some(col => 
        template.mappings.find(m => m.sourceColumn === col)?.targetField === r.field
      )
    ).length;

    const missingFields = template.mappings
      .filter(mapping => !rawData.some(row => row[mapping.sourceColumn] !== null && row[mapping.sourceColumn] !== undefined))
      .map(mapping => mapping.sourceColumn);

    const invalidValues = validationResults
      .filter(r => !r.isValid)
      .map(r => ({
        field: r.field,
        value: r.value,
        reason: r.errorMessage || 'Unknown validation error'
      }));

    return {
      completeness: requiredFieldsCount > 0 ? (filledRequiredFields / requiredFieldsCount) * 100 : 100,
      accuracy: totalFields > 0 ? (validFields / totalFields) * 100 : 100,
      consistency: 100, // Can be enhanced with cross-field validation
      timeliness: 100, // Assumes current data is timely
      validRecords: validationResults.filter(r => r.isValid).length,
      totalRecords: rawData.length,
      missingFields,
      invalidValues
    };
  }

  // Enhanced template detection with adaptive fallback
  static detectDataTemplate(columnHeaders: string[], fileName?: string, data?: any[]): DataMappingTemplate | AdaptiveTemplate | null {
    // First try traditional template matching
    let bestMatch: { template: DataMappingTemplate; score: number } | null = null;

    for (const template of DATA_MAPPING_TEMPLATES) {
      let score = 0;

      // Calculate match score based on column presence
      for (const mapping of template.mappings) {
        if (columnHeaders.some(header =>
          header.toLowerCase().includes(mapping.sourceColumn.toLowerCase()) ||
          mapping.sourceColumn.toLowerCase().includes(header.toLowerCase())
        )) {
          score += mapping.required ? 2 : 1; // Weight required fields more heavily
        }
      }

      // Normalize score by template size
      const normalizedScore = score / template.mappings.length;

      if (!bestMatch || normalizedScore > bestMatch.score) {
        bestMatch = { template, score: normalizedScore };
      }
    }

    // If traditional matching found a good match, use it
    if (bestMatch && bestMatch.score > 0.5) {
      return bestMatch.template;
    }

    // Otherwise, create adaptive template
    if (fileName && data && data.length > 0) {
      try {
        const columnAnalysis = AdaptiveDataValidator.analyzeColumns(data);
        const adaptiveTemplate = AdaptiveDataValidator.createAdaptiveTemplate(fileName, data, columnAnalysis);

        // Only return adaptive template if it has reasonable confidence
        if (adaptiveTemplate.confidence > 0.2) {
          return adaptiveTemplate;
        }
      } catch (error) {
        console.warn('Failed to create adaptive template:', error);
      }
    }

    // Return best traditional match even if score is low, or null
    return bestMatch?.template || null;
  }

  // Parse Excel/CSV file and extract data
  static async parseFile(file: File): Promise<{ data: any[]; columnHeaders: string[] }> {
    // Ensure this runs only on client side
    if (typeof window === 'undefined') {
      throw new Error('File parsing is only available on the client side');
    }

    try {
      // Parse file using XLSX library

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            let workbook: XLSX.WorkBook;

            if (file.type.includes('csv')) {
              workbook = XLSX.read(data, { type: 'binary' });
            } else {
              workbook = XLSX.read(data, { type: 'array' });
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
              reject(new Error('File contains no data'));
              return;
            }

            const columnHeaders = jsonData[0] as string[];
            const dataRows = jsonData.slice(1).map(row => {
              const rowObj: any = {};
              columnHeaders.forEach((header, index) => {
                rowObj[header] = (row as any[])[index];
              });
              return rowObj;
            });

            resolve({ data: dataRows, columnHeaders });
          } catch (error) {
            reject(new Error(`Failed to parse file: ${error}`));
          }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));

        if (file.type.includes('csv')) {
          reader.readAsText(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      });
    } catch (error) {
      throw new Error(`Failed to process file: ${error}`);
    }
  }
}

// Utility functions for data processing
export const DataProcessingUtils = {
  
  // Format validation results for display
  formatValidationResults: (results: ValidationResult[]): string => {
    const errors = results.filter(r => !r.isValid);
    if (errors.length === 0) return 'All data validation checks passed successfully.';
    
    return `Found ${errors.length} validation errors:\n${errors.map(r => 
      `• ${r.field}: ${r.errorMessage}`
    ).join('\n')}`;
  },

  // Format data quality metrics for display
  formatDataQuality: (quality: DataQualityMetrics): string => {
    return `Data Quality Assessment:
�� Completeness: ${quality.completeness.toFixed(1)}%
• Accuracy: ${quality.accuracy.toFixed(1)}%
• Valid Records: ${quality.validRecords}/${quality.totalRecords}
${quality.missingFields.length > 0 ? `• Missing Fields: ${quality.missingFields.join(', ')}` : ''}
${quality.invalidValues.length > 0 ? `• Invalid Values: ${quality.invalidValues.length} found` : ''}`;
  },

  // Generate processing summary
  generateProcessingSummary: (result: ProcessingResult): string => {
    const { summary, errors, warnings } = result;
    
    return `Processing Complete:
• Total Rows: ${summary.totalRows}
• Valid Rows: ${summary.validRows}
• Skipped Rows: ${summary.skippedRows}
• Success Rate: ${((summary.validRows / summary.totalRows) * 100).toFixed(1)}%
${errors.length > 0 ? `\nErrors (${errors.length}):\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}` : ''}
${warnings.length > 0 ? `\nWarnings (${warnings.length}):\n${warnings.slice(0, 3).join('\n')}${warnings.length > 3 ? '\n...' : ''}` : ''}`;
  }
};
