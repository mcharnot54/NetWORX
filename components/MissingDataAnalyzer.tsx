'use client';

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Info,
  BarChart3,
  Zap,
  Target
} from 'lucide-react';
import { EnhancedDataProcessor, type SmartProcessingConfig, type SmartProcessingResult } from '@/lib/enhanced-data-processor';
import { DataProcessingUtilities } from '@/lib/enhanced-data-processor';
import { DataCompletenessIndicator, DataCompletenessComparison } from '@/components/DataCompletenessIndicator';
import { DataCompletenessAnalyzer } from '@/lib/data-completeness-analyzer';

interface MissingDataAnalyzerProps {
  onDataProcessed?: (result: SmartProcessingResult) => void;
  className?: string;
}

export function MissingDataAnalyzer({ onDataProcessed, className = '' }: MissingDataAnalyzerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SmartProcessingResult | null>(null);
  const [config, setConfig] = useState<Partial<SmartProcessingConfig>>({
    enableAutoImputation: true,
    imputationMethod: 'auto',
    confidenceThreshold: 0.7,
    markImputedFields: true,
    maxIterations: 10
  });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setResult(null);
      setRecommendations(null);
    }
  }, []);

  const analyzeFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Parse file and analyze missing data
      const { data } = await import('@/lib/data-validator').then(module => module.DataValidator.parseFile(file));
      setParsedData(data);
      setOriginalData([...data]); // Keep original for comparison

      const recs = EnhancedDataProcessor.getImputationRecommendations(data);
      setRecommendations(recs);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  const processFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const processingResult = await EnhancedDataProcessor.processFileWithSmartImputation(file, config);
      setResult(processingResult);
      onDataProcessed?.(processingResult);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [file, config, onDataProcessed]);

  const getMethodDescription = (method: string): string => {
    const descriptions = {
      auto: 'Automatically selects the best method based on data analysis',
      mean_median: 'Simple statistical imputation using mean/median values',
      knn: 'K-Nearest Neighbors - uses similar records to predict missing values',
      regression: 'Linear regression models to predict missing values from other fields',
      random_forest: 'Tree-based ensemble method for complex pattern recognition',
      neural_network: 'Deep learning approach for high-dimensional data imputation',
      mice: 'Multiple Imputation by Chained Equations - iterative modeling approach'
    };
    return descriptions[method as keyof typeof descriptions] || 'Unknown method';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImprovementColor = (improvement: number): string => {
    if (improvement > 5) return 'text-green-600';
    if (improvement > 0) return 'text-blue-600';
    if (improvement === 0) return 'text-gray-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Advanced Missing Data Analyzer</h3>
            <p className="text-sm text-gray-600">
              Intelligent imputation using ML/DL approaches: Random Forests, XGBoost, Neural Networks, and MICE
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Data Upload
          </h4>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="missing-data-file"
            />
            <label
              htmlFor="missing-data-file"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {file ? file.name : 'Upload your data file'}
              </span>
              <span className="text-xs text-gray-500">
                Supports CSV, Excel files with missing data
              </span>
            </label>
          </div>

          {file && !recommendations && (
            <button
              onClick={analyzeFile}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Analyze Missing Data Patterns
                </>
              )}
            </button>
          )}
        </div>

        {/* Data Completeness Analysis */}
        {parsedData.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Data Completeness Analysis
            </h4>

            <DataCompletenessIndicator
              data={parsedData}
              showDetailedBreakdown={showDetailedAnalysis}
              onViewDetails={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            />
          </div>
        )}

        {/* Recommendations Display */}
        {recommendations && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Imputation Method Analysis
            </h4>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Recommended Method:</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {recommendations.recommendedMethod}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Confidence:</span>
                  <span className="text-blue-700 font-medium">
                    {(recommendations.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="font-medium text-blue-900">Analysis:</span>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    {recommendations.reasoning.map((reason: string, index: number) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
                
                {recommendations.alternatives.length > 0 && (
                  <div className="space-y-1">
                    <span className="font-medium text-blue-900">Alternative Methods:</span>
                    <div className="space-y-1">
                      {recommendations.alternatives.slice(0, 3).map((alt: any, index: number) => (
                        <div key={index} className="text-sm text-blue-700 flex items-center justify-between">
                          <span>{alt.method}</span>
                          <span className="text-xs">
                            {(alt.suitability * 100).toFixed(0)}% suitable
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Section */}
        {recommendations && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Imputation Settings
              </h4>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.enableAutoImputation}
                    onChange={(e) => setConfig(prev => ({ ...prev, enableAutoImputation: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Auto Imputation</span>
                </label>
              </div>

              {config.enableAutoImputation && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imputation Method
                    </label>
                    <select
                      value={config.imputationMethod || 'auto'}
                      onChange={(e) => setConfig(prev => ({ ...prev, imputationMethod: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="auto">Auto-Select (Recommended)</option>
                      <option value="mean_median">Mean/Median</option>
                      <option value="knn">K-Nearest Neighbors</option>
                      <option value="regression">Linear Regression</option>
                      <option value="random_forest">Random Forest</option>
                      <option value="neural_network">Neural Network</option>
                      <option value="mice">MICE</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {getMethodDescription(config.imputationMethod || 'auto')}
                    </p>
                  </div>

                  {showAdvancedSettings && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confidence Threshold: {config.confidenceThreshold}
                        </label>
                        <input
                          type="range"
                          min="0.3"
                          max="0.95"
                          step="0.05"
                          value={config.confidenceThreshold}
                          onChange={(e) => setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum confidence required for imputation
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Iterations: {config.maxIterations}
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="20"
                          step="1"
                          value={config.maxIterations}
                          onChange={(e) => setConfig(prev => ({ ...prev, maxIterations: parseInt(e.target.value) }))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum iterations for iterative methods (MICE)
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.markImputedFields}
                            onChange={(e) => setConfig(prev => ({ ...prev, markImputedFields: e.target.checked }))}
                            className="rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Mark Imputed Fields</span>
                        </label>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <button
              onClick={processFile}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing with Advanced Imputation...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Process Data with Smart Imputation
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Processing Results
            </h4>

            {/* Success/Failure Status */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {result.success ? 'Processing Completed Successfully' : 'Processing Failed'}
              </span>
            </div>

            {/* Quality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-600">Original Quality</div>
                <div className={`text-2xl font-bold ${getQualityColor(result.processingMetrics.originalDataQuality)}`}>
                  {result.processingMetrics.originalDataQuality.toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-600">Final Quality</div>
                <div className={`text-2xl font-bold ${getQualityColor(result.processingMetrics.finalDataQuality)}`}>
                  {result.processingMetrics.finalDataQuality.toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-600">Improvement</div>
                <div className={`text-2xl font-bold flex items-center gap-1 ${getImprovementColor(result.processingMetrics.improvementPercentage)}`}>
                  <TrendingUp className="w-5 h-5" />
                  {result.processingMetrics.improvementPercentage >= 0 ? '+' : ''}{result.processingMetrics.improvementPercentage.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Before/After Comparison */}
            {result.imputationSummary && originalData.length > 0 && (
              <DataCompletenessComparison
                beforeData={originalData}
                afterData={parsedData}
                imputationFields={result.imputationSummary ? [
                  // Simulate imputation fields from summary
                  ...Array(result.imputationSummary.totalValuesImputed).fill(null).map((_, i) => ({
                    field: `field_${i}`,
                    rowIndex: i,
                    confidence: result.imputationSummary!.averageConfidence,
                    method: result.imputationSummary!.methodUsed
                  }))
                ] : []}
                className="mb-4"
              />
            )}

            {/* Imputation Summary */}
            {result.imputationSummary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-3">Imputation Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Method Used:</span>
                    <span className="ml-2 text-blue-600">{result.imputationSummary.methodUsed}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Fields Imputed:</span>
                    <span className="ml-2 text-blue-600">{result.imputationSummary.fieldsImputed}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Values Imputed:</span>
                    <span className="ml-2 text-blue-600">{result.imputationSummary.totalValuesImputed}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Avg Confidence:</span>
                    <span className="ml-2 text-blue-600">{(result.imputationSummary.averageConfidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Recommendations
                </h5>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h5 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({result.warnings.length})
                </h5>
                <div className="text-sm text-orange-700 space-y-1">
                  {result.warnings.slice(0, 3).map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                  {result.warnings.length > 3 && (
                    <div className="text-orange-600">... and {result.warnings.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
