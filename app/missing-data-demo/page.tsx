'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import { MissingDataAnalyzer } from '@/components/MissingDataAnalyzer';
import { EnhancedDataProcessor, DataProcessingUtilities, type SmartProcessingResult } from '@/lib/enhanced-data-processor';
import { 
  Brain, 
  FileSpreadsheet, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Download,
  Database,
  Zap
} from 'lucide-react';

export default function MissingDataDemo() {
  const [processingResult, setProcessingResult] = useState<SmartProcessingResult | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [showDetailedLog, setShowDetailedLog] = useState(false);

  const generateSampleData = () => {
    const sampleData = [
      { customer_name: 'ABC Corp', order_amount: 5000, quantity: 100, region: 'North', delivery_date: '2024-01-15' },
      { customer_name: 'XYZ Ltd', order_amount: null, quantity: 250, region: 'South', delivery_date: null },
      { customer_name: 'Tech Solutions', order_amount: 8500, quantity: null, region: 'East', delivery_date: '2024-01-20' },
      { customer_name: null, order_amount: 3200, quantity: 80, region: 'West', delivery_date: '2024-01-18' },
      { customer_name: 'Global Inc', order_amount: 12000, quantity: 400, region: null, delivery_date: '2024-01-22' },
      { customer_name: 'Data Corp', order_amount: null, quantity: null, region: 'North', delivery_date: null },
      { customer_name: 'Future Systems', order_amount: 6700, quantity: 180, region: 'South', delivery_date: '2024-01-25' },
      { customer_name: 'Innovation Hub', order_amount: 9200, quantity: null, region: 'East', delivery_date: null },
      { customer_name: null, order_amount: 4500, quantity: 120, region: 'West', delivery_date: '2024-01-28' },
      { customer_name: 'Smart Solutions', order_amount: 15000, quantity: 500, region: 'North', delivery_date: '2024-01-30' }
    ];

    // Convert to CSV blob
    const csvHeader = 'customer_name,order_amount,quantity,region,delivery_date\n';
    const csvData = sampleData.map(row => 
      `"${row.customer_name || ''}",${row.order_amount || ''},${row.quantity || ''},"${row.region || ''}","${row.delivery_date || ''}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-data-with-missing-values.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProcessingComplete = (result: SmartProcessingResult) => {
    setProcessingResult(result);
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="text-purple-600" size={32} />
            <div>
              <h2 className="card-title mb-1">Advanced Missing Data Imputation Demo</h2>
              <p className="text-gray-600">
                Experience intelligent data completion using ML/DL techniques: Random Forests, XGBoost, Neural Networks, and MICE
              </p>
            </div>
          </div>

          {/* Introduction Section */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Advanced Machine Learning Methodology
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">🌳 Tree-Based Methods</h4>
                <ul className="space-y-1 text-purple-600">
                  <li>• <strong>Random Forests:</strong> Ensemble learning with multiple decision trees</li>
                  <li>• <strong>XGBoost-style:</strong> Gradient boosting for complex pattern recognition</li>
                  <li>• <strong>Feature importance:</strong> Identifies key predictors automatically</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">🧠 Neural Network Approaches</h4>
                <ul className="space-y-1 text-purple-600">
                  <li>• <strong>MissForest:</strong> Iterative random forest imputation</li>
                  <li>• <strong>GAIN:</strong> Generative Adversarial Imputation Networks</li>
                  <li>• <strong>Deep learning:</strong> Captures non-linear relationships</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">🔄 Iterative Methods</h4>
                <ul className="space-y-1 text-purple-600">
                  <li>• <strong>MICE:</strong> Multiple Imputation by Chained Equations</li>
                  <li>• <strong>Iterative modeling:</strong> Each missing field modeled from others</li>
                  <li>• <strong>Convergence:</strong> Repeats until stable predictions</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">📊 Smart Selection</h4>
                <ul className="space-y-1 text-purple-600">
                  <li>• <strong>Pattern analysis:</strong> Automatic missing data diagnosis</li>
                  <li>• <strong>Method selection:</strong> Chooses optimal approach per dataset</li>
                  <li>• <strong>Confidence scoring:</strong> Transparent quality metrics</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sample Data Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Try with Sample Data
              </h4>
              <button
                onClick={generateSampleData}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Sample CSV
              </button>
            </div>
            <p className="text-blue-700 text-sm">
              Get a sample CSV file with realistic missing data patterns to test the imputation system. 
              The file includes customer orders with strategically missing values across different fields.
            </p>
          </div>

          {/* Main Analyzer Component */}
          <MissingDataAnalyzer onDataProcessed={handleProcessingComplete} />

          {/* Results Section */}
          {processingResult && (
            <div className="mt-8 space-y-6">
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="text-green-600" />
                  Processing Results
                </h3>

                {/* Success/Error Status */}
                <div className={`flex items-center gap-2 p-4 rounded-lg mb-4 ${
                  processingResult.success 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {processingResult.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {processingResult.success 
                      ? 'Advanced imputation completed successfully!' 
                      : 'Processing encountered issues'}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Original Quality</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {processingResult.processingMetrics.originalDataQuality.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Final Quality</div>
                    <div className="text-2xl font-bold text-green-700">
                      {processingResult.processingMetrics.finalDataQuality.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">Improvement</div>
                    <div className={`text-2xl font-bold ${
                      processingResult.processingMetrics.improvementPercentage >= 0 
                        ? 'text-green-700' 
                        : 'text-red-700'
                    }`}>
                      {processingResult.processingMetrics.improvementPercentage >= 0 ? '+' : ''}
                      {processingResult.processingMetrics.improvementPercentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-600">Processing Time</div>
                    <div className="text-2xl font-bold text-gray-700">
                      {processingResult.processingMetrics.processingTime}ms
                    </div>
                  </div>
                </div>

                {/* Imputation Summary */}
                {processingResult.imputationSummary && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-purple-800 mb-3">Imputation Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-purple-700">Method Used:</span>
                        <div className="text-purple-600 mt-1">{processingResult.imputationSummary.methodUsed}</div>
                      </div>
                      <div>
                        <span className="font-medium text-purple-700">Fields Imputed:</span>
                        <div className="text-purple-600 mt-1">{processingResult.imputationSummary.fieldsImputed}</div>
                      </div>
                      <div>
                        <span className="font-medium text-purple-700">Values Imputed:</span>
                        <div className="text-purple-600 mt-1">{processingResult.imputationSummary.totalValuesImputed}</div>
                      </div>
                      <div>
                        <span className="font-medium text-purple-700">Avg Confidence:</span>
                        <div className="text-purple-600 mt-1">
                          {(processingResult.imputationSummary.averageConfidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {processingResult.recommendations.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Recommendations
                    </h4>
                    <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                      {processingResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {processingResult.warnings.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings ({processingResult.warnings.length})
                    </h4>
                    <div className="text-orange-700 text-sm space-y-1">
                      {processingResult.warnings.slice(0, 5).map((warning, index) => (
                        <div key={index}>• {warning}</div>
                      ))}
                      {processingResult.warnings.length > 5 && (
                        <div className="text-orange-600 mt-2">
                          ... and {processingResult.warnings.length - 5} more warnings
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed Log Toggle */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowDetailedLog(!showDetailedLog)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Database className="w-4 h-4" />
                    {showDetailedLog ? 'Hide' : 'Show'} Detailed Log
                  </button>
                  
                  {processingResult.success && (
                    <button
                      onClick={() => {
                        const formattedResults = DataProcessingUtilities.formatSmartProcessingResults(processingResult);
                        const blob = new Blob([formattedResults], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `imputation-results-${new Date().toISOString().split('T')[0]}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export Results
                    </button>
                  )}
                </div>

                {/* Detailed Log */}
                {showDetailedLog && (
                  <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto">
                    <div className="text-green-300 font-bold mb-2">Processing Log:</div>
                    {processingResult.detailedLog.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Information */}
          <div className="mt-8 pt-6 border-t text-center text-gray-500 text-sm">
            <p>
              This demo showcases advanced missing data imputation techniques including Random Forests, XGBoost, 
              Neural Networks (MissForest, GAIN), and MICE. The system automatically analyzes your data patterns 
              and selects the most appropriate method for optimal results.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
