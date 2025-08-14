'use client';

import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  TrendingUp,
  Database,
  Eye,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { 
  DataCompletenessAnalyzer, 
  DataCompletenessUtils, 
  type DataCompletenessMetrics 
} from '@/lib/data-completeness-analyzer';

interface DataCompletenessIndicatorProps {
  data?: any[];
  imputationFields?: any[];
  showDetailedBreakdown?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

export function DataCompletenessIndicator({ 
  data, 
  imputationFields, 
  showDetailedBreakdown = false,
  onViewDetails,
  className = '' 
}: DataCompletenessIndicatorProps) {
  
  // Analyze data completeness
  const metrics = React.useMemo(() => {
    if (!data || data.length === 0) {
      return DataCompletenessAnalyzer.analyzeOriginalCompleteness([]);
    }
    
    if (imputationFields && imputationFields.length > 0) {
      return DataCompletenessAnalyzer.analyzePostImputationCompleteness(data, data, imputationFields);
    } else {
      return DataCompletenessAnalyzer.analyzeOriginalCompleteness(data);
    }
  }, [data, imputationFields]);

  const getQualityIcon = () => {
    switch (metrics.qualityLevel) {
      case 'excellent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getProgressBarColor = () => {
    switch (metrics.qualityColor) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Database className="w-4 h-4" />
          <span className="text-sm">No data uploaded yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {/* Main Completeness Display */}
      <div className={`p-4 rounded-t-lg ${DataCompletenessUtils.getQualityColorClass(metrics.qualityColor)}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getQualityIcon()}
            <span className={`font-semibold ${DataCompletenessUtils.getQualityColorClass(metrics.qualityColor, 'text')}`}>
              Data Completeness Analysis
            </span>
          </div>
          <div className={`text-sm ${DataCompletenessUtils.getQualityColorClass(metrics.qualityColor, 'text')}`}>
            {DataCompletenessUtils.formatPercentage(metrics.originalDataPercentage)} Original
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            {/* Original Data */}
            <div 
              className={`h-full ${getProgressBarColor()} flex items-center justify-center text-white text-xs font-medium transition-all duration-300`}
              style={{ width: `${metrics.originalDataPercentage}%` }}
            >
              {metrics.originalDataPercentage > 15 && (
                <span>{DataCompletenessUtils.formatPercentage(metrics.originalDataPercentage)} Original</span>
              )}
            </div>
            
            {/* Imputed Data Overlay */}
            {metrics.imputedDataPercentage > 0 && (
              <div 
                className="absolute top-0 right-0 h-full bg-blue-500 bg-opacity-80 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${metrics.imputedDataPercentage}%` }}
              >
                {metrics.imputedDataPercentage > 10 && (
                  <span>{DataCompletenessUtils.formatPercentage(metrics.imputedDataPercentage)} ML</span>
                )}
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-between mt-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${getProgressBarColor()}`}></div>
                <span className={DataCompletenessUtils.getQualityColorClass(metrics.qualityColor, 'text')}>
                  Original Data ({DataCompletenessUtils.formatPercentage(metrics.originalDataPercentage)})
                </span>
              </div>
              {metrics.imputedDataPercentage > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-blue-600">
                    ML Imputed ({DataCompletenessUtils.formatPercentage(metrics.imputedDataPercentage)})
                  </span>
                </div>
              )}
            </div>
            <span className={`text-xs ${DataCompletenessUtils.getQualityColorClass(metrics.qualityColor, 'text')}`}>
              {metrics.qualityLevel.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Quality Message */}
        <div className={`mt-3 text-sm ${DataCompletenessUtils.getQualityColorClass(metrics.qualityColor, 'text')}`}>
          {metrics.qualityMessage}
        </div>
      </div>

      {/* Action Required Warning */}
      {metrics.actionRequired && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800 text-sm">Action Required</p>
              <p className="text-red-700 text-xs mt-1">
                {metrics.qualityLevel === 'critical' 
                  ? 'Consider collecting more data before proceeding - reliability may be compromised'
                  : 'Review imputed fields and validate against business knowledge'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Summary */}
      {metrics.recommendations.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                {metrics.recommendations.length} Recommendation{metrics.recommendations.length > 1 ? 's' : ''}
              </span>
            </div>
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-3 h-3" />
                View Details
              </button>
            )}
          </div>
          
          {/* Show first recommendation */}
          {metrics.recommendations[0] && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">{metrics.recommendations[0].title}:</span>{' '}
              {metrics.recommendations[0].message}
            </div>
          )}
        </div>
      )}

      {/* Detailed Field Breakdown */}
      {showDetailedBreakdown && metrics.fieldAnalysis.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-3 bg-gray-50">
            <h4 className="font-medium text-gray-700 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Field-by-Field Analysis
            </h4>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {metrics.fieldAnalysis.map((field, index) => (
              <div key={index} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{field.fieldName}</span>
                    {field.isRequired && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">Required</span>
                    )}
                    <span className="text-xs text-gray-500 capitalize">({field.dataType})</span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    DataCompletenessUtils.getQualityColorClass(field.qualityColor)
                  } ${DataCompletenessUtils.getQualityColorClass(field.qualityColor, 'text')}`}>
                    {DataCompletenessUtils.formatPercentage(field.originalPercentage)} Original
                  </div>
                </div>
                
                {/* Field Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full ${
                      field.qualityColor === 'green' ? 'bg-green-500' :
                      field.qualityColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${field.originalPercentage}%` }}
                  ></div>
                  {field.imputedPercentage > 0 && (
                    <div 
                      className="absolute h-2 bg-blue-500 bg-opacity-80"
                      style={{ 
                        width: `${field.imputedPercentage}%`,
                        marginLeft: `${field.originalPercentage}%`
                      }}
                    ></div>
                  )}
                </div>
                
                {/* Field Stats */}
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>
                    {field.originalValues}/{field.totalValues} original
                    {field.imputedValues > 0 && `, ${field.imputedValues} imputed`}
                    {field.missingValues > 0 && `, ${field.missingValues} missing`}
                  </span>
                  {field.qualityLevel === 'critical' && (
                    <span className="text-red-600 font-medium">Needs attention</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-700">
              {metrics.fieldAnalysis.length}
            </div>
            <div className="text-xs text-gray-500">Total Fields</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${
              metrics.fieldAnalysis.filter(f => f.qualityLevel === 'excellent').length > 0 ? 'text-green-600' : 'text-gray-400'
            }`}>
              {metrics.fieldAnalysis.filter(f => f.qualityLevel === 'excellent').length}
            </div>
            <div className="text-xs text-gray-500">High Quality</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${
              metrics.fieldAnalysis.filter(f => f.qualityLevel === 'critical').length > 0 ? 'text-red-600' : 'text-gray-400'
            }`}>
              {metrics.fieldAnalysis.filter(f => f.qualityLevel === 'critical').length}
            </div>
            <div className="text-xs text-gray-500">Need Attention</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DataCompletenessComparisonProps {
  beforeData: any[];
  afterData: any[];
  imputationFields: any[];
  className?: string;
}

export function DataCompletenessComparison({ 
  beforeData, 
  afterData, 
  imputationFields,
  className = '' 
}: DataCompletenessComparisonProps) {
  
  const beforeMetrics = React.useMemo(() => 
    DataCompletenessAnalyzer.analyzeOriginalCompleteness(beforeData),
    [beforeData]
  );
  
  const afterMetrics = React.useMemo(() => 
    DataCompletenessAnalyzer.analyzePostImputationCompleteness(beforeData, afterData, imputationFields),
    [beforeData, afterData, imputationFields]
  );
  
  const comparison = React.useMemo(() => 
    DataCompletenessAnalyzer.compareCompleteness(beforeMetrics, afterMetrics),
    [beforeMetrics, afterMetrics]
  );

  const getProceedColor = () => {
    switch (comparison.proceedRecommendation) {
      case 'proceed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'caution':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'stop':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProceedIcon = () => {
    switch (comparison.proceedRecommendation) {
      case 'proceed':
        return <CheckCircle className="w-5 h-5" />;
      case 'caution':
        return <AlertTriangle className="w-5 h-5" />;
      case 'stop':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 ${className}`}>
      <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Before vs After Imputation
      </h4>

      {/* Comparison Visual */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Before */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600 mb-2">Before Imputation</div>
          <div className={`text-2xl font-bold ${DataCompletenessUtils.getQualityColorClass(beforeMetrics.qualityColor, 'text')}`}>
            {DataCompletenessUtils.formatPercentage(beforeMetrics.originalDataPercentage)}
          </div>
          <div className="text-xs text-gray-500">Original Data</div>
        </div>

        {/* After */}
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600 mb-2">After Imputation</div>
          <div className="space-y-1">
            <div className={`text-lg font-bold ${DataCompletenessUtils.getQualityColorClass(afterMetrics.qualityColor, 'text')}`}>
              {DataCompletenessUtils.formatPercentage(afterMetrics.originalDataPercentage)}
            </div>
            <div className="text-xs text-gray-500">Original</div>
            {afterMetrics.imputedDataPercentage > 0 && (
              <>
                <div className="text-lg font-bold text-blue-600">
                  {DataCompletenessUtils.formatPercentage(afterMetrics.imputedDataPercentage)}
                </div>
                <div className="text-xs text-gray-500">ML Imputed</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Arrow and Improvement */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {comparison.improvement > 0 ? '+' : ''}{DataCompletenessUtils.formatPercentage(comparison.improvement)} completion
          </span>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`p-3 rounded-lg border ${getProceedColor()}`}>
        <div className="flex items-center gap-2 mb-2">
          {getProceedIcon()}
          <span className="font-medium">
            {comparison.proceedRecommendation === 'proceed' && 'Ready to Proceed'}
            {comparison.proceedRecommendation === 'caution' && 'Proceed with Caution'}
            {comparison.proceedRecommendation === 'stop' && 'Consider More Data'}
          </span>
        </div>
        <p className="text-sm">{comparison.summary}</p>
        <p className="text-xs mt-1 opacity-80">{comparison.riskAssessment}</p>
      </div>
    </div>
  );
}
