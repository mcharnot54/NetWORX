"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Truck, Route, DollarSign, Clock } from "lucide-react";

interface TransportRoute {
  origin: string;
  destination: string;
  distance: number;
  baseFreightCost: number;
  fuelCostPerKm: number;
  transitTime: number;
  vehicleType: "truck" | "rail" | "air" | "sea";
  capacity: number;
}

interface OptimizationParams {
  objective: "minimize_cost" | "minimize_time" | "optimize_both";
  maxTransitTime: number;
  fuelPriceVariation: number;
  carbonEmissionWeight: number;
  reliabilityWeight: number;
  flexibilityRequirement: boolean;
}

export default function TransportOptimizer() {
  const [routes, setRoutes] = useState<TransportRoute[]>([
    {
      origin: "New York, NY",
      destination: "Chicago, IL",
      distance: 790,
      baseFreightCost: 1200,
      fuelCostPerKm: 0.15,
      transitTime: 14,
      vehicleType: "truck",
      capacity: 26000,
    },
  ]);

  const [params, setParams] = useState<OptimizationParams>({
    objective: "minimize_cost",
    maxTransitTime: 72,
    fuelPriceVariation: 0.1,
    carbonEmissionWeight: 0.2,
    reliabilityWeight: 0.8,
    flexibilityRequirement: true,
  });

  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const addRoute = () => {
    setRoutes([
      ...routes,
      {
        origin: "",
        destination: "",
        distance: 0,
        baseFreightCost: 0,
        fuelCostPerKm: 0.15,
        transitTime: 0,
        vehicleType: "truck",
        capacity: 26000,
      },
    ]);
  };

  const updateRoute = (
    index: number,
    field: keyof TransportRoute,
    value: any,
  ) => {
    const updated = [...routes];
    updated[index] = { ...updated[index], [field]: value };
    setRoutes(updated);
  };

  const runOptimization = async () => {
    setOptimizing(true);
    // Simulate optimization
    setTimeout(() => {
      setResults({
        totalCost: 125000,
        totalDistance: 15600,
        averageTransitTime: 18.5,
        fuelEfficiency: 7.2,
        carbonFootprint: 45.6,
        costSavings: 22000,
        routeEfficiency: 89.3,
      });
      setOptimizing(false);
    }, 2500);
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Transport Optimizer</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Optimize transportation routes, minimize freight costs, and improve
            delivery efficiency.
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
                <h3 style={{ color: "#111827" }}>Transport Routes</h3>
                <button className="button button-secondary" onClick={addRoute}>
                  Add Route
                </button>
              </div>

              {routes.map((route, index) => (
                <div key={index} className="card" style={{ margin: "1rem 0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <Route size={20} style={{ color: "#3b82f6" }} />
                    <h4 style={{ margin: 0 }}>Route {index + 1}</h4>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">Origin</label>
                      <input
                        type="text"
                        className="form-input"
                        value={route.origin}
                        onChange={(e) =>
                          updateRoute(index, "origin", e.target.value)
                        }
                        placeholder="Origin location"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Destination</label>
                      <input
                        type="text"
                        className="form-input"
                        value={route.destination}
                        onChange={(e) =>
                          updateRoute(index, "destination", e.target.value)
                        }
                        placeholder="Destination location"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Distance (km)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={route.distance}
                        onChange={(e) =>
                          updateRoute(
                            index,
                            "distance",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Base Freight Cost ($)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={route.baseFreightCost}
                        onChange={(e) =>
                          updateRoute(
                            index,
                            "baseFreightCost",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fuel Cost per km ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={route.fuelCostPerKm}
                        onChange={(e) =>
                          updateRoute(
                            index,
                            "fuelCostPerKm",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Transit Time (hours)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={route.transitTime}
                        onChange={(e) =>
                          updateRoute(
                            index,
                            "transitTime",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Vehicle Type</label>
                      <select
                        className="form-input"
                        value={route.vehicleType}
                        onChange={(e) =>
                          updateRoute(index, "vehicleType", e.target.value)
                        }
                      >
                        <option value="truck">Truck</option>
                        <option value="rail">Rail</option>
                        <option value="air">Air</option>
                        <option value="sea">Sea</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Capacity (kg)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={route.capacity}
                        onChange={(e) =>
                          updateRoute(
                            index,
                            "capacity",
                            parseInt(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Parameters
              </h3>

              <div className="form-group">
                <label className="form-label">Optimization Objective</label>
                <select
                  className="form-input"
                  value={params.objective}
                  onChange={(e) =>
                    setParams({ ...params, objective: e.target.value as any })
                  }
                >
                  <option value="minimize_cost">Minimize Cost</option>
                  <option value="minimize_time">Minimize Transit Time</option>
                  <option value="optimize_both">Optimize Both</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Max Transit Time (hours)</label>
                <input
                  type="number"
                  className="form-input"
                  value={params.maxTransitTime}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      maxTransitTime: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fuel Price Variation (0-1)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="form-input"
                  value={params.fuelPriceVariation}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      fuelPriceVariation: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Carbon Emission Weight (0-1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  className="form-input"
                  value={params.carbonEmissionWeight}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      carbonEmissionWeight: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reliability Weight (0-1)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  className="form-input"
                  value={params.reliabilityWeight}
                  onChange={(e) =>
                    setParams({
                      ...params,
                      reliabilityWeight: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={params.flexibilityRequirement}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        flexibilityRequirement: e.target.checked,
                      })
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  Require Route Flexibility
                </label>
              </div>

              <div
                className="card"
                style={{ backgroundColor: "#f9fafb", margin: "1rem 0" }}
              >
                <h4 style={{ marginBottom: "0.75rem", color: "#111827" }}>
                  Advanced Options
                </h4>
                <div className="form-group">
                  <label className="form-label">
                    <input type="checkbox" style={{ marginRight: "0.5rem" }} />
                    Consider Traffic Patterns
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <input type="checkbox" style={{ marginRight: "0.5rem" }} />
                    Multi-Modal Transportation
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <input type="checkbox" style={{ marginRight: "0.5rem" }} />
                    Seasonal Rate Adjustments
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              className="button button-primary"
              onClick={runOptimization}
              disabled={optimizing || routes.length === 0}
            >
              {optimizing && <div className="loading-spinner"></div>}
              <Truck size={16} />
              {optimizing ? "Optimizing Routes..." : "Optimize Transportation"}
            </button>
          </div>

          {results && (
            <div className="results-container">
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Results
              </h3>
              <div className="grid grid-cols-2">
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <DollarSign size={20} style={{ color: "#10b981" }} />
                    <span>
                      Total Transportation Cost:{" "}
                      <strong>${results.totalCost.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <Route size={20} style={{ color: "#3b82f6" }} />
                    <span>
                      Total Distance:{" "}
                      <strong>
                        {results.totalDistance.toLocaleString()} km
                      </strong>
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <Clock size={20} style={{ color: "#f59e0b" }} />
                    <span>
                      Average Transit Time:{" "}
                      <strong>{results.averageTransitTime} hours</strong>
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <span>
                      Fuel Efficiency:{" "}
                      <strong>{results.fuelEfficiency} L/100km</strong>
                    </span>
                  </div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <span>
                      Carbon Footprint:{" "}
                      <strong>{results.carbonFootprint} tons CO₂</strong>
                    </span>
                  </div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <span>
                      Route Efficiency:{" "}
                      <strong>{results.routeEfficiency}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  backgroundColor: "#dcfce7",
                  borderRadius: "0.5rem",
                }}
              >
                <strong>
                  Cost Savings: ${results.costSavings.toLocaleString()}
                </strong>{" "}
                compared to current routing
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
