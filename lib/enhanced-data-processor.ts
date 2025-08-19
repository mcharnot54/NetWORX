// Enhanced Data Processor with Smart Missing Data Handling
// Provides a comprehensive interface for data processing with advanced imputation

import { DataValidator } from './data-validator';
import { AdvancedDataImputation, type ImputationConfig, type ImputationResult } from './missing-data-imputation';
import { EnhancedDataProcessingUtils } from './data-processing-utils';
import type {
  ProcessingResult,
  DataMappingTemplate,
  ComprehensiveOperationalData
} from '@/types/data-schema';
import { AdaptiveDataValidator, type AdaptiveTemplate } from './adaptive-data-validator';

export interface SmartProcessingConfig {
  enableAutoImputation: boolean;
  imputationMethod?: 'auto' | 'mean_median' | 'knn' | 'regression' | 'random_forest' | 'neural_network' | 'mice';
  confidenceThreshold: number;
  markImputedFields: boolean;
  maxIterations: number;
  skipImputationForFields?: string[];
}

export interface SmartProcessingResult {
  success: boolean;
  data?: ComprehensiveOperationalData;
  processingMetrics: {
    originalDataQuality: number;
    finalDataQuality: number;
    improvementPercentage: number;
    processingTime: number;
  };
  imputationSummary?: {
    methodUsed: string;
    fieldsImputed: number;
    totalValuesImputed: number;
    averageConfidence: number;
    qualityMetrics: {
      completeness: number;
      reliability: number;
      consistency: number;
    };
  };
  recommendations: string[];
  warnings: string[];
  errors: string[];
  detailedLog: string[];
}

export class EnhancedDataProcessor {

  /**
   * Smart processing pipeline with automatic missing data handling
   */
  static async processFileWithSmartImputation(
    file: File,
    config: Partial<SmartProcessingConfig> = {}
  ): Promise<SmartProcessingResult> {
    const startTime = Date.now();
    const log: string[] = [];
    
    const defaultConfig: SmartProcessingConfig = {
      enableAutoImputation: true,
      imputationMethod: 'auto',
      confidenceThreshold: 0.7,
      markImputedFields: true,
      maxIterations: 10,
      skipImputationForFields: []
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    try {
      log.push(`Starting smart processing for file: ${file.name}`);
      
      // Step 1: Parse the file
      log.push('Step 1: Parsing file data...');
      const { data: rawData, columnHeaders } = await DataValidator.parseFile(file);
      
      if (!rawData || rawData.length === 0) {
        throw new Error('No data found in file');
      }
      
      log.push(`Parsed ${rawData.length} rows with ${columnHeaders.length} columns`);
      
      // Step 2: Initial data quality assessment
      log.push('Step 2: Assessing initial data quality...');
      const initialQuality = this.assessDataQuality(rawData);
      log.push(`Initial data quality: ${initialQuality.overallScore.toFixed(1)}% (Completeness: ${initialQuality.completeness.toFixed(1)}%, Accuracy: ${initialQuality.accuracy.toFixed(1)}%)`);
      
      // Step 3: Missing data diagnosis
      log.push('Step 3: Analyzing missing data patterns...');
      const diagnosis = AdvancedDataImputation.diagnoseMissingData(rawData);
      
      if (diagnosis.patterns.length > 0) {
        log.push(`Found ${diagnosis.patterns.length} fields with missing data:`);
        diagnosis.patterns.forEach(pattern => {
          log.push(`  - ${pattern.field}: ${pattern.missingPercentage.toFixed(1)}% missing (${pattern.pattern} pattern)`);
        });
        log.push(`Recommended imputation method: ${diagnosis.suggestedMethod}`);
      } else {
        log.push('No missing data detected - proceeding with standard processing');
      }
      
      // Step 4: Template detection
      log.push('Step 4: Detecting data template...');
      const template = DataValidator.detectDataTemplate(columnHeaders, file.name, rawData);
      
      if (!template) {
        throw new Error('Could not detect appropriate data template for this file');
      }
      
      log.push(`Detected template: ${template.name || 'Adaptive Template'} (confidence: ${('confidence' in template ? template.confidence : 1).toFixed(2)})`);
      
      // Step 5: Smart imputation (if enabled and needed)
      let imputationResult: ImputationResult | undefined;
      let processedData = rawData;
      
      if (finalConfig.enableAutoImputation && diagnosis.patterns.length > 0) {
        log.push('Step 5: Applying advanced missing data imputation...');
        
        try {
          const imputationConfig: Partial<ImputationConfig> = {
            method: finalConfig.imputationMethod,
            confidence_threshold: finalConfig.confidenceThreshold,
            max_iterations: finalConfig.maxIterations,
            mark_imputed: finalConfig.markImputedFields
          };
          
          imputationResult = await AdvancedDataImputation.imputeMissingData(rawData, imputationConfig);
          processedData = imputationResult.data;
          
          log.push(`Imputation completed: ${imputationResult.statistics.totalImputed} values imputed using ${imputationResult.statistics.methodsUsed.join(', ')}`);
          log.push(`Average imputation confidence: ${imputationResult.statistics.averageConfidence.toFixed(2)}`);
          
        } catch (error) {
          log.push(`Imputation failed: ${error}. Proceeding with original data.`);
        }
      } else {
        log.push('Step 5: Skipping imputation (disabled or no missing data)');
      }
      
      // Step 6: Data processing with template
      log.push('Step 6: Processing data with detected template...');
      const processingResult = DataValidator.processDataWithTemplate(processedData, template);
      
      if (!processingResult.success) {
        log.push(`Processing completed with ${processingResult.errors.length} errors and ${processingResult.warnings.length} warnings`);
      } else {
        log.push('Processing completed successfully');
      }
      
      // Step 7: Final quality assessment
      log.push('Step 7: Assessing final data quality...');
      const finalQuality = this.assessDataQuality(processedData);
      const improvement = finalQuality.overallScore - initialQuality.overallScore;
      
      log.push(`Final data quality: ${finalQuality.overallScore.toFixed(1)}% (improvement: ${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%)`);
      
      // Step 8: Generate recommendations
      const recommendations = this.generateSmartRecommendations(
        diagnosis,
        imputationResult,
        processingResult,
        initialQuality,
        finalQuality
      );
      
      const processingTime = Date.now() - startTime;
      log.push(`Total processing time: ${processingTime}ms`);
      
      return {
        success: processingResult.success,
        data: processingResult.data,
        processingMetrics: {
          originalDataQuality: initialQuality.overallScore,
          finalDataQuality: finalQuality.overallScore,
          improvementPercentage: improvement,
          processingTime
        },
        imputationSummary: imputationResult ? {
          methodUsed: imputationResult.statistics.methodsUsed.join(', '),
          fieldsImputed: new Set(imputationResult.imputedFields.map(f => f.field)).size,
          totalValuesImputed: imputationResult.statistics.totalImputed,
          averageConfidence: imputationResult.statistics.averageConfidence,
          qualityMetrics: imputationResult.qualityMetrics
        } : undefined,
        recommendations,
        warnings: processingResult.warnings,
        errors: processingResult.errors,
        detailedLog: log
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      log.push(`Processing failed after ${processingTime}ms: ${error}`);
      
      return {
        success: false,
        processingMetrics: {
          originalDataQuality: 0,
          finalDataQuality: 0,
          improvementPercentage: 0,
          processingTime
        },
        recommendations: ['Review data format and ensure file contains valid data'],
        warnings: [],
        errors: [String(error)],
        detailedLog: log
      };
    }
  }

  /**
   * Batch process multiple files with consistent imputation strategy
   */
  static async processBatchWithSmartImputation(
    files: File[],
    config: Partial<SmartProcessingConfig> = {}
  ): Promise<{
    results: SmartProcessingResult[];
    batchSummary: {
      totalFiles: number;
      successfulFiles: number;
      totalImputations: number;
      averageQualityImprovement: number;
      recommendedSettings: Partial<SmartProcessingConfig>;
    };
  }> {
    const results: SmartProcessingResult[] = [];
    let totalImputations = 0;
    let totalQualityImprovement = 0;
    let successfulFiles = 0;
    
    // Process each file
    for (const file of files) {
      const result = await this.processFileWithSmartImputation(file, config);
      results.push(result);
      
      if (result.success) {
        successfulFiles++;
        totalQualityImprovement += result.processingMetrics.improvementPercentage;
        if (result.imputationSummary) {
          totalImputations += result.imputationSummary.totalValuesImputed;
        }
      }
    }
    
    // Generate batch recommendations
    const recommendedSettings = this.generateBatchRecommendations(results);
    
    return {
      results,
      batchSummary: {
        totalFiles: files.length,
        successfulFiles,
        totalImputations,
        averageQualityImprovement: successfulFiles > 0 ? totalQualityImprovement / successfulFiles : 0,
        recommendedSettings
      }
    };
  }

  /**
   * Get imputation method recommendations based on data analysis
   */
  static getImputationRecommendations(data: any[]): {
    recommendedMethod: string;
    confidence: number;
    reasoning: string[];
    alternatives: { method: string; suitability: number; reason: string }[];
  } {
    const diagnosis = AdvancedDataImputation.diagnoseMissingData(data);
    
    if (diagnosis.patterns.length === 0) {
      return {
        recommendedMethod: 'none',
        confidence: 1.0,
        reasoning: ['No missing data detected'],
        alternatives: []
      };
    }
    
    const reasoning: string[] = [];
    const alternatives: { method: string; suitability: number; reason: string }[] = [];
    
    // Analyze patterns to build reasoning
    const totalMissingPercentage = diagnosis.patterns.reduce((sum, p) => sum + p.missingPercentage, 0) / diagnosis.patterns.length;
    const highCorrelationPatterns = diagnosis.patterns.filter(p => p.correlatedWith.length > 0);
    const systematicPatterns = diagnosis.patterns.filter(p => p.pattern === 'systematic');
    
    reasoning.push(`Average missing data rate: ${totalMissingPercentage.toFixed(1)}%`);
    
    if (highCorrelationPatterns.length > 0) {
      reasoning.push(`${highCorrelationPatterns.length} fields show correlation patterns`);
      alternatives.push({
        method: 'regression',
        suitability: 0.8,
        reason: 'Strong correlations detected between fields'
      });
      alternatives.push({
        method: 'random_forest',
        suitability: 0.9,
        reason: 'Complex correlations suggest tree-based methods'
      });
    }
    
    if (systematicPatterns.length > 0) {
      reasoning.push(`${systematicPatterns.length} fields show systematic missing patterns`);
      alternatives.push({
        method: 'neural_network',
        suitability: 0.8,
        reason: 'Systematic patterns may benefit from deep learning approaches'
      });
    }
    
    if (totalMissingPercentage > 30) {
      reasoning.push('High missing data rate requires advanced methods');
      alternatives.push({
        method: 'mice',
        suitability: 0.85,
        reason: 'Multiple imputation handles high missing rates well'
      });
    } else if (totalMissingPercentage < 10) {
      reasoning.push('Low missing data rate allows simple methods');
      alternatives.push({
        method: 'mean_median',
        suitability: 0.7,
        reason: 'Simple imputation sufficient for low missing rates'
      });
      alternatives.push({
        method: 'knn',
        suitability: 0.75,
        reason: 'KNN provides good balance for moderate complexity'
      });
    }
    
    // Sort alternatives by suitability
    alternatives.sort((a, b) => b.suitability - a.suitability);
    
    return {
      recommendedMethod: diagnosis.suggestedMethod,
      confidence: diagnosis.patterns.length > 0 ? 
        diagnosis.patterns.reduce((sum, p) => sum + p.confidence, 0) / diagnosis.patterns.length : 0,
      reasoning,
      alternatives
    };
  }

  // Private helper methods

  private static assessDataQuality(data: any[]): {
    completeness: number;
    accuracy: number;
    overallScore: number;
    details: {
      totalFields: number;
      emptyFields: number;
      invalidFields: number;
    };
  } {
    if (!data || data.length === 0) {
      return {
        completeness: 0,
        accuracy: 0,
        overallScore: 0,
        details: { totalFields: 0, emptyFields: 0, invalidFields: 0 }
      };
    }
    
    const columns = Object.keys(data[0]);
    let totalFields = 0;
    let emptyFields = 0;
    let invalidFields = 0;
    
    for (const row of data) {
      for (const col of columns) {
        totalFields++;
        const value = row[col];
        
        if (value === null || value === undefined || value === '') {
          emptyFields++;
        } else {
          // Basic validity check
          const strValue = String(value);
          if (strValue.trim() === '' || strValue === 'undefined' || strValue === 'null') {
            invalidFields++;
          }
        }
      }
    }
    
    const completeness = totalFields > 0 ? ((totalFields - emptyFields) / totalFields) * 100 : 100;
    const accuracy = totalFields > 0 ? ((totalFields - invalidFields) / totalFields) * 100 : 100;
    const overallScore = (completeness + accuracy) / 2;
    
    return {
      completeness,
      accuracy,
      overallScore,
      details: { totalFields, emptyFields, invalidFields }
    };
  }

  private static generateSmartRecommendations(
    diagnosis: any,
    imputationResult: ImputationResult | undefined,
    processingResult: ProcessingResult,
    initialQuality: any,
    finalQuality: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Data quality recommendations
    if (finalQuality.overallScore < 80) {
      recommendations.push('Consider data cleaning - final quality below 80%');
    }
    
    if (initialQuality.overallScore > finalQuality.overallScore) {
      recommendations.push('Data quality decreased during processing - review imputation settings');
    }
    
    // Imputation-specific recommendations
    if (imputationResult) {
      if (imputationResult.statistics.averageConfidence < 0.6) {
        recommendations.push('Low imputation confidence - consider collecting more complete data');
      }
      
      if (imputationResult.statistics.totalImputed > processingResult.summary.totalRows * 0.3) {
        recommendations.push('High proportion of imputed values - validate results carefully');
      }
      
      const lowConfidenceFields = imputationResult.imputedFields.filter(f => f.confidence < 0.5);
      if (lowConfidenceFields.length > 0) {
        recommendations.push(`Review imputed values for fields: ${Array.from(new Set(lowConfidenceFields.map(f => f.field))).join(', ')}`);
      }
    }
    
    // Processing recommendations
    if (processingResult.errors.length > 0) {
      recommendations.push('Address data validation errors before final analysis');
    }
    
    if (processingResult.warnings.length > processingResult.summary.validRows * 0.1) {
      recommendations.push('High warning rate - review data consistency');
    }
    
    // Method-specific recommendations
    if (diagnosis.patterns.some((p: any) => p.pattern === 'systematic')) {
      recommendations.push('Systematic missing patterns detected - consider data collection process improvements');
    }
    
    if (diagnosis.patterns.some((p: any) => p.missingPercentage > 50)) {
      recommendations.push('Some fields have >50% missing data - consider if these fields are necessary');
    }
    
    return recommendations;
  }

  private static generateBatchRecommendations(results: SmartProcessingResult[]): Partial<SmartProcessingConfig> {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return { enableAutoImputation: false };
    }
    
    // Analyze common patterns
    const avgImprovement = successfulResults.reduce((sum, r) => sum + r.processingMetrics.improvementPercentage, 0) / successfulResults.length;
    const avgConfidence = successfulResults
      .filter(r => r.imputationSummary)
      .reduce((sum, r) => sum + r.imputationSummary!.averageConfidence, 0) / successfulResults.filter(r => r.imputationSummary).length;
    
    const recommendations: Partial<SmartProcessingConfig> = {
      enableAutoImputation: avgImprovement > 5, // Enable if average improvement > 5%
      confidenceThreshold: Math.max(0.5, avgConfidence - 0.1), // Slightly lower than average achieved
      markImputedFields: true // Always recommended for transparency
    };
    
    // Method recommendation based on success rates
    const methodCounts = new Map<string, number>();
    successfulResults.forEach(r => {
      if (r.imputationSummary) {
        const method = r.imputationSummary.methodUsed.split(',')[0].trim();
        methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
      }
    });
    
    const mostSuccessfulMethod = Array.from(methodCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (mostSuccessfulMethod) {
      recommendations.imputationMethod = mostSuccessfulMethod as any;
    }
    
    return recommendations;
  }
}

/**
 * Utility functions for enhanced data processing
 */
export const DataProcessingUtilities = {
  
  /**
   * Format smart processing results for user display
   */
  formatSmartProcessingResults: (result: SmartProcessingResult): string => {
    let output = `Smart Processing Results:\n`;
    output += `Status: ${result.success ? 'Success' : 'Failed'}\n`;
    output += `Data Quality: ${result.processingMetrics.originalDataQuality.toFixed(1)}% → ${result.processingMetrics.finalDataQuality.toFixed(1)}%`;
    
    if (result.processingMetrics.improvementPercentage !== 0) {
      output += ` (${result.processingMetrics.improvementPercentage >= 0 ? '+' : ''}${result.processingMetrics.improvementPercentage.toFixed(1)}% improvement)`;
    }
    output += `\n`;
    
    if (result.imputationSummary) {
      output += `\nImputation Summary:\n`;
      output += `• Method: ${result.imputationSummary.methodUsed}\n`;
      output += `• Fields Imputed: ${result.imputationSummary.fieldsImputed}\n`;
      output += `• Values Imputed: ${result.imputationSummary.totalValuesImputed}\n`;
      output += `• Confidence: ${(result.imputationSummary.averageConfidence * 100).toFixed(1)}%\n`;
    }
    
    if (result.recommendations.length > 0) {
      output += `\nRecommendations:\n${result.recommendations.map(r => `• ${r}`).join('\n')}`;
    }
    
    if (result.warnings.length > 0) {
      output += `\nWarnings (${result.warnings.length}):\n${result.warnings.slice(0, 3).map(w => `• ${w}`).join('\n')}${result.warnings.length > 3 ? '\n• ...' : ''}`;
    }
    
    return output;
  },

  /**
   * Format imputation recommendations for user display
   */
  formatImputationRecommendations: (recommendations: ReturnType<typeof EnhancedDataProcessor.getImputationRecommendations>): string => {
    let output = `Missing Data Analysis:\n`;
    output += `Recommended Method: ${recommendations.recommendedMethod}\n`;
    output += `Confidence: ${(recommendations.confidence * 100).toFixed(1)}%\n\n`;
    
    if (recommendations.reasoning.length > 0) {
      output += `Analysis:\n${recommendations.reasoning.map(r => `• ${r}`).join('\n')}\n\n`;
    }
    
    if (recommendations.alternatives.length > 0) {
      output += `Alternative Methods:\n`;
      recommendations.alternatives.forEach(alt => {
        output += `• ${alt.method} (${(alt.suitability * 100).toFixed(0)}% suitable): ${alt.reason}\n`;
      });
    }
    
    return output;
  }
};
