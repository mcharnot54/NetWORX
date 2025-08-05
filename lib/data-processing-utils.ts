// Enhanced data processing utilities with flexible validation
import type {
  ValidationResult,
  ProcessingResult,
  DataQualityMetrics
} from '@/types/data-schema';

export class EnhancedDataProcessingUtils {
  
  /**
   * Format validation results with improved readability for adaptive templates
   */
  static formatValidationResults(results: ValidationResult[]): string {
    const errors = results.filter(r => !r.isValid);
    if (errors.length === 0) return 'All data validation checks passed successfully.';
    
    // Group errors by type for better understanding
    const errorGroups = this.groupErrorsByType(errors);
    const totalFields = results.length;
    const errorRate = (errors.length / totalFields * 100).toFixed(1);
    
    let output = `Found ${errors.length} validation issues (${errorRate}% of fields):\n\n`;
    
    for (const [errorType, groupedErrors] of Object.entries(errorGroups)) {
      output += `${errorType} (${groupedErrors.length}):\n`;
      groupedErrors.slice(0, 3).forEach(error => {
        output += `  • ${error.field}: ${error.errorMessage}\n`;
      });
      if (groupedErrors.length > 3) {
        output += `  • ... and ${groupedErrors.length - 3} more ${errorType.toLowerCase()} issues\n`;
      }
      output += '\n';
    }
    
    // Add suggestions for common issues
    output += this.generateValidationSuggestions(errorGroups);
    
    return output;
  }

  /**
   * Format data quality metrics with enhanced insights for adaptive processing
   */
  static formatDataQuality(quality: DataQualityMetrics): string {
    const qualityGrade = this.calculateQualityGrade(quality);
    
    return `Data Quality Assessment (Grade: ${qualityGrade}):
• Completeness: ${quality.completeness.toFixed(1)}% - ${this.getCompletenessComment(quality.completeness)}
• Accuracy: ${quality.accuracy.toFixed(1)}% - ${this.getAccuracyComment(quality.accuracy)}
• Valid Records: ${quality.validRecords}/${quality.totalRecords} processed successfully
${quality.missingFields.length > 0 ? `• Missing Fields: ${quality.missingFields.slice(0, 5).join(', ')}${quality.missingFields.length > 5 ? '...' : ''}` : ''}
${quality.invalidValues.length > 0 ? `• Data Issues: ${quality.invalidValues.length} found` : ''}

${this.generateQualityRecommendations(quality)}`;
  }

  /**
   * Generate processing summary with enhanced insights for adaptive templates
   */
  static generateProcessingSummary(result: ProcessingResult): string {
    const { summary, errors, warnings } = result;
    const successRate = ((summary.validRows / summary.totalRows) * 100).toFixed(1);
    const processingMode = this.detectProcessingMode(result);
    
    return `Processing Complete (${processingMode} Mode):
• Total Rows: ${summary.totalRows}
• Successfully Processed: ${summary.validRows} (${successRate}%)
• Skipped/Invalid: ${summary.skippedRows}
• Processing Quality: ${this.getProcessingQualityComment(parseFloat(successRate))}

${this.formatIssuesSummary(errors, warnings)}

${this.generateProcessingInsights(result)}`;
  }

  /**
   * Enhanced file content analyzer for better template matching
   */
  static analyzeFileContent(data: any[], fileName: string): {
    suggestedCategories: string[];
    dataCharacteristics: string[];
    processingRecommendations: string[];
  } {
    const analysis = {
      suggestedCategories: [] as string[],
      dataCharacteristics: [] as string[],
      processingRecommendations: [] as string[]
    };

    if (!data || data.length === 0) return analysis;

    const columnNames = Object.keys(data[0] || {}).map(k => k.toLowerCase());
    const sampleRow = data[0];
    
    // Analyze content patterns
    const hasFinancialData = this.detectFinancialData(columnNames, sampleRow);
    const hasGeographicData = this.detectGeographicData(columnNames, sampleRow);
    const hasTemporalData = this.detectTemporalData(columnNames, sampleRow);
    const hasQuantityData = this.detectQuantityData(columnNames, sampleRow);
    
    // Suggest categories based on patterns
    if (hasFinancialData) {
      analysis.suggestedCategories.push('Business Financials');
    }
    if (hasGeographicData || hasQuantityData) {
      analysis.suggestedCategories.push('Operational Reporting');
    }
    if (hasTemporalData) {
      analysis.suggestedCategories.push('Sales Growth Trajectory');
    }

    // Describe data characteristics
    if (hasFinancialData) analysis.dataCharacteristics.push('Contains monetary values and costs');
    if (hasGeographicData) analysis.dataCharacteristics.push('Includes location and facility data');
    if (hasTemporalData) analysis.dataCharacteristics.push('Has time-series or date information');
    if (hasQuantityData) analysis.dataCharacteristics.push('Contains quantities and measurements');

    // Generate processing recommendations
    analysis.processingRecommendations = this.generateFileProcessingRecommendations(
      fileName, hasFinancialData, hasGeographicData, hasTemporalData, hasQuantityData
    );

    return analysis;
  }

  // Private helper methods

  private static groupErrorsByType(errors: ValidationResult[]): Record<string, ValidationResult[]> {
    const groups: Record<string, ValidationResult[]> = {
      'Type Conversion Issues': [],
      'Missing Required Data': [],
      'Format Issues': [],
      'Range/Validation Issues': [],
      'Other Issues': []
    };

    errors.forEach(error => {
      const message = error.errorMessage || '';
      if (message.includes('convert') || message.includes('parse')) {
        groups['Type Conversion Issues'].push(error);
      } else if (message.includes('missing') || message.includes('required')) {
        groups['Missing Required Data'].push(error);
      } else if (message.includes('format') || message.includes('pattern')) {
        groups['Format Issues'].push(error);
      } else if (message.includes('range') || message.includes('minimum') || message.includes('maximum')) {
        groups['Range/Validation Issues'].push(error);
      } else {
        groups['Other Issues'].push(error);
      }
    });

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) delete groups[key];
    });

    return groups;
  }

  private static generateValidationSuggestions(errorGroups: Record<string, ValidationResult[]>): string {
    let suggestions = 'Suggestions for improvement:\n';
    
    if (errorGroups['Type Conversion Issues']) {
      suggestions += '• Check for non-numeric characters in number fields\n';
    }
    if (errorGroups['Missing Required Data']) {
      suggestions += '• Ensure all required columns are present and populated\n';
    }
    if (errorGroups['Format Issues']) {
      suggestions += '• Verify date formats and text patterns match expectations\n';
    }
    
    return suggestions;
  }

  private static calculateQualityGrade(quality: DataQualityMetrics): string {
    const overallScore = (quality.accuracy + quality.completeness) / 2;
    if (overallScore >= 95) return 'A+';
    if (overallScore >= 90) return 'A';
    if (overallScore >= 85) return 'B+';
    if (overallScore >= 80) return 'B';
    if (overallScore >= 75) return 'C+';
    if (overallScore >= 70) return 'C';
    return 'D';
  }

  private static getCompletenessComment(completeness: number): string {
    if (completeness >= 95) return 'Excellent data coverage';
    if (completeness >= 85) return 'Good data coverage';
    if (completeness >= 70) return 'Adequate data coverage';
    return 'Limited data coverage - consider data enrichment';
  }

  private static getAccuracyComment(accuracy: number): string {
    if (accuracy >= 95) return 'Highly accurate data';
    if (accuracy >= 85) return 'Good data accuracy';
    if (accuracy >= 70) return 'Acceptable accuracy with minor issues';
    return 'Data quality needs improvement';
  }

  private static generateQualityRecommendations(quality: DataQualityMetrics): string {
    const recommendations = [];
    
    if (quality.completeness < 85) {
      recommendations.push('• Consider filling missing data or marking as optional');
    }
    if (quality.accuracy < 85) {
      recommendations.push('• Review data validation rules and clean invalid entries');
    }
    if (quality.invalidValues.length > 0) {
      recommendations.push('• Check data formats and ensure consistency');
    }
    
    return recommendations.length > 0 ? 
      `Recommendations:\n${recommendations.join('\n')}` : 
      'Data quality is good - ready for optimization processing.';
  }

  private static detectProcessingMode(result: ProcessingResult): string {
    if (result.data?.metadata && 'confidence' in (result.data.metadata as any)) {
      return 'Adaptive AI';
    }
    return 'Standard Template';
  }

  private static getProcessingQualityComment(successRate: number): string {
    if (successRate >= 95) return 'Excellent processing quality';
    if (successRate >= 85) return 'Good processing quality';
    if (successRate >= 70) return 'Acceptable processing quality';
    return 'Processing quality needs review';
  }

  private static formatIssuesSummary(errors: string[], warnings: string[]): string {
    let summary = '';
    
    if (errors.length > 0) {
      summary += `Errors (${errors.length}):\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}\n\n`;
    }
    
    if (warnings.length > 0) {
      summary += `Warnings (${warnings.length}):\n${warnings.slice(0, 3).join('\n')}${warnings.length > 3 ? '\n...' : ''}\n\n`;
    }
    
    return summary;
  }

  private static generateProcessingInsights(result: ProcessingResult): string {
    const insights = [];
    
    if (result.summary.validRows > 0) {
      insights.push('✓ Data was successfully extracted and categorized');
    }
    
    if (result.warnings.length > 0 && result.errors.length === 0) {
      insights.push('⚠ Minor data quality issues detected but processing continued');
    }
    
    if (result.summary.skippedRows > 0) {
      insights.push('ℹ Some rows were skipped due to missing critical data');
    }
    
    return insights.length > 0 ? 
      `Insights:\n${insights.join('\n')}` : 
      'Processing completed without additional insights.';
  }

  // Content detection methods
  private static detectFinancialData(columnNames: string[], sampleRow: any): boolean {
    const financialKeywords = ['cost', 'price', 'amount', 'revenue', 'budget', 'expense', 'profit', 'dollar', 'currency'];
    return columnNames.some(col => financialKeywords.some(keyword => col.includes(keyword))) ||
           Object.values(sampleRow).some(val => typeof val === 'string' && /\$\d+/.test(val));
  }

  private static detectGeographicData(columnNames: string[], sampleRow: any): boolean {
    const geoKeywords = ['state', 'city', 'zip', 'region', 'location', 'address', 'facility', 'warehouse'];
    return columnNames.some(col => geoKeywords.some(keyword => col.includes(keyword)));
  }

  private static detectTemporalData(columnNames: string[], sampleRow: any): boolean {
    const timeKeywords = ['date', 'time', 'year', 'month', 'period', 'quarter'];
    return columnNames.some(col => timeKeywords.some(keyword => col.includes(keyword))) ||
           Object.values(sampleRow).some(val => !isNaN(Date.parse(String(val))));
  }

  private static detectQuantityData(columnNames: string[], sampleRow: any): boolean {
    const quantityKeywords = ['quantity', 'count', 'volume', 'capacity', 'units', 'weight', 'qty'];
    return columnNames.some(col => quantityKeywords.some(keyword => col.includes(keyword)));
  }

  private static generateFileProcessingRecommendations(
    fileName: string,
    hasFinancial: boolean,
    hasGeographic: boolean,
    hasTemporal: boolean,
    hasQuantity: boolean
  ): string[] {
    const recommendations = [];
    
    if (hasFinancial) {
      recommendations.push('Ensure monetary values use consistent currency format');
    }
    if (hasGeographic) {
      recommendations.push('Verify location data is standardized (state codes, etc.)');
    }
    if (hasTemporal) {
      recommendations.push('Check date formats are consistent throughout the file');
    }
    if (hasQuantity) {
      recommendations.push('Confirm quantity measurements use consistent units');
    }
    
    if (fileName.toLowerCase().includes('budget') || fileName.toLowerCase().includes('financial')) {
      recommendations.push('Consider breaking down costs by category for better analysis');
    }
    
    return recommendations;
  }
}

// Export compatibility with existing DataProcessingUtils
export const DataProcessingUtils = {
  formatValidationResults: EnhancedDataProcessingUtils.formatValidationResults,
  formatDataQuality: EnhancedDataProcessingUtils.formatDataQuality,
  generateProcessingSummary: EnhancedDataProcessingUtils.generateProcessingSummary
};
