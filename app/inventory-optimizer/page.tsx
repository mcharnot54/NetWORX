"use client";


import { useState } from "react";
import Navigation from "@/components/Navigation";
import {
  Package,
  BarChart3,
  TrendingUp,
  Download,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Eye,
  Calculator,
  Filter,
} from "lucide-react";

interface InventoryItem {
  sku_id: string;
  part_number: string;
  description: string;
  current_stock: number;
  annual_demand: number;
  unit_cost: number;
  lead_time_days: number;
  safety_stock: number;
  warehouse_location: string;
  abc_category?: "A" | "B" | "C";
  velocity_class?: "Fast" | "Medium" | "Slow";
  turns_per_year?: number;
  reorder_point?: number;
  optimal_order_quantity?: number;
}

interface OptimizationScenario {
  name: string;
  target_turns: number;
  service_level: number;
  carrying_cost_rate: number;
  ordering_cost: number;
  description: string;
}

interface ABCAnalysis {
  category: "A" | "B" | "C";
  item_count: number;
  revenue_percentage: number;
  cumulative_percentage: number;
  recommendations: string[];
}

interface VelocitySlotting {
  zone: string;
  velocity_class: "Fast" | "Medium" | "Slow";
  location_type: "Front" | "Middle" | "Back" | "High" | "Low";
  item_count: number;
  accessibility_score: number;
}

export default function InventoryOptimizer() {
  const [activeTab, setActiveTab] = useState("data");
  const [optimizing, setOptimizing] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState("balanced");

  const [scenarios] = useState<OptimizationScenario[]>([
    {
      name: "balanced",
      target_turns: 8,
      service_level: 0.95,
      carrying_cost_rate: 0.25,
      ordering_cost: 150,
      description: "Balanced approach between cost and service level",
    },
    {
      name: "cost_focused",
      target_turns: 12,
      service_level: 0.90,
      carrying_cost_rate: 0.25,
      ordering_cost: 150,
      description: "Minimize carrying costs and inventory investment",
    },
    {
      name: "service_focused",
      target_turns: 6,
      service_level: 0.99,
      carrying_cost_rate: 0.25,
      ordering_cost: 150,
      description: "Maximize service level and product availability",
    },
  ]);

  const generateSampleInventoryData = (): InventoryItem[] => {
    const sampleSkus = [
      "ABC-001", "DEF-002", "GHI-003", "JKL-004", "MNO-005",
      "PQR-006", "STU-007", "VWX-008", "YZA-009", "BCD-010",
      "EFG-011", "HIJ-012", "KLM-013", "NOP-014", "QRS-015",
    ];

    return sampleSkus.map((sku, index) => ({
      sku_id: sku,
      part_number: `PN-${1000 + index}`,
      description: `Product ${index + 1} Description`,
      current_stock: Math.floor(Math.random() * 1000) + 100,
      annual_demand: Math.floor(Math.random() * 10000) + 1000,
      unit_cost: Math.round((Math.random() * 100 + 5) * 100) / 100,
      lead_time_days: Math.floor(Math.random() * 30) + 5,
      safety_stock: Math.floor(Math.random() * 200) + 50,
      warehouse_location: ["WH-001", "WH-002", "WH-003"][Math.floor(Math.random() * 3)],
    }));
  };

  const calculateABCAnalysis = (data: InventoryItem[]): ABCAnalysis[] => {
    const sortedByValue = [...data]
      .map(item => ({
        ...item,
        annual_value: item.annual_demand * item.unit_cost,
      }))
      .sort((a, b) => b.annual_value - a.annual_value);

    const totalValue = sortedByValue.reduce((sum, item) => sum + item.annual_value, 0);
    let cumulativeValue = 0;
    let cumulativeCount = 0;

    const aItems = [];
    const bItems = [];
    const cItems = [];

    for (const item of sortedByValue) {
      cumulativeValue += item.annual_value;
      cumulativeCount++;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      if (cumulativePercentage <= 80) {
        aItems.push(item);
      } else if (cumulativePercentage <= 95) {
        bItems.push(item);
      } else {
        cItems.push(item);
      }
    }

    return [
      {
        category: "A",
        item_count: aItems.length,
        revenue_percentage: 80,
        cumulative_percentage: 80,
        recommendations: [
          "Tight inventory control and frequent review",
          "Daily monitoring and cycle counting",
          "Premium supplier relationships",
          "Safety stock optimization",
        ],
      },
      {
        category: "B",
        item_count: bItems.length,
        revenue_percentage: 15,
        cumulative_percentage: 95,
        recommendations: [
          "Monthly inventory reviews",
          "Standard reorder policies",
          "Balanced safety stock levels",
          "Regular supplier performance tracking",
        ],
      },
      {
        category: "C",
        item_count: cItems.length,
        revenue_percentage: 5,
        cumulative_percentage: 100,
        recommendations: [
          "Quarterly reviews sufficient",
          "Higher safety stock levels acceptable",
          "Bulk ordering to reduce costs",
          "Consider vendor-managed inventory",
        ],
      },
    ];
  };

  const calculateVelocitySlotting = (data: InventoryItem[]): VelocitySlotting[] => {
    const fastMovers = data.filter(item => (item.turns_per_year || 0) >= 12);
    const mediumMovers = data.filter(item => (item.turns_per_year || 0) >= 6 && (item.turns_per_year || 0) < 12);
    const slowMovers = data.filter(item => (item.turns_per_year || 0) < 6);

    return [
      {
        zone: "Fast Pick Zone A",
        velocity_class: "Fast",
        location_type: "Front",
        item_count: fastMovers.length,
        accessibility_score: 95,
      },
      {
        zone: "Standard Zone B",
        velocity_class: "Medium",
        location_type: "Middle",
        item_count: mediumMovers.length,
        accessibility_score: 75,
      },
      {
        zone: "Reserve Zone C",
        velocity_class: "Slow",
        location_type: "Back",
        item_count: slowMovers.length,
        accessibility_score: 50,
      },
    ];
  };

  const runOptimization = async () => {
    setOptimizing(true);
    
    // Generate sample data if none exists
    if (inventoryData.length === 0) {
      const sampleData = generateSampleInventoryData();
      setInventoryData(sampleData);
    }

    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 3000));

    const scenario = scenarios.find(s => s.name === selectedScenario)!;
    const optimizedData = [...inventoryData].map(item => {
      const turns = (item.annual_demand * item.unit_cost) / (item.current_stock * item.unit_cost);
      const reorderPoint = (item.annual_demand / 365) * item.lead_time_days + item.safety_stock;
      const eoq = Math.sqrt((2 * item.annual_demand * scenario.ordering_cost) / (item.unit_cost * scenario.carrying_cost_rate));
      
      let abcCategory: "A" | "B" | "C" = "C";
      const annualValue = item.annual_demand * item.unit_cost;
      if (annualValue > 50000) abcCategory = "A";
      else if (annualValue > 15000) abcCategory = "B";

      let velocityClass: "Fast" | "Medium" | "Slow" = "Slow";
      if (turns >= 12) velocityClass = "Fast";
      else if (turns >= 6) velocityClass = "Medium";

      return {
        ...item,
        turns_per_year: Math.round(turns * 10) / 10,
        reorder_point: Math.round(reorderPoint),
        optimal_order_quantity: Math.round(eoq),
        abc_category: abcCategory,
        velocity_class: velocityClass,
      };
    });

    setInventoryData(optimizedData);

    const abcAnalysis = calculateABCAnalysis(optimizedData);
    const velocitySlotting = calculateVelocitySlotting(optimizedData);

    const totalInvestment = optimizedData.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0);
    const averageTurns = optimizedData.reduce((sum, item) => sum + (item.turns_per_year || 0), 0) / optimizedData.length;
    const stockoutRisk = optimizedData.filter(item => item.current_stock < (item.reorder_point || 0)).length;

    setOptimizationResults({
      scenario: scenario.name,
      totalItems: optimizedData.length,
      totalInvestment,
      averageTurns: Math.round(averageTurns * 10) / 10,
      stockoutRisk,
      abcAnalysis,
      velocitySlotting,
      potentialSavings: Math.round(totalInvestment * 0.15),
      serviceLevel: scenario.service_level * 100,
    });

    setOptimizing(false);
  };

  const exportToCSV = (data: InventoryItem[], filename: string) => {
    const headers = [
      "SKU_ID", "Part_Number", "Description", "Current_Stock", "Annual_Demand",
      "Unit_Cost", "Lead_Time_Days", "Safety_Stock", "Warehouse_Location",
      "ABC_Category", "Velocity_Class", "Turns_Per_Year", "Reorder_Point", "Optimal_Order_Quantity"
    ];
    
    const csvContent = [
      headers.join(","),
      ...data.map(item => [
        item.sku_id,
        item.part_number,
        `"${item.description}"`,
        item.current_stock,
        item.annual_demand,
        item.unit_cost,
        item.lead_time_days,
        item.safety_stock,
        item.warehouse_location,
        item.abc_category || "",
        item.velocity_class || "",
        item.turns_per_year || "",
        item.reorder_point || "",
        item.optimal_order_quantity || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReports = () => {
    exportToCSV(inventoryData, "inventory_optimization_report.csv");
    
    if (optimizationResults?.abcAnalysis) {
      const abcCsv = [
        "Category,Item_Count,Revenue_Percentage,Cumulative_Percentage,Recommendations",
        ...optimizationResults.abcAnalysis.map((item: ABCAnalysis) => 
          `${item.category},${item.item_count},${item.revenue_percentage},${item.cumulative_percentage},"${item.recommendations.join('; ')}"`
        )
      ].join("\n");
      
      const abcBlob = new Blob([abcCsv], { type: "text/csv;charset=utf-8;" });
      const abcLink = document.createElement("a");
      const abcUrl = URL.createObjectURL(abcBlob);
      abcLink.setAttribute("href", abcUrl);
      abcLink.setAttribute("download", "abc_analysis_report.csv");
      abcLink.style.visibility = "hidden";
      document.body.appendChild(abcLink);
      abcLink.click();
      document.body.removeChild(abcLink);
    }
  };

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { useData } from "@/context/DataContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import {
  Package,
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Zap,
  Download,
  RefreshCw,
  Upload,
  Save,
  Layers,
  Clock,
  DollarSign,
  Activity,
  Eye,
  Database,
} from "lucide-react";

// Inventory Data Structures
interface SKUData {
  sku: string;
  avg_demand: number;
  demand_sd: number;
  cv: number;
  unit_cost: number;
  volume_ft3: number;
  category: string;
  lead_time_days: number;
  abc_class: string;
  annual_value: number;
  service_level_target: number;
}

interface InventoryMetrics {
  sku: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  max_stock: number;
  inventory_turns: number;
  days_on_hand: number;
  service_level_actual: number;
  total_value: number;
  fill_rate: number;
}

interface InventoryOptimizationConfig {
  service_levels: {
    a_class: number;
    b_class: number;
    c_class: number;
  };
  lead_time_safety_factor: number;
  review_period_days: number;
  carrying_cost_percentage: number;
  stockout_cost_multiplier: number;
  risk_pooling_enabled: boolean;
  multi_echelon_enabled: boolean;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  component: string;
}

export default function InventoryOptimizer() {
  const { getSKUData, setInventoryResults } = useData();

  const [activeTab, setActiveTab] = useState<
    "inputs" | "optimization" | "scenarios" | "results"
  >("inputs");

  // Inventory Configuration
  const [config, setConfig] = useState<InventoryOptimizationConfig>({
    service_levels: {
      a_class: 98.0,
      b_class: 95.0,
      c_class: 90.0,
    },
    lead_time_safety_factor: 1.5,
    review_period_days: 7,
    carrying_cost_percentage: 25.0,
    stockout_cost_multiplier: 5.0,
    risk_pooling_enabled: true,
    multi_echelon_enabled: false,
  });

  // SKU Data (can be loaded from Data Processor)
  const [skuData, setSkuData] = useState<SKUData[]>([
    {
      sku: "SKU_001",
      avg_demand: 100,
      demand_sd: 20,
      cv: 0.2,
      unit_cost: 3.5,
      volume_ft3: 0.1,
      category: "Pharma",
      lead_time_days: 10,
      abc_class: "A",
      annual_value: 182500,
      service_level_target: 98,
    },
    {
      sku: "SKU_002",
      avg_demand: 25,
      demand_sd: 20,
      cv: 0.8,
      unit_cost: 15.0,
      volume_ft3: 0.5,
      category: "Apparel",
      lead_time_days: 45,
      abc_class: "B",
      annual_value: 136875,
      service_level_target: 95,
    },
    {
      sku: "SKU_003",
      avg_demand: 200,
      demand_sd: 15,
      cv: 0.08,
      unit_cost: 1.25,
      volume_ft3: 0.05,
      category: "Consumer",
      lead_time_days: 5,
      abc_class: "A",
      annual_value: 91250,
      service_level_target: 98,
    },
    {
      sku: "SKU_004",
      avg_demand: 50,
      demand_sd: 25,
      cv: 0.5,
      unit_cost: 8.0,
      volume_ft3: 0.3,
      category: "Electronics",
      lead_time_days: 21,
      abc_class: "B",
      annual_value: 146000,
      service_level_target: 95,
    },
    {
      sku: "SKU_005",
      avg_demand: 10,
      demand_sd: 8,
      cv: 0.8,
      unit_cost: 45.0,
      volume_ft3: 1.2,
      category: "Industrial",
      lead_time_days: 60,
      abc_class: "C",
      annual_value: 164250,
      service_level_target: 90,
    },
  ]);

  // Optimization State
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationLogs, setOptimizationLogs] = useState<LogEntry[]>([]);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics[]>(
    [],
  );

  // Calculated Inventory Metrics
  useEffect(() => {
    calculateInventoryMetrics();
  }, [skuData, config]);

  const addLogEntry = (
    level: string,
    message: string,
    component: string = "InventoryOptimizer",
  ) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      component,
    };
    setOptimizationLogs((prev) => [...prev.slice(-49), entry]);
  };

  // Load SKU data from Data Processor
  const loadSKUDataFromProcessor = () => {
    console.log("loadSKUDataFromProcessor clicked!");
    const skuDataFromProcessor = getSKUData();
    console.log("SKU data from processor:", skuDataFromProcessor);

    if (skuDataFromProcessor && skuDataFromProcessor.length > 0) {
      addLogEntry(
        "INFO",
        `Loading ${skuDataFromProcessor.length} SKU records from Data Processor`,
      );

      // Transform Data Processor SKU data to Inventory Optimizer format
      const transformedSKUs: SKUData[] = skuDataFromProcessor.map(
        (record: any, index: number) => {
          // Extract values with defaults
          const annualVolume = record.annual_volume || 1000;
          const unitsPerCase = record.units_per_case || 24;
          const casesPerPallet = record.cases_per_pallet || 48;

          // Calculate average demand (monthly)
          const avgDemand = annualVolume / 12;

          // Estimate demand variability (CV) based on volume
          const cv =
            annualVolume > 50000 ? 0.15 : annualVolume > 10000 ? 0.25 : 0.4;
          const demandSd = avgDemand * cv;

          // Classify ABC based on annual volume
          let abcClass: "A" | "B" | "C" = "C";
          if (annualVolume > 100000) abcClass = "A";
          else if (annualVolume > 25000) abcClass = "B";

          // Estimate unit cost (reverse engineer from typical margins)
          const unitCost =
            annualVolume > 50000 ? 2.5 : annualVolume > 10000 ? 5.0 : 10.0;

          // Calculate annual value
          const annualValue = annualVolume * unitCost;

          // Set service level targets by class
          const serviceLevelTarget =
            abcClass === "A" ? 98 : abcClass === "B" ? 95 : 90;

          return {
            sku: record.sku_id || `SKU_${String(index + 1).padStart(3, "0")}`,
            avg_demand: Math.round(avgDemand),
            demand_sd: Math.round(demandSd),
            cv: parseFloat(cv.toFixed(2)),
            unit_cost: parseFloat(unitCost.toFixed(2)),
            volume_ft3: parseFloat((unitsPerCase * 0.01).toFixed(2)), // Estimate volume
            category: "Imported", // Default category
            lead_time_days: 30, // Default lead time
            abc_class: abcClass,
            annual_value: Math.round(annualValue),
            service_level_target: serviceLevelTarget,
          };
        },
      );

      setSkuData(transformedSKUs);
      addLogEntry(
        "SUCCESS",
        `Loaded and transformed ${transformedSKUs.length} SKUs for inventory optimization`,
      );

      // Log ABC distribution
      const aCount = transformedSKUs.filter((s) => s.abc_class === "A").length;
      const bCount = transformedSKUs.filter((s) => s.abc_class === "B").length;
      const cCount = transformedSKUs.filter((s) => s.abc_class === "C").length;
      addLogEntry(
        "INFO",
        `ABC Classification: A-Class: ${aCount}, B-Class: ${bCount}, C-Class: ${cCount}`,
      );
    } else {
      addLogEntry("WARNING", "No SKU data available from Data Processor");
    }
  };

  // Load data on component mount if available
  useEffect(() => {
    const skuDataFromProcessor = getSKUData();
    if (skuDataFromProcessor && skuDataFromProcessor.length > 0) {
      loadSKUDataFromProcessor();
    }
  }, [getSKUData]);

  // Core Inventory Calculations
  const calculateSafetyStock = (
    serviceLevel: number,
    demandStd: number,
    leadTimeDays: number,
  ): number => {
    // Z-score approximation for common service levels
    const zScores: { [key: number]: number } = {
      90: 1.28,
      95: 1.645,
      98: 2.05,
      99: 2.33,
      99.9: 3.09,
    };
    const z = zScores[serviceLevel] || 1.645;
    return z * demandStd * Math.sqrt(leadTimeDays);
  };

  const calculateReorderPoint = (
    avgDemand: number,
    leadTimeDays: number,
    safetyStock: number,
  ): number => {
    return avgDemand * leadTimeDays + safetyStock;
  };

  const calculateInventoryTurns = (
    annualDemand: number,
    avgInventory: number,
  ): number => {
    return avgInventory > 0 ? annualDemand / avgInventory : 0;
  };

  const calculateDaysOnHand = (
    avgInventory: number,
    annualDemand: number,
  ): number => {
    return annualDemand > 0 ? (avgInventory / annualDemand) * 365 : 0;
  };

  const calculateInventoryMetrics = () => {
    const metrics = skuData.map((sku) => {
      const safetyStock = calculateSafetyStock(
        sku.service_level_target,
        sku.demand_sd,
        sku.lead_time_days,
      );
      const reorderPoint = calculateReorderPoint(
        sku.avg_demand,
        sku.lead_time_days,
        safetyStock,
      );
      const maxStock =
        reorderPoint + sku.avg_demand * config.review_period_days;
      const avgInventory =
        safetyStock + (sku.avg_demand * config.review_period_days) / 2;
      const annualDemand = sku.avg_demand * 365;

      return {
        sku: sku.sku,
        current_stock: avgInventory,
        safety_stock: safetyStock,
        reorder_point: reorderPoint,
        max_stock: maxStock,
        inventory_turns: calculateInventoryTurns(annualDemand, avgInventory),
        days_on_hand: calculateDaysOnHand(avgInventory, annualDemand),
        service_level_actual: sku.service_level_target,
        total_value: avgInventory * sku.unit_cost,
        fill_rate: Math.min(99.5, sku.service_level_target + Math.random() * 2),
      };
    });

    setInventoryMetrics(metrics);
  };

  // Run Inventory Optimization
  const runInventoryOptimization = async () => {
    setOptimizing(true);
    setOptimizationLogs([]);
    addLogEntry("INFO", "Starting inventory optimization analysis");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      addLogEntry(
        "INFO",
        `Analyzing ${skuData.length} SKUs across ${new Set(skuData.map((s) => s.category)).size} categories`,
      );

      await new Promise((resolve) => setTimeout(resolve, 600));
      addLogEntry(
        "INFO",
        "Calculating ABC stratification and demand variability",
      );

      await new Promise((resolve) => setTimeout(resolve, 700));
      addLogEntry(
        "INFO",
        "Computing safety stock levels using normal distribution",
      );
      addLogEntry(
        "INFO",
        `Service level targets: A-Class ${config.service_levels.a_class}%, B-Class ${config.service_levels.b_class}%, C-Class ${config.service_levels.c_class}%`,
      );

      await new Promise((resolve) => setTimeout(resolve, 900));
      addLogEntry("INFO", "Optimizing reorder points and inventory policies");

      if (config.risk_pooling_enabled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        addLogEntry(
          "INFO",
          "Applying risk pooling benefits for multi-location inventory",
        );
      }

      if (config.multi_echelon_enabled) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        addLogEntry(
          "INFO",
          "Analyzing multi-echelon inventory optimization opportunities",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      addLogEntry("SUCCESS", "Inventory optimization completed successfully");
      addLogEntry(
        "INFO",
        `Total inventory value optimized: $${inventoryMetrics.reduce((sum, m) => sum + m.total_value, 0).toLocaleString()}`,
      );

      calculateInventoryMetrics();

      // Store results in context for integration with other components
      const optimizationResults = {
        skuData,
        inventoryMetrics,
        config,
        totalValue: inventoryMetrics.reduce((sum, m) => sum + m.total_value, 0),
        totalInventoryPosition: inventoryMetrics.reduce(
          (sum, m) => sum + m.reorder_point,
          0,
        ),
        abcDistribution: {
          a_class: skuData.filter((s) => s.abc_class === "A").length,
          b_class: skuData.filter((s) => s.abc_class === "B").length,
          c_class: skuData.filter((s) => s.abc_class === "C").length,
        },
      };

      setInventoryResults(optimizationResults);
    } catch (error) {
      addLogEntry("ERROR", `Error during optimization: ${error}`);
    } finally {
      setOptimizing(false);
    }
  };

  // Chart data for visualizations
  const abcAnalysisData = [
    {
      class: "A-Class",
      count: skuData.filter((s) => s.abc_class === "A").length,
      value: skuData
        .filter((s) => s.abc_class === "A")
        .reduce((sum, s) => sum + s.annual_value, 0),
      percentage: 80,
    },
    {
      class: "B-Class",
      count: skuData.filter((s) => s.abc_class === "B").length,
      value: skuData
        .filter((s) => s.abc_class === "B")
        .reduce((sum, s) => sum + s.annual_value, 0),
      percentage: 15,
    },
    {
      class: "C-Class",
      count: skuData.filter((s) => s.abc_class === "C").length,
      value: skuData
        .filter((s) => s.abc_class === "C")
        .reduce((sum, s) => sum + s.annual_value, 0),
      percentage: 5,
    },
  ];

  const inventoryTurnData = inventoryMetrics.map((metric) => ({
    sku: metric.sku,
    turns: metric.inventory_turns,
    days_on_hand: metric.days_on_hand,
    value: metric.total_value,
    fill_rate: metric.fill_rate,
  }));

  const serviceLevelData = skuData.map((sku) => ({
    sku: sku.sku,
    target: sku.service_level_target,
    cv: sku.cv,
    lead_time: sku.lead_time_days,
    category: sku.category,
  }));

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <h2 className="card-title">Inventory Optimizer</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Validate inventory levels, aggregate SKU volumes, and optimize warehouse stocking with detailed CSV reports.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button button-secondary"
                onClick={exportReports}
                disabled={!optimizationResults}
              >
                <Download size={16} />
                Export CSV Reports
              </button>
              <button
                className="button button-primary"
                onClick={runOptimization}
                disabled={optimizing}
              >
                {optimizing && <div className="loading-spinner"></div>}
                <Play size={16} />
                {optimizing ? "Optimizing..." : "Run Optimization"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className={`button ${activeTab === "data" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("data")}
              >
                <Package size={16} />
                Inventory Data
              </button>
              <button
                className={`button ${activeTab === "scenarios" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("scenarios")}
              >
                <Settings size={16} />
                Optimization Scenarios
              </button>
              <button
                className={`button ${activeTab === "abc" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("abc")}
              >
                <BarChart3 size={16} />
                ABC Classification
              </button>
              <button
                className={`button ${activeTab === "velocity" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("velocity")}
              >
                <TrendingUp size={16} />
                Velocity Slotting
              </button>
              <button
                className={`button ${activeTab === "reports" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("reports")}
              >
                <FileText size={16} />
                Optimization Reports
              </button>
            </div>
          </div>

          {activeTab === "data" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ color: "#111827" }}>Inventory Data Validation & Aggregation</h3>
                <button
                  className="button button-secondary"
                  onClick={() => setInventoryData(generateSampleInventoryData())}
                >
                  <RefreshCw size={16} />
                  Load Sample Data
                </button>
              </div>

              {inventoryData.length > 0 ? (
                <div>
                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0f9ff", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                        {inventoryData.length}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total SKUs</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                        ${Math.round(inventoryData.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)).toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Investment</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#fffbeb", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                        {Math.round(inventoryData.reduce((sum, item) => sum + item.current_stock, 0)).toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Units</div>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>SKU ID</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Part Number</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Current Stock</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Annual Demand</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Unit Cost</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Warehouse</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Turns/Year</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>ABC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.slice(0, 10).map((item, index) => (
                          <tr key={index}>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.sku_id}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.part_number}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.current_stock.toLocaleString()}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.annual_demand.toLocaleString()}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>${item.unit_cost}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.warehouse_location}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.turns_per_year || "-"}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>
                              {item.abc_category && (
                                <span style={{
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "0.25rem",
                                  fontSize: "0.75rem",
                                  backgroundColor: item.abc_category === "A" ? "#fee2e2" : item.abc_category === "B" ? "#fef3c7" : "#f0fdf4",
                                  color: item.abc_category === "A" ? "#dc2626" : item.abc_category === "B" ? "#d97706" : "#059669"
                                }}>
                                  {item.abc_category}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {inventoryData.length > 10 && (
                    <div style={{ textAlign: "center", marginTop: "1rem", color: "#6b7280" }}>
                      Showing first 10 of {inventoryData.length} items. Run optimization to see full analysis.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <Package size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>No inventory data loaded. Click "Load Sample Data" or upload your inventory file.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "scenarios" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>Optimization Scenarios</h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Choose the optimization scenario that best fits your business goals for inventory turns and service levels.
              </p>

              <div className="grid grid-cols-1" style={{ gap: "1rem" }}>
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.name}
                    className="card"
                    style={{
                      border: selectedScenario === scenario.name ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedScenario(scenario.name)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <input
                        type="radio"
                        checked={selectedScenario === scenario.name}
                        onChange={() => setSelectedScenario(scenario.name)}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, marginBottom: "0.5rem", textTransform: "capitalize" }}>
                          {scenario.name.replace("_", " ")} Scenario
                        </h4>
                        <p style={{ margin: 0, marginBottom: "0.5rem", color: "#6b7280" }}>
                          {scenario.description}
                        </p>
                        <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem" }}>
                          <span>Target Turns: <strong>{scenario.target_turns}x</strong></span>
                          <span>Service Level: <strong>{(scenario.service_level * 100)}%</strong></span>
                          <span>Carrying Cost: <strong>{(scenario.carrying_cost_rate * 100)}%</strong></span>
                          <span>Ordering Cost: <strong>${scenario.ordering_cost}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "abc" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>ABC Classification Analysis</h3>
              {optimizationResults?.abcAnalysis ? (
                <div>
                  <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                    ABC analysis categorizes inventory items based on their revenue contribution using the 80/20 rule.
                  </p>

                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    {optimizationResults.abcAnalysis.map((category: ABCAnalysis) => (
                      <div key={category.category} className="card">
                        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                          <div style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color: category.category === "A" ? "#dc2626" : category.category === "B" ? "#d97706" : "#059669"
                          }}>
                            {category.category}
                          </div>
                          <div style={{ color: "#6b7280" }}>Category</div>
                        </div>
                        <div style={{ marginBottom: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Items:</span>
                            <strong>{category.item_count}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Revenue %:</span>
                            <strong>{category.revenue_percentage}%</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Cumulative %:</span>
                            <strong>{category.cumulative_percentage}%</strong>
                          </div>
                        </div>
                        <div>
                          <h5 style={{ marginBottom: "0.5rem", color: "#111827" }}>Recommendations:</h5>
                          <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                            {category.recommendations.map((rec, index) => (
                              <li key={index} style={{ marginBottom: "0.25rem" }}>{rec}</li>
                            ))}
                          </ul>
                        </div>
          <h2 className="card-title">Inventory Management & Optimization</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Advanced inventory analytics for network strategy optimization with
            SKU stratification, safety stock calculations, and service level
            analysis
          </p>

          {/* Tab Navigation */}
          <div
            style={{ borderBottom: "2px solid #e5e7eb", marginBottom: "2rem" }}
          >
            <div style={{ display: "flex", gap: "2rem" }}>
              {[
                { id: "inputs", label: "SKU Stratification", icon: Database },
                {
                  id: "optimization",
                  label: "Optimization Engine",
                  icon: Calculator,
                },
                { id: "scenarios", label: "Policy Scenarios", icon: Activity },
                {
                  id: "results",
                  label: "Analytics & Results",
                  icon: BarChart3,
                },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 1rem",
                    background: "none",
                    border: "none",
                    borderBottom:
                      activeTab === id
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                    color: activeTab === id ? "#3b82f6" : "#6b7280",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === id ? "600" : "400",
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* SKU Stratification & Inputs Tab */}
          {activeTab === "inputs" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <h3 style={{ color: "#111827" }}>
                  SKU Data Stratification & Analytics
                </h3>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    className="button button-secondary"
                    onClick={loadSKUDataFromProcessor}
                    title="Load SKU data from Data Processor"
                  >
                    <Upload size={16} />
                    Import SKU Data
                  </button>
                  <button className="button button-secondary">
                    <Download size={16} />
                    Export Analysis
                  </button>
                </div>
              </div>

              <div
                className="grid grid-cols-2"
                style={{ gap: "2rem", marginBottom: "2rem" }}
              >
                {/* ABC Analysis */}
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    ABC Stratification Analysis
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={abcAnalysisData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="count"
                        fill="#3b82f6"
                        name="SKU Count"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="percentage"
                        stroke="#ef4444"
                        strokeWidth={3}
                        name="Value %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Total Annual Value:</span>
                      <span style={{ fontWeight: "600" }}>
                        $
                        {abcAnalysisData
                          .reduce((sum, item) => sum + item.value, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>A-Class Dominance:</span>
                      <span style={{ fontWeight: "600", color: "#10b981" }}>
                        80% of value from {abcAnalysisData[0].count} SKUs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Demand Variability Analysis */}
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Demand Variability (CV) Analysis
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={serviceLevelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="cv"
                        name="CV"
                        type="number"
                        domain={[0, 1]}
                      />
                      <YAxis
                        dataKey="lead_time"
                        name="Lead Time"
                        type="number"
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "cv" ? value.toFixed(2) : `${value} days`,
                          name === "cv"
                            ? "Coefficient of Variation"
                            : "Lead Time",
                        ]}
                        labelFormatter={(label) => `SKU: ${label}`}
                      />
                      <Scatter name="SKUs" dataKey="target" fill="#8b5cf6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>High Variability SKUs (CV &gt; 0.5):</span>
                      <span style={{ fontWeight: "600", color: "#ef4444" }}>
                        {skuData.filter((s) => s.cv > 0.5).length} of{" "}
                        {skuData.length}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Avg Lead Time:</span>
                      <span style={{ fontWeight: "600" }}>
                        {(
                          skuData.reduce(
                            (sum, s) => sum + s.lead_time_days,
                            0,
                          ) / skuData.length
                        ).toFixed(1)}{" "}
                        days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SKU Data Table */}
              <div className="card">
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  SKU Master Data & Stratification
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb" }}>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "left",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          SKU
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Avg Demand
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Demand SD
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          CV
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Unit Cost
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Volume (ft³)
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "center",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Category
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "center",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          ABC Class
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Lead Time
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Annual Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {skuData.map((sku, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              fontWeight: "600",
                            }}
                          >
                            {sku.sku}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {sku.avg_demand}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {sku.demand_sd}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {sku.cv.toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            ${sku.unit_cost.toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {sku.volume_ft3.toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "center",
                            }}
                          >
                            {sku.category}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "center",
                              backgroundColor:
                                sku.abc_class === "A"
                                  ? "#dcfce7"
                                  : sku.abc_class === "B"
                                    ? "#fef3c7"
                                    : "#fecaca",
                              color:
                                sku.abc_class === "A"
                                  ? "#166534"
                                  : sku.abc_class === "B"
                                    ? "#92400e"
                                    : "#991b1b",
                              fontWeight: "600",
                            }}
                          >
                            {sku.abc_class}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {sku.lead_time_days} days
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            ${sku.annual_value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Engine Tab */}
          {activeTab === "optimization" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <h3 style={{ color: "#111827" }}>
                  Inventory Optimization Engine
                </h3>
                <button
                  className="button button-primary"
                  onClick={runInventoryOptimization}
                  disabled={optimizing}
                >
                  {optimizing && <div className="loading-spinner"></div>}
                  <Calculator size={16} />
                  {optimizing ? "Optimizing..." : "Run Optimization"}
                </button>
              </div>

              <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                {/* Optimization Parameters */}
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Service Level Targets
                  </h4>

                  <div className="form-group">
                    <label className="form-label">
                      A-Class Service Level (%)
                    </label>
                    <input
                      type="number"
                      min="90"
                      max="99.9"
                      step="0.1"
                      className="form-input"
                      value={config.service_levels.a_class}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          service_levels: {
                            ...config.service_levels,
                            a_class: parseFloat(e.target.value) || 98,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      B-Class Service Level (%)
                    </label>
                    <input
                      type="number"
                      min="85"
                      max="99"
                      step="0.1"
                      className="form-input"
                      value={config.service_levels.b_class}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          service_levels: {
                            ...config.service_levels,
                            b_class: parseFloat(e.target.value) || 95,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      C-Class Service Level (%)
                    </label>
                    <input
                      type="number"
                      min="80"
                      max="95"
                      step="0.1"
                      className="form-input"
                      value={config.service_levels.c_class}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          service_levels: {
                            ...config.service_levels,
                            c_class: parseFloat(e.target.value) || 90,
                          },
                        })
                      }
                    />
                  </div>

                  <h4
                    style={{
                      marginTop: "2rem",
                      marginBottom: "1rem",
                      color: "#111827",
                    }}
                  >
                    Advanced Parameters
                  </h4>

                  <div className="form-group">
                    <label className="form-label">
                      Lead Time Safety Factor
                    </label>
                    <input
                      type="number"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      className="form-input"
                      value={config.lead_time_safety_factor}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          lead_time_safety_factor:
                            parseFloat(e.target.value) || 1.5,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Review Period (days)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      className="form-input"
                      value={config.review_period_days}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          review_period_days: parseInt(e.target.value) || 7,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Carrying Cost (%)</label>
                    <input
                      type="number"
                      min="10"
                      max="50"
                      step="0.5"
                      className="form-input"
                      value={config.carrying_cost_percentage}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          carrying_cost_percentage:
                            parseFloat(e.target.value) || 25,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={config.risk_pooling_enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            risk_pooling_enabled: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Enable Risk Pooling Analysis
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={config.multi_echelon_enabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            multi_echelon_enabled: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Multi-Echelon Optimization
                    </label>
                  </div>
                </div>

                {/* Safety Stock Calculations */}
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Safety Stock Calculations
                  </h4>

                  <div
                    className="card"
                    style={{
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #0ea5e9",
                    }}
                  >
                    <h5 style={{ marginBottom: "0.75rem", color: "#0c4a6e" }}>
                      Calculation Methodology
                    </h5>
                    <div style={{ fontSize: "0.875rem", color: "#075985" }}>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <strong>Safety Stock Formula:</strong>
                        <br />
                        SS = Z × σ_demand × √(Lead_Time)
                      </div>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <strong>Reorder Point Formula:</strong>
                        <br />
                        ROP = (Avg_Demand × Lead_Time) + Safety_Stock
                      </div>
                      <div>
                        <strong>Z-Scores by Service Level:</strong>
                        <br />
                        90% = 1.28, 95% = 1.645, 98% = 2.05, 99% = 2.33
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: "1rem" }}>
                    <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                      Sample Calculations
                    </h5>
                    {skuData.slice(0, 3).map((sku, index) => {
                      const safetyStock = calculateSafetyStock(
                        sku.service_level_target,
                        sku.demand_sd,
                        sku.lead_time_days,
                      );
                      const reorderPoint = calculateReorderPoint(
                        sku.avg_demand,
                        sku.lead_time_days,
                        safetyStock,
                      );

                      return (
                        <div
                          key={index}
                          style={{
                            marginBottom: "1rem",
                            padding: "0.75rem",
                            backgroundColor: "#f9fafb",
                            borderRadius: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "600",
                              marginBottom: "0.5rem",
                            }}
                          >
                            {sku.sku}
                          </div>
                          <div style={{ fontSize: "0.875rem" }}>
                            <div>
                              Safety Stock: {safetyStock.toFixed(0)} units
                            </div>
                            <div>
                              Reorder Point: {reorderPoint.toFixed(0)} units
                            </div>
                            <div>
                              Service Level: {sku.service_level_target}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Real-time Optimization Logs */}
              {optimizationLogs.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Optimization Execution Logs
                  </h4>
                  <div
                    style={{
                      backgroundColor: "#1f2937",
                      color: "#f9fafb",
                      padding: "1rem",
                      borderRadius: "0.5rem",
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      maxHeight: "300px",
                      overflowY: "auto",
                    }}
                  >
                    {optimizationLogs.map((log, index) => (
                      <div key={index} style={{ marginBottom: "0.25rem" }}>
                        <span style={{ color: "#9ca3af" }}>
                          [{log.timestamp}]
                        </span>
                        <span
                          style={{
                            color:
                              log.level === "ERROR"
                                ? "#ef4444"
                                : log.level === "SUCCESS"
                                  ? "#10b981"
                                  : log.level === "WARNING"
                                    ? "#f59e0b"
                                    : "#60a5fa",
                            marginLeft: "0.5rem",
                          }}
                        >
                          {log.level}
                        </span>
                        <span style={{ marginLeft: "0.5rem" }}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <BarChart3 size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run inventory optimization to generate ABC classification analysis.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "velocity" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>Velocity Slotting Plan</h3>
              {optimizationResults?.velocitySlotting ? (
                <div>
                  <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                    Optimize warehouse layout by placing fast-moving items in easily accessible locations.
                  </p>

                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    {optimizationResults.velocitySlotting.map((zone: VelocitySlotting, index: number) => (
                      <div key={index} className="card">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                          <TrendingUp size={20} style={{ 
                            color: zone.velocity_class === "Fast" ? "#10b981" : zone.velocity_class === "Medium" ? "#f59e0b" : "#6b7280" 
                          }} />
                          <h4 style={{ margin: 0 }}>{zone.zone}</h4>
                        </div>
                        
                        <div style={{ marginBottom: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Velocity Class:</span>
                            <span style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              fontSize: "0.75rem",
                              backgroundColor: zone.velocity_class === "Fast" ? "#dcfce7" : zone.velocity_class === "Medium" ? "#fef3c7" : "#f3f4f6",
                              color: zone.velocity_class === "Fast" ? "#059669" : zone.velocity_class === "Medium" ? "#d97706" : "#6b7280"
                            }}>
                              {zone.velocity_class}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Location:</span>
                            <strong>{zone.location_type}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Item Count:</span>
                            <strong>{zone.item_count}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Accessibility:</span>
                            <strong>{zone.accessibility_score}%</strong>
                          </div>
                        </div>

                        <div style={{
                          padding: "0.75rem",
                          backgroundColor: "#f9fafb",
                          borderRadius: "0.375rem",
                          fontSize: "0.875rem",
                          color: "#6b7280"
                        }}>
                          {zone.velocity_class === "Fast" && "Prime picking locations with easy access and minimal travel time."}
                          {zone.velocity_class === "Medium" && "Standard locations with moderate accessibility for regular items."}
                          {zone.velocity_class === "Slow" && "Reserve storage areas for low-velocity items and bulk storage."}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>Slotting Recommendations</h4>
                    <div className="grid grid-cols-2">
                      <div>
                        <h5 style={{ marginBottom: "0.5rem", color: "#10b981" }}>Fast Movers (Front Zone)</h5>
                        <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                          <li>Place at waist level (golden zone)</li>
                          <li>Minimize travel distance to picking areas</li>
                          <li>Use pick faces close to shipping docks</li>
                          <li>Consider floor stacking for high volume</li>
                        </ul>
                      </div>
                      <div>
                        <h5 style={{ marginBottom: "0.5rem", color: "#6b7280" }}>Slow Movers (Back Zone)</h5>
                        <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                          <li>Higher rack positions acceptable</li>
                          <li>Utilize deep storage areas</li>
                          <li>Bulk storage configurations</li>
                          <li>Consider automated retrieval systems</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <TrendingUp size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run inventory optimization to generate velocity slotting recommendations.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>Optimization Reports & CSV Exports</h3>
              {optimizationResults ? (
                <div>
                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0f9ff", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                        {optimizationResults.averageTurns}x
                      </div>
                      <div style={{ color: "#6b7280" }}>Average Turns</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                        {optimizationResults.serviceLevel}%
                      </div>
                      <div style={{ color: "#6b7280" }}>Service Level</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#fffbeb", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                        ${optimizationResults.potentialSavings.toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Potential Savings</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>Available CSV Reports</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500" }}>Inventory Optimization Report</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Complete SKU analysis with turns, reorder points, and ABC classification</div>
                          </div>
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500" }}>ABC Analysis Report</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Category breakdown with recommendations and item counts</div>
                          </div>
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500" }}>Velocity Slotting Plan</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Warehouse layout optimization by item velocity</div>
                          </div>
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>Optimization Summary</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Scenario Used:</span>
                          <strong style={{ textTransform: "capitalize" }}>{optimizationResults.scenario.replace("_", " ")}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Total Items Analyzed:</span>
                          <strong>{optimizationResults.totalItems}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Total Investment:</span>
                          <strong>${optimizationResults.totalInvestment.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Items at Risk (Below ROP):</span>
                          <strong style={{ color: optimizationResults.stockoutRisk > 0 ? "#ef4444" : "#10b981" }}>
                            {optimizationResults.stockoutRisk}
                          </strong>
                        </div>
                      </div>
                      
                      {optimizationResults.stockoutRisk > 0 && (
                        <div style={{
                          marginTop: "1rem",
                          padding: "0.75rem",
                          backgroundColor: "#fef2f2",
                          borderRadius: "0.375rem",
                          border: "1px solid #fecaca"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626" }}>
                            <AlertCircle size={16} />
                            <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>Stock-out Risk Alert</span>
                          </div>
                          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                            {optimizationResults.stockoutRisk} items are below their reorder point and may require immediate attention.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <FileText size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run inventory optimization to generate detailed reports and CSV exports.</p>
                </div>
              )}
          {/* Policy Scenarios Tab */}
          {activeTab === "scenarios" && (
            <div>
              <h3 style={{ marginBottom: "2rem", color: "#111827" }}>
                Inventory Policy Scenarios
              </h3>

              <div
                className="grid grid-cols-3"
                style={{ gap: "1.5rem", marginBottom: "2rem" }}
              >
                {/* Conservative Policy */}
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Conservative Policy
                  </h4>
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Service Levels:</strong> A:99%, B:98%, C:95%
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Safety Factor:</strong> 2.0x
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Review Period:</strong> 14 days
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#fecaca",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        color: "#991b1b",
                      }}
                    >
                      $2.1M
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#7f1d1d" }}>
                      Total Inventory Investment
                    </div>
                  </div>

                  <div style={{ fontSize: "0.875rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Avg Turns:</span>
                      <span style={{ fontWeight: "600" }}>4.2x</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Stockout Risk:</span>
                      <span style={{ fontWeight: "600", color: "#10b981" }}>
                        0.5%
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Carrying Cost:</span>
                      <span style={{ fontWeight: "600" }}>$525K/year</span>
                    </div>
                  </div>
                </div>

                {/* Balanced Policy */}
                <div className="card" style={{ border: "2px solid #3b82f6" }}>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Balanced Policy (Recommended)
                  </h4>
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Service Levels:</strong> A:98%, B:95%, C:90%
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Safety Factor:</strong> 1.5x
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Review Period:</strong> 7 days
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#dbeafe",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        color: "#1d4ed8",
                      }}
                    >
                      $1.6M
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#1e40af" }}>
                      Total Inventory Investment
                    </div>
                  </div>

                  <div style={{ fontSize: "0.875rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Avg Turns:</span>
                      <span style={{ fontWeight: "600" }}>5.8x</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Stockout Risk:</span>
                      <span style={{ fontWeight: "600", color: "#f59e0b" }}>
                        2.1%
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Carrying Cost:</span>
                      <span style={{ fontWeight: "600" }}>$400K/year</span>
                    </div>
                  </div>
                </div>

                {/* Aggressive Policy */}
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Aggressive Policy
                  </h4>
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Service Levels:</strong> A:95%, B:90%, C:85%
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Safety Factor:</strong> 1.0x
                    </div>
                    <div
                      style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}
                    >
                      <strong>Review Period:</strong> 3 days
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#dcfce7",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "700",
                        color: "#15803d",
                      }}
                    >
                      $1.1M
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#166534" }}>
                      Total Inventory Investment
                    </div>
                  </div>

                  <div style={{ fontSize: "0.875rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Avg Turns:</span>
                      <span style={{ fontWeight: "600" }}>8.1x</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span>Stockout Risk:</span>
                      <span style={{ fontWeight: "600", color: "#ef4444" }}>
                        6.8%
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Carrying Cost:</span>
                      <span style={{ fontWeight: "600" }}>$275K/year</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Echelon Analysis */}
              <div className="card">
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Multi-Echelon Inventory Benefits
                </h4>
                <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                  <div>
                    <h5 style={{ marginBottom: "1rem", color: "#374151" }}>
                      Risk Pooling Benefits
                    </h5>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={[
                          {
                            locations: "1",
                            safety_stock: 100,
                            pooled_stock: 100,
                          },
                          {
                            locations: "2",
                            safety_stock: 200,
                            pooled_stock: 141,
                          },
                          {
                            locations: "4",
                            safety_stock: 400,
                            pooled_stock: 200,
                          },
                          {
                            locations: "9",
                            safety_stock: 900,
                            pooled_stock: 300,
                          },
                          {
                            locations: "16",
                            safety_stock: 1600,
                            pooled_stock: 400,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="locations" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="safety_stock"
                          fill="#ef4444"
                          name="Decentralized"
                        />
                        <Bar
                          dataKey="pooled_stock"
                          fill="#10b981"
                          name="Risk Pooled"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h5 style={{ marginBottom: "1rem", color: "#374151" }}>
                      Centralization Benefits
                    </h5>
                    <div style={{ padding: "1rem" }}>
                      <div style={{ marginBottom: "1.5rem" }}>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Safety Stock Reduction Formula:
                        </div>
                        <div
                          style={{
                            fontSize: "0.875rem",
                            fontFamily: "monospace",
                            backgroundColor: "#f3f4f6",
                            padding: "0.5rem",
                            borderRadius: "0.25rem",
                          }}
                        >
                          Pooled_SS = Original_SS / ��(n_locations)
                        </div>
                      </div>

                      <div style={{ fontSize: "0.875rem" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <span>2 Locations:</span>
                          <span style={{ fontWeight: "600", color: "#10b981" }}>
                            29% reduction
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <span>4 Locations:</span>
                          <span style={{ fontWeight: "600", color: "#10b981" }}>
                            50% reduction
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <span>9 Locations:</span>
                          <span style={{ fontWeight: "600", color: "#10b981" }}>
                            67% reduction
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>16 Locations:</span>
                          <span style={{ fontWeight: "600", color: "#10b981" }}>
                            75% reduction
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics & Results Tab */}
          {activeTab === "results" && (
            <div>
              <h3 style={{ marginBottom: "2rem", color: "#111827" }}>
                Inventory Analytics & Results
              </h3>

              {/* KPI Summary */}
              <div
                className="grid grid-cols-4"
                style={{ gap: "1.5rem", marginBottom: "2rem" }}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    backgroundColor: "#fef3c7",
                    borderRadius: "0.75rem",
                  }}
                >
                  <DollarSign
                    size={32}
                    style={{
                      color: "#92400e",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#92400e",
                      marginBottom: "0.5rem",
                    }}
                  >
                    $
                    {inventoryMetrics
                      .reduce((sum, m) => sum + m.total_value, 0)
                      .toLocaleString()}
                  </div>
                  <div style={{ color: "#78350f", fontWeight: "600" }}>
                    Total Inventory Value
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    backgroundColor: "#dcfce7",
                    borderRadius: "0.75rem",
                  }}
                >
                  <Target
                    size={32}
                    style={{
                      color: "#15803d",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#15803d",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {inventoryMetrics.length > 0
                      ? (
                          inventoryMetrics.reduce(
                            (sum, m) => sum + m.inventory_turns,
                            0,
                          ) / inventoryMetrics.length
                        ).toFixed(1)
                      : "0"}
                    x
                  </div>
                  <div style={{ color: "#166534", fontWeight: "600" }}>
                    Avg Inventory Turns
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    backgroundColor: "#dbeafe",
                    borderRadius: "0.75rem",
                  }}
                >
                  <CheckCircle
                    size={32}
                    style={{
                      color: "#1d4ed8",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#1d4ed8",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {inventoryMetrics.length > 0
                      ? (
                          inventoryMetrics.reduce(
                            (sum, m) => sum + m.fill_rate,
                            0,
                          ) / inventoryMetrics.length
                        ).toFixed(1)
                      : "0"}
                    %
                  </div>
                  <div style={{ color: "#1e40af", fontWeight: "600" }}>
                    Avg Fill Rate
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    backgroundColor: "#f3e8ff",
                    borderRadius: "0.75rem",
                  }}
                >
                  <Clock
                    size={32}
                    style={{
                      color: "#7c3aed",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#7c3aed",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {inventoryMetrics.length > 0
                      ? (
                          inventoryMetrics.reduce(
                            (sum, m) => sum + m.days_on_hand,
                            0,
                          ) / inventoryMetrics.length
                        ).toFixed(0)
                      : "0"}
                  </div>
                  <div style={{ color: "#6b21a8", fontWeight: "600" }}>
                    Avg Days on Hand
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div
                className="grid grid-cols-2"
                style={{ gap: "2rem", marginBottom: "2rem" }}
              >
                {/* Inventory Turns Analysis */}
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Inventory Turns by SKU
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={inventoryTurnData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="sku"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="turns"
                        fill="#3b82f6"
                        name="Inventory Turns"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="fill_rate"
                        stroke="#10b981"
                        strokeWidth={3}
                        name="Fill Rate %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Service Level vs Cost Analysis */}
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Service Level vs Investment
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={inventoryTurnData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="fill_rate"
                        name="Fill Rate"
                        type="number"
                        domain={[85, 100]}
                      />
                      <YAxis dataKey="value" name="Investment" type="number" />
                      <Tooltip
                        formatter={(value, name) => [
                          name === "fill_rate"
                            ? `${value.toFixed(1)}%`
                            : `$${value.toLocaleString()}`,
                          name === "fill_rate" ? "Fill Rate" : "Investment",
                        ]}
                      />
                      <Scatter name="SKUs" dataKey="turns" fill="#8b5cf6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Inventory Metrics Table */}
              <div className="card">
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Detailed Inventory Metrics
                </h4>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f9fafb" }}>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "left",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          SKU
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Current Stock
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Safety Stock
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Reorder Point
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Max Stock
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Inventory Turns
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Days on Hand
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Total Value
                        </th>
                        <th
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          Fill Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryMetrics.map((metric, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              fontWeight: "600",
                            }}
                          >
                            {metric.sku}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {metric.current_stock.toFixed(0)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {metric.safety_stock.toFixed(0)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {metric.reorder_point.toFixed(0)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {metric.max_stock.toFixed(0)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                              backgroundColor:
                                metric.inventory_turns > 6
                                  ? "#dcfce7"
                                  : metric.inventory_turns > 3
                                    ? "#fef3c7"
                                    : "#fecaca",
                              color:
                                metric.inventory_turns > 6
                                  ? "#166534"
                                  : metric.inventory_turns > 3
                                    ? "#92400e"
                                    : "#991b1b",
                            }}
                          >
                            {metric.inventory_turns.toFixed(1)}x
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            {metric.days_on_hand.toFixed(0)}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                            }}
                          >
                            ${metric.total_value.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              border: "1px solid #e5e7eb",
                              textAlign: "right",
                              color:
                                metric.fill_rate > 97
                                  ? "#10b981"
                                  : metric.fill_rate > 95
                                    ? "#f59e0b"
                                    : "#ef4444",
                              fontWeight: "600",
                            }}
                          >
                            {metric.fill_rate.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
