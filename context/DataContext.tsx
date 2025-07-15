"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Data structure for processed data from Data Processor
interface ProcessedData {
  transportation_costs?: any[];
  warehouse_inputs?: any[];
  sku_data?: any[];
  sales_orders?: any[];
  network_data?: any[];
  forecast_data?: any[];
  dataQuality?: any;
  conversionResults?: any;
  lastProcessed?: string;
  dataType?: string;
}

// Market data for financial analysis
interface MarketData {
  location: string;
  state: string;
  laborCostPerHour: number;
  leaseRatePerSqFt: number;
  threePLCostPerUnit: number;
  lastUpdated: string;
}

// Financial analysis parameters
interface FinancialParameters {
  discountRate: number;
  analysisYears: number;
  currentStateBaseline: {
    totalCost: number;
    totalInvestment: number;
  };
  futureStateProjections: {
    totalCost: number;
    totalInvestment: number;
    annualSavings: number;
  };
}

// Context interface
interface DataContextType {
  // Processed data from Data Processor
  processedData: ProcessedData;
  setProcessedData: (data: ProcessedData) => void;

  // Market data for locations
  marketData: MarketData[];
  setMarketData: (data: MarketData[]) => void;

  // Financial parameters
  financialParams: FinancialParameters;
  setFinancialParams: (params: FinancialParameters) => void;

  // Optimization results
  transportResults: any;
  setTransportResults: (results: any) => void;

  warehouseResults: any;
  setWarehouseResults: (results: any) => void;

  inventoryResults: any;
  setInventoryResults: (results: any) => void;

  // Location locking for scenarios
  lockedLocations: string[];
  setLockedLocations: (locations: string[]) => void;

  // Helper functions
  getTransportationData: () => any[];
  getWarehouseData: () => any[];
  getSKUData: () => any[];

  // API functions
  fetchMarketData: (locations: string[]) => Promise<void>;
  calculateFinancialMetrics: () => {
    roic: number;
    npv: number;
    irr: number;
    paybackPeriod: number;
  };
}

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export function DataProvider({ children }: { children: ReactNode }) {
  const [processedData, setProcessedData] = useState<ProcessedData>({});
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [transportResults, setTransportResults] = useState<any>(null);
  const [warehouseResults, setWarehouseResults] = useState<any>(null);
  const [inventoryResults, setInventoryResults] = useState<any>(null);
  const [lockedLocations, setLockedLocations] = useState<string[]>([]);

  const [financialParams, setFinancialParams] = useState<FinancialParameters>({
    discountRate: 0.1, // 10% default discount rate
    analysisYears: 5,
    currentStateBaseline: {
      totalCost: 0,
      totalInvestment: 0,
    },
    futureStateProjections: {
      totalCost: 0,
      totalInvestment: 0,
      annualSavings: 0,
    },
  });

  // Helper function to extract transportation data
  const getTransportationData = () => {
    return processedData.transportation_costs || [];
  };

  // Helper function to extract warehouse data
  const getWarehouseData = () => {
    return processedData.warehouse_inputs || [];
  };

  // Helper function to extract SKU data
  const getSKUData = () => {
    return processedData.sku_data || [];
  };

  // API function to fetch market data for proposed locations
  const fetchMarketData = async (locations: string[]) => {
    try {
      // Enhanced mock API with realistic location-based data
      // In production, this would call actual APIs like BLS, real estate APIs, etc.

      const marketDataBase: { [key: string]: Partial<MarketData> } = {
        // Major metropolitan areas with realistic cost data
        "Chicago, IL": {
          laborCostPerHour: 18.5,
          leaseRatePerSqFt: 12.25,
          threePLCostPerUnit: 3.8,
        },
        "Dallas, TX": {
          laborCostPerHour: 16.75,
          leaseRatePerSqFt: 8.9,
          threePLCostPerUnit: 3.2,
        },
        "Los Angeles, CA": {
          laborCostPerHour: 22.3,
          leaseRatePerSqFt: 18.5,
          threePLCostPerUnit: 4.6,
        },
        "Atlanta, GA": {
          laborCostPerHour: 17.2,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.4,
        },
        "Phoenix, AZ": {
          laborCostPerHour: 17.8,
          leaseRatePerSqFt: 10.2,
          threePLCostPerUnit: 3.5,
        },
        "Memphis, TN": {
          laborCostPerHour: 15.9,
          leaseRatePerSqFt: 7.6,
          threePLCostPerUnit: 2.9,
        },
        "Indianapolis, IN": {
          laborCostPerHour: 16.4,
          leaseRatePerSqFt: 8.2,
          threePLCostPerUnit: 3.1,
        },
        "Columbus, OH": {
          laborCostPerHour: 17.1,
          leaseRatePerSqFt: 9.4,
          threePLCostPerUnit: 3.25,
        },
        "Kansas City, MO": {
          laborCostPerHour: 16.6,
          leaseRatePerSqFt: 8.7,
          threePLCostPerUnit: 3.0,
        },
        "Nashville, TN": {
          laborCostPerHour: 17.0,
          leaseRatePerSqFt: 9.2,
          threePLCostPerUnit: 3.15,
        },
        "Denver, CO": {
          laborCostPerHour: 19.2,
          leaseRatePerSqFt: 11.8,
          threePLCostPerUnit: 3.7,
        },
        "Seattle, WA": {
          laborCostPerHour: 21.5,
          leaseRatePerSqFt: 16.4,
          threePLCostPerUnit: 4.3,
        },
        "New York, NY": {
          laborCostPerHour: 24.8,
          leaseRatePerSqFt: 22.5,
          threePLCostPerUnit: 5.2,
        },
        "Miami, FL": {
          laborCostPerHour: 18.9,
          leaseRatePerSqFt: 13.7,
          threePLCostPerUnit: 4.1,
        },
        "Houston, TX": {
          laborCostPerHour: 17.6,
          leaseRatePerSqFt: 9.5,
          threePLCostPerUnit: 3.3,
        },
      };

      // Simulate API delay
      await new Promise((resolve) =>
        setTimeout(resolve, 500 + Math.random() * 1000),
      );

      const mockMarketData: MarketData[] = locations.map((location) => {
        const baseData = marketDataBase[location];
        const state = location.split(", ")[1] || "";

        // If location not in our database, generate realistic regional data
        let laborCost = baseData?.laborCostPerHour || 15 + Math.random() * 8;
        let leaseRate = baseData?.leaseRatePerSqFt || 8 + Math.random() * 6;
        let threePLCost =
          baseData?.threePLCostPerUnit || 2.5 + Math.random() * 2.5;

        // Apply regional adjustments if no specific data
        if (!baseData) {
          // West Coast premium
          if (["CA", "WA", "OR"].includes(state)) {
            laborCost *= 1.25;
            leaseRate *= 1.4;
            threePLCost *= 1.2;
          }
          // Northeast premium
          else if (["NY", "NJ", "CT", "MA"].includes(state)) {
            laborCost *= 1.3;
            leaseRate *= 1.5;
            threePLCost *= 1.25;
          }
          // Southeast discount
          else if (["AL", "MS", "SC", "AR", "KY"].includes(state)) {
            laborCost *= 0.85;
            leaseRate *= 0.75;
            threePLCost *= 0.85;
          }
          // Midwest moderate
          else if (["OH", "IN", "MI", "WI", "IA"].includes(state)) {
            laborCost *= 0.95;
            leaseRate *= 0.9;
            threePLCost *= 0.9;
          }
        }

        return {
          location,
          state,
          laborCostPerHour: Math.round(laborCost * 100) / 100,
          leaseRatePerSqFt: Math.round(leaseRate * 100) / 100,
          threePLCostPerUnit: Math.round(threePLCost * 100) / 100,
          lastUpdated: new Date().toISOString(),
        };
      });

      setMarketData(mockMarketData);
      console.log("Market data fetched for locations:", locations);
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    }
  };

  // Financial metrics calculation
  const calculateFinancialMetrics = () => {
    const {
      currentStateBaseline,
      futureStateProjections,
      discountRate,
      analysisYears,
    } = financialParams;

    // Calculate annual cash flows
    const initialInvestment =
      futureStateProjections.totalInvestment -
      currentStateBaseline.totalInvestment;
    const annualSavings = futureStateProjections.annualSavings;

    // NPV calculation
    let npv = -initialInvestment;
    for (let year = 1; year <= analysisYears; year++) {
      npv += annualSavings / Math.pow(1 + discountRate, year);
    }

    // IRR calculation (simplified Newton-Raphson method)
    let irr = 0.1; // Starting guess
    for (let i = 0; i < 100; i++) {
      let f = -initialInvestment;
      let df = 0;

      for (let year = 1; year <= analysisYears; year++) {
        const factor = Math.pow(1 + irr, year);
        f += annualSavings / factor;
        df -= (year * annualSavings) / (factor * (1 + irr));
      }

      const newIrr = irr - f / df;
      if (Math.abs(newIrr - irr) < 0.0001) break;
      irr = newIrr;
    }

    // ROIC calculation
    const averageInvestedCapital = initialInvestment / 2;
    const roic =
      averageInvestedCapital > 0 ? annualSavings / averageInvestedCapital : 0;

    // Payback period
    const paybackPeriod =
      initialInvestment > 0 ? initialInvestment / annualSavings : 0;

    return {
      roic: roic * 100, // Convert to percentage
      npv: npv,
      irr: irr * 100, // Convert to percentage
      paybackPeriod,
    };
  };

  const value: DataContextType = {
    processedData,
    setProcessedData,
    marketData,
    setMarketData,
    financialParams,
    setFinancialParams,
    transportResults,
    setTransportResults,
    warehouseResults,
    setWarehouseResults,
    inventoryResults,
    setInventoryResults,
    lockedLocations,
    setLockedLocations,
    getTransportationData,
    getWarehouseData,
    getSKUData,
    fetchMarketData,
    calculateFinancialMetrics,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// Custom hook to use the data context
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

export type { ProcessedData, MarketData, FinancialParameters };
