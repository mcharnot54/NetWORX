"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ScenarioManager from "@/components/ScenarioManager";
import { useData } from "@/context/DataContext";
import {
  Package,
  MapPin,
  TrendingUp,
  Calculator,
  Save,
  Play,
  Database,
  BarChart3,
  Settings,
  Target,
  DollarSign,
  Zap,
} from "lucide-react";

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
}

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
}

export default function WarehouseOptimizer() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { getWarehouseData, getSKUData, setWarehouseResults, fetchMarketData } = useData();
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
    },
  ]);

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
  });

  const [results, setResults] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const runOptimization = async () => {
    if (!selectedScenario) {
      alert('Please select a scenario first');
      return;
    }

    setIsOptimizing(true);
    try {
      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResults = {
        optimizedWarehouses: warehouses.map(w => ({
          ...w,
          recommendedCapacity: w.maxCapacity * 0.85,
          efficiencyScore: Math.random() * 20 + 80,
          estimatedSavings: Math.random() * 50000 + 25000,
        })),
        totalCostSavings: Math.random() * 200000 + 100000,
        spaceUtilization: Math.random() * 20 + 75,
        recommendations: [
          "Consider increasing automation level for DC1",
          "Optimize warehouse layout for better flow",
          "Implement cross-docking capabilities",
        ],
      };

      setResults(mockResults);
      setWarehouseResults(mockResults);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const addWarehouse = () => {
    const newWarehouse: WarehouseConfig = {
      warehouse_name: `Distribution Center ${warehouses.length + 1}`,
      maxCapacity: 50000,
      fixedCosts: 30000,
      variableCostPerUnit: 2.0,
      locationLatitude: 0,
      locationLongitude: 0,
      warehouseType: "distribution",
      automationLevel: "manual",
    };
    setWarehouses([...warehouses, newWarehouse]);
  };

  const updateWarehouse = (index: number, updates: Partial<WarehouseConfig>) => {
    const updated = warehouses.map((w, i) => 
      i === index ? { ...w, ...updates } : w
    );
    setWarehouses(updated);
  };

  const removeWarehouse = (index: number) => {
    setWarehouses(warehouses.filter((_, i) => i !== index));
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Warehouse Optimizer</h2>
          
          <div style={{ marginBottom: "2rem" }}>
            <ScenarioManager 
              selectedScenario={selectedScenario}
              onSelectScenario={setSelectedScenario}
              scenarioType="warehouse"
            />
          </div>

          {selectedScenario && (
            <>
              {/* Tab Navigation */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid #e5e7eb" }}>
                {["scenarios", "warehouses", "parameters", "results"].map((tab) => (
                  <button
                    key={tab}
                    className={`button ${activeTab === tab ? "button-primary" : "button-secondary"}`}
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      borderRadius: "0.5rem 0.5rem 0 0",
                      borderBottom: activeTab === tab ? "2px solid #3b82f6" : "none"
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Warehouse Configuration */}
              {activeTab === "warehouses" && (
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3>Warehouse Configuration</h3>
                    <button className="button button-primary" onClick={addWarehouse}>
                      <Package size={16} />
                      Add Warehouse
                    </button>
                  </div>

                  {warehouses.map((warehouse, index) => (
                    <div key={index} className="card" style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h4>{warehouse.warehouse_name}</h4>
                        <button 
                          className="button button-secondary"
                          onClick={() => removeWarehouse(index)}
                          style={{ color: "#ef4444" }}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="form-group">
                          <label className="form-label">Warehouse Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={warehouse.warehouse_name}
                            onChange={(e) => updateWarehouse(index, { warehouse_name: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Max Capacity</label>
                          <input
                            type="number"
                            className="form-input"
                            value={warehouse.maxCapacity}
                            onChange={(e) => updateWarehouse(index, { maxCapacity: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Fixed Costs ($)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={warehouse.fixedCosts}
                            onChange={(e) => updateWarehouse(index, { fixedCosts: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Variable Cost per Unit ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={warehouse.variableCostPerUnit}
                            onChange={(e) => updateWarehouse(index, { variableCostPerUnit: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Warehouse Type</label>
                          <select
                            className="form-input"
                            value={warehouse.warehouseType}
                            onChange={(e) => updateWarehouse(index, { warehouseType: e.target.value as any })}
                          >
                            <option value="distribution">Distribution</option>
                            <option value="fulfillment">Fulfillment</option>
                            <option value="cross-dock">Cross-dock</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Automation Level</label>
                          <select
                            className="form-input"
                            value={warehouse.automationLevel}
                            onChange={(e) => updateWarehouse(index, { automationLevel: e.target.value as any })}
                          >
                            <option value="manual">Manual</option>
                            <option value="semi-automated">Semi-automated</option>
                            <option value="fully-automated">Fully-automated</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {activeTab === "results" && (
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h3>Optimization Results</h3>
                    <button 
                      className="button button-primary" 
                      onClick={runOptimization}
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? (
                        <>
                          <div className="loading-spinner" style={{ marginRight: "0.5rem" }}></div>
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Run Optimization
                        </>
                      )}
                    </button>
                  </div>

                  {results ? (
                    <div>
                      <div className="grid grid-cols-3" style={{ marginBottom: "2rem" }}>
                        <div className="card">
                          <h4 style={{ color: "#10b981", marginBottom: "0.5rem" }}>
                            ${results.totalCostSavings?.toLocaleString() || 0}
                          </h4>
                          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Cost Savings</p>
                        </div>
                        <div className="card">
                          <h4 style={{ color: "#3b82f6", marginBottom: "0.5rem" }}>
                            {results.spaceUtilization?.toFixed(1) || 0}%
                          </h4>
                          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Space Utilization</p>
                        </div>
                        <div className="card">
                          <h4 style={{ color: "#f59e0b", marginBottom: "0.5rem" }}>
                            {results.optimizedWarehouses?.length || 0}
                          </h4>
                          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Optimized Warehouses</p>
                        </div>
                      </div>

                      <div className="card">
                        <h4 style={{ marginBottom: "1rem" }}>Recommendations</h4>
                        <ul style={{ paddingLeft: "1.5rem" }}>
                          {results.recommendations?.map((rec: string, index: number) => (
                            <li key={index} style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                      <BarChart3 size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                      <p>Run optimization to see results</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
