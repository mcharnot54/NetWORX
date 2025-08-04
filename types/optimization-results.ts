// Comprehensive optimization results and output structure for NetWORX Essentials

export interface CapacityCapability {
  throughputCapacityAnalysis: {
    peakDaysOrdersShipped: number;
    highestDailyOrderVolume: number;
    peakInventoryUnits: number;
    currentCapacityUtilization: number;
  };
  storageCapacity: {
    peakInventoryUnits: number;
    highestDailyItemsShipped: number;
    currentStorageUtilization: number;
    availableCapacityBuffer: number;
  };
  facilityCapacity: {
    peakUnitsPerDay: number;
    highestUnitOnHandDuringPeakPeriods: number;
    peakCapacityUtilization: number;
    facilityMaxCapacity: number;
  };
}

export interface ExpansionScenarios {
  currentPeakOperations: {
    throughputBottleneckProcess: string;
    automationInvestment: number;
    expansionRequirements: string;
    capitalInvestmentForAutomation: number;
  };
  futureGrowthOperations: {
    projectedExpansionCapacity: number;
    automationExpansionTimeline: string;
    futureCapacityRequirements: number;
    automationGainFromSolutionsImplemented: number;
  };
  equipmentAndFacilityOperations: {
    newEquipmentCapacityGain: number;
    automationInvestment: number;
    facilityExpandCapacity: number;
    capitalCostForAutomationSolutions: number;
  };
}

export interface CostForecastPlanModeling {
  growthProjections: {
    projectedOrderLinear: number;
    five3PLCapacityUnits: number;
    tenPctCultureUnits: number;
    growthCultureForecast: string;
  };
  strategicMilestones: {
    planningCapacityMilestones: number;
    newFacilityProjectedCapacity: number;
    tenPctCapacityAchievement: string;
    averageCapacityGainFromStrategy: number;
  };
  financialBenchmarks: {
    potentialGrowthCapacity: number;
    strategyCostUnitsPerOrder: number;
    budgetImplementation: string;
    multiYearForecastForGrowthCapacity: number;
  };
}

export interface InventoryRoiAnalysis {
  inventoryManagement: {
    optimalTurnoverSchedule: number;
    averageInventoryDaysOnHand: number;
    optimalCarryingCostReduction: number;
    inventoryTurnoverPerformance: number;
  };
  operationalCostComparison: {
    currentFulfillmentCostPerOrder: number;
    optimalInternalCostEstimation: number;
    threePLCostPerOrder: number;
    costOptimizationPotential: number;
  };
  operationalRoiComparison: {
    currentOperationalRoi: number;
    optimalFutureCostEstimation: number;
    threePLCostStructure: number;
    roiImprovementPotential: number;
  };
  benefitsEstimation: {
    annualRevenuePotential: number;
    additionalRevenueProjectedInGrowthCapacity: number;
    optimalJustificationOfStrategicDecision: string;
    valueOfDiscountedCashFromOperationsNetOut: number;
  };
  roiMetrics: {
    netPresentValue: number;
    roiPresentValueHpv: number;
    roiCalculation: number;
    estimatedPaybackFinancialAttainment: number;
  };
}

export interface OptimizationOutputs {
  capacityCapability: CapacityCapability;
  expansionScenarios: ExpansionScenarios;
  costForecastPlanModeling: CostForecastPlanModeling;
  inventoryRoiAnalysis: InventoryRoiAnalysis;
  
  // Performance metrics
  performanceIndicators: {
    totalCostReduction: number;
    capacityUtilizationImprovement: number;
    fulfillmentTimeReduction: number;
    inventoryTurnoverIncrease: number;
  };
  
  // Strategic recommendations
  strategicRecommendations: {
    primaryRecommendation: string;
    implementationPriority: 'high' | 'medium' | 'low';
    expectedTimeframe: string;
    riskAssessment: 'low' | 'medium' | 'high';
    confidenceLevel: number; // 0-100
  }[];
  
  // Scenario comparison
  scenarioComparison: {
    currentState: ScenarioMetrics;
    optimizedState: ScenarioMetrics;
    improvementPercentage: number;
  };
  
  // Implementation roadmap
  implementationRoadmap: {
    phase: number;
    description: string;
    duration: string;
    investment: number;
    expectedBenefits: string;
    prerequisites: string[];
  }[];
  
  // Risk analysis
  riskAnalysis: {
    operationalRisks: string[];
    financialRisks: string[];
    mitigationStrategies: string[];
    contingencyPlans: string[];
  };
  
  // Sensitivity analysis
  sensitivityAnalysis: {
    variableName: string;
    baseValue: number;
    optimisticValue: number;
    pessimisticValue: number;
    impactOnRoi: number;
  }[];
}

export interface ScenarioMetrics {
  totalOperatingCost: number;
  capacityUtilization: number;
  fulfillmentTime: number;
  inventoryTurnover: number;
  laborEfficiency: number;
  transportationCosts: number;
  warehouseOperatingCosts: number;
  inventoryCarryingCosts: number;
}

// Specific optimizer result types
export interface WarehouseOptimizerResults extends OptimizationOutputs {
  warehouseSpecific: {
    layoutOptimization: {
      currentLayout: string;
      recommendedLayout: string;
      spaceUtilizationImprovement: number;
      pickingEfficiencyGain: number;
    };
    
    staffingOptimization: {
      currentStaffLevels: number;
      recommendedStaffLevels: number;
      laborCostSavings: number;
      productivityImprovement: number;
    };
    
    equipmentRecommendations: {
      equipmentType: string;
      quantity: number;
      investmentCost: number;
      expectedPayback: number;
      productivityGain: number;
    }[];
    
    automationOpportunities: {
      process: string;
      automationLevel: 'partial' | 'full';
      investmentRequired: number;
      laborSavings: number;
      roiTimeline: string;
    }[];
  };
}

export interface TransportOptimizerResults extends OptimizationOutputs {
  transportSpecific: {
    routeOptimization: {
      currentRoutes: number;
      optimizedRoutes: number;
      distanceReduction: number;
      fuelSavings: number;
      timeReduction: number;
    };
    
    carrierOptimization: {
      carrierId: string;
      carrierName: string;
      utilization: number;
      costPerMile: number;
      reliabilityScore: number;
      recommendedUsage: number;
    }[];
    
    modeOptimization: {
      transportMode: 'truck' | 'rail' | 'air' | 'sea' | 'intermodal';
      currentUsage: number;
      recommendedUsage: number;
      costImplication: number;
      timeImplication: number;
    }[];
    
    networkOptimization: {
      currentHubs: number;
      recommendedHubs: number;
      hubLocations: string[];
      networkEfficiencyGain: number;
      investmentRequired: number;
    };
  };
}

export interface InventoryOptimizerResults extends OptimizationOutputs {
  inventorySpecific: {
    stockLevelOptimization: {
      skuId: string;
      currentStock: number;
      recommendedStock: number;
      carryingCostReduction: number;
      serviceLevel: number;
    }[];
    
    replenishmentOptimization: {
      currentOrderFrequency: number;
      recommendedOrderFrequency: number;
      orderQuantityOptimization: number;
      totalCostReduction: number;
    };
    
    abcAnalysis: {
      aItems: { count: number; valuePercentage: number };
      bItems: { count: number; valuePercentage: number };
      cItems: { count: number; valuePercentage: number };
      recommendedStrategies: string[];
    };
    
    seasonalityAnalysis: {
      seasonalPatterns: {
        period: string;
        demandMultiplier: number;
        recommendedStockBuffer: number;
      }[];
      seasonalStockingStrategy: string;
    };
  };
}

// Combined results for integrated scenarios
export interface CombinedOptimizerResults {
  warehouseResults: WarehouseOptimizerResults;
  transportResults: TransportOptimizerResults;
  inventoryResults: InventoryOptimizerResults;
  
  integratedAnalysis: {
    synergies: {
      description: string;
      combinedBenefit: number;
      implementationComplexity: 'low' | 'medium' | 'high';
    }[];
    
    tradeoffs: {
      description: string;
      warehouseImpact: number;
      transportImpact: number;
      inventoryImpact: number;
      netBenefit: number;
    }[];
    
    totalOptimizationPotential: {
      costSavings: number;
      capacityIncrease: number;
      efficiencyGain: number;
      roiImprovement: number;
    };
  };
}

// Result status and metadata
export interface OptimizationResultMetadata {
  scenarioId: number;
  optimizerType: 'warehouse' | 'transport' | 'inventory' | 'combined';
  generatedAt: string;
  processingTimeMs: number;
  dataQualityScore: number;
  confidenceLevel: number;
  assumptions: string[];
  limitations: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    timeframe: 'immediate' | 'short-term' | 'long-term';
    description: string;
    expectedImpact: string;
  }[];
}

// Export the main result wrapper
export interface OptimizationResult {
  metadata: OptimizationResultMetadata;
  results: WarehouseOptimizerResults | TransportOptimizerResults | InventoryOptimizerResults | CombinedOptimizerResults;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
  warnings?: string[];
}
