"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Package, MapPin, TrendingUp, Calculator } from "lucide-react";

interface WarehouseConfig {
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
  const [warehouses, setWarehouses] = useState<WarehouseConfig[]>([
    {
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
  const [results, setResults] = useState<any>(null);

  const addWarehouse = () => {
    setWarehouses([
      ...warehouses,
      {
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
    setOptimizing(true);
    // Simulate optimization
    setTimeout(() => {
      setResults({
        totalCost: 485000,
        averageUtilization: 78.5,
        recommendedCapacity: 125000,
        costSavings: 65000,
        roi: 13.4,
        optimizationScore: 92,
      });
      setOptimizing(false);
    }, 3000);
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Warehouse Optimizer</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Optimize warehouse space allocation, capacity planning, and
            operational efficiency.
          </p>

          <div className="grid grid-cols-2">
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ color: "#111827" }}>Warehouse Configuration</h3>
                <button
                  className="button button-secondary"
                  onClick={addWarehouse}
                >
                  Add Warehouse
                </button>
              </div>

              {warehouses.map((warehouse, index) => (
                <div key={index} className="card" style={{ margin: "1rem 0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <Package size={20} style={{ color: "#3b82f6" }} />
                    <h4 style={{ margin: 0 }}>Warehouse {index + 1}</h4>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">Max Capacity (units)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouse.maxCapacity}
                        onChange={(e) =>
                          updateWarehouse(
                            index,
                            "maxCapacity",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fixed Costs ($)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouse.fixedCosts}
                        onChange={(e) =>
                          updateWarehouse(
                            index,
                            "fixedCosts",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Variable Cost per Unit ($)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        value={warehouse.variableCostPerUnit}
                        onChange={(e) =>
                          updateWarehouse(
                            index,
                            "variableCostPerUnit",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Warehouse Type</label>
                      <select
                        className="form-input"
                        value={warehouse.warehouseType}
                        onChange={(e) =>
                          updateWarehouse(
                            index,
                            "warehouseType",
                            e.target.value,
                          )
                        }
                      >
                        <option value="distribution">
                          Distribution Center
                        </option>
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
                        onChange={(e) =>
                          updateWarehouse(
                            index,
                            "locationLatitude",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-input"
                        value={warehouse.locationLongitude}
                        onChange={(e) =>
                          updateWarehouse(
                            index,
                            "locationLongitude",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Automation Level</label>
                    <select
                      className="form-input"
                      value={warehouse.automationLevel}
                      onChange={(e) =>
                        updateWarehouse(
                          index,
                          "automationLevel",
                          e.target.value,
                        )
                      }
                    >
                      <option value="manual">Manual Operations</option>
                      <option value="semi-automated">Semi-Automated</option>
                      <option value="fully-automated">Fully Automated</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Settings
              </h3>

              <div className="form-group">
                <label className="form-label">Optimization Objective</label>
                <select
                  className="form-input"
                  value={settings.objective}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      objective: e.target.value as any,
                    })
                  }
                >
                  <option value="minimize_costs">Minimize Total Costs</option>
                  <option value="maximize_throughput">
                    Maximize Throughput
                  </option>
                  <option value="balance_both">
                    Balance Cost & Throughput
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Time Horizon (months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.timeHorizon}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      timeHorizon: parseInt(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      demandVariability: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Seasonality Factor</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={settings.seasonalityFactor}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      seasonalityFactor: parseFloat(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      growthRate: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
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

          {results && (
            <div className="results-container">
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Results
              </h3>
              <div className="grid grid-cols-3">
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#3b82f6",
                    }}
                  >
                    ${results.totalCost.toLocaleString()}
                  </div>
                  <div style={{ color: "#6b7280" }}>Total Annual Cost</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#10b981",
                    }}
                  >
                    {results.averageUtilization}%
                  </div>
                  <div style={{ color: "#6b7280" }}>Average Utilization</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#f59e0b",
                    }}
                  >
                    {results.recommendedCapacity.toLocaleString()}
                  </div>
                  <div style={{ color: "#6b7280" }}>Recommended Capacity</div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    Potential Cost Savings:{" "}
                    <strong>${results.costSavings.toLocaleString()}</strong>
                  </span>
                  <span>
                    ROI: <strong>{results.roi}%</strong>
                  </span>
                  <span>
                    Optimization Score:{" "}
                    <strong>{results.optimizationScore}/100</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
