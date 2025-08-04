"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ScenarioManager from "@/components/ScenarioManager";
import { useData } from "@/context/DataContext";
import {
  Truck,
  Route,
  DollarSign,
  Clock,
  Save,
  Database,
  TrendingUp,
  Settings,
  MapPin,
  Zap,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  Play,
  Pause,
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

interface TransportRoute {
  id?: number;
  route_name?: string;
  origin: string;
  destination: string;
  distance?: number;
  base_freight_cost?: number;
  fuel_cost_per_km?: number;
  transit_time?: number;
  vehicle_type: 'truck' | 'rail' | 'air' | 'sea';
  capacity?: number;
}

interface TransportationConfig {
  facilities: {
    max_capacity_per_facility: number;
    fixed_cost_per_facility: number;
    cost_per_mile: number;
    max_distance_miles: number;
    service_level_requirement: number;
    required_facilities: number;
    max_facilities: number;
    mandatory_facilities: string[];
  };
  optimization: {
    solver: string;
    time_limit_seconds: number;
    gap_tolerance: number;
    threads: number;
  };
  weights: {
    cost: number;
    service_level: number;
    distance: number;
    capacity_utilization: number;
  };
}

interface CostMatrixRow {
  facility: string;
  destinations: { [key: string]: number };
}

interface DemandData {
  destination: string;
  demand: number;
  priority: number;
}

export default function TransportOptimizer() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { getTransportationData, setTransportResults } = useData();
  const [activeTab, setActiveTab] = useState("scenarios");
  
  const [routes, setRoutes] = useState<TransportRoute[]>([
    {
      route_name: "Chicago-NYC Route",
      origin: "Chicago, IL",
      destination: "New York, NY",
      distance: 790,
      base_freight_cost: 2.5,
      fuel_cost_per_km: 0.15,
      transit_time: 18,
      vehicle_type: "truck",
      capacity: 26000,
    },
  ]);

  const [config, setConfig] = useState<TransportationConfig>({
    facilities: {
      max_capacity_per_facility: 100000,
      fixed_cost_per_facility: 50000,
      cost_per_mile: 2.5,
      max_distance_miles: 500,
      service_level_requirement: 0.95,
      required_facilities: 3,
      max_facilities: 10,
      mandatory_facilities: [],
    },
    optimization: {
      solver: "CBC",
      time_limit_seconds: 300,
      gap_tolerance: 0.01,
      threads: 4,
    },
    weights: {
      cost: 0.4,
      service_level: 0.3,
      distance: 0.2,
      capacity_utilization: 0.1,
    },
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResults = {
        optimizedRoutes: routes.map(r => ({
          ...r,
          recommendedCapacity: r.capacity ? r.capacity * 0.9 : 24000,
          efficiencyScore: Math.random() * 15 + 85,
          costReduction: Math.random() * 0.2 + 0.1,
        })),
        totalCostSavings: Math.random() * 150000 + 75000,
        averageTransitTime: Math.random() * 5 + 15,
        fuelEfficiency: Math.random() * 10 + 85,
        recommendations: [
          "Consolidate shipments on Chicago-NYC route",
          "Consider rail transport for long-distance routes",
          "Optimize load balancing across vehicles",
          "Implement dynamic routing based on traffic",
        ],
      };

      setResults(mockResults);
      setTransportResults(mockResults);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const addRoute = () => {
    const newRoute: TransportRoute = {
      route_name: `Route ${routes.length + 1}`,
      origin: "",
      destination: "",
      distance: 0,
      base_freight_cost: 2.0,
      fuel_cost_per_km: 0.12,
      transit_time: 24,
      vehicle_type: "truck",
      capacity: 26000,
    };
    setRoutes([...routes, newRoute]);
  };

  const updateRoute = (index: number, updates: Partial<TransportRoute>) => {
    const updated = routes.map((r, i) => 
      i === index ? { ...r, ...updates } : r
    );
    setRoutes(updated);
  };

  const removeRoute = (index: number) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };

  const updateConfig = (section: keyof TransportationConfig, updates: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Transport Optimizer</h2>
          
          <div style={{ marginBottom: "2rem" }}>
            <ScenarioManager 
              selectedScenario={selectedScenario}
              onSelectScenario={setSelectedScenario}
              scenarioType="transport"
            />
          </div>

          {selectedScenario && (
            <>
              {/* Tab Navigation */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid #e5e7eb" }}>
                {["scenarios", "routes", "configuration", "results"].map((tab) => (
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

              {/* Routes Configuration */}
              {activeTab === "routes" && (
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3>Transport Routes</h3>
                    <button className="button button-primary" onClick={addRoute}>
                      <Truck size={16} />
                      Add Route
                    </button>
                  </div>

                  {routes.map((route, index) => (
                    <div key={index} className="card" style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h4>{route.route_name || `Route ${index + 1}`}</h4>
                        <button 
                          className="button button-secondary"
                          onClick={() => removeRoute(index)}
                          style={{ color: "#ef4444" }}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-2">
                        <div className="form-group">
                          <label className="form-label">Route Name</label>
                          <input
                            type="text"
                            className="form-input"
                            value={route.route_name || ""}
                            onChange={(e) => updateRoute(index, { route_name: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Vehicle Type</label>
                          <select
                            className="form-input"
                            value={route.vehicle_type}
                            onChange={(e) => updateRoute(index, { vehicle_type: e.target.value as any })}
                          >
                            <option value="truck">Truck</option>
                            <option value="rail">Rail</option>
                            <option value="air">Air</option>
                            <option value="sea">Sea</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Origin</label>
                          <input
                            type="text"
                            className="form-input"
                            value={route.origin}
                            onChange={(e) => updateRoute(index, { origin: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Destination</label>
                          <input
                            type="text"
                            className="form-input"
                            value={route.destination}
                            onChange={(e) => updateRoute(index, { destination: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Distance (miles)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={route.distance || 0}
                            onChange={(e) => updateRoute(index, { distance: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Base Freight Cost ($/mile)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            value={route.base_freight_cost || 0}
                            onChange={(e) => updateRoute(index, { base_freight_cost: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Transit Time (hours)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={route.transit_time || 0}
                            onChange={(e) => updateRoute(index, { transit_time: Number(e.target.value) })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Capacity (lbs)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={route.capacity || 0}
                            onChange={(e) => updateRoute(index, { capacity: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Configuration */}
              {activeTab === "configuration" && (
                <div className="card">
                  <h3 style={{ marginBottom: "1rem" }}>Optimization Configuration</h3>
                  
                  <div style={{ marginBottom: "2rem" }}>
                    <h4>Facility Settings</h4>
                    <div className="grid grid-cols-2">
                      <div className="form-group">
                        <label className="form-label">Cost per Mile ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={config.facilities.cost_per_mile}
                          onChange={(e) => updateConfig('facilities', { cost_per_mile: Number(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Max Distance (miles)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={config.facilities.max_distance_miles}
                          onChange={(e) => updateConfig('facilities', { max_distance_miles: Number(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Service Level Requirement (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          className="form-input"
                          value={config.facilities.service_level_requirement}
                          onChange={(e) => updateConfig('facilities', { service_level_requirement: Number(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Required Facilities</label>
                        <input
                          type="number"
                          className="form-input"
                          value={config.facilities.required_facilities}
                          onChange={(e) => updateConfig('facilities', { required_facilities: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "2rem" }}>
                    <h4>Optimization Weights</h4>
                    <div className="grid grid-cols-2">
                      <div className="form-group">
                        <label className="form-label">Cost Weight</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          className="form-input"
                          value={config.weights.cost}
                          onChange={(e) => updateConfig('weights', { cost: Number(e.target.value) })}
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
                          value={config.weights.service_level}
                          onChange={(e) => updateConfig('weights', { service_level: Number(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Distance Weight</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          className="form-input"
                          value={config.weights.distance}
                          onChange={(e) => updateConfig('weights', { distance: Number(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Capacity Weight</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          className="form-input"
                          value={config.weights.capacity_utilization}
                          onChange={(e) => updateConfig('weights', { capacity_utilization: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
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
                            {results.averageTransitTime?.toFixed(1) || 0} hrs
                          </h4>
                          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Avg Transit Time</p>
                        </div>
                        <div className="card">
                          <h4 style={{ color: "#f59e0b", marginBottom: "0.5rem" }}>
                            {results.fuelEfficiency?.toFixed(1) || 0}%
                          </h4>
                          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Fuel Efficiency</p>
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
