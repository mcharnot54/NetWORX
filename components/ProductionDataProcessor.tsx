'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Play, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Calculator,
  TrendingUp,
  Eye,
  RefreshCw,
  Info,
  BarChart3
} from 'lucide-react';
import { ProductionDataProcessor, type ProductionDataConfig, type ProductionProcessingResult } from '@/lib/production-data-processor';
import { DataCompletenessIndicator, DataCompletenessComparison } from '@/components/DataCompletenessIndicator';

interface ProductionDataProcessorProps {
  projectId: number;
  scenarioId: number;
  onProcessingComplete?: (result: ProductionProcessingResult) => void;
  className?: string;
}

export function ProductionDataProcessorComponent({ 
  projectId, 
  scenarioId, 
  onProcessingComplete,
  className = '' 
}: ProductionDataProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProductionProcessingResult | null>(null);
  const [config, setConfig] = useState<ProductionDataConfig>({
    projectId,
    scenarioId,
    enableAutoCalculations: true,
    imputationConfig: {
      method: 'auto',
      confidence_threshold: 0.7,
      max_iterations: 10,
      mark_imputed: true
    },
    calculationRules: []
  });
  const [availableData, setAvailableData] = useState<any[]>([]);
  const [suggestedRules, setSuggestedRules] = useState<any[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Load available data and suggested calculation rules
  useEffect(() => {
    loadAvailableData();
  }, [projectId, scenarioId]);

  const loadAvailableData = async () => {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/data`);
      if (response.ok) {
        const { data } = await response.json();
        setAvailableData(data);
        
        // Get suggested calculation rules
        const rules = ProductionDataProcessor.suggestCalculationRules(data);
        setSuggestedRules(rules);
        setConfig(prev => ({ ...prev, calculationRules: rules }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const processProductionData = async () => {
    setIsProcessing(true);
    try {
      const processingResult = await ProductionDataProcessor.processScenarioData(config);
      setResult(processingResult);
      onProcessingComplete?.(processingResult);
    } catch (error) {
      console.error('Processing failed:', error);
      setResult({
        success: false,
        originalData: [],
        processedData: [],
        completenessMetrics: {
          overallCompleteness: 0,
          originalDataPercentage: 0,
          imputedDataPercentage: 0,
          qualityLevel: 'critical',
          qualityColor: 'red',
          qualityMessage: 'Processing failed',
          fieldAnalysis: [],
          recommendations: [],
          actionRequired: true
        },
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
        processingTime: 0,
        errors: [String(error)],
        warnings: []
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'good':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Production Data Processing</h3>
            <p className="text-sm text-gray-600">
              Process database data with advanced imputation and automatic calculations
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Data Overview */}
        {availableData.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Current Data Overview
            </h4>
            
            <DataCompletenessIndicator 
              data={availableData}
              showDetailedBreakdown={false}
              className="mb-4"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-700">Total Records</div>
                <div className="text-xl font-bold text-blue-600">{availableData.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-700">Data Fields</div>
                <div className="text-xl font-bold text-green-600">
                  {availableData.length > 0 ? Object.keys(availableData[0]).length : 0}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-700">Calculation Rules</div>
                <div className="text-xl font-bold text-purple-600">{suggestedRules.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Automatic Calculations */}
        {suggestedRules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Automatic Calculations
              </h4>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.enableAutoCalculations}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableAutoCalculations: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Auto Calculations</span>
              </label>
            </div>

            {config.enableAutoCalculations && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="font-medium text-purple-800 mb-3">Suggested Calculations</h5>
                <div className="space-y-2">
                  {suggestedRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <Calculator className="w-4 h-4 text-purple-600" />
                      <div className="flex-1">
                        <span className="font-medium text-purple-700">{rule.targetField}</span>
                        <span className="text-purple-600"> = {rule.formula}</span>
                        <div className="text-xs text-purple-500">{rule.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-purple-600">
                  ✨ These calculations will be performed automatically using available data fields
                </div>
              </div>
            )}
          </div>
        )}

        {/* Imputation Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Missing Data Imputation
            </h4>
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imputation Method
              </label>
              <select
                value={config.imputationConfig.method || 'auto'}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  imputationConfig: { ...prev.imputationConfig, method: e.target.value as any }
                }))}
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
            </div>

            {showAdvancedSettings && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold: {config.imputationConfig.confidence_threshold}
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={config.imputationConfig.confidence_threshold}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    imputationConfig: { ...prev.imputationConfig, confidence_threshold: parseFloat(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {showAdvancedSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Iterations: {config.imputationConfig.max_iterations}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={config.imputationConfig.max_iterations}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    imputationConfig: { ...prev.imputationConfig, max_iterations: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.imputationConfig.mark_imputed}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    imputationConfig: { ...prev.imputationConfig, mark_imputed: e.target.checked }
                  }))}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Mark Imputed Fields</span>
              </div>
            </div>
          )}
        </div>

        {/* Process Button */}
        <div className="flex justify-center">
          <button
            onClick={processProductionData}
            disabled={isProcessing || availableData.length === 0}
            className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing Production Data...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Process Production Data
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6 border-t pt-6">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Processing Results
            </h4>

            {/* Success/Failure Status */}
            <div className={`flex items-center gap-2 p-4 rounded-lg border ${
              result.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <div>
                <div className="font-medium">
                  {result.success ? 'Production Processing Completed Successfully' : 'Processing Failed'}
                </div>
                <div className="text-sm opacity-80">
                  Processing time: {result.processingTime}ms | Records processed: {result.processedData.length}
                </div>
              </div>
            </div>

            {/* Quality Assessment */}
            <div className={`p-4 rounded-lg border ${getQualityColor(result.qualityAssessment.overallQuality)}`}>
              <div className="flex items-center gap-2 mb-3">
                {getQualityIcon(result.qualityAssessment.overallQuality)}
                <span className="font-medium">
                  Data Quality: {result.qualityAssessment.overallQuality.toUpperCase()}
                </span>
                <span className="px-2 py-1 bg-white bg-opacity-60 rounded text-xs font-medium">
                  {result.qualityAssessment.proceedRecommendation.toUpperCase()}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Original Data:</span>
                  <span className="ml-2">{result.qualityAssessment.originalDataPercentage.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="font-medium">Imputed Data:</span>
                  <span className="ml-2">{result.qualityAssessment.imputedDataPercentage.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="font-medium">Calculated Data:</span>
                  <span className="ml-2">{result.qualityAssessment.calculatedDataPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Calculation Results */}
            {result.calculationResults.derivedFields.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="font-medium text-purple-800 mb-3">Calculation Results</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-purple-700">Fields Calculated:</span>
                    <span className="ml-2 text-purple-600">{result.calculationResults.fieldsCalculated}</span>
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">Total Calculations:</span>
                    <span className="ml-2 text-purple-600">{result.calculationResults.calculationsPerformed}</span>
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">Derived Fields:</span>
                  </div>
                </div>
                <div className="mt-2 text-purple-600 text-sm">
                  <strong>New fields created:</strong> {result.calculationResults.derivedFields.join(', ')}
                </div>
              </div>
            )}

            {/* Before/After Comparison */}
            {result.originalData.length > 0 && result.processedData.length > 0 && (
              <DataCompletenessComparison
                beforeData={result.originalData}
                afterData={result.processedData}
                imputationFields={result.imputationResult?.imputedFields || []}
              />
            )}

            {/* Errors and Warnings */}
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-medium text-red-800 mb-2">Errors ({result.errors.length})</h5>
                <ul className="text-red-700 text-sm space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-medium text-yellow-800 mb-2">Warnings ({result.warnings.length})</h5>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* No Data Message */}
        {availableData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Data Available</p>
            <p className="text-sm">Upload some files to this scenario first to enable production processing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
