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
      // Mock API call - replace with actual API endpoint
      const mockMarketData: MarketData[] = locations.map((location) => ({
        location,
        state: location.split(", ")[1] || "",
        laborCostPerHour: 15 + Math.random() * 10, // $15-25/hour
        leaseRatePerSqFt: 8 + Math.random() * 7, // $8-15/sqft
        threePLCostPerUnit: 2 + Math.random() * 3, // $2-5/unit
        lastUpdated: new Date().toISOString(),
      }));

      setMarketData(mockMarketData);
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
