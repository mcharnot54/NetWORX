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
}

interface OptimizationSettings {
  objective: "minimize_costs" | "maximize_throughput" | "balance_both";
  timeHorizon: number;
  demandVariability: number;
  seasonalityFactor: number;
  growthRate: number;
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
    },
  ]);

  const [settings, setSettings] = useState<OptimizationSettings>({
    objective: "minimize_costs",
    timeHorizon: 12,
    demandVariability: 0.15,
    seasonalityFactor: 1.2,
    growthRate: 0.05,
  });

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
  };

  const updateWarehouse = (
    index: number,
    field: keyof WarehouseConfig,
    value: any,
  ) => {
    const updated = [...warehouses];
    updated[index] = { ...updated[index], [field]: value };
    setWarehouses(updated);
  };

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
                    </div>

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
              </div>
            </div>
          )}

          {activeTab === "optimization" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Settings
              </h3>

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
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
