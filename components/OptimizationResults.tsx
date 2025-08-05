"use client";

import React, { useState } from 'react';
import {
  OptimizationResult,
  WarehouseOptimizerResults,
  TransportOptimizerResults,
  InventoryOptimizerResults,
  CombinedOptimizerResults,
  ScenarioMetrics
} from '@/types/optimization-results';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  DollarSign,
  Package,
  Truck,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Download,
  Share,
  Settings,
  Zap,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface OptimizationResultsProps {
  result: OptimizationResult;
  onExport?: () => void;
  onShare?: () => void;
}

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ 
  result, 
  onExport, 
  onShare 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'partial': return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'failed': return <AlertTriangle className="text-red-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getOptimizerIcon = (type: string) => {
    switch (type) {
      case 'warehouse': return <Warehouse className="text-blue-600" size={24} />;
      case 'transport': return <Truck className="text-green-600" size={24} />;
      case 'inventory': return <Package className="text-purple-600" size={24} />;
      case 'combined': return <Target className="text-orange-600" size={24} />;
      default: return <BarChart3 className="text-gray-600" size={24} />;
    }
  };

  // Extract common metrics for display
  const commonResults = result.results as any;
  const capacityMetrics = commonResults?.capacityCapability;
  const expansionScenarios = commonResults?.expansionScenarios;
  const costForecast = commonResults?.costForecastPlanModeling;
  const roiAnalysis = commonResults?.inventoryRoiAnalysis;

  return (
    <div className="optimization-results-container">
      {/* Header */}
      <div className="results-header bg-white border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getOptimizerIcon(result.metadata.optimizerType)}
            <div>
              <h2 className="text-2xl font-bold">
                {result.metadata.optimizerType.charAt(0).toUpperCase() + result.metadata.optimizerType.slice(1)} Optimization Results
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  {getStatusIcon(result.status)}
                  <span className="capitalize">{result.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{new Date(result.metadata.generatedAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target size={16} />
                  <span>Confidence: {result.metadata.confidenceLevel}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {onShare && (
              <button
                onClick={onShare}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
              >
                <Share size={16} />
                Share
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download size={16} />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'capacity', label: 'Capacity Analysis', icon: Warehouse },
          { id: 'financial', label: 'Financial Impact', icon: DollarSign },
          { id: 'implementation', label: 'Implementation', icon: Settings },
          { id: 'risks', label: 'Risk Analysis', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-50 border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Performance Indicators */}
          <div className="results-section bg-white border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={24} />
              Key Performance Improvements
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {commonResults?.performanceIndicators && Object.entries(commonResults.performanceIndicators).map(([key, value]) => (
                <div key={key} className="metric-card bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {typeof value === 'number' && value > 0 ? (
                      <TrendingUp className="text-green-500" size={16} />
                    ) : (
                      <TrendingDown className="text-red-500" size={16} />
                    )}
                  </div>
                  <div className="text-2xl font-bold">
                    {typeof value === 'number'
                      ? (key.includes('Cost') || key.includes('cost') ? formatCurrency(value) : formatPercentage(value))
                      : String(value)
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario Comparison */}
          {commonResults?.scenarioComparison && (
            <div className="results-section bg-white border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="text-blue-600" size={24} />
                Current vs. Optimized State
              </h3>
              
              <div className="comparison-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="current-state">
                  <h4 className="font-semibold text-gray-700 mb-3">Current State</h4>
                  <div className="space-y-2">
                    {Object.entries(commonResults.scenarioComparison.currentState).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">
                          {typeof value === 'number' && key.toLowerCase().includes('cost')
                            ? formatCurrency(value)
                            : typeof value === 'number'
                              ? formatPercentage(value)
                              : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="optimized-state">
                  <h4 className="font-semibold text-gray-700 mb-3">Optimized State</h4>
                  <div className="space-y-2">
                    {Object.entries(commonResults.scenarioComparison.optimizedState).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">
                          {typeof value === 'number' && key.toLowerCase().includes('cost')
                            ? formatCurrency(value)
                            : typeof value === 'number'
                              ? formatPercentage(value)
                              : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="improvement-summary mt-4 p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercentage(commonResults.scenarioComparison.improvementPercentage)}
                </div>
                <div className="text-sm text-blue-700">Overall Improvement</div>
              </div>
            </div>
          )}

          {/* Strategic Recommendations */}
          {commonResults?.strategicRecommendations && (
            <div className="results-section bg-white border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="text-yellow-600" size={24} />
                Strategic Recommendations
              </h3>
              
              <div className="space-y-3">
                {commonResults.strategicRecommendations.map((rec: any, index: number) => (
                  <div key={index} className={`recommendation-card p-4 rounded-lg border-l-4 ${
                    rec.implementationPriority === 'high' ? 'border-red-500 bg-red-50' :
                    rec.implementationPriority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-green-500 bg-green-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            rec.implementationPriority === 'high' ? 'bg-red-200 text-red-800' :
                            rec.implementationPriority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            {rec.implementationPriority.toUpperCase()} PRIORITY
                          </span>
                          <span className="text-sm text-gray-600">{rec.expectedTimeframe}</span>
                        </div>
                        <p className="text-gray-800">{rec.primaryRecommendation}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Risk: {rec.riskAssessment}</span>
                          <span>Confidence: {rec.confidenceLevel}%</span>
                        </div>
                      </div>
                      <ArrowRight className="text-gray-400 ml-4" size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Capacity Analysis Tab */}
      {activeTab === 'capacity' && capacityMetrics && (
        <div className="space-y-6">
          {/* Throughput & Capacity Analysis */}
          <div className="results-section bg-white border rounded-lg p-6">
            <button
              onClick={() => toggleSection('throughput')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={24} />
                Throughput & Capacity Analysis
              </h3>
              {expandedSections.has('throughput') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.has('throughput') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="metric-card bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Peak Days Orders Shipped</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {capacityMetrics.throughputCapacityAnalysis?.peakDaysOrdersShipped?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="metric-card bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Highest Daily Order Volume</div>
                  <div className="text-2xl font-bold text-green-800">
                    {capacityMetrics.throughputCapacityAnalysis?.highestDailyOrderVolume?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="metric-card bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 mb-1">Peak Inventory Units</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {capacityMetrics.throughputCapacityAnalysis?.peakInventoryUnits?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="metric-card bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 mb-1">Current Capacity Utilization</div>
                  <div className="text-2xl font-bold text-orange-800">
                    {capacityMetrics.throughputCapacityAnalysis?.currentCapacityUtilization 
                      ? formatPercentage(capacityMetrics.throughputCapacityAnalysis.currentCapacityUtilization)
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Storage Capacity */}
          <div className="results-section bg-white border rounded-lg p-6">
            <button
              onClick={() => toggleSection('storage')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Package className="text-purple-600" size={24} />
                Storage Capacity Analysis
              </h3>
              {expandedSections.has('storage') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            
            {expandedSections.has('storage') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="metric-card bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 mb-1">Peak Inventory Units</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {capacityMetrics.storageCapacity?.peakInventoryUnits?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="metric-card bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Highest Daily Items Shipped</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {capacityMetrics.storageCapacity?.highestDailyItemsShipped?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="metric-card bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Current Storage Utilization</div>
                  <div className="text-2xl font-bold text-green-800">
                    {capacityMetrics.storageCapacity?.currentStorageUtilization 
                      ? formatPercentage(capacityMetrics.storageCapacity.currentStorageUtilization)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="metric-card bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 mb-1">Available Capacity Buffer</div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {capacityMetrics.storageCapacity?.availableCapacityBuffer 
                      ? formatPercentage(capacityMetrics.storageCapacity.availableCapacityBuffer)
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Impact Tab */}
      {activeTab === 'financial' && (roiAnalysis || costForecast) && (
        <div className="space-y-6">
          {/* ROI Analysis */}
          {roiAnalysis?.roiMetrics && (
            <div className="results-section bg-white border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" size={24} />
                Return on Investment Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="metric-card bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Net Present Value</div>
                  <div className="text-2xl font-bold text-green-800">
                    {formatCurrency(roiAnalysis.roiMetrics.netPresentValue)}
                  </div>
                </div>
                <div className="metric-card bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">ROI Calculation</div>
                  <div className="text-2xl font-bold text-blue-800">
                    {formatPercentage(roiAnalysis.roiMetrics.roiCalculation)}
                  </div>
                </div>
                <div className="metric-card bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 mb-1">ROI Present Value HPV</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {formatCurrency(roiAnalysis.roiMetrics.roiPresentValueHpv)}
                  </div>
                </div>
                <div className="metric-card bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 mb-1">Payback Period</div>
                  <div className="text-2xl font-bold text-orange-800">
                    {roiAnalysis.roiMetrics.estimatedPaybackFinancialAttainment.toFixed(1)} years
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cost Analysis */}
          {roiAnalysis?.operationalCostComparison && (
            <div className="results-section bg-white border rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={24} />
                Operational Cost Comparison
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="cost-comparison-card p-4 border rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700 mb-2">Current Fulfillment Cost</div>
                    <div className="text-3xl font-bold text-red-600">
                      {formatCurrency(roiAnalysis.operationalCostComparison.currentFulfillmentCostPerOrder)}
                    </div>
                    <div className="text-sm text-gray-500">per order</div>
                  </div>
                </div>
                
                <div className="cost-comparison-card p-4 border rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700 mb-2">Optimal Internal Cost</div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(roiAnalysis.operationalCostComparison.optimalInternalCostEstimation)}
                    </div>
                    <div className="text-sm text-gray-500">per order</div>
                  </div>
                </div>
                
                <div className="cost-comparison-card p-4 border rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-700 mb-2">3PL Cost</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(roiAnalysis.operationalCostComparison.threePLCostPerOrder)}
                    </div>
                    <div className="text-sm text-gray-500">per order</div>
                  </div>
                </div>
              </div>
              
              <div className="optimization-potential mt-6 p-4 bg-green-50 rounded-lg text-center">
                <div className="text-lg font-semibold text-green-700 mb-1">Cost Optimization Potential</div>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(roiAnalysis.operationalCostComparison.costOptimizationPotential)}
                </div>
                <div className="text-sm text-green-600">annual savings</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Implementation Tab */}
      {activeTab === 'implementation' && commonResults?.implementationRoadmap && (
        <div className="space-y-6">
          <div className="results-section bg-white border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="text-gray-600" size={24} />
              Implementation Roadmap
            </h3>
            
            <div className="roadmap-timeline space-y-4">
              {commonResults.implementationRoadmap.map((phase: any, index: number) => (
                <div key={index} className="phase-card p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="phase-number bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {phase.phase}
                        </div>
                        <h4 className="text-lg font-semibold text-blue-800">{phase.description}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <div className="text-sm text-blue-600">Duration</div>
                          <div className="font-medium">{phase.duration}</div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-600">Investment</div>
                          <div className="font-medium">{formatCurrency(phase.investment)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-600">Expected Benefits</div>
                          <div className="font-medium">{phase.expectedBenefits}</div>
                        </div>
                      </div>
                      
                      {phase.prerequisites && phase.prerequisites.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm text-blue-600 mb-1">Prerequisites:</div>
                          <ul className="text-sm text-gray-700 list-disc list-inside">
                            {phase.prerequisites.map((prereq: string, idx: number) => (
                              <li key={idx}>{prereq}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Analysis Tab */}
      {activeTab === 'risks' && commonResults?.riskAnalysis && (
        <div className="space-y-6">
          <div className="results-section bg-white border rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={24} />
              Risk Analysis & Mitigation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="risk-category">
                <h4 className="font-semibold text-red-700 mb-3">Operational Risks</h4>
                <ul className="space-y-2">
                  {commonResults.riskAnalysis.operationalRisks.map((risk: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                      <AlertTriangle className="text-red-500 mt-0.5" size={16} />
                      <span className="text-sm">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="risk-category">
                <h4 className="font-semibold text-yellow-700 mb-3">Financial Risks</h4>
                <ul className="space-y-2">
                  {commonResults.riskAnalysis.financialRisks.map((risk: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                      <DollarSign className="text-yellow-500 mt-0.5" size={16} />
                      <span className="text-sm">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mitigation-strategies mt-6">
              <h4 className="font-semibold text-green-700 mb-3">Mitigation Strategies</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commonResults.riskAnalysis.mitigationStrategies.map((strategy: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="text-green-500 mt-0.5" size={16} />
                    <span className="text-sm">{strategy}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error and Warning Messages */}
      {(result.errors || result.warnings) && (
        <div className="messages-section space-y-3">
          {result.errors && result.errors.length > 0 && (
            <div className="error-messages bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={18} />
                Errors
              </h4>
              <ul className="space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {result.warnings && result.warnings.length > 0 && (
            <div className="warning-messages bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="text-yellow-600" size={18} />
                Warnings
              </h4>
              <ul className="space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OptimizationResults;
