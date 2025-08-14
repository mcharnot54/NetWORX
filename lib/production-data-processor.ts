// Production Database Integration for Missing Data Imputation
// Processes data directly from database and performs automatic calculations

import { AdvancedDataImputation, type ImputationConfig, type ImputationResult } from './missing-data-imputation';
import { DataCompletenessAnalyzer, type DataCompletenessMetrics } from './data-completeness-analyzer';
import { EnhancedDataProcessor, type SmartProcessingResult } from './enhanced-data-processor';

export interface ProductionDataConfig {
  projectId: number;
  scenarioId: number;
  enableAutoCalculations: boolean;
  imputationConfig: Partial<ImputationConfig>;
  calculationRules: CalculationRule[];
}

export interface CalculationRule {
  targetField: string;
  formula: string;
  sourceFields: string[];
  condition?: string;
  description: string;
  dataType: 'number' | 'string' | 'date';
}

export interface ProductionProcessingResult {
  success: boolean;
  originalData: any[];
  processedData: any[];
  completenessMetrics: DataCompletenessMetrics;
  imputationResult?: ImputationResult;
  calculationResults: {
    fieldsCalculated: number;
    calculationsPerformed: number;
    derivedFields: string[];
  };
  qualityAssessment: {
    originalDataPercentage: number;
    imputedDataPercentage: number;
    calculatedDataPercentage: number;
    overallQuality: 'excellent' | 'good' | 'warning' | 'critical';
    proceedRecommendation: 'proceed' | 'caution' | 'stop';
  };
  processingTime: number;
  errors: string[];
  warnings: string[];
}

export class ProductionDataProcessor {

  /**
   * Process data directly from database with imputation and calculations
   */
  static async processScenarioData(config: ProductionDataConfig): Promise<ProductionProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Step 1: Fetch data from database
      const originalData = await this.fetchScenarioData(config.projectId, config.scenarioId);
      
      if (!originalData || originalData.length === 0) {
        throw new Error('No data found for the specified scenario');
      }

      // Step 2: Analyze initial completeness
      const initialCompleteness = DataCompletenessAnalyzer.analyzeOriginalCompleteness(originalData);

      // Step 3: Perform automatic calculations first (before imputation)
      let calculatedData = [...originalData];
      const calculationResults = {
        fieldsCalculated: 0,
        calculationsPerformed: 0,
        derivedFields: [] as string[]
      };

      if (config.enableAutoCalculations) {
        const calcResult = await this.performAutomaticCalculations(calculatedData, config.calculationRules);
        calculatedData = calcResult.data;
        calculationResults.fieldsCalculated = calcResult.fieldsCalculated;
        calculationResults.calculationsPerformed = calcResult.calculationsPerformed;
        calculationResults.derivedFields = calcResult.derivedFields;
      }

      // Step 4: Perform imputation on the calculated data
      let imputationResult: ImputationResult | undefined;
      let finalData = calculatedData;

      const diagnosis = AdvancedDataImputation.diagnoseMissingData(calculatedData);
      if (diagnosis.patterns.length > 0) {
        imputationResult = await AdvancedDataImputation.imputeMissingData(
          calculatedData,
          config.imputationConfig
        );
        finalData = imputationResult.data;
      }

      // Step 5: Analyze final completeness
      const finalCompleteness = DataCompletenessAnalyzer.analyzePostImputationCompleteness(
        originalData,
        finalData,
        imputationResult?.imputedFields || []
      );

      // Step 6: Generate quality assessment
      const qualityAssessment = this.assessProductionQuality(
        initialCompleteness,
        finalCompleteness,
        calculationResults
      );

      // Step 7: Save processed data back to database
      await this.saveProcessedData(config.scenarioId, finalData, {
        imputationResult,
        calculationResults,
        qualityAssessment
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        originalData,
        processedData: finalData,
        completenessMetrics: finalCompleteness,
        imputationResult,
        calculationResults,
        qualityAssessment,
        processingTime,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(String(error));
      return {
        success: false,
        originalData: [],
        processedData: [],
        completenessMetrics: DataCompletenessAnalyzer.analyzeOriginalCompleteness([]),
        calculationResults: {
          fieldsCalculated: 0,
          calculationsPerformed: 0,
          derivedFields: []
        },
        qualityAssessment: {
          originalDataPercentage: 0,
          imputedDataPercentage: 0,
          calculatedDataPercentage: 0,
          overallQuality: 'critical',
          proceedRecommendation: 'stop'
        },
        processingTime: Date.now() - startTime,
        errors,
        warnings
      };
    }
  }

  /**
   * Perform automatic calculations between related columns
   */
  private static async performAutomaticCalculations(
    data: any[],
    customRules: CalculationRule[] = []
  ): Promise<{
    data: any[];
    fieldsCalculated: number;
    calculationsPerformed: number;
    derivedFields: string[];
  }> {
    const processedData = JSON.parse(JSON.stringify(data));
    let calculationsPerformed = 0;
    const derivedFields: string[] = [];

    // Default calculation rules for common business metrics
    const defaultRules: CalculationRule[] = [
      {
        targetField: 'units_per_pallet',
        formula: 'units_per_carton * cartons_per_pallet',
        sourceFields: ['units_per_carton', 'cartons_per_pallet'],
        description: 'Calculate total units per pallet',
        dataType: 'number'
      },
      {
        targetField: 'total_value',
        formula: 'unit_price * quantity',
        sourceFields: ['unit_price', 'quantity'],
        description: 'Calculate total value from unit price and quantity',
        dataType: 'number'
      },
      {
        targetField: 'pallets_needed',
        formula: 'Math.ceil(total_units / units_per_pallet)',
        sourceFields: ['total_units', 'units_per_pallet'],
        description: 'Calculate number of pallets needed',
        dataType: 'number'
      },
      {
        targetField: 'cartons_needed',
        formula: 'Math.ceil(total_units / units_per_carton)',
        sourceFields: ['total_units', 'units_per_carton'],
        description: 'Calculate number of cartons needed',
        dataType: 'number'
      },
      {
        targetField: 'inventory_days',
        formula: 'inventory_on_hand / daily_demand',
        sourceFields: ['inventory_on_hand', 'daily_demand'],
        description: 'Calculate days of inventory on hand',
        dataType: 'number'
      },
      {
        targetField: 'cost_per_unit',
        formula: 'total_cost / total_units',
        sourceFields: ['total_cost', 'total_units'],
        description: 'Calculate cost per unit',
        dataType: 'number'
      },
      {
        targetField: 'capacity_utilization',
        formula: '(current_capacity / max_capacity) * 100',
        sourceFields: ['current_capacity', 'max_capacity'],
        description: 'Calculate capacity utilization percentage',
        dataType: 'number'
      },
      {
        targetField: 'freight_cost_per_unit',
        formula: 'freight_cost / total_units',
        sourceFields: ['freight_cost', 'total_units'],
        description: 'Calculate freight cost per unit',
        dataType: 'number'
      }
    ];

    // Combine default and custom rules
    const allRules = [...defaultRules, ...customRules];

    // Apply calculation rules
    for (const rule of allRules) {
      const { applied, calculations } = this.applyCalculationRule(processedData, rule);
      if (applied) {
        derivedFields.push(rule.targetField);
        calculationsPerformed += calculations;
      }
    }

    return {
      data: processedData,
      fieldsCalculated: derivedFields.length,
      calculationsPerformed,
      derivedFields
    };
  }

  /**
   * Apply a specific calculation rule to the dataset
   */
  private static applyCalculationRule(data: any[], rule: CalculationRule): {
    applied: boolean;
    calculations: number;
  } {
    // Check if all source fields exist
    const hasAllFields = rule.sourceFields.every(field => 
      data.some(row => row.hasOwnProperty(field))
    );

    if (!hasAllFields) {
      return { applied: false, calculations: 0 };
    }

    let calculations = 0;

    for (const row of data) {
      // Check if all source fields have values in this row
      const hasAllValues = rule.sourceFields.every(field => {
        const value = row[field];
        return value !== null && value !== undefined && value !== '';
      });

      if (!hasAllValues) {
        continue; // Skip this row
      }

      try {
        // Safely evaluate the formula
        const result = this.evaluateFormula(rule.formula, row);
        
        if (result !== null && result !== undefined && !isNaN(result)) {
          row[rule.targetField] = rule.dataType === 'number' ? Number(result) : result;
          row[`${rule.targetField}_calculated`] = true; // Mark as calculated
          calculations++;
        }
      } catch (error) {
        console.warn(`Failed to calculate ${rule.targetField}: ${error}`);
      }
    }

    return { applied: calculations > 0, calculations };
  }

  /**
   * Safely evaluate mathematical formulas
   */
  private static evaluateFormula(formula: string, row: any): number | null {
    try {
      // Replace field names with actual values
      let expression = formula;
      
      // Find all field references in the formula
      const fieldMatches = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      
      for (const field of fieldMatches) {
        if (field !== 'Math' && field !== 'ceil' && field !== 'floor' && field !== 'round') {
          const value = row[field];
          if (value !== null && value !== undefined && value !== '') {
            expression = expression.replace(new RegExp(`\\b${field}\\b`, 'g'), String(value));
          } else {
            return null; // Cannot calculate if any field is missing
          }
        }
      }

      // Use Function constructor for safe evaluation (limited to math operations)
      const func = new Function('Math', `return ${expression}`);
      const result = func(Math);

      return typeof result === 'number' ? result : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetch data from database for a specific scenario
   */
  private static async fetchScenarioData(projectId: number, scenarioId: number): Promise<any[]> {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/data`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scenario data: ${response.statusText}`);
      }
      
      const { data } = await response.json();
      return data || [];
    } catch (error) {
      throw new Error(`Database fetch error: ${error}`);
    }
  }

  /**
   * Save processed data back to database
   */
  private static async saveProcessedData(
    scenarioId: number,
    processedData: any[],
    metadata: any
  ): Promise<void> {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/processed-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: processedData,
          metadata,
          processedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save processed data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error saving processed data:', error);
      throw error;
    }
  }

  /**
   * Assess overall quality for production use
   */
  private static assessProductionQuality(
    initial: DataCompletenessMetrics,
    final: DataCompletenessMetrics,
    calculations: any
  ): ProductionProcessingResult['qualityAssessment'] {
    const originalPercentage = final.originalDataPercentage;
    const imputedPercentage = final.imputedDataPercentage;
    const calculatedPercentage = (calculations.calculationsPerformed / 
      (final.fieldAnalysis.length * final.fieldAnalysis[0]?.totalValues || 1)) * 100;

    let overallQuality: 'excellent' | 'good' | 'warning' | 'critical';
    let proceedRecommendation: 'proceed' | 'caution' | 'stop';

    if (originalPercentage >= 90) {
      overallQuality = 'excellent';
      proceedRecommendation = 'proceed';
    } else if (originalPercentage >= 75) {
      overallQuality = 'good';
      proceedRecommendation = 'caution';
    } else if (originalPercentage >= 60) {
      overallQuality = 'warning';
      proceedRecommendation = 'caution';
    } else {
      overallQuality = 'critical';
      proceedRecommendation = 'stop';
    }

    return {
      originalDataPercentage: originalPercentage,
      imputedDataPercentage: imputedPercentage,
      calculatedDataPercentage: calculatedPercentage,
      overallQuality,
      proceedRecommendation
    };
  }

  /**
   * Get available calculation rules for a dataset
   */
  static suggestCalculationRules(data: any[]): CalculationRule[] {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0]).map(col => col.toLowerCase());
    const suggestions: CalculationRule[] = [];

    // Check for units per carton + cartons per pallet → units per pallet
    if (columns.includes('units_per_carton') && columns.includes('cartons_per_pallet')) {
      suggestions.push({
        targetField: 'units_per_pallet',
        formula: 'units_per_carton * cartons_per_pallet',
        sourceFields: ['units_per_carton', 'cartons_per_pallet'],
        description: 'Calculate total units per pallet from carton and pallet data',
        dataType: 'number'
      });
    }

    // Check for price + quantity → total value
    if (columns.some(c => c.includes('price')) && columns.some(c => c.includes('quantity'))) {
      const priceField = columns.find(c => c.includes('price'));
      const quantityField = columns.find(c => c.includes('quantity'));
      if (priceField && quantityField) {
        suggestions.push({
          targetField: 'total_value',
          formula: `${priceField} * ${quantityField}`,
          sourceFields: [priceField, quantityField],
          description: 'Calculate total value from price and quantity',
          dataType: 'number'
        });
      }
    }

    // Check for capacity utilization
    if (columns.some(c => c.includes('current')) && columns.some(c => c.includes('max'))) {
      const currentField = columns.find(c => c.includes('current') && c.includes('capacity'));
      const maxField = columns.find(c => c.includes('max') && c.includes('capacity'));
      if (currentField && maxField) {
        suggestions.push({
          targetField: 'capacity_utilization_percent',
          formula: `(${currentField} / ${maxField}) * 100`,
          sourceFields: [currentField, maxField],
          description: 'Calculate capacity utilization percentage',
          dataType: 'number'
        });
      }
    }

    return suggestions;
  }
}

/**
 * Utility functions for production data processing
 */
export const ProductionDataUtils = {
  
  /**
   * Validate production data configuration
   */
  validateConfig: (config: ProductionDataConfig): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.projectId || config.projectId <= 0) {
      errors.push('Valid project ID is required');
    }

    if (!config.scenarioId || config.scenarioId <= 0) {
      errors.push('Valid scenario ID is required');
    }

    if (config.calculationRules) {
      config.calculationRules.forEach((rule, index) => {
        if (!rule.targetField) {
          errors.push(`Calculation rule ${index + 1}: Target field is required`);
        }
        if (!rule.formula) {
          errors.push(`Calculation rule ${index + 1}: Formula is required`);
        }
        if (!rule.sourceFields || rule.sourceFields.length === 0) {
          errors.push(`Calculation rule ${index + 1}: Source fields are required`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Format production processing results for display
   */
  formatResults: (result: ProductionProcessingResult): string => {
    let output = `Production Data Processing Results:\n`;
    output += `Status: ${result.success ? 'Success' : 'Failed'}\n`;
    output += `Processing Time: ${result.processingTime}ms\n\n`;
    
    output += `Data Quality:\n`;
    output += `• Original Data: ${result.qualityAssessment.originalDataPercentage.toFixed(1)}%\n`;
    output += `• Imputed Data: ${result.qualityAssessment.imputedDataPercentage.toFixed(1)}%\n`;
    output += `• Calculated Data: ${result.qualityAssessment.calculatedDataPercentage.toFixed(1)}%\n`;
    output += `• Overall Quality: ${result.qualityAssessment.overallQuality.toUpperCase()}\n`;
    output += `• Recommendation: ${result.qualityAssessment.proceedRecommendation.toUpperCase()}\n\n`;
    
    if (result.calculationResults.derivedFields.length > 0) {
      output += `Calculations Performed:\n`;
      output += `• Fields Calculated: ${result.calculationResults.fieldsCalculated}\n`;
      output += `• Total Calculations: ${result.calculationResults.calculationsPerformed}\n`;
      output += `• Derived Fields: ${result.calculationResults.derivedFields.join(', ')}\n\n`;
    }
    
    if (result.imputationResult) {
      output += `Imputation Summary:\n`;
      output += `• Values Imputed: ${result.imputationResult.statistics.totalImputed}\n`;
      output += `• Average Confidence: ${(result.imputationResult.statistics.averageConfidence * 100).toFixed(1)}%\n`;
      output += `• Methods Used: ${result.imputationResult.statistics.methodsUsed.join(', ')}\n\n`;
    }
    
    if (result.errors.length > 0) {
      output += `Errors:\n${result.errors.map(e => `• ${e}`).join('\n')}\n\n`;
    }
    
    if (result.warnings.length > 0) {
      output += `Warnings:\n${result.warnings.map(w => `• ${w}`).join('\n')}`;
    }
    
    return output;
  }
};
