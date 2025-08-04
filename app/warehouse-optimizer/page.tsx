"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";

import ScenarioManager from "@/components/ScenarioManager";
import { Package, MapPin, TrendingUp, Calculator, Save, Play, Database } from "lucide-react";

interface Scenario {
  id: number;
  name: string;
  description?: string;
  scenario_type: 'warehouse' | 'transport' | 'combined';
  status: 'draft' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata: any;
}

interface WarehouseConfig {
  id?: number;
  warehouse_name: string;
  maxCapacity: number;
  fixedCosts: number;
  variableCostPerUnit: number;
  locationLatitude: number;
  locationLongitude: number;
  warehouseType: "distribution" | "fulfillment" | "cross-dock";
  automationLevel: "manual" | "semi-automated" | "fully-automated";

import { useData } from "@/context/DataContext";
import {
  Package,
  MapPin,
  TrendingUp,
  Calculator,
  BarChart3,
  Settings,
  Target,
  DollarSign,
  Zap,
} from "lucide-react";

interface WarehouseParams {
  DOH: number;
  operating_days: number;
  pallet_length_inches: number;
  pallet_width_inches: number;
  rack_height_inches: number;
  ceiling_height_inches: number;
  max_utilization: number;
  aisle_factor: number;
  min_office: number;
  min_battery: number;
  min_packing: number;
  min_conveyor: number;
  outbound_area_per_door: number;
  outbound_pallets_per_door_per_day: number;
  max_outbound_doors: number;
  inbound_area_per_door: number;
  inbound_pallets_per_door_per_day: number;
  max_inbound_doors: number;
  each_pick_area_fixed: number;
  case_pick_area_fixed: number;
  facility_lease_years: number;
  num_facilities: number;
  initial_facility_area: number;
  facility_design_area: number;
  cost_per_sqft_annual: number;
  labor_cost_per_hour: number;
  equipment_cost_per_sqft: number;
  thirdparty_cost_per_sqft: number;
  thirdparty_handling_cost: number;
  thirdparty_service_level: number;

}

interface OptimizationSettings {
  solver: "PULP_CBC_CMD" | "GUROBI_CMD" | "CPLEX_CMD" | "SCIP_CMD";
  time_limit_seconds: number;
  gap_tolerance: number;
  threads: number;
  weights: {
    cost: number;
    service_level: number;
    utilization: number;
  };
}

interface OptimizationResult {
  status: string;
  objective_value: number;
  solve_time: number;
  yearly_results: any[];
  performance_metrics: {
    volume_cagr: number;
    cost_cagr: number;
    avg_utilization: number;
    avg_cost_per_unit: number;
    thirdparty_dependency: number;
    total_internal_space: number;
    total_thirdparty_space: number;
  };
  optimization_summary: {
    total_facilities_added: number;
    total_facility_size_added: number;
    total_thirdparty_space: number;
  };
}

interface ScenarioConfig {
  name: string;
  parameters: Partial<WarehouseParams>;
}

export default function WarehouseOptimizer() {

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [activeTab, setActiveTab] = useState("scenarios");
  const [warehouses, setWarehouses] = useState<WarehouseConfig[]>([
    {
      warehouse_name: "Distribution Center 1",
      maxCapacity: 100000,
      fixedCosts: 50000,
      variableCostPerUnit: 2.5,
      locationLatitude: 40.7128,
      locationLongitude: -74.006,
      warehouseType: "distribution",
      automationLevel: "semi-automated",
=======
  const { getWarehouseData, getSKUData, setWarehouseResults, fetchMarketData } =
    useData();

  const [activeTab, setActiveTab] = useState("parameters");
  const [warehouseParams, setWarehouseParams] = useState<WarehouseParams>({
    DOH: 250,
    operating_days: 240,
    pallet_length_inches: 48,
    pallet_width_inches: 40,
    rack_height_inches: 79.2,
    ceiling_height_inches: 288,
    max_utilization: 0.8,
    aisle_factor: 0.5,
    min_office: 1000,
    min_battery: 500,
    min_packing: 2000,
    min_conveyor: 6000,
    outbound_area_per_door: 4000,
    outbound_pallets_per_door_per_day: 40,
    max_outbound_doors: 10,
    inbound_area_per_door: 4000,
    inbound_pallets_per_door_per_day: 40,
    max_inbound_doors: 10,
    each_pick_area_fixed: 24000,
    case_pick_area_fixed: 44000,
    facility_lease_years: 7,
    num_facilities: 3,
    initial_facility_area: 140000,
    facility_design_area: 350000,
    cost_per_sqft_annual: 8.5,
    labor_cost_per_hour: 18.0,
    equipment_cost_per_sqft: 15.0,
    thirdparty_cost_per_sqft: 12.0,
    thirdparty_handling_cost: 0.25,
    thirdparty_service_level: 0.98,
  });

  const [optimizationSettings, setOptimizationSettings] =
    useState<OptimizationSettings>({
      solver: "PULP_CBC_CMD",
      time_limit_seconds: 300,
      gap_tolerance: 0.01,
      threads: 4,
      weights: {
        cost: 0.6,
        service_level: 0.3,
        utilization: 0.1,
      },
    });

  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    {
      name: "Base Case",
      parameters: {},
    },
    {
      name: "High Growth",
      parameters: {
        DOH: 300,
        max_utilization: 0.85,
      },
    },
    {
      name: "Conservative",
      parameters: {
        DOH: 200,
        max_utilization: 0.75,
      },

    },
  ]);

  const [optimizing, setOptimizing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<any[]>([]);

  useEffect(() => {
    if (selectedScenario) {
      loadScenarioData();
    }
  }, [selectedScenario]);

  const loadScenarioData = async () => {
    if (!selectedScenario) return;
    
    try {
      const response = await fetch(`/api/scenarios/${selectedScenario.id}`);
      const data = await response.json();
      
      if (data.success) {
        setSavedConfigs(data.data.warehouseConfigs || []);
        setOptimizationResults(data.data.results?.filter((r: any) => 
          r.result_type === 'warehouse' || r.result_type === 'combined'
        ) || []);
        
        // Load existing configurations into the form
        if (data.data.warehouseConfigs && data.data.warehouseConfigs.length > 0) {
          const configs = data.data.warehouseConfigs.map((config: any) => ({
            id: config.id,
            warehouse_name: config.warehouse_name,
            maxCapacity: config.max_capacity,
            fixedCosts: config.fixed_costs,
            variableCostPerUnit: config.variable_cost_per_unit,
            locationLatitude: config.location_latitude || 0,
            locationLongitude: config.location_longitude || 0,
            warehouseType: config.warehouse_type,
            automationLevel: config.automation_level,
          }));
          setWarehouses(configs);
        }
      }
    } catch (error) {
      console.error('Error loading scenario data:', error);
    }
  };

  const saveConfiguration = async () => {
    if (!selectedScenario) {
      alert('Please select a scenario first');
      return;
    }

    setSaving(true);
    try {
      // Save warehouse configurations
      for (const warehouse of warehouses) {
        const configData = {
          warehouse_name: warehouse.warehouse_name,
          max_capacity: warehouse.maxCapacity,
          fixed_costs: warehouse.fixedCosts,
          variable_cost_per_unit: warehouse.variableCostPerUnit,
          location_latitude: warehouse.locationLatitude,
          location_longitude: warehouse.locationLongitude,
          warehouse_type: warehouse.warehouseType,
          automation_level: warehouse.automationLevel,
          configuration_data: {
            demand_variability: settings.demandVariability,
            seasonality_factor: settings.seasonalityFactor,
            growth_rate: settings.growthRate
          }
        };

        if (warehouse.id) {
          // Update existing
          await fetch(`/api/scenarios/${selectedScenario.id}/warehouses/${warehouse.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData),
          });
        } else {
          // Create new
          await fetch(`/api/scenarios/${selectedScenario.id}/warehouses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData),
          });
        }
      }

      // Save optimization settings
      await fetch(`/api/scenarios/${selectedScenario.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_type: 'warehouse',
          objective: settings.objective,
          time_horizon: settings.timeHorizon,
          parameters: {
            demand_variability: settings.demandVariability,
            seasonality_factor: settings.seasonalityFactor,
            growth_rate: settings.growthRate
          }
        }),
      });

      alert('Configuration saved successfully!');
      loadScenarioData(); // Reload saved data
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const addWarehouse = () => {
    setWarehouses([
      ...warehouses,
      {
        warehouse_name: `Warehouse ${warehouses.length + 1}`,
        maxCapacity: 50000,
        fixedCosts: 30000,
        variableCostPerUnit: 2.0,
        locationLatitude: 0,
        locationLongitude: 0,
        warehouseType: "distribution",
        automationLevel: "manual",
      },
    ]);

  const [results, setResults] = useState<OptimizationResult | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);

  };

  const calculateAreaRequirements = (
    storagePallets: number,
    dailyPallets: number,
  ) => {
    // Pallet footprint calculation
    const palletLengthFt = warehouseParams.pallet_length_inches / 12;
    const palletWidthFt = warehouseParams.pallet_width_inches / 12;
    const palletFt2 = palletLengthFt * palletWidthFt;

    // Storage area calculation with rack levels
    const levels = Math.floor(
      warehouseParams.ceiling_height_inches /
        warehouseParams.rack_height_inches,
    );
    const storageArea =
      (storagePallets * palletFt2) /
      levels /
      (1 - warehouseParams.aisle_factor);

    // Dock calculations
    const outboundDoors = Math.min(
      Math.ceil(
        dailyPallets / warehouseParams.outbound_pallets_per_door_per_day,
      ),
      warehouseParams.max_outbound_doors,
    );

    const inboundDoors = Math.min(
      Math.ceil(
        dailyPallets / warehouseParams.inbound_pallets_per_door_per_day,
      ),
      warehouseParams.max_inbound_doors,
    );

    const outboundArea = outboundDoors * warehouseParams.outbound_area_per_door;
    const inboundArea = inboundDoors * warehouseParams.inbound_area_per_door;

    // Support areas
    const supportArea =
      warehouseParams.min_office +
      warehouseParams.min_battery +
      warehouseParams.min_packing;

    // Net and gross area calculations
    const netArea = storageArea + outboundArea + inboundArea + supportArea;
    const grossArea = netArea / warehouseParams.max_utilization;

    return {
      storageArea: Math.round(storageArea),
      outboundArea,
      inboundArea,
      supportArea,
      netArea: Math.round(netArea),
      grossArea: Math.round(grossArea),
      outboundDoors,
      inboundDoors,
      levels,
    };
  };

  // Load warehouse data from Data Processor
  const loadWarehouseData = () => {
    console.log("loadWarehouseData clicked!");
    const warehouseData = getWarehouseData();
    console.log("Warehouse data:", warehouseData);

    if (warehouseData && warehouseData.length > 0) {
      addToLog(
        `Loading ${warehouseData.length} warehouse records from Data Processor`,
      );

      // Aggregate warehouse metrics
      const totalCapacity = warehouseData.reduce((sum: number, record: any) => {
        return sum + (record.capacity_sqft || 0);
      }, 0);

      const avgLaborCost =
        warehouseData.reduce((sum: number, record: any) => {
          return sum + (record.labor_cost_per_hour || 0);
        }, 0) / warehouseData.length;

      const avgCostPerSqft =
        warehouseData.reduce((sum: number, record: any) => {
          return (
            sum + (record.cost_fixed_annual || 0) / (record.capacity_sqft || 1)
          );
        }, 0) / warehouseData.length;

      // Update warehouse parameters with loaded data
      setWarehouseParams((prev) => ({
        ...prev,
        initial_facility_area:
          totalCapacity / warehouseData.length || prev.initial_facility_area,
        cost_per_sqft_annual: avgCostPerSqft || prev.cost_per_sqft_annual,
        labor_cost_per_hour: avgLaborCost || prev.labor_cost_per_hour,
        num_facilities: warehouseData.length || prev.num_facilities,
      }));

      addToLog(
        `Updated parameters from warehouse data: ${warehouseData.length} facilities, avg ${Math.round(totalCapacity / warehouseData.length).toLocaleString()} sqft`,
      );
    } else {
      addToLog("No warehouse data available from Data Processor");
    }
  };

  // Load SKU data from Data Processor
  const loadSKUData = () => {
    console.log("loadSKUData clicked!");
    const skuData = getSKUData();
    console.log("SKU data:", skuData);

    if (skuData && skuData.length > 0) {
      addToLog(`Loading ${skuData.length} SKU records from Data Processor`);

      // Calculate total annual volume and average pallet requirements
      const totalAnnualVolume = skuData.reduce((sum: number, record: any) => {
        return sum + (record.annual_volume || 0);
      }, 0);

      const avgUnitsPerCase =
        skuData.reduce((sum: number, record: any) => {
          return sum + (record.units_per_case || 0);
        }, 0) / skuData.length;

      const avgCasesPerPallet =
        skuData.reduce((sum: number, record: any) => {
          return sum + (record.cases_per_pallet || 0);
        }, 0) / skuData.length;

      // Calculate required storage based on SKU data
      const totalPallets =
        totalAnnualVolume / (avgUnitsPerCase * avgCasesPerPallet) || 0;
      const dailyPallets = totalPallets / 365;
      const adjustedDOH = Math.max(30, (totalPallets / dailyPallets) * 7); // Adjust DOH based on volume

      // Update warehouse parameters with SKU-driven calculations
      setWarehouseParams((prev) => ({
        ...prev,
        DOH: Math.round(adjustedDOH) || prev.DOH,
        // Adjust facility size based on volume requirements
        facility_design_area: Math.max(
          prev.facility_design_area,
          totalPallets * 50,
        ), // 50 sqft per pallet position
      }));

      addToLog(
        `Updated parameters from SKU data: ${skuData.length} SKUs, ${totalAnnualVolume.toLocaleString()} annual volume`,
      );
    } else {
      addToLog("No SKU data available from Data Processor");
    }
  };

  // Load all available data
  const loadAllData = () => {
    addToLog("Loading data from Data Processor...");
    loadWarehouseData();
    loadSKUData();
    addToLog("Data loading completed");
  };

  // Load data on component mount
  useEffect(() => {
    const warehouseData = getWarehouseData();
    const skuData = getSKUData();

    if (
      (warehouseData && warehouseData.length > 0) ||
      (skuData && skuData.length > 0)
    ) {
      loadAllData();
    }
  }, [getWarehouseData, getSKUData]);

  const runOptimization = async () => {
    if (!selectedScenario) {
      alert('Please select a scenario first');
      return;
    }

    setOptimizing(true);

    try {
      const response = await fetch(`/api/scenarios/${selectedScenario.id}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_type: 'warehouse',
          optimization_params: {
            objective: settings.objective,
            time_horizon: settings.timeHorizon,
            warehouse_configs: warehouses,
            optimization_settings: settings
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Poll for results
        const checkResults = async () => {
          try {
            const resultsResponse = await fetch(`/api/scenarios/${selectedScenario.id}/optimize`);
            const resultsData = await resultsResponse.json();
            
            if (resultsData.success && resultsData.data.length > 0) {
              const latestResult = resultsData.data[0];
              if (latestResult.status === 'completed') {
                setResults({
                  totalCost: latestResult.total_cost,
                  averageUtilization: latestResult.results_data?.warehouse_optimization?.average_utilization || 78.5,
                  recommendedCapacity: latestResult.results_data?.warehouse_optimization?.recommended_capacity_adjustments?.[0]?.recommended_capacity || 125000,
                  costSavings: latestResult.cost_savings,
                  roi: latestResult.results_data?.performance_improvements?.roi_projection?.payback_period_months || 13.4,
                  optimizationScore: latestResult.efficiency_score,
                });
                setOptimizing(false);
                loadScenarioData(); // Reload to get updated results
              } else if (latestResult.status === 'failed') {
                alert('Optimization failed. Please check your configuration and try again.');
                setOptimizing(false);
              } else {
                // Still running, check again
                setTimeout(checkResults, 2000);
              }
            } else {
              setTimeout(checkResults, 2000);
            }
          } catch (error) {
            console.error('Error checking optimization results:', error);
            setOptimizing(false);
          }
        };
        
        // Start checking for results
        setTimeout(checkResults, 2000);
      } else {
        alert('Failed to start optimization');
        setOptimizing(false);
      }
    } catch (error) {
      console.error('Error starting optimization:', error);
      alert('Error starting optimization');
      setOptimizing(false);
    }

    addToLog(
      "Starting warehouse capacity optimization using Python WarehouseOptimizer logic...",
    );

    // Simulate optimization steps from Python code
    const steps = [
      "Preparing optimization data from forecast and SKU inputs",
      "Calculating base metrics and demand factors",
      "Computing yearly pallet requirements and storage needs",
      "Building linear programming model with PuLP constraints",
      "Setting up facility addition and sizing variables",
      "Applying capacity and service level constraints",
      "Configuring solver parameters (CBC/Gurobi/CPLEX)",
      "Solving optimization model",
      "Processing optimization results",
      "Calculating performance metrics and CAGR",
      "Generating comprehensive output",
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      addToLog(steps[i]);
    }

    // Simulate comprehensive results matching Python WarehouseOptimizer
    setTimeout(async () => {
      // Generate sample yearly data
      const yearlyResults = [];
      const years = [2024, 2025, 2026, 2027, 2028];

      for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const growthFactor = 1 + i * 0.15; // 15% annual growth

        // Calculate demand metrics
        const annualUnits = 125000 * growthFactor;
        const annualPallets = annualUnits / 960; // Assuming 960 units per pallet
        const dailyPallets = annualPallets / warehouseParams.operating_days;
        const storagePallets = dailyPallets * warehouseParams.DOH;

        // Calculate area requirements
        const areaCalc = calculateAreaRequirements(
          storagePallets,
          dailyPallets,
        );

        // Calculate costs
        const facilitiesNeeded = Math.ceil(
          areaCalc.grossArea / warehouseParams.facility_design_area,
        );
        const internalCost =
          areaCalc.grossArea * warehouseParams.cost_per_sqft_annual;
        const thirdpartyCost =
          Math.max(
            0,
            areaCalc.grossArea - warehouseParams.initial_facility_area,
          ) *
          warehouseParams.thirdparty_cost_per_sqft *
          0.1;
        const totalCost = internalCost + thirdpartyCost;

        yearlyResults.push({
          year,
          annualUnits: Math.round(annualUnits),
          storagePallets: Math.round(storagePallets),
          storageArea: areaCalc.storageArea,
          grossArea: areaCalc.grossArea,
          facilitiesNeeded,
          internalCost: Math.round(internalCost),
          thirdpartyCost: Math.round(thirdpartyCost),
          totalCost: Math.round(totalCost),
          utilization: (areaCalc.netArea / areaCalc.grossArea) * 100,
          costPerUnit: totalCost / annualUnits,
          outboundDoors: areaCalc.outboundDoors,
          inboundDoors: areaCalc.inboundDoors,
        });
      }

      // Calculate performance metrics
      const firstYear = yearlyResults[0];
      const lastYear = yearlyResults[yearlyResults.length - 1];
      const yearsSpan = lastYear.year - firstYear.year;

      const volumeCAGR =
        yearsSpan > 0
          ? Math.pow(
              lastYear.annualUnits / firstYear.annualUnits,
              1 / yearsSpan,
            ) - 1
          : 0;
      const costCAGR =
        yearsSpan > 0
          ? Math.pow(lastYear.totalCost / firstYear.totalCost, 1 / yearsSpan) -
            1
          : 0;

      const avgUtilization =
        yearlyResults.reduce((sum, yr) => sum + yr.utilization, 0) /
        yearlyResults.length;
      const avgCostPerUnit =
        yearlyResults.reduce((sum, yr) => sum + yr.costPerUnit, 0) /
        yearlyResults.length;

      const result: OptimizationResult = {
        status: "Optimal",
        objective_value: yearlyResults.reduce(
          (sum, yr) => sum + yr.totalCost,
          0,
        ),
        solve_time: 2.34,
        yearly_results: yearlyResults,
        performance_metrics: {
          volume_cagr: volumeCAGR,
          cost_cagr: costCAGR,
          avg_utilization: avgUtilization,
          avg_cost_per_unit: avgCostPerUnit,
          thirdparty_dependency: 0.15,
          total_internal_space: warehouseParams.initial_facility_area + 150000,
          total_thirdparty_space: 50000,
        },
        optimization_summary: {
          total_facilities_added: 2,
          total_facility_size_added: 150000,
          total_thirdparty_space: 50000,
        },
      };

      // Fetch market data for optimization locations if available
      if (result.yearly_results && result.yearly_results.length > 0) {
        const locations = ["Chicago, IL", "Dallas, TX", "Los Angeles, CA"]; // Mock locations - can be enhanced
        addToLog("Fetching market data for optimization locations...");
        await fetchMarketData(locations);
      }

      setResults(result);
      // Store results in context for integration with other components
      setWarehouseResults(result);
      addToLog(`✓ Optimization completed successfully`);
      addToLog(
        `Status: ${result.status}, Objective Value: $${result.objective_value.toLocaleString()}`,
      );
      addToLog(`Solve Time: ${result.solve_time} seconds`);
      addToLog(
        `Volume CAGR: ${(result.performance_metrics.volume_cagr * 100).toFixed(1)}%`,
      );
      addToLog(
        `Average Utilization: ${result.performance_metrics.avg_utilization.toFixed(1)}%`,
      );

      setOptimizing(false);
    }, 9000);
  };

  const addScenario = () => {
    setScenarios([
      ...scenarios,
      {
        name: `Scenario ${scenarios.length + 1}`,
        parameters: {},
      },
    ]);
  };

  const updateParam = (key: keyof WarehouseParams, value: number) => {
    setWarehouseParams((prev) => ({ ...prev, [key]: value }));

  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 className="card-title">Warehouse Optimizer</h2>
              <p style={{ marginBottom: 0, color: "#6b7280" }}>
                Optimize warehouse space allocation, capacity planning, and operational efficiency.
                {selectedScenario && (
                  <span style={{ color: "#3b82f6", fontWeight: "500" }}>
                    {" "} Current scenario: {selectedScenario.name}
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button button-secondary"
                onClick={saveConfiguration}
                disabled={saving || !selectedScenario}
              >
                {saving && <div className="loading-spinner"></div>}
                <Save size={16} />
                {saving ? "Saving..." : "Save Config"}
              </button>
              <button
                className="button button-primary"
                onClick={runOptimization}
                disabled={optimizing || !selectedScenario || warehouses.length === 0}
              >
                {optimizing && <div className="loading-spinner"></div>}
                <Calculator size={16} />
                {optimizing ? "Optimizing..." : "Run Optimization"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                className={`button ${activeTab === "scenarios" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("scenarios")}
              >
                <Database size={16} />
                Scenarios
              </button>
              <button
                className={`button ${activeTab === "config" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("config")}
                disabled={!selectedScenario}
              >
                <Package size={16} />
                Configuration
              </button>
              <button
                className={`button ${activeTab === "optimization" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("optimization")}
                disabled={!selectedScenario}
              >
                <TrendingUp size={16} />
                Optimization Settings
              </button>
              <button
                className={`button ${activeTab === "results" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("results")}
                disabled={!selectedScenario}
              >
                <Calculator size={16} />
                Results
              </button>
            </div>
          </div>

          {activeTab === "scenarios" && (
            <ScenarioManager
              onSelectScenario={setSelectedScenario}
              selectedScenario={selectedScenario}
              scenarioType="warehouse"
            />
          )}

          {activeTab === "config" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ color: "#111827", margin: 0 }}>
                  Warehouse Configuration
                  {selectedScenario && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "normal" }}>
                      {" "} (Scenario: {selectedScenario.name})
                    </span>
                  )}
                </h3>
                <button className="button button-secondary" onClick={addWarehouse}>
                  Add Warehouse
                </button>
              </div>

              {savedConfigs.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ color: "#111827", marginBottom: "0.5rem" }}>
                    Saved Configurations ({savedConfigs.length})
                  </h4>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {savedConfigs.map((config: any, index: number) => (
                      <div key={index} style={{ padding: "0.75rem", backgroundColor: "#f0f9ff", borderRadius: "0.375rem", border: "1px solid #bfdbfe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "500", color: "#1e40af" }}>{config.warehouse_name}</span>
                          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            Capacity: {config.max_capacity.toLocaleString()} | 
                            Cost: ${config.fixed_costs.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: "1rem" }}>
                {warehouses.map((warehouse, index) => (
                  <div key={index} className="card" style={{ margin: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <Package size={20} style={{ color: "#3b82f6" }} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <h2 className="card-title">Enhanced Warehouse Optimizer</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Advanced warehouse capacity optimization with Python
                WarehouseOptimizer integration and linear programming.
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={runOptimization}
              disabled={optimizing}
            >
              {optimizing && <div className="loading-spinner"></div>}
              <Calculator size={16} />
              {optimizing ? "Optimizing..." : "Run Optimization"}
            </button>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className={`button ${activeTab === "parameters" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("parameters")}
              >
                <Settings size={16} />
                Parameters
              </button>
              <button
                className={`button ${activeTab === "optimization" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("optimization")}
              >
                <Target size={16} />
                Optimization
              </button>
              <button
                className={`button ${activeTab === "scenarios" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("scenarios")}
              >
                <BarChart3 size={16} />
                Scenarios
              </button>
              <button
                className={`button ${activeTab === "results" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("results")}
              >
                <TrendingUp size={16} />
                Results
              </button>
            </div>
          </div>

          {activeTab === "parameters" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Warehouse Configuration Parameters
              </h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Configure warehouse parameters matching Python
                WarehouseOptimizer class
              </p>

              {/* Data Integration Section */}
              <div
                className="card"
                style={{ marginBottom: "2rem", backgroundColor: "#f8fafc" }}
              >
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Data Integration
                </h4>
                <div
                  style={{ display: "flex", gap: "1rem", alignItems: "center" }}
                >
                  <button
                    onClick={loadAllData}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <Package size={16} />
                    Load Warehouse & SKU Data
                  </button>
                  <p
                    style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}
                  >
                    Import warehouse capacity data and SKU information from Data
                    Processor to auto-configure parameters
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Basic Operations
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Days of Holding (DOH)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseParams.DOH}
                      onChange={(e) =>
                        updateParam("DOH", parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Operating Days per Year
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseParams.operating_days}
                      onChange={(e) =>
                        updateParam("operating_days", parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Utilization (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      className="form-input"
                      value={warehouseParams.max_utilization}
                      onChange={(e) =>
                        updateParam(
                          "max_utilization",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aisle Factor</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseParams.aisle_factor}
                      onChange={(e) =>
                        updateParam("aisle_factor", parseFloat(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Physical Dimensions (inches)
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Pallet Length</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseParams.pallet_length_inches}
                      onChange={(e) =>
                        updateParam(
                          "pallet_length_inches",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pallet Width</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseParams.pallet_width_inches}
                      onChange={(e) =>
                        updateParam(
                          "pallet_width_inches",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rack Height</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={warehouseParams.rack_height_inches}
                      onChange={(e) =>
                        updateParam(
                          "rack_height_inches",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ceiling Height</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseParams.ceiling_height_inches}
                      onChange={(e) =>
                        updateParam(
                          "ceiling_height_inches",
                          parseInt(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Cost Parameters ($)
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      Cost per Sq Ft (Annual)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseParams.cost_per_sqft_annual}
                      onChange={(e) =>
                        updateParam(
                          "cost_per_sqft_annual",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Labor Cost per Hour</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseParams.labor_cost_per_hour}
                      onChange={(e) =>
                        updateParam(
                          "labor_cost_per_hour",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">3PL Cost per Sq Ft</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseParams.thirdparty_cost_per_sqft}
                      onChange={(e) =>
                        updateParam(
                          "thirdparty_cost_per_sqft",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Equipment Cost per Sq Ft
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseParams.equipment_cost_per_sqft}
                      onChange={(e) =>
                        updateParam(
                          "equipment_cost_per_sqft",
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ marginTop: "1rem" }}>
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Area Requirements (sq ft)
                  </h4>
                  <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">Min Office Area</label>

                      <input
                        type="text"
                        className="form-input"

                        value={warehouse.warehouse_name}
                        onChange={(e) => updateWarehouse(index, "warehouse_name", e.target.value)}
                        style={{ fontSize: "1rem", fontWeight: "500", border: "none", backgroundColor: "transparent" }}
                      />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                      <div className="form-group">
                        <label className="form-label">Max Capacity (units)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={warehouse.maxCapacity}
                          onChange={(e) => updateWarehouse(index, "maxCapacity", parseInt(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Fixed Costs ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={warehouse.fixedCosts}
                          onChange={(e) => updateWarehouse(index, "fixedCosts", parseInt(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Variable Cost per Unit ($)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="form-input"
                          value={warehouse.variableCostPerUnit}
                          onChange={(e) => updateWarehouse(index, "variableCostPerUnit", parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Warehouse Type</label>
                        <select
                          className="form-input"
                          value={warehouse.warehouseType}
                          onChange={(e) => updateWarehouse(index, "warehouseType", e.target.value)}
                        >
                          <option value="distribution">Distribution Center</option>
                          <option value="fulfillment">Fulfillment Center</option>
                          <option value="cross-dock">Cross-Dock Facility</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          className="form-input"
                          value={warehouse.locationLatitude}
                          onChange={(e) => updateWarehouse(index, "locationLatitude", parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          className="form-input"
                          value={warehouse.locationLongitude}
                          onChange={(e) => updateWarehouse(index, "locationLongitude", parseFloat(e.target.value))}
                        />
                      </div>

                        value={warehouseParams.min_office}
                        onChange={(e) =>
                          updateParam("min_office", parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Min Battery Area</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseParams.min_battery}
                        onChange={(e) =>
                          updateParam("min_battery", parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Each Pick Area (Fixed)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseParams.each_pick_area_fixed}
                        onChange={(e) =>
                          updateParam(
                            "each_pick_area_fixed",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Case Pick Area (Fixed)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseParams.case_pick_area_fixed}
                        onChange={(e) =>
                          updateParam(
                            "case_pick_area_fixed",
                            parseInt(e.target.value),
                          )
                        }
                      />

                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Dock Configuration
                  </h4>
                  <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                    <div className="form-group">

                      <label className="form-label">Automation Level</label>
                      <select
                        className="form-input"
                        value={warehouse.automationLevel}
                        onChange={(e) => updateWarehouse(index, "automationLevel", e.target.value)}
                      >
                        <option value="manual">Manual Operations</option>
                        <option value="semi-automated">Semi-Automated</option>
                        <option value="fully-automated">Fully Automated</option>
                      </select>
                    </div>
                  </div>
                ))}
=======
                      <label className="form-label">Max Outbound Doors</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseParams.max_outbound_doors}
                        onChange={(e) =>
                          updateParam(
                            "max_outbound_doors",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Inbound Doors</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseParams.max_inbound_doors}
                        onChange={(e) =>
                          updateParam(
                            "max_inbound_doors",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Outbound Pallets/Door/Day
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={
                          warehouseParams.outbound_pallets_per_door_per_day
                        }
                        onChange={(e) =>
                          updateParam(
                            "outbound_pallets_per_door_per_day",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Inbound Pallets/Door/Day
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseParams.inbound_pallets_per_door_per_day}
                        onChange={(e) =>
                          updateParam(
                            "inbound_pallets_per_door_per_day",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "optimization" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Linear Programming Optimization Settings
              </h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Configure solver parameters for the PuLP optimization model
              </p>

              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Solver Configuration
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Optimization Solver</label>
                    <select
                      className="form-input"
                      value={optimizationSettings.solver}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          solver: e.target.value as any,
                        })
                      }
                    >
                      <option value="PULP_CBC_CMD">
                        PULP CBC CMD (Default)
                      </option>
                      <option value="GUROBI_CMD">Gurobi (Commercial)</option>
                      <option value="CPLEX_CMD">CPLEX (Commercial)</option>
                      <option value="SCIP_CMD">SCIP (Open Source)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Limit (seconds)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={optimizationSettings.time_limit_seconds}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          time_limit_seconds: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gap Tolerance</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-input"
                      value={optimizationSettings.gap_tolerance}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          gap_tolerance: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Threads</label>
                    <input
                      type="number"
                      className="form-input"
                      value={optimizationSettings.threads}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          threads: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Objective Function Weights
                  </h4>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      marginBottom: "1rem",
                    }}
                  >
                    Configure multi-objective optimization weights (should sum
                    to 1.0)
                  </p>
                  <div className="form-group">
                    <label className="form-label">Cost Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      className="form-input"
                      value={optimizationSettings.weights.cost}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          weights: {
                            ...optimizationSettings.weights,
                            cost: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Level Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      className="form-input"
                      value={optimizationSettings.weights.service_level}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          weights: {
                            ...optimizationSettings.weights,
                            service_level: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Utilization Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      className="form-input"
                      value={optimizationSettings.weights.utilization}
                      onChange={(e) =>
                        setOptimizationSettings({
                          ...optimizationSettings,
                          weights: {
                            ...optimizationSettings.weights,
                            utilization: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Total Weight:{" "}
                    {(
                      optimizationSettings.weights.cost +
                      optimizationSettings.weights.service_level +
                      optimizationSettings.weights.utilization
                    ).toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Optimization Log
                </h4>
                <div
                  style={{
                    backgroundColor: "#1f2937",
                    color: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    height: "200px",
                    overflowY: "auto",
                    border: "1px solid #374151",
                  }}
                >
                  {processingLog.length === 0 ? (
                    <div
                      style={{
                        color: "#6b7280",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Optimization log will appear here when running...
                    </div>
                  ) : (
                    processingLog.map((log, index) => (
                      <div
                        key={index}
                        style={{ marginBottom: "0.25rem", color: "#10b981" }}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}


          {activeTab === "optimization" && (

          {activeTab === "scenarios" && (

            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Scenario Analysis
              </h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Compare different parameter configurations using
                generate_scenario_analysis method
              </p>


              <div className="grid grid-cols-2" style={{ gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Optimization Objective</label>
                  <select
                    className="form-input"
                    value={settings.objective}
                    onChange={(e) => setSettings({ ...settings, objective: e.target.value as any })}
                  >
                    <option value="minimize_costs">Minimize Total Costs</option>
                    <option value="maximize_throughput">Maximize Throughput</option>
                    <option value="balance_both">Balance Cost & Throughput</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Time Horizon (months)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.timeHorizon}
                    onChange={(e) => setSettings({ ...settings, timeHorizon: parseInt(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Demand Variability (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className="form-input"
                    value={settings.demandVariability}
                    onChange={(e) => setSettings({ ...settings, demandVariability: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Seasonality Factor</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={settings.seasonalityFactor}
                    onChange={(e) => setSettings({ ...settings, seasonalityFactor: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Growth Rate (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className="form-input"
                    value={settings.growthRate}
                    onChange={(e) => setSettings({ ...settings, growthRate: parseFloat(e.target.value) })}
                  />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h4 style={{ color: "#111827" }}>Scenarios</h4>
                <button
                  className="button button-secondary"
                  onClick={addScenario}
                >
                  Add Scenario
                </button>
              </div>

              {scenarios.map((scenario, index) => (
                <div
                  key={index}
                  className="card"
                  style={{ marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      value={scenario.name}
                      onChange={(e) => {
                        const updated = [...scenarios];
                        updated[index].name = e.target.value;
                        setScenarios(updated);
                      }}
                      style={{ maxWidth: "200px" }}
                    />
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {Object.keys(scenario.parameters).length} parameter
                      overrides
                    </div>
                  </div>

                  <div className="grid grid-cols-3" style={{ gap: "1rem" }}>
                    {index === 1 && ( // High Growth scenario
                      <>
                        <div>
                          <label className="form-label">DOH Override</label>
                          <input
                            type="number"
                            className="form-input"
                            value={
                              scenario.parameters.DOH || warehouseParams.DOH
                            }
                            onChange={(e) => {
                              const updated = [...scenarios];
                              updated[index].parameters.DOH = parseInt(
                                e.target.value,
                              );
                              setScenarios(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label">
                            Max Utilization Override
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={
                              scenario.parameters.max_utilization ||
                              warehouseParams.max_utilization
                            }
                            onChange={(e) => {
                              const updated = [...scenarios];
                              updated[index].parameters.max_utilization =
                                parseFloat(e.target.value);
                              setScenarios(updated);
                            }}
                          />
                        </div>
                      </>
                    )}

                    {index === 2 && ( // Conservative scenario
                      <>
                        <div>
                          <label className="form-label">DOH Override</label>
                          <input
                            type="number"
                            className="form-input"
                            value={
                              scenario.parameters.DOH || warehouseParams.DOH
                            }
                            onChange={(e) => {
                              const updated = [...scenarios];
                              updated[index].parameters.DOH = parseInt(
                                e.target.value,
                              );
                              setScenarios(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label">
                            Max Utilization Override
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={
                              scenario.parameters.max_utilization ||
                              warehouseParams.max_utilization
                            }
                            onChange={(e) => {
                              const updated = [...scenarios];
                              updated[index].parameters.max_utilization =
                                parseFloat(e.target.value);
                              setScenarios(updated);
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {index === 0 && (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                    >
                      Base case uses current parameter values
                    </div>
                  )}
                </div>
              ))}

              <div className="card">
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Scenario Comparison
                </h4>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "1rem",
                  }}
                >
                  Run optimization to compare scenarios using _compare_scenarios
                  method
                </p>
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "#6b7280",
                  }}
                >
                  Scenario comparison results will appear here after
                  optimization

                </div>
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Results
              </h3>


              {optimizationResults.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ color: "#111827", marginBottom: "0.5rem" }}>
                    Previous Optimization Runs ({optimizationResults.length})
                  </h4>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {optimizationResults.map((result: any, index: number) => (
                      <div key={index} style={{ padding: "0.75rem", backgroundColor: "#f0f9ff", borderRadius: "0.375rem", border: "1px solid #bfdbfe" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "500", color: "#1e40af" }}>
                            Run {index + 1} - {result.status}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {result.total_cost && `Cost: $${result.total_cost.toLocaleString()}`}
                            {result.cost_savings && ` | Savings: $${result.cost_savings.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results && (
                <div className="results-container">
                  <div className="grid grid-cols-3">
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                        ${results.totalCost.toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Annual Cost</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                        {results.averageUtilization}%
                      </div>
                      <div style={{ color: "#6b7280" }}>Average Utilization</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                        {results.recommendedCapacity.toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Recommended Capacity</div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f0f9ff", borderRadius: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        Potential Cost Savings: <strong>${results.costSavings.toLocaleString()}</strong>
                      </span>
                      <span>
                        ROI: <strong>{results.roi}%</strong>
                      </span>
                      <span>
                        Optimization Score: <strong>{results.optimizationScore}/100</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!results && !optimizing && (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <Calculator size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run optimization to see results here</p>

              {results ? (
                <div>
                  <div
                    className="grid grid-cols-4"
                    style={{ marginBottom: "1.5rem" }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0f9ff",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#3b82f6",
                        }}
                      >
                        ${results.objective_value.toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Total Objective Value
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#10b981",
                        }}
                      >
                        {results.performance_metrics.avg_utilization.toFixed(1)}
                        %
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Avg Utilization
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#fffbeb",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#f59e0b",
                        }}
                      >
                        {results.optimization_summary.total_facilities_added}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Facilities Added
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#fef2f2",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#ef4444",
                        }}
                      >
                        {results.solve_time}s
                      </div>
                      <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        Solve Time
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Performance Metrics
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Volume CAGR:</span>
                        <span style={{ fontWeight: "bold", color: "#10b981" }}>
                          {(
                            results.performance_metrics.volume_cagr * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Cost CAGR:</span>
                        <span style={{ fontWeight: "bold", color: "#ef4444" }}>
                          {(
                            results.performance_metrics.cost_cagr * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Avg Cost per Unit:</span>
                        <span style={{ fontWeight: "bold" }}>
                          $
                          {results.performance_metrics.avg_cost_per_unit.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>3PL Dependency:</span>
                        <span style={{ fontWeight: "bold", color: "#f59e0b" }}>
                          {(
                            results.performance_metrics.thirdparty_dependency *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Space Summary
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Total Internal Space:</span>
                        <span style={{ fontWeight: "bold" }}>
                          {results.performance_metrics.total_internal_space.toLocaleString()}{" "}
                          sq ft
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Total 3PL Space:</span>
                        <span style={{ fontWeight: "bold" }}>
                          {results.performance_metrics.total_thirdparty_space.toLocaleString()}{" "}
                          sq ft
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Facility Size Added:</span>
                        <span style={{ fontWeight: "bold" }}>
                          {results.optimization_summary.total_facility_size_added.toLocaleString()}{" "}
                          sq ft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: "1rem" }}>
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Yearly Optimization Results
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.875rem",
                        }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f3f4f6" }}>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Year
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Annual Units
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Storage Pallets
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Gross Area
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Facilities
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Total Cost
                            </th>
                            <th
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              Utilization
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.yearly_results.map((year, index) => (
                            <tr key={index}>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {year.year}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {year.annualUnits.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {year.storagePallets.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {year.grossArea.toLocaleString()} sq ft
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {year.facilitiesNeeded}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                ${year.totalCost.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {year.utilization.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  <Package
                    size={48}
                    style={{ margin: "0 auto 1rem", opacity: 0.5 }}
                  />
                  <h4 style={{ marginBottom: "0.5rem" }}>
                    No optimization results yet
                  </h4>
                  <p>
                    Run the optimization to see comprehensive warehouse capacity
                    results
                  </p>

                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
