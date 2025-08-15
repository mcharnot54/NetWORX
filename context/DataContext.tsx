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
  straightLaborRate: number; // Base hourly wage
  fullyBurdendedLaborRate: number; // Including benefits, taxes, overhead
  leaseRatePerSqFt: number;
  threePLCostPerUnit: number;
  laborCostPerHour: number; // Legacy field for backward compatibility
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

  // Perplexity API integration for real-time warehouse cost data
  const fetchMarketDataFromPerplexity = async (
    location: string,
  ): Promise<Partial<MarketData>> => {
    try {
      const apiKey =
        process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY ||
        process.env.PERPLEXITY_API_KEY;

      if (!apiKey) {
        console.warn("Perplexity API key not found, using fallback data");
        return {};
      }

      const query = `Current warehouse labor costs and industrial lease rates for ${location}:

      Please provide specific data for:
      1. Straight warehouse labor rate (base hourly wage for warehouse workers)
      2. Fully burdened warehouse labor rate (including benefits, taxes, worker's comp, overhead - typically 1.3-1.6x base rate)
      3. Industrial warehouse lease rates per square foot annually
      4. 3PL fulfillment costs per unit/shipment

      Focus on 2024 current market rates for distribution and fulfillment operations. Provide numerical values in USD.`;

      const response = await handleAbortError(async () => {
        return await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-sonar-small-128k-online",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a warehouse cost analytics expert. Provide current, accurate cost data for warehouse operations. Return specific numerical values for labor rates, lease costs, and 3PL pricing.",
                },
                {
                  role: "user",
                  content: query,
                },
              ],
              max_tokens: 1000,
              temperature: 0.1,
              top_p: 0.9,
              search_domain_filter: ["perplexity.ai"],
              return_images: false,
              return_related_questions: false,
              search_recency_filter: "month",
            }),
          },
        );
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Parse the response to extract numerical values
      const parseRateFromText = (
        text: string,
        patterns: string[],
      ): number | null => {
        for (const pattern of patterns) {
          const regex = new RegExp(pattern, "i");
          const match = text.match(regex);
          if (match) {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) return value;
          }
        }
        return null;
      };

      // Extract straight labor rate
      const straightLaborRate = parseRateFromText(content, [
        "straight.*?labor.*?rate.*?\\$?(\\d+\\.?\\d*)",
        "base.*?wage.*?\\$?(\\d+\\.?\\d*)",
        "hourly.*?wage.*?\\$?(\\d+\\.?\\d*)",
        "warehouse.*?worker.*?\\$?(\\d+\\.?\\d*)",
      ]);

      // Extract fully burdened labor rate
      const fullyBurdendedLaborRate = parseRateFromText(content, [
        "fully.*?burdened.*?\\$?(\\d+\\.?\\d*)",
        "total.*?labor.*?cost.*?\\$?(\\d+\\.?\\d*)",
        "burdened.*?rate.*?\\$?(\\d+\\.?\\d*)",
        "fully.*?loaded.*?\\$?(\\d+\\.?\\d*)",
      ]);

      // Extract lease rate
      const leaseRate = parseRateFromText(content, [
        "lease.*?rate.*?\\$?(\\d+\\.?\\d*)",
        "industrial.*?lease.*?\\$?(\\d+\\.?\\d*)",
        "warehouse.*?rent.*?\\$?(\\d+\\.?\\d*)",
        "per.*?square.*?foot.*?\\$?(\\d+\\.?\\d*)",
      ]);

      // Extract 3PL costs
      const threePLCost = parseRateFromText(content, [
        "3pl.*?cost.*?\\$?(\\d+\\.?\\d*)",
        "fulfillment.*?cost.*?\\$?(\\d+\\.?\\d*)",
        "per.*?unit.*?\\$?(\\d+\\.?\\d*)",
        "per.*?shipment.*?\\$?(\\d+\\.?\\d*)",
      ]);

      return {
        straightLaborRate: straightLaborRate || undefined,
        fullyBurdendedLaborRate:
          fullyBurdendedLaborRate ||
          (straightLaborRate ? straightLaborRate * 1.4 : undefined),
        leaseRatePerSqFt: leaseRate || undefined,
        threePLCostPerUnit: threePLCost || undefined,
        laborCostPerHour:
          fullyBurdendedLaborRate ||
          (straightLaborRate ? straightLaborRate * 1.4 : undefined),
      };
    } catch (error) {
      console.error(`Failed to fetch Perplexity data for ${location}:`, error);
      return {};
    }
  };

  // API function to fetch market data for proposed locations
  const fetchMarketData = async (locations: string[]) => {
    try {
      console.log("Fetching real-time market data from Perplexity API...");

      // Comprehensive fallback data with both straight and fully burdened rates
      const marketDataBase: { [key: string]: Partial<MarketData> } = {
        // Major Metropolitan Areas
        "Chicago, IL": {
          straightLaborRate: 16.5,
          fullyBurdendedLaborRate: 23.1,
          leaseRatePerSqFt: 12.25,
          threePLCostPerUnit: 3.8,
        },
        "Dallas, TX": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 8.9,
          threePLCostPerUnit: 3.2,
        },
        "Los Angeles, CA": {
          straightLaborRate: 18.5,
          fullyBurdendedLaborRate: 25.9,
          leaseRatePerSqFt: 18.5,
          threePLCostPerUnit: 4.6,
        },
        "Atlanta, GA": {
          straightLaborRate: 14.8,
          fullyBurdendedLaborRate: 20.72,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.4,
        },
        "Phoenix, AZ": {
          straightLaborRate: 15.5,
          fullyBurdendedLaborRate: 21.7,
          leaseRatePerSqFt: 10.2,
          threePLCostPerUnit: 3.5,
        },
        "Memphis, TN": {
          straightLaborRate: 14.25,
          fullyBurdendedLaborRate: 19.95,
          leaseRatePerSqFt: 7.6,
          threePLCostPerUnit: 2.9,
        },
        "Indianapolis, IN": {
          straightLaborRate: 14.75,
          fullyBurdendedLaborRate: 20.65,
          leaseRatePerSqFt: 8.2,
          threePLCostPerUnit: 3.1,
        },
        "Columbus, OH": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 9.4,
          threePLCostPerUnit: 3.25,
        },
        "Kansas City, MO": {
          straightLaborRate: 14.9,
          fullyBurdendedLaborRate: 20.86,
          leaseRatePerSqFt: 8.7,
          threePLCostPerUnit: 3.0,
        },
        "Nashville, TN": {
          straightLaborRate: 15.0,
          fullyBurdendedLaborRate: 21.0,
          leaseRatePerSqFt: 9.2,
          threePLCostPerUnit: 3.15,
        },
        "Denver, CO": {
          straightLaborRate: 16.8,
          fullyBurdendedLaborRate: 23.52,
          leaseRatePerSqFt: 11.8,
          threePLCostPerUnit: 3.7,
        },
        "Seattle, WA": {
          straightLaborRate: 19.5,
          fullyBurdendedLaborRate: 27.3,
          leaseRatePerSqFt: 16.4,
          threePLCostPerUnit: 4.3,
        },
        "New York, NY": {
          straightLaborRate: 21.0,
          fullyBurdendedLaborRate: 29.4,
          leaseRatePerSqFt: 22.5,
          threePLCostPerUnit: 5.2,
        },
        "Miami, FL": {
          straightLaborRate: 16.2,
          fullyBurdendedLaborRate: 22.68,
          leaseRatePerSqFt: 13.7,
          threePLCostPerUnit: 4.1,
        },
        "Houston, TX": {
          straightLaborRate: 15.75,
          fullyBurdendedLaborRate: 22.05,
          leaseRatePerSqFt: 9.5,
          threePLCostPerUnit: 3.3,
        },

        // Additional Comprehensive US Markets
        "Birmingham, AL": {
          straightLaborRate: 13.5,
          fullyBurdendedLaborRate: 18.9,
          leaseRatePerSqFt: 6.8,
          threePLCostPerUnit: 2.75,
        },
        "Little Rock, AR": {
          straightLaborRate: 13.25,
          fullyBurdendedLaborRate: 18.55,
          leaseRatePerSqFt: 6.5,
          threePLCostPerUnit: 2.65,
        },
        "Tucson, AZ": {
          straightLaborRate: 14.75,
          fullyBurdendedLaborRate: 20.65,
          leaseRatePerSqFt: 8.9,
          threePLCostPerUnit: 3.2,
        },
        "Fresno, CA": {
          straightLaborRate: 16.25,
          fullyBurdendedLaborRate: 22.75,
          leaseRatePerSqFt: 11.2,
          threePLCostPerUnit: 3.85,
        },
        "Sacramento, CA": {
          straightLaborRate: 17.5,
          fullyBurdendedLaborRate: 24.5,
          leaseRatePerSqFt: 13.8,
          threePLCostPerUnit: 4.2,
        },
        "San Francisco, CA": {
          straightLaborRate: 22.0,
          fullyBurdendedLaborRate: 30.8,
          leaseRatePerSqFt: 28.5,
          threePLCostPerUnit: 5.8,
        },
        "Colorado Springs, CO": {
          straightLaborRate: 15.75,
          fullyBurdendedLaborRate: 22.05,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.45,
        },
        "Hartford, CT": {
          straightLaborRate: 18.25,
          fullyBurdendedLaborRate: 25.55,
          leaseRatePerSqFt: 14.2,
          threePLCostPerUnit: 4.35,
        },
        "Jacksonville, FL": {
          straightLaborRate: 15.5,
          fullyBurdendedLaborRate: 21.7,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.4,
        },
        "Tampa, FL": {
          straightLaborRate: 15.75,
          fullyBurdendedLaborRate: 22.05,
          leaseRatePerSqFt: 10.5,
          threePLCostPerUnit: 3.6,
        },
        "Orlando, FL": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 9.9,
          threePLCostPerUnit: 3.5,
        },
        "Savannah, GA": {
          straightLaborRate: 14.5,
          fullyBurdendedLaborRate: 20.3,
          leaseRatePerSqFt: 8.4,
          threePLCostPerUnit: 3.15,
        },
        "Boise, ID": {
          straightLaborRate: 14.8,
          fullyBurdendedLaborRate: 20.72,
          leaseRatePerSqFt: 8.6,
          threePLCostPerUnit: 3.2,
        },
        "Rockford, IL": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 7.8,
          threePLCostPerUnit: 2.95,
        },
        "Fort Wayne, IN": {
          straightLaborRate: 14.25,
          fullyBurdendedLaborRate: 19.95,
          leaseRatePerSqFt: 7.5,
          threePLCostPerUnit: 2.85,
        },
        "Des Moines, IA": {
          straightLaborRate: 14.5,
          fullyBurdendedLaborRate: 20.3,
          leaseRatePerSqFt: 7.9,
          threePLCostPerUnit: 2.95,
        },
        "Wichita, KS": {
          straightLaborRate: 13.75,
          fullyBurdendedLaborRate: 19.25,
          leaseRatePerSqFt: 7.2,
          threePLCostPerUnit: 2.8,
        },
        "Louisville, KY": {
          straightLaborRate: 14.5,
          fullyBurdendedLaborRate: 20.3,
          leaseRatePerSqFt: 8.1,
          threePLCostPerUnit: 3.05,
        },
        "New Orleans, LA": {
          straightLaborRate: 14.25,
          fullyBurdendedLaborRate: 19.95,
          leaseRatePerSqFt: 8.5,
          threePLCostPerUnit: 3.2,
        },
        "Baton Rouge, LA": {
          straightLaborRate: 13.75,
          fullyBurdendedLaborRate: 19.25,
          leaseRatePerSqFt: 7.8,
          threePLCostPerUnit: 2.95,
        },
        "Portland, ME": {
          straightLaborRate: 16.5,
          fullyBurdendedLaborRate: 23.1,
          leaseRatePerSqFt: 11.2,
          threePLCostPerUnit: 3.85,
        },
        "Baltimore, MD": {
          straightLaborRate: 17.25,
          fullyBurdendedLaborRate: 24.15,
          leaseRatePerSqFt: 12.8,
          threePLCostPerUnit: 4.05,
        },
        "Boston, MA": {
          straightLaborRate: 19.75,
          fullyBurdendedLaborRate: 27.65,
          leaseRatePerSqFt: 19.5,
          threePLCostPerUnit: 4.95,
        },
        "Detroit, MI": {
          straightLaborRate: 16.25,
          fullyBurdendedLaborRate: 22.75,
          leaseRatePerSqFt: 9.2,
          threePLCostPerUnit: 3.35,
        },
        "Grand Rapids, MI": {
          straightLaborRate: 15.5,
          fullyBurdendedLaborRate: 21.7,
          leaseRatePerSqFt: 8.4,
          threePLCostPerUnit: 3.1,
        },
        "Minneapolis, MN": {
          straightLaborRate: 17.0,
          fullyBurdendedLaborRate: 23.8,
          leaseRatePerSqFt: 10.8,
          threePLCostPerUnit: 3.65,
        },
        "Jackson, MS": {
          straightLaborRate: 12.75,
          fullyBurdendedLaborRate: 17.85,
          leaseRatePerSqFt: 6.2,
          threePLCostPerUnit: 2.55,
        },
        "St. Louis, MO": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 8.6,
          threePLCostPerUnit: 3.15,
        },
        "Billings, MT": {
          straightLaborRate: 14.5,
          fullyBurdendedLaborRate: 20.3,
          leaseRatePerSqFt: 7.8,
          threePLCostPerUnit: 3.05,
        },
        "Omaha, NE": {
          straightLaborRate: 14.75,
          fullyBurdendedLaborRate: 20.65,
          leaseRatePerSqFt: 8.2,
          threePLCostPerUnit: 3.0,
        },
        "Las Vegas, NV": {
          straightLaborRate: 16.5,
          fullyBurdendedLaborRate: 23.1,
          leaseRatePerSqFt: 11.5,
          threePLCostPerUnit: 3.75,
        },
        "Reno, NV": {
          straightLaborRate: 16.25,
          fullyBurdendedLaborRate: 22.75,
          leaseRatePerSqFt: 10.8,
          threePLCostPerUnit: 3.6,
        },
        "Manchester, NH": {
          straightLaborRate: 17.0,
          fullyBurdendedLaborRate: 23.8,
          leaseRatePerSqFt: 11.8,
          threePLCostPerUnit: 3.9,
        },
        "Newark, NJ": {
          straightLaborRate: 18.75,
          fullyBurdendedLaborRate: 26.25,
          leaseRatePerSqFt: 16.2,
          threePLCostPerUnit: 4.65,
        },
        "Albuquerque, NM": {
          straightLaborRate: 14.25,
          fullyBurdendedLaborRate: 19.95,
          leaseRatePerSqFt: 8.4,
          threePLCostPerUnit: 3.15,
        },
        "Albany, NY": {
          straightLaborRate: 17.5,
          fullyBurdendedLaborRate: 24.5,
          leaseRatePerSqFt: 12.2,
          threePLCostPerUnit: 3.95,
        },
        "Buffalo, NY": {
          straightLaborRate: 16.5,
          fullyBurdendedLaborRate: 23.1,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.45,
        },
        "Charlotte, NC": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 9.6,
          threePLCostPerUnit: 3.35,
        },
        "Raleigh, NC": {
          straightLaborRate: 15.5,
          fullyBurdendedLaborRate: 21.7,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.4,
        },
        "Fargo, ND": {
          straightLaborRate: 15.0,
          fullyBurdendedLaborRate: 21.0,
          leaseRatePerSqFt: 7.6,
          threePLCostPerUnit: 2.9,
        },
        "Cleveland, OH": {
          straightLaborRate: 15.75,
          fullyBurdendedLaborRate: 22.05,
          leaseRatePerSqFt: 8.8,
          threePLCostPerUnit: 3.2,
        },
        "Cincinnati, OH": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 8.4,
          threePLCostPerUnit: 3.1,
        },
        "Toledo, OH": {
          straightLaborRate: 14.75,
          fullyBurdendedLaborRate: 20.65,
          leaseRatePerSqFt: 7.8,
          threePLCostPerUnit: 2.95,
        },
        "Oklahoma City, OK": {
          straightLaborRate: 13.75,
          fullyBurdendedLaborRate: 19.25,
          leaseRatePerSqFt: 7.4,
          threePLCostPerUnit: 2.85,
        },
        "Tulsa, OK": {
          straightLaborRate: 13.5,
          fullyBurdendedLaborRate: 18.9,
          leaseRatePerSqFt: 7.2,
          threePLCostPerUnit: 2.8,
        },
        "Portland, OR": {
          straightLaborRate: 18.25,
          fullyBurdendedLaborRate: 25.55,
          leaseRatePerSqFt: 13.6,
          threePLCostPerUnit: 4.15,
        },
        "Philadelphia, PA": {
          straightLaborRate: 17.75,
          fullyBurdendedLaborRate: 24.85,
          leaseRatePerSqFt: 13.2,
          threePLCostPerUnit: 4.1,
        },
        "Pittsburgh, PA": {
          straightLaborRate: 16.5,
          fullyBurdendedLaborRate: 23.1,
          leaseRatePerSqFt: 9.6,
          threePLCostPerUnit: 3.4,
        },
        "Providence, RI": {
          straightLaborRate: 17.25,
          fullyBurdendedLaborRate: 24.15,
          leaseRatePerSqFt: 12.4,
          threePLCostPerUnit: 3.95,
        },
        "Charleston, SC": {
          straightLaborRate: 14.25,
          fullyBurdendedLaborRate: 19.95,
          leaseRatePerSqFt: 8.6,
          threePLCostPerUnit: 3.2,
        },
        "Columbia, SC": {
          straightLaborRate: 13.75,
          fullyBurdendedLaborRate: 19.25,
          leaseRatePerSqFt: 7.8,
          threePLCostPerUnit: 2.95,
        },
        "Sioux Falls, SD": {
          straightLaborRate: 14.25,
          fullyBurdendedLaborRate: 19.95,
          leaseRatePerSqFt: 7.4,
          threePLCostPerUnit: 2.85,
        },
        "Knoxville, TN": {
          straightLaborRate: 14.0,
          fullyBurdendedLaborRate: 19.6,
          leaseRatePerSqFt: 7.8,
          threePLCostPerUnit: 2.95,
        },
        "Chattanooga, TN": {
          straightLaborRate: 13.75,
          fullyBurdendedLaborRate: 19.25,
          leaseRatePerSqFt: 7.6,
          threePLCostPerUnit: 2.9,
        },
        "San Antonio, TX": {
          straightLaborRate: 14.5,
          fullyBurdendedLaborRate: 20.3,
          leaseRatePerSqFt: 8.2,
          threePLCostPerUnit: 3.05,
        },
        "Austin, TX": {
          straightLaborRate: 16.0,
          fullyBurdendedLaborRate: 22.4,
          leaseRatePerSqFt: 11.4,
          threePLCostPerUnit: 3.75,
        },
        "Fort Worth, TX": {
          straightLaborRate: 15.0,
          fullyBurdendedLaborRate: 21.0,
          leaseRatePerSqFt: 8.6,
          threePLCostPerUnit: 3.15,
        },
        "El Paso, TX": {
          straightLaborRate: 13.25,
          fullyBurdendedLaborRate: 18.55,
          leaseRatePerSqFt: 7.2,
          threePLCostPerUnit: 2.8,
        },
        "Salt Lake City, UT": {
          straightLaborRate: 15.75,
          fullyBurdendedLaborRate: 22.05,
          leaseRatePerSqFt: 9.8,
          threePLCostPerUnit: 3.45,
        },
        "Burlington, VT": {
          straightLaborRate: 17.0,
          fullyBurdendedLaborRate: 23.8,
          leaseRatePerSqFt: 11.6,
          threePLCostPerUnit: 3.85,
        },
        "Virginia Beach, VA": {
          straightLaborRate: 15.5,
          fullyBurdendedLaborRate: 21.7,
          leaseRatePerSqFt: 9.4,
          threePLCostPerUnit: 3.35,
        },
        "Richmond, VA": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 9.2,
          threePLCostPerUnit: 3.3,
        },
        "Norfolk, VA": {
          straightLaborRate: 15.0,
          fullyBurdendedLaborRate: 21.0,
          leaseRatePerSqFt: 8.8,
          threePLCostPerUnit: 3.25,
        },
        "Spokane, WA": {
          straightLaborRate: 16.75,
          fullyBurdendedLaborRate: 23.45,
          leaseRatePerSqFt: 10.2,
          threePLCostPerUnit: 3.55,
        },
        "Charleston, WV": {
          straightLaborRate: 14.0,
          fullyBurdendedLaborRate: 19.6,
          leaseRatePerSqFt: 7.4,
          threePLCostPerUnit: 2.85,
        },
        "Milwaukee, WI": {
          straightLaborRate: 16.0,
          fullyBurdendedLaborRate: 22.4,
          leaseRatePerSqFt: 9.4,
          threePLCostPerUnit: 3.35,
        },
        "Green Bay, WI": {
          straightLaborRate: 15.25,
          fullyBurdendedLaborRate: 21.35,
          leaseRatePerSqFt: 8.2,
          threePLCostPerUnit: 3.05,
        },
        "Cheyenne, WY": {
          straightLaborRate: 14.5,
          fullyBurdendedLaborRate: 20.3,
          leaseRatePerSqFt: 7.6,
          threePLCostPerUnit: 2.95,
        },
      };

      // Fetch data from Perplexity API for each location in parallel
      const perplexityPromises = locations.map((location) =>
        fetchMarketDataFromPerplexity(location).catch((error) => {
          console.warn(`Perplexity API failed for ${location}:`, error);
          return {};
        }),
      );

      // Wait for all API calls to complete (with timeout)
      const perplexityResults = await Promise.allSettled(
        perplexityPromises.map((promise) =>
          Promise.race([
            promise,
            new Promise(
              (_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 10000), // 10 second timeout
            ),
          ]),
        ),
      );

      const marketData: MarketData[] = locations.map((location, index) => {
        const state = location.split(", ")[1] || "";
        const baseData = marketDataBase[location];

        // Get Perplexity data if available
        const perplexityResult = perplexityResults[index];
        const perplexityData =
          perplexityResult.status === "fulfilled" ? perplexityResult.value : {};

        // Determine final values (Perplexity API first, then fallback, then regional estimates)
        const typedPerplexityData = perplexityData as any;
        let straightLaborRate =
          typedPerplexityData?.straightLaborRate || baseData?.straightLaborRate;
        let fullyBurdendedLaborRate =
          typedPerplexityData?.fullyBurdendedLaborRate ||
          baseData?.fullyBurdendedLaborRate;
        let leaseRate =
          typedPerplexityData?.leaseRatePerSqFt || baseData?.leaseRatePerSqFt;
        let threePLCost =
          typedPerplexityData?.threePLCostPerUnit || baseData?.threePLCostPerUnit;

        // If no data available, generate realistic regional estimates
        if (
          !straightLaborRate ||
          !fullyBurdendedLaborRate ||
          !leaseRate ||
          !threePLCost
        ) {
          const baseStraightRate = 15;
          const baseLeaseRate = 8;
          const baseThreePLCost = 2.5;

          // Apply regional adjustments
          let regionalMultiplier = 1.0;
          if (["CA", "WA", "OR"].includes(state)) {
            regionalMultiplier = 1.25; // West Coast premium
          } else if (["NY", "NJ", "CT", "MA"].includes(state)) {
            regionalMultiplier = 1.3; // Northeast premium
          } else if (["AL", "MS", "SC", "AR", "KY"].includes(state)) {
            regionalMultiplier = 0.85; // Southeast discount
          } else if (["OH", "IN", "MI", "WI", "IA"].includes(state)) {
            regionalMultiplier = 0.95; // Midwest moderate
          }

          straightLaborRate =
            straightLaborRate ||
            Math.round(baseStraightRate * regionalMultiplier * 100) / 100;
          fullyBurdendedLaborRate =
            fullyBurdendedLaborRate ||
            Math.round(straightLaborRate * 1.4 * 100) / 100;
          leaseRate =
            leaseRate ||
            Math.round(baseLeaseRate * regionalMultiplier * 1.2 * 100) / 100;
          threePLCost =
            threePLCost ||
            Math.round(baseThreePLCost * regionalMultiplier * 100) / 100;
        }

        return {
          location,
          state,
          straightLaborRate: straightLaborRate!,
          fullyBurdendedLaborRate: fullyBurdendedLaborRate!,
          leaseRatePerSqFt: leaseRate!,
          threePLCostPerUnit: threePLCost!,
          laborCostPerHour: fullyBurdendedLaborRate!, // For backward compatibility
          lastUpdated: new Date().toISOString(),
        };
      });

      setMarketData(marketData);

      const perplexitySuccessCount = perplexityResults.filter(
        (r) => r.status === "fulfilled",
      ).length;
      console.log(
        `Market data fetched for ${locations.length} locations. Perplexity API: ${perplexitySuccessCount}/${locations.length} successful.`,
      );
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
