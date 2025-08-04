"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ScenarioManager from "@/components/ScenarioManager";
import { Truck, Route, DollarSign, Clock, Save, Database, TrendingUp } from "lucide-react";

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

interface TransportRoute {
  id?: number;
  route_name?: string;
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
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [activeTab, setActiveTab] = useState("scenarios");
  const [routes, setRoutes] = useState<TransportRoute[]>([
    {
      route_name: "East Coast Route",
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
        setSavedConfigs(data.data.transportConfigs || []);
        setOptimizationResults(data.data.results?.filter((r: any) => 
          r.result_type === 'transport' || r.result_type === 'combined'
        ) || []);
        
        // Load existing configurations into the form
        if (data.data.transportConfigs && data.data.transportConfigs.length > 0) {
          const configs = data.data.transportConfigs.map((config: any) => ({
            id: config.id,
            route_name: config.route_name || `Route ${config.id}`,
            origin: config.origin,
            destination: config.destination,
            distance: config.distance || 0,
            baseFreightCost: config.base_freight_cost || 0,
            fuelCostPerKm: config.fuel_cost_per_km || 0,
            transitTime: config.transit_time || 0,
            vehicleType: config.vehicle_type,
            capacity: config.capacity || 0,
          }));
          setRoutes(configs);
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
      // Save transport configurations
      for (const route of routes) {
        const configData = {
          route_name: route.route_name,
          origin: route.origin,
          destination: route.destination,
          distance: route.distance,
          base_freight_cost: route.baseFreightCost,
          fuel_cost_per_km: route.fuelCostPerKm,
          transit_time: route.transitTime,
          vehicle_type: route.vehicleType,
          capacity: route.capacity,
          route_data: {
            optimization_params: params,
            advanced_settings: {
              fuel_price_variation: params.fuelPriceVariation,
              carbon_emission_weight: params.carbonEmissionWeight,
              reliability_weight: params.reliabilityWeight,
              flexibility_requirement: params.flexibilityRequirement
            }
          }
        };

        if (route.id) {
          // Update existing
          await fetch(`/api/scenarios/${selectedScenario.id}/transport/${route.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configData),
          });
        } else {
          // Create new
          await fetch(`/api/scenarios/${selectedScenario.id}/transport`, {
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
          setting_type: 'transport',
          objective: params.objective,
          constraints: {
            max_transit_time: params.maxTransitTime,
            fuel_price_variation: params.fuelPriceVariation
          },
          parameters: {
            carbon_emission_weight: params.carbonEmissionWeight,
            reliability_weight: params.reliabilityWeight,
            flexibility_requirement: params.flexibilityRequirement
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

  const addRoute = () => {
    setRoutes([
      ...routes,
      {
        route_name: `Route ${routes.length + 1}`,
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
          result_type: 'transport',
          optimization_params: {
            objective: params.objective,
            transport_routes: routes,
            optimization_settings: params
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
                  totalDistance: latestResult.results_data?.transport_optimization?.total_distance || 15600,
                  averageTransitTime: latestResult.results_data?.transport_optimization?.average_transit_time || 18.5,
                  fuelEfficiency: latestResult.results_data?.transport_optimization?.fuel_efficiency || 7.2,
                  carbonFootprint: latestResult.results_data?.overall_metrics?.carbon_footprint_reduction || 45.6,
                  costSavings: latestResult.cost_savings,
                  routeEfficiency: latestResult.efficiency_score,
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
              <h2 className="card-title">Transport Optimizer</h2>
              <p style={{ marginBottom: 0, color: "#6b7280" }}>
                Optimize transportation routes, minimize freight costs, and improve delivery efficiency.
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
                disabled={optimizing || !selectedScenario || routes.length === 0}
              >
                {optimizing && <div className="loading-spinner"></div>}
                <Truck size={16} />
                {optimizing ? "Optimizing Routes..." : "Optimize Transportation"}
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
                className={`button ${activeTab === "routes" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("routes")}
                disabled={!selectedScenario}
              >
                <Route size={16} />
                Routes
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
                <Truck size={16} />
                Results
              </button>
            </div>
          </div>

          {activeTab === "scenarios" && (
            <ScenarioManager
              onSelectScenario={setSelectedScenario}
              selectedScenario={selectedScenario}
              scenarioType="transport"
            />
          )}

          {activeTab === "routes" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ color: "#111827", margin: 0 }}>
                  Transport Routes
                  {selectedScenario && (
                    <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "normal" }}>
                      {" "} (Scenario: {selectedScenario.name})
                    </span>
                  )}
                </h3>
                <button className="button button-secondary" onClick={addRoute}>
                  Add Route
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
                          <span style={{ fontWeight: "500", color: "#1e40af" }}>
                            {config.route_name || `${config.origin} → ${config.destination}`}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {config.distance} km | 
                            ${config.base_freight_cost?.toLocaleString()} | 
                            {config.vehicle_type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: "1rem" }}>
                {routes.map((route, index) => (
                  <div key={index} className="card" style={{ margin: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                      <Route size={20} style={{ color: "#3b82f6" }} />
                      <input
                        type="text"
                        className="form-input"
                        value={route.route_name || `Route ${index + 1}`}
                        onChange={(e) => updateRoute(index, "route_name", e.target.value)}
                        style={{ fontSize: "1rem", fontWeight: "500", border: "none", backgroundColor: "transparent" }}
                        placeholder="Route name"
                      />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                      <div className="form-group">
                        <label className="form-label">Origin</label>
                        <input
                          type="text"
                          className="form-input"
                          value={route.origin}
                          onChange={(e) => updateRoute(index, "origin", e.target.value)}
                          placeholder="Origin location"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Destination</label>
                        <input
                          type="text"
                          className="form-input"
                          value={route.destination}
                          onChange={(e) => updateRoute(index, "destination", e.target.value)}
                          placeholder="Destination location"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Distance (km)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={route.distance}
                          onChange={(e) => updateRoute(index, "distance", parseInt(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Base Freight Cost ($)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={route.baseFreightCost}
                          onChange={(e) => updateRoute(index, "baseFreightCost", parseInt(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Fuel Cost per km ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={route.fuelCostPerKm}
                          onChange={(e) => updateRoute(index, "fuelCostPerKm", parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Transit Time (hours)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={route.transitTime}
                          onChange={(e) => updateRoute(index, "transitTime", parseInt(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Vehicle Type</label>
                        <select
                          className="form-input"
                          value={route.vehicleType}
                          onChange={(e) => updateRoute(index, "vehicleType", e.target.value)}
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
                          onChange={(e) => updateRoute(index, "capacity", parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "optimization" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Parameters
              </h3>

              <div className="grid grid-cols-2" style={{ gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Optimization Objective</label>
                  <select
                    className="form-input"
                    value={params.objective}
                    onChange={(e) => setParams({ ...params, objective: e.target.value as any })}
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
                    onChange={(e) => setParams({ ...params, maxTransitTime: parseInt(e.target.value) })}
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
                    onChange={(e) => setParams({ ...params, fuelPriceVariation: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Carbon Emission Weight (0-1)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    className="form-input"
                    value={params.carbonEmissionWeight}
                    onChange={(e) => setParams({ ...params, carbonEmissionWeight: parseFloat(e.target.value) })}
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
                    onChange={(e) => setParams({ ...params, reliabilityWeight: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={params.flexibilityRequirement}
                      onChange={(e) => setParams({ ...params, flexibilityRequirement: e.target.checked })}
                      style={{ marginRight: "0.5rem" }}
                    />
                    Require Route Flexibility
                  </label>
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
                  <div className="grid grid-cols-2">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <DollarSign size={20} style={{ color: "#10b981" }} />
                        <span>
                          Total Transportation Cost: <strong>${results.totalCost.toLocaleString()}</strong>
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <Route size={20} style={{ color: "#3b82f6" }} />
                        <span>
                          Total Distance: <strong>{results.totalDistance.toLocaleString()} km</strong>
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                        <Clock size={20} style={{ color: "#f59e0b" }} />
                        <span>
                          Average Transit Time: <strong>{results.averageTransitTime} hours</strong>
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <span>
                          Fuel Efficiency: <strong>{results.fuelEfficiency} L/100km</strong>
                        </span>
                      </div>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <span>
                          Carbon Footprint: <strong>{results.carbonFootprint} tons CO₂</strong>
                        </span>
                      </div>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <span>
                          Route Efficiency: <strong>{results.routeEfficiency}%</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#dcfce7", borderRadius: "0.5rem" }}>
                    <strong>Cost Savings: ${results.costSavings.toLocaleString()}</strong> compared to current routing
                  </div>
                </div>
              )}

              {!results && !optimizing && (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <Truck size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
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
