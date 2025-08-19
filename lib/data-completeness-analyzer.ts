// Data Completeness Analyzer with Color-Coded Warning System
// Provides detailed analysis of missing data percentages and quality indicators

export interface DataCompletenessMetrics {
  overallCompleteness: number;
  originalDataPercentage: number;
  imputedDataPercentage: number;
  qualityLevel: 'excellent' | 'good' | 'warning' | 'critical';
  qualityColor: 'green' | 'yellow' | 'red';
  qualityMessage: string;
  fieldAnalysis: FieldCompletenessInfo[];
  recommendations: CompletenessRecommendation[];
  actionRequired: boolean;
}

export interface FieldCompletenessInfo {
  fieldName: string;
  totalValues: number;
  originalValues: number;
  missingValues: number;
  imputedValues: number;
  originalPercentage: number;
  missingPercentage: number;
  imputedPercentage: number;
  qualityLevel: 'excellent' | 'good' | 'warning' | 'critical';
  qualityColor: 'green' | 'yellow' | 'red';
  isRequired: boolean;
  dataType: 'numeric' | 'categorical' | 'date' | 'text';
}

export interface CompletenessRecommendation {
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  affectedFields: string[];
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
}

export class DataCompletenessAnalyzer {
  
  /**
   * Analyze data completeness before imputation
   */
  static analyzeOriginalCompleteness(data: any[]): DataCompletenessMetrics {
    if (!data || data.length === 0) {
      return this.createEmptyMetrics();
    }

    const fieldAnalysis = this.analyzeFields(data, null);
    const overallStats = this.calculateOverallStats(fieldAnalysis);
    const qualityAssessment = this.assessQualityLevel(overallStats.originalPercentage);
    const recommendations = this.generateRecommendations(fieldAnalysis, qualityAssessment);

    return {
      overallCompleteness: overallStats.originalPercentage,
      originalDataPercentage: overallStats.originalPercentage,
      imputedDataPercentage: 0,
      qualityLevel: qualityAssessment.level,
      qualityColor: qualityAssessment.color,
      qualityMessage: qualityAssessment.message,
      fieldAnalysis,
      recommendations,
      actionRequired: qualityAssessment.level === 'critical' || qualityAssessment.level === 'warning'
    };
  }

  /**
   * Analyze data completeness after imputation
   */
  static analyzePostImputationCompleteness(
    originalData: any[],
    imputedData: any[],
    imputationFields: any[]
  ): DataCompletenessMetrics {
    if (!originalData || originalData.length === 0) {
      return this.createEmptyMetrics();
    }

    const fieldAnalysis = this.analyzeFields(originalData, imputationFields);
    const overallStats = this.calculateOverallStatsWithImputation(fieldAnalysis);
    const qualityAssessment = this.assessQualityLevel(overallStats.originalPercentage);
    const recommendations = this.generatePostImputationRecommendations(fieldAnalysis, qualityAssessment, overallStats);

    return {
      overallCompleteness: 100, // After imputation, data is 100% complete
      originalDataPercentage: overallStats.originalPercentage,
      imputedDataPercentage: overallStats.imputedPercentage,
      qualityLevel: qualityAssessment.level,
      qualityColor: qualityAssessment.color,
      qualityMessage: this.generatePostImputationMessage(qualityAssessment, overallStats),
      fieldAnalysis,
      recommendations,
      actionRequired: qualityAssessment.level === 'critical' || 
                     (qualityAssessment.level === 'warning' && overallStats.imputedPercentage > 15)
    };
  }

  /**
   * Compare completeness before and after imputation
   */
  static compareCompleteness(
    beforeMetrics: DataCompletenessMetrics,
    afterMetrics: DataCompletenessMetrics
  ): {
    improvement: number;
    qualityChange: string;
    riskAssessment: string;
    proceedRecommendation: 'proceed' | 'caution' | 'stop';
    summary: string;
  } {
    const improvement = afterMetrics.overallCompleteness - beforeMetrics.overallCompleteness;
    const originalDataLoss = beforeMetrics.originalDataPercentage - afterMetrics.originalDataPercentage;
    
    let proceedRecommendation: 'proceed' | 'caution' | 'stop' = 'proceed';
    let riskAssessment = 'Low risk';
    
    if (afterMetrics.originalDataPercentage < 75) {
      proceedRecommendation = 'stop';
      riskAssessment = 'High risk - Too much imputed data';
    } else if (afterMetrics.originalDataPercentage < 90) {
      proceedRecommendation = 'caution';
      riskAssessment = 'Medium risk - Significant imputed data';
    }

    const qualityChange = this.getQualityChangeDescription(beforeMetrics.qualityLevel, afterMetrics.qualityLevel);
    
    const summary = this.generateComparisonSummary(
      beforeMetrics.originalDataPercentage,
      afterMetrics.originalDataPercentage,
      afterMetrics.imputedDataPercentage,
      proceedRecommendation
    );

    return {
      improvement,
      qualityChange,
      riskAssessment,
      proceedRecommendation,
      summary
    };
  }

  // Private helper methods

  private static analyzeFields(data: any[], imputationFields: any[] | null): FieldCompletenessInfo[] {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0] || {});
    const totalRows = data.length;
    
    return columns.map(fieldName => {
      let originalValues = 0;
      let missingValues = 0;
      let imputedValues = 0;

      // Count original, missing, and imputed values
      for (let i = 0; i < data.length; i++) {
        const value = data[i][fieldName];
        const isOriginallyMissing = value === null || value === undefined || value === '';
        
        if (isOriginallyMissing) {
          missingValues++;
          
          // Check if this field was imputed
          if (imputationFields) {
            const wasImputed = imputationFields.some(
              field => field.field === fieldName && field.rowIndex === i
            );
            if (wasImputed) {
              imputedValues++;
              missingValues--; // It's no longer missing after imputation
            }
          }
        } else {
          originalValues++;
        }
      }

      const originalPercentage = (originalValues / totalRows) * 100;
      const missingPercentage = (missingValues / totalRows) * 100;
      const imputedPercentage = (imputedValues / totalRows) * 100;

      const qualityAssessment = this.assessFieldQuality(originalPercentage);
      const dataType = this.detectDataType(data, fieldName);

      return {
        fieldName,
        totalValues: totalRows,
        originalValues,
        missingValues,
        imputedValues,
        originalPercentage,
        missingPercentage,
        imputedPercentage,
        qualityLevel: qualityAssessment.level,
        qualityColor: qualityAssessment.color,
        isRequired: this.isRequiredField(fieldName),
        dataType
      };
    });
  }

  private static calculateOverallStats(fieldAnalysis: FieldCompletenessInfo[]): {
    originalPercentage: number;
    imputedPercentage: number;
  } {
    if (fieldAnalysis.length === 0) {
      return { originalPercentage: 0, imputedPercentage: 0 };
    }

    const totalCells = fieldAnalysis.reduce((sum, field) => sum + field.totalValues, 0);
    const totalOriginal = fieldAnalysis.reduce((sum, field) => sum + field.originalValues, 0);
    const totalImputed = fieldAnalysis.reduce((sum, field) => sum + field.imputedValues, 0);

    return {
      originalPercentage: (totalOriginal / totalCells) * 100,
      imputedPercentage: (totalImputed / totalCells) * 100
    };
  }

  private static calculateOverallStatsWithImputation(fieldAnalysis: FieldCompletenessInfo[]): {
    originalPercentage: number;
    imputedPercentage: number;
  } {
    return this.calculateOverallStats(fieldAnalysis);
  }

  private static assessQualityLevel(originalPercentage: number): {
    level: 'excellent' | 'good' | 'warning' | 'critical';
    color: 'green' | 'yellow' | 'red';
    message: string;
  } {
    if (originalPercentage >= 90) {
      return {
        level: 'excellent',
        color: 'green',
        message: 'Excellent data quality - ready to proceed with confidence'
      };
    } else if (originalPercentage >= 75) {
      return {
        level: 'warning',
        color: 'yellow',
        message: 'Moderate data quality - review imputed fields and consider collecting more data'
      };
    } else {
      return {
        level: 'critical',
        color: 'red',
        message: 'Poor data quality - collect more original data before proceeding'
      };
    }
  }

  private static assessFieldQuality(originalPercentage: number): {
    level: 'excellent' | 'good' | 'warning' | 'critical';
    color: 'green' | 'yellow' | 'red';
  } {
    if (originalPercentage >= 90) {
      return { level: 'excellent', color: 'green' };
    } else if (originalPercentage >= 75) {
      return { level: 'warning', color: 'yellow' };
    } else {
      return { level: 'critical', color: 'red' };
    }
  }

  private static generateRecommendations(
    fieldAnalysis: FieldCompletenessInfo[],
    qualityAssessment: any
  ): CompletenessRecommendation[] {
    const recommendations: CompletenessRecommendation[] = [];

    // Overall quality recommendations
    if (qualityAssessment.level === 'critical') {
      recommendations.push({
        type: 'critical',
        title: 'Critical Data Quality Issue',
        message: 'Less than 75% of your data is complete. This may lead to unreliable analysis results.',
        affectedFields: fieldAnalysis.filter(f => f.qualityLevel === 'critical').map(f => f.fieldName),
        suggestedAction: 'Collect more complete data before proceeding with analysis',
        priority: 'high'
      });
    } else if (qualityAssessment.level === 'warning') {
      recommendations.push({
        type: 'warning',
        title: 'Moderate Data Quality',
        message: '75-90% of your data is complete. Consider reviewing the imputed values.',
        affectedFields: fieldAnalysis.filter(f => f.qualityLevel === 'warning').map(f => f.fieldName),
        suggestedAction: 'Review which fields will be imputed and consider collecting more data for critical fields',
        priority: 'medium'
      });
    }

    // Field-specific recommendations
    const criticalFields = fieldAnalysis.filter(f => f.qualityLevel === 'critical' && f.isRequired);
    if (criticalFields.length > 0) {
      recommendations.push({
        type: 'critical',
        title: 'Required Fields with Poor Quality',
        message: 'Some required fields have less than 75% complete data.',
        affectedFields: criticalFields.map(f => f.fieldName),
        suggestedAction: 'Prioritize collecting data for these required fields',
        priority: 'high'
      });
    }

    const warningFields = fieldAnalysis.filter(f => f.qualityLevel === 'warning');
    if (warningFields.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Fields Requiring Attention',
        message: 'Several fields have 75-90% complete data and will benefit from additional data collection.',
        affectedFields: warningFields.map(f => f.fieldName),
        suggestedAction: 'Consider collecting more data for these fields to improve analysis accuracy',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private static generatePostImputationRecommendations(
    fieldAnalysis: FieldCompletenessInfo[],
    qualityAssessment: any,
    overallStats: any
  ): CompletenessRecommendation[] {
    const recommendations: CompletenessRecommendation[] = [];

    // Risk assessment based on imputed data percentage
    if (overallStats.imputedPercentage > 25) {
      recommendations.push({
        type: 'critical',
        title: 'High Percentage of Imputed Data',
        message: `${overallStats.imputedPercentage.toFixed(1)}% of your data has been imputed using ML algorithms.`,
        affectedFields: fieldAnalysis.filter(f => f.imputedPercentage > 20).map(f => f.fieldName),
        suggestedAction: 'Validate results carefully and consider collecting more original data',
        priority: 'high'
      });
    } else if (overallStats.imputedPercentage > 10) {
      recommendations.push({
        type: 'warning',
        title: 'Moderate Imputation Used',
        message: `${overallStats.imputedPercentage.toFixed(1)}% of your data has been imputed.`,
        affectedFields: fieldAnalysis.filter(f => f.imputedPercentage > 10).map(f => f.fieldName),
        suggestedAction: 'Review imputed values and validate against business knowledge',
        priority: 'medium'
      });
    }

    // Field-specific imputation warnings
    const heavilyImputedFields = fieldAnalysis.filter(f => f.imputedPercentage > 30);
    if (heavilyImputedFields.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Fields with Heavy Imputation',
        message: 'Some fields had more than 30% of their values imputed.',
        affectedFields: heavilyImputedFields.map(f => f.fieldName),
        suggestedAction: 'Review these fields carefully and validate imputed values',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private static generatePostImputationMessage(qualityAssessment: any, overallStats: any): string {
    const baseMessage = qualityAssessment.message;
    const imputedPercentage = overallStats.imputedPercentage;
    
    if (imputedPercentage > 0) {
      return `${baseMessage} (${imputedPercentage.toFixed(1)}% of data was imputed using ML)`;
    }
    
    return baseMessage;
  }

  private static getQualityChangeDescription(
    beforeLevel: string,
    afterLevel: string
  ): string {
    if (beforeLevel === afterLevel) {
      return 'Quality level maintained';
    } else if (
      (beforeLevel === 'critical' && afterLevel === 'warning') ||
      (beforeLevel === 'warning' && afterLevel === 'excellent')
    ) {
      return 'Quality level improved';
    } else {
      return 'Quality level changed';
    }
  }

  private static generateComparisonSummary(
    originalBefore: number,
    originalAfter: number,
    imputedPercentage: number,
    recommendation: string
  ): string {
    return `Original data: ${originalAfter.toFixed(1)}%, Imputed: ${imputedPercentage.toFixed(1)}% - ${
      recommendation === 'proceed' ? 'Safe to proceed' :
      recommendation === 'caution' ? 'Proceed with caution' :
      'Consider collecting more data'
    }`;
  }

  private static detectDataType(data: any[], fieldName: string): 'numeric' | 'categorical' | 'date' | 'text' {
    const sampleValues = data.slice(0, 20)
      .map(row => row[fieldName])
      .filter(val => val !== null && val !== undefined && val !== '');

    if (sampleValues.length === 0) return 'text';

    // Check for numeric
    if (sampleValues.every(val => !isNaN(parseFloat(val)))) {
      return 'numeric';
    }

    // Check for date
    if (sampleValues.some(val => !isNaN(Date.parse(val)))) {
      return 'date';
    }

    // Check for categorical (limited unique values)
    const uniqueValues = new Set(sampleValues);
    if (uniqueValues.size <= Math.min(10, sampleValues.length * 0.5)) {
      return 'categorical';
    }

    return 'text';
  }

  private static isRequiredField(fieldName: string): boolean {
    const requiredPatterns = ['id', 'name', 'amount', 'quantity', 'date', 'customer', 'order'];
    const lowerFieldName = fieldName.toLowerCase();
    return requiredPatterns.some(pattern => lowerFieldName.includes(pattern));
  }

  private static createEmptyMetrics(): DataCompletenessMetrics {
    return {
      overallCompleteness: 0,
      originalDataPercentage: 0,
      imputedDataPercentage: 0,
      qualityLevel: 'critical',
      qualityColor: 'red',
      qualityMessage: 'No data available for analysis',
      fieldAnalysis: [],
      recommendations: [],
      actionRequired: true
    };
  }
}

/**
 * Utility functions for displaying completeness metrics
 */
export const DataCompletenessUtils = {
  
  /**
   * Get color class for UI components based on quality level
   */
  getQualityColorClass: (color: 'green' | 'yellow' | 'red', variant: 'bg' | 'text' | 'border' = 'bg'): string => {
    const colorMap = {
      green: {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-700',
        border: 'border-green-200'
      },
      yellow: {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-700',
        border: 'border-yellow-200'
      },
      red: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-700',
        border: 'border-red-200'
      }
    };
    
    return colorMap[color][variant];
  },

  /**
   * Format percentage for display
   */
  formatPercentage: (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  },

  /**
   * Get quality icon based on level
   */
  getQualityIcon: (level: 'excellent' | 'good' | 'warning' | 'critical'): string => {
    const iconMap = {
      excellent: '✅',
      good: '✅',
      warning: '⚠️',
      critical: '❌'
    };
    
    return iconMap[level];
  },

  /**
   * Generate completeness summary text
   */
  generateSummaryText: (metrics: DataCompletenessMetrics): string => {
    const { originalDataPercentage, imputedDataPercentage, qualityLevel } = metrics;
    
    let summary = `${DataCompletenessUtils.formatPercentage(originalDataPercentage)} original data`;
    
    if (imputedDataPercentage > 0) {
      summary += `, ${DataCompletenessUtils.formatPercentage(imputedDataPercentage)} imputed`;
    }
    
    const statusText = qualityLevel === 'excellent' ? 'Excellent quality' :
                      qualityLevel === 'good' ? 'Good quality' :
                      qualityLevel === 'warning' ? 'Needs attention' :
                      'Critical issues';
    
    return `${summary} - ${statusText}`;
  }
};
