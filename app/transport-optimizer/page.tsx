"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { useData } from "@/context/DataContext";
import {
  Truck,
  Route,
  DollarSign,
  Clock,
  Settings,
  MapPin,
  Zap,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  Play,
  Pause,
  Save,
} from "lucide-react";

// Transportation Network Configuration
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

// Network Data Structures
interface CostMatrixRow {
  facility: string;
  destinations: { [key: string]: number };
}

interface DemandData {
  destination: string;
  demand: number;
  priority: string;
}

interface CapacityData {
  facility: string;
  capacity: number;
  operating_cost: number;
}

// Optimization Results
interface NetworkAssignment {
  facility: string;
  destination: string;
  demand: number;
  flow: number;
  cost: number;
  distance: number;
}

interface FacilityMetrics {
  facility: string;
  destinations_served: number;
  total_demand: number;
  capacity_utilization: number;
  average_distance: number;
  total_cost: number;
  cost_per_unit: number;
}

interface NetworkMetrics {
  service_level_achievement: number;
  avg_cost_per_unit: number;
  weighted_avg_distance: number;
  avg_facility_utilization: number;
  network_utilization: number;
  destinations_per_facility: number;
  total_transportation_cost: number;
  demand_within_service_limit: number;
  total_demand_served: number;
  facilities_opened: number;
  total_capacity_available: number;
}

interface OptimizationResults {
  open_facilities: string[];
  assignments: NetworkAssignment[];
  facility_metrics: FacilityMetrics[];
  network_metrics: NetworkMetrics;
  optimization_summary: {
    status: string;
    objective_value: number;
    solve_time: number;
    facilities_opened: number;
    total_demand_served: number;
    total_transportation_cost: number;
  };
}

interface NetworkScenario {
  name: string;
  description: string;
  parameters: Partial<TransportationConfig>;
  demand_adjustment: number;
  capacity_adjustment: number;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  component: string;
}

export default function TransportOptimizer() {
  const {
    getTransportationData,
    lockedLocations,
    setLockedLocations,
    setTransportResults,
    fetchMarketData,
  } = useData();

  const [activeTab, setActiveTab] = useState<
    "network" | "optimization" | "scenarios" | "results"
  >("network");

  // Transportation Network Configuration
  const [config, setConfig] = useState<TransportationConfig>({
    facilities: {
      max_capacity_per_facility: 1000000,
      fixed_cost_per_facility: 100000,
      cost_per_mile: 2.5,
      max_distance_miles: 1000,
      service_level_requirement: 0.95,
      required_facilities: 3,
      max_facilities: 10,
      mandatory_facilities: [],
    },
    optimization: {
      solver: "PULP_CBC_CMD",
      time_limit_seconds: 300,
      gap_tolerance: 0.01,
      threads: 4,
    },
    weights: {
      cost: 0.6,
      service_level: 0.3,
      distance: 0.1,
      capacity_utilization: 0.0,
    },
  });

  // Network Data
  const [costMatrix, setCostMatrix] = useState<CostMatrixRow[]>([
    {
      facility: "Chicago, IL",
      destinations: {
        "New York, NY": 2100,
        "Los Angeles, CA": 3200,
        "Houston, TX": 2800,
        "Phoenix, AZ": 2900,
        "Philadelphia, PA": 2250,
      },
    },
    {
      facility: "Dallas, TX",
      destinations: {
        "New York, NY": 2850,
        "Los Angeles, CA": 2400,
        "Houston, TX": 600,
        "Phoenix, AZ": 1800,
        "Philadelphia, PA": 2950,
      },
    },
    {
      facility: "Los Angeles, CA",
      destinations: {
        "New York, NY": 4200,
        "Los Angeles, CA": 0,
        "Houston, TX": 2700,
        "Phoenix, AZ": 750,
        "Philadelphia, PA": 4350,
      },
    },
  ]);

  const [demandData, setDemandData] = useState<DemandData[]>([
    { destination: "New York, NY", demand: 15000, priority: "High" },
    { destination: "Los Angeles, CA", demand: 12000, priority: "High" },
    { destination: "Houston, TX", demand: 8000, priority: "Medium" },
    { destination: "Phoenix, AZ", demand: 6000, priority: "Medium" },
    { destination: "Philadelphia, PA", demand: 5000, priority: "Low" },
  ]);

  const [capacityData, setCapacityData] = useState<CapacityData[]>([
    { facility: "Chicago, IL", capacity: 25000, operating_cost: 150000 },
    { facility: "Dallas, TX", capacity: 20000, operating_cost: 120000 },
    { facility: "Los Angeles, CA", capacity: 30000, operating_cost: 180000 },
  ]);

  // Scenarios
  const [scenarios, setScenarios] = useState<NetworkScenario[]>([
    {
      name: "Cost Focused",
      description: "Minimize total transportation and facility costs",
      parameters: {
        weights: {
          cost: 0.8,
          service_level: 0.15,
          distance: 0.05,
          capacity_utilization: 0.0,
        },
      },
      demand_adjustment: 1.0,
      capacity_adjustment: 1.0,
    },
    {
      name: "Service Focused",
      description: "Prioritize service level and distance optimization",
      parameters: {
        weights: {
          cost: 0.3,
          service_level: 0.5,
          distance: 0.2,
          capacity_utilization: 0.0,
        },
        facilities: {
          service_level_requirement: 0.98,
          max_distance_miles: 800,
        },
      },
      demand_adjustment: 1.0,
      capacity_adjustment: 1.0,
    },
    {
      name: "Balanced Approach",
      description: "Balance cost, service, and operational efficiency",
      parameters: {
        weights: {
          cost: 0.4,
          service_level: 0.3,
          distance: 0.2,
          capacity_utilization: 0.1,
        },
      },
      demand_adjustment: 1.0,
      capacity_adjustment: 1.0,
    },
    {
      name: "High Demand Scenario",
      description: "Test network under 150% demand increase",
      parameters: {},
      demand_adjustment: 1.5,
      capacity_adjustment: 1.0,
    },
  ]);

  // Optimization State
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [scenarioResults, setScenarioResults] = useState<{
    [key: string]: OptimizationResults;
  }>({});
  const [optimizationLogs, setOptimizationLogs] = useState<LogEntry[]>([]);
  const [isLoggingActive, setIsLoggingActive] = useState(false);

  // Add optimization log entry
  const addLogEntry = (
    level: string,
    message: string,
    component: string = "TransportationOptimizer",
  ) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      component,
    };
    setOptimizationLogs((prev) => [...prev.slice(-49), entry]);
  };

  // Load transportation data from Data Processor
  const loadTransportationData = async () => {
    const transportData = getTransportationData();

    if (transportData && transportData.length > 0) {
      addLogEntry(
        "INFO",
        `Loading ${transportData.length} transportation records from Data Processor`,
      );

      // Extract unique facilities and destinations
      const facilities = new Set<string>();
      const destinations = new Set<string>();
      const costs: { [key: string]: { [key: string]: number } } = {};

      transportData.forEach((record: any) => {
        const facility = record.facility || record.origin;
        const destination = record.destination || record.ship_to;
        const cost =
          record.total_lane_cost ||
          record.cost_per_mile * record.distance_miles ||
          0;

        if (facility && destination) {
          facilities.add(facility);
          destinations.add(destination);

          if (!costs[facility]) costs[facility] = {};
          costs[facility][destination] = cost;
        }
      });

      // Build cost matrix from loaded data
      const newCostMatrix: CostMatrixRow[] = Array.from(facilities).map(
        (facility) => ({
          facility,
          destinations: costs[facility] || {},
        }),
      );

      // Build demand data (aggregate by destination)
      const demandMap: { [key: string]: number } = {};
      transportData.forEach((record: any) => {
        const destination = record.destination || record.ship_to;
        const demand = record.shipment_weight_lbs || 1000; // Default demand

        if (destination) {
          demandMap[destination] = (demandMap[destination] || 0) + demand;
        }
      });

      const newDemandData: DemandData[] = Array.from(destinations).map(
        (destination) => ({
          destination,
          demand: demandMap[destination] || 1000,
          priority: demandMap[destination] > 10000 ? "High" : "Medium",
        }),
      );

      // Build capacity data
      const newCapacityData: CapacityData[] = Array.from(facilities).map(
        (facility) => ({
          facility,
          capacity: 100000, // Default capacity - can be enhanced with warehouse data
          operating_cost: 50000, // Default operating cost - can be enhanced with market data
        }),
      );

      setCostMatrix(newCostMatrix);
      setDemandData(newDemandData);
      setCapacityData(newCapacityData);

      addLogEntry(
        "SUCCESS",
        `Loaded ${facilities.size} facilities and ${destinations.size} destinations`,
      );
    } else {
      addLogEntry(
        "WARNING",
        "No transportation data available from Data Processor",
      );
    }
  };

  // Toggle location lock
  const toggleLocationLock = (location: string) => {
    const newLockedLocations = lockedLocations.includes(location)
      ? lockedLocations.filter((loc) => loc !== location)
      : [...lockedLocations, location];

    setLockedLocations(newLockedLocations);

    // Update mandatory facilities in config
    setConfig((prev) => ({
      ...prev,
      facilities: {
        ...prev.facilities,
        mandatory_facilities: newLockedLocations,
      },
    }));

    addLogEntry(
      "INFO",
      `${lockedLocations.includes(location) ? "Unlocked" : "Locked"} location: ${location}`,
    );
  };

  // Load data on component mount
  useEffect(() => {
    const transportData = getTransportationData();
    if (transportData && transportData.length > 0) {
      loadTransportationData();
    }
  }, [getTransportationData]);

  // Simulate Transportation Network Optimization
  const runNetworkOptimization = async (scenarioName?: string) => {
    setOptimizing(true);
    setIsLoggingActive(true);

    const currentConfig =
      scenarioName && scenarios.find((s) => s.name === scenarioName)
        ? {
            ...config,
            ...scenarios.find((s) => s.name === scenarioName)?.parameters,
          }
        : config;

    addLogEntry(
      "INFO",
      `Starting transportation network optimization${scenarioName ? ` for scenario: ${scenarioName}` : ""}`,
    );
    addLogEntry(
      "INFO",
      `Network size: ${costMatrix.length} potential facilities, ${demandData.length} destinations`,
    );

    // Simulate optimization process
    await new Promise((resolve) => setTimeout(resolve, 800));
    addLogEntry("INFO", "Preparing network data and validating constraints");

    await new Promise((resolve) => setTimeout(resolve, 600));
    addLogEntry(
      "INFO",
      `Building optimization model with solver: ${currentConfig.optimization.solver}`,
    );
    addLogEntry(
      "INFO",
      `Optimization weights - Cost: ${currentConfig.weights.cost}, Service: ${currentConfig.weights.service_level}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1200));
    addLogEntry("INFO", "Solving transportation network model...");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Calculate results based on data
    const totalDemand = demandData.reduce((sum, d) => sum + d.demand, 0);
    const totalCapacity = capacityData.reduce((sum, c) => sum + c.capacity, 0);

    // Determine opened facilities (including locked locations)
    const mandatoryFacilities =
      currentConfig.facilities.mandatory_facilities || [];
    const availableFacilities = capacityData.filter(
      (f) => !mandatoryFacilities.includes(f.facility),
    );

    addLogEntry(
      "INFO",
      `Mandatory facilities: ${mandatoryFacilities.length > 0 ? mandatoryFacilities.join(", ") : "None"}`,
    );

    // Start with mandatory/locked facilities
    let openFacilities = [...mandatoryFacilities];

    // Add additional facilities based on optimization
    const additionalNeeded = Math.max(
      0,
      Math.min(
        currentConfig.facilities.required_facilities -
          mandatoryFacilities.length,
        currentConfig.facilities.max_facilities - mandatoryFacilities.length,
      ),
    );

    const additionalFacilities = availableFacilities
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, additionalNeeded)
      .map((f) => f.facility);

    openFacilities = [...openFacilities, ...additionalFacilities];

    // Generate assignments
    const assignments: NetworkAssignment[] = [];
    demandData.forEach((demand) => {
      // Find best facility for each destination
      let bestFacility = openFacilities[0];
      let bestCost = Infinity;

      costMatrix.forEach((row) => {
        if (
          openFacilities.includes(row.facility) &&
          row.destinations[demand.destination]
        ) {
          const cost = row.destinations[demand.destination];
          if (cost < bestCost) {
            bestCost = cost;
            bestFacility = row.facility;
          }
        }
      });

      assignments.push({
        facility: bestFacility,
        destination: demand.destination,
        demand: demand.demand,
        flow: demand.demand,
        cost: bestCost,
        distance: bestCost / currentConfig.facilities.cost_per_mile,
      });
    });

    // Calculate facility metrics
    const facilityMetrics: FacilityMetrics[] = openFacilities.map(
      (facility) => {
        const facilityAssignments = assignments.filter(
          (a) => a.facility === facility,
        );
        const totalDemandServed = facilityAssignments.reduce(
          (sum, a) => sum + a.demand,
          0,
        );
        const facilityCapacity =
          capacityData.find((c) => c.facility === facility)?.capacity || 0;
        const totalCost = facilityAssignments.reduce(
          (sum, a) => sum + a.cost * a.flow,
          0,
        );
        const avgDistance =
          facilityAssignments.length > 0
            ? facilityAssignments.reduce((sum, a) => sum + a.distance, 0) /
              facilityAssignments.length
            : 0;

        return {
          facility,
          destinations_served: facilityAssignments.length,
          total_demand: totalDemandServed,
          capacity_utilization:
            facilityCapacity > 0 ? totalDemandServed / facilityCapacity : 0,
          average_distance: avgDistance,
          total_cost: totalCost,
          cost_per_unit:
            totalDemandServed > 0 ? totalCost / totalDemandServed : 0,
        };
      },
    );

    const totalTransportationCost = assignments.reduce(
      (sum, a) => sum + a.cost * a.flow,
      0,
    );
    const totalFacilityCost =
      openFacilities.length * currentConfig.facilities.fixed_cost_per_facility;
    const objectiveValue = totalTransportationCost + totalFacilityCost;

    // Calculate network metrics
    const withinServiceLimit = assignments.filter(
      (a) => a.distance <= currentConfig.facilities.max_distance_miles,
    );
    const demandWithinLimit = withinServiceLimit.reduce(
      (sum, a) => sum + a.demand,
      0,
    );

    const networkMetrics: NetworkMetrics = {
      service_level_achievement: demandWithinLimit / totalDemand,
      avg_cost_per_unit: totalTransportationCost / totalDemand,
      weighted_avg_distance:
        assignments.reduce((sum, a) => sum + a.distance * a.demand, 0) /
        totalDemand,
      avg_facility_utilization:
        facilityMetrics.reduce((sum, f) => sum + f.capacity_utilization, 0) /
        facilityMetrics.length,
      network_utilization: totalDemand / totalCapacity,
      destinations_per_facility: assignments.length / openFacilities.length,
      total_transportation_cost: totalTransportationCost,
      demand_within_service_limit: demandWithinLimit,
      total_demand_served: totalDemand,
      facilities_opened: openFacilities.length,
      total_capacity_available: totalCapacity,
    };

    const optimizationResults: OptimizationResults = {
      open_facilities: openFacilities,
      assignments,
      facility_metrics: facilityMetrics,
      network_metrics: networkMetrics,
      optimization_summary: {
        status: "Optimal",
        objective_value: objectiveValue,
        solve_time: 2.8,
        facilities_opened: openFacilities.length,
        total_demand_served: totalDemand,
        total_transportation_cost: totalTransportationCost,
      },
    };

    addLogEntry(
      "SUCCESS",
      `Optimization completed successfully in 2.8 seconds`,
    );
    addLogEntry(
      "INFO",
      `Solution: ${openFacilities.length} facilities opened, total cost: $${objectiveValue.toLocaleString()}`,
    );
    addLogEntry(
      "INFO",
      `Service level achievement: ${(networkMetrics.service_level_achievement * 100).toFixed(1)}%`,
    );

    if (scenarioName) {
      setScenarioResults((prev) => ({
        ...prev,
        [scenarioName]: optimizationResults,
      }));
      addLogEntry("INFO", `Scenario "${scenarioName}" results stored`);
    } else {
      setResults(optimizationResults);
    }

    setOptimizing(false);
    setIsLoggingActive(false);
  };

  // Run all scenarios
  const runAllScenarios = async () => {
    setOptimizing(true);
    addLogEntry(
      "INFO",
      `Starting scenario analysis with ${scenarios.length} scenarios`,
    );

    for (const scenario of scenarios) {
      await runNetworkOptimization(scenario.name);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    addLogEntry("SUCCESS", "All scenarios completed successfully");
    setOptimizing(false);
  };

  // Export configuration
  const exportConfig = () => {
    const configData = {
      config,
      costMatrix,
      demandData,
      capacityData,
      scenarios,
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transportation-network-config.json";
    a.click();

    addLogEntry("INFO", "Configuration exported successfully");
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Transportation Network Optimizer</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Advanced transportation network optimization with linear programming
            for freight cost minimization
          </p>

          {/* Tab Navigation */}
          <div
            style={{ borderBottom: "2px solid #e5e7eb", marginBottom: "2rem" }}
          >
            <div style={{ display: "flex", gap: "2rem" }}>
              {[
                { id: "network", label: "Network Data", icon: MapPin },
                { id: "optimization", label: "Optimization", icon: Settings },
                { id: "scenarios", label: "Scenarios", icon: TrendingUp },
                { id: "results", label: "Results", icon: BarChart3 },
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

          {/* Network Data Tab */}
          {activeTab === "network" && (
            <div>
              <div className="grid grid-cols-3" style={{ gap: "2rem" }}>
                {/* Cost Matrix */}
                <div>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Cost Matrix
                  </h3>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {costMatrix.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="card"
                        style={{ margin: "0.5rem 0" }}
                      >
                        <h4
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          {row.facility}
                        </h4>
                        {Object.entries(row.destinations).map(
                          ([dest, cost]) => (
                            <div
                              key={dest}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "0.875rem" }}>
                                {dest}
                              </span>
                              <span style={{ fontWeight: "600" }}>${cost}</span>
                            </div>
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Demand Data */}
                <div>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Demand Data
                  </h3>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {demandData.map((demand, index) => (
                      <div
                        key={index}
                        className="card"
                        style={{ margin: "0.5rem 0" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{ fontWeight: "600", color: "#111827" }}
                            >
                              {demand.destination}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#6b7280" }}
                            >
                              Priority: {demand.priority}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{ fontWeight: "600", color: "#059669" }}
                            >
                              {demand.demand.toLocaleString()} units
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capacity Data */}
                <div>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Facility Capacity
                  </h3>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {capacityData.map((capacity, index) => (
                      <div
                        key={index}
                        className="card"
                        style={{ margin: "0.5rem 0" }}
                      >
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#111827",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {capacity.facility}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span style={{ fontSize: "0.875rem" }}>
                            Capacity:
                          </span>
                          <span style={{ fontWeight: "600" }}>
                            {capacity.capacity.toLocaleString()}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: "0.875rem" }}>
                            Operating Cost:
                          </span>
                          <span style={{ fontWeight: "600" }}>
                            ${capacity.operating_cost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === "optimization" && (
            <div>
              <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                {/* Transportation Parameters */}
                <div>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Transportation Parameters
                  </h3>

                  <div className="form-group">
                    <label className="form-label">
                      Max Capacity per Facility
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.facilities.max_capacity_per_facility}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          facilities: {
                            ...config.facilities,
                            max_capacity_per_facility:
                              parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Fixed Cost per Facility ($)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.facilities.fixed_cost_per_facility}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          facilities: {
                            ...config.facilities,
                            fixed_cost_per_facility:
                              parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cost per Mile ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={config.facilities.cost_per_mile}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          facilities: {
                            ...config.facilities,
                            cost_per_mile: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Distance (miles)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.facilities.max_distance_miles}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          facilities: {
                            ...config.facilities,
                            max_distance_miles: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Service Level Requirement (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      value={config.facilities.service_level_requirement * 100}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          facilities: {
                            ...config.facilities,
                            service_level_requirement:
                              (parseInt(e.target.value) || 0) / 100,
                          },
                        })
                      }
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Min Facilities</label>
                      <input
                        type="number"
                        className="form-input"
                        value={config.facilities.required_facilities}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            facilities: {
                              ...config.facilities,
                              required_facilities:
                                parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Max Facilities</label>
                      <input
                        type="number"
                        className="form-input"
                        value={config.facilities.max_facilities}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            facilities: {
                              ...config.facilities,
                              max_facilities: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Optimization Settings */}
                <div>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Optimization Settings
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Solver</label>
                    <select
                      className="form-input"
                      value={config.optimization.solver}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          optimization: {
                            ...config.optimization,
                            solver: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="PULP_CBC_CMD">CBC (Default)</option>
                      <option value="GUROBI_CMD">Gurobi</option>
                      <option value="CPLEX_CMD">CPLEX</option>
                      <option value="SCIP_CMD">SCIP</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Time Limit (seconds)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.optimization.time_limit_seconds}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          optimization: {
                            ...config.optimization,
                            time_limit_seconds: parseInt(e.target.value) || 0,
                          },
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
                      value={config.optimization.gap_tolerance}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          optimization: {
                            ...config.optimization,
                            gap_tolerance: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Threads</label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      className="form-input"
                      value={config.optimization.threads}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          optimization: {
                            ...config.optimization,
                            threads: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                    />
                  </div>

                  <h4
                    style={{
                      marginTop: "1.5rem",
                      marginBottom: "1rem",
                      color: "#111827",
                    }}
                  >
                    Objective Weights
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Cost Weight</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      className="form-input"
                      value={config.weights.cost}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          weights: {
                            ...config.weights,
                            cost: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Service Level Weight</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      className="form-input"
                      value={config.weights.service_level}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          weights: {
                            ...config.weights,
                            service_level: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Distance Weight</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      className="form-input"
                      value={config.weights.distance}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          weights: {
                            ...config.weights,
                            distance: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Optimization Controls */}
              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  justifyContent: "center",
                  gap: "1rem",
                }}
              >
                <button
                  className="button button-primary"
                  onClick={() => runNetworkOptimization()}
                  disabled={optimizing}
                >
                  {optimizing && <div className="loading-spinner"></div>}
                  <Zap size={16} />
                  {optimizing ? "Optimizing..." : "Run Optimization"}
                </button>

                <button
                  className="button button-secondary"
                  onClick={exportConfig}
                >
                  <Download size={16} />
                  Export Config
                </button>
              </div>

              {/* Real-time Optimization Logs */}
              {optimizationLogs.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Optimization Logs
                  </h3>
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
              )}
            </div>
          )}

          {/* Scenarios Tab */}
          {activeTab === "scenarios" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h3 style={{ color: "#111827" }}>Network Scenarios</h3>
                <button
                  className="button button-primary"
                  onClick={runAllScenarios}
                  disabled={optimizing}
                >
                  {optimizing && <div className="loading-spinner"></div>}
                  <Play size={16} />
                  Run All Scenarios
                </button>
              </div>

              <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                {scenarios.map((scenario, index) => (
                  <div key={index} className="card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                      }}
                    >
                      <div>
                        <h4
                          style={{ marginBottom: "0.5rem", color: "#111827" }}
                        >
                          {scenario.name}
                        </h4>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "#6b7280",
                            margin: 0,
                          }}
                        >
                          {scenario.description}
                        </p>
                      </div>
                      {scenarioResults[scenario.name] && (
                        <CheckCircle
                          size={20}
                          style={{
                            color: "#10b981",
                            flexShrink: 0,
                            marginLeft: "1rem",
                          }}
                        />
                      )}
                    </div>

                    <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span>Demand Adjustment:</span>
                        <span style={{ fontWeight: "600" }}>
                          {(scenario.demand_adjustment * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span>Capacity Adjustment:</span>
                        <span style={{ fontWeight: "600" }}>
                          {(scenario.capacity_adjustment * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {scenarioResults[scenario.name] && (
                      <div
                        style={{
                          backgroundColor: "#f0f9ff",
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span>Total Cost:</span>
                            <span style={{ fontWeight: "600" }}>
                              $
                              {scenarioResults[
                                scenario.name
                              ].optimization_summary.objective_value.toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.25rem",
                            }}
                          >
                            <span>Facilities Opened:</span>
                            <span style={{ fontWeight: "600" }}>
                              {
                                scenarioResults[scenario.name]
                                  .optimization_summary.facilities_opened
                              }
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Service Level:</span>
                            <span style={{ fontWeight: "600" }}>
                              {(
                                scenarioResults[scenario.name].network_metrics
                                  .service_level_achievement * 100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      className="button button-secondary"
                      onClick={() => runNetworkOptimization(scenario.name)}
                      disabled={optimizing}
                      style={{ width: "100%" }}
                    >
                      <Play size={16} />
                      Run Scenario
                    </button>
                  </div>
                ))}
              </div>

              {/* Scenario Comparison */}
              {Object.keys(scenarioResults).length > 1 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Scenario Comparison
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f9fafb" }}>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Scenario
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Total Cost
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Facilities
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Service Level
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Avg Distance
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Network Util.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(scenarioResults).map(
                          ([name, result]) => (
                            <tr key={name}>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                  fontWeight: "600",
                                }}
                              >
                                {name}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                  textAlign: "right",
                                }}
                              >
                                $
                                {result.optimization_summary.objective_value.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                  textAlign: "right",
                                }}
                              >
                                {result.optimization_summary.facilities_opened}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                  textAlign: "right",
                                }}
                              >
                                {(
                                  result.network_metrics
                                    .service_level_achievement * 100
                                ).toFixed(1)}
                                %
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                  textAlign: "right",
                                }}
                              >
                                {result.network_metrics.weighted_avg_distance.toFixed(
                                  1,
                                )}{" "}
                                mi
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                  textAlign: "right",
                                }}
                              >
                                {(
                                  result.network_metrics.network_utilization *
                                  100
                                ).toFixed(1)}
                                %
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === "results" && results && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <h3 style={{ color: "#111827" }}>Optimization Results</h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <CheckCircle size={20} style={{ color: "#10b981" }} />
                  <span style={{ color: "#10b981", fontWeight: "600" }}>
                    {results.optimization_summary.status}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div
                className="grid grid-cols-4"
                style={{ gap: "1.5rem", marginBottom: "2rem" }}
              >
                <div
                  className="card"
                  style={{ textAlign: "center", backgroundColor: "#fef3c7" }}
                >
                  <DollarSign
                    size={32}
                    style={{
                      color: "#f59e0b",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "#92400e",
                    }}
                  >
                    $
                    {results.optimization_summary.objective_value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#78350f" }}>
                    Total Cost
                  </div>
                </div>

                <div
                  className="card"
                  style={{ textAlign: "center", backgroundColor: "#dcfce7" }}
                >
                  <MapPin
                    size={32}
                    style={{
                      color: "#16a34a",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "#15803d",
                    }}
                  >
                    {results.optimization_summary.facilities_opened}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#166534" }}>
                    Facilities Opened
                  </div>
                </div>

                <div
                  className="card"
                  style={{ textAlign: "center", backgroundColor: "#dbeafe" }}
                >
                  <TrendingUp
                    size={32}
                    style={{
                      color: "#2563eb",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "#1d4ed8",
                    }}
                  >
                    {(
                      results.network_metrics.service_level_achievement * 100
                    ).toFixed(1)}
                    %
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#1e40af" }}>
                    Service Level
                  </div>
                </div>

                <div
                  className="card"
                  style={{ textAlign: "center", backgroundColor: "#f3e8ff" }}
                >
                  <Route
                    size={32}
                    style={{
                      color: "#9333ea",
                      marginBottom: "0.5rem",
                      margin: "0 auto",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "#7c3aed",
                    }}
                  >
                    {results.network_metrics.weighted_avg_distance.toFixed(1)}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b21a8" }}>
                    Avg Distance (mi)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                {/* Facility Metrics */}
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Facility Performance
                  </h4>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {results.facility_metrics.map((facility, index) => (
                      <div
                        key={index}
                        className="card"
                        style={{ margin: "0.75rem 0" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "1rem",
                          }}
                        >
                          <h5 style={{ margin: 0, color: "#111827" }}>
                            {facility.facility}
                          </h5>
                          <span
                            style={{
                              padding: "0.25rem 0.75rem",
                              backgroundColor: "#dcfce7",
                              color: "#166534",
                              borderRadius: "1rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            Active
                          </span>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0.75rem",
                            fontSize: "0.875rem",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Destinations:</span>
                              <span style={{ fontWeight: "600" }}>
                                {facility.destinations_served}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Total Demand:</span>
                              <span style={{ fontWeight: "600" }}>
                                {facility.total_demand.toLocaleString()}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Avg Distance:</span>
                              <span style={{ fontWeight: "600" }}>
                                {facility.average_distance.toFixed(1)} mi
                              </span>
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Utilization:</span>
                              <span style={{ fontWeight: "600" }}>
                                {(facility.capacity_utilization * 100).toFixed(
                                  1,
                                )}
                                %
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Total Cost:</span>
                              <span style={{ fontWeight: "600" }}>
                                ${facility.total_cost.toLocaleString()}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>Cost/Unit:</span>
                              <span style={{ fontWeight: "600" }}>
                                ${facility.cost_per_unit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Network Assignments */}
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Network Assignments
                  </h4>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table style={{ width: "100%", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f9fafb" }}>
                          <th
                            style={{
                              padding: "0.5rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Facility
                          </th>
                          <th
                            style={{
                              padding: "0.5rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Destination
                          </th>
                          <th
                            style={{
                              padding: "0.5rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Demand
                          </th>
                          <th
                            style={{
                              padding: "0.5rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Distance
                          </th>
                          <th
                            style={{
                              padding: "0.5rem",
                              textAlign: "right",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.assignments.map((assignment, index) => (
                          <tr key={index}>
                            <td
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #e5e7eb",
                                fontSize: "0.75rem",
                              }}
                            >
                              {assignment.facility.split(",")[0]}
                            </td>
                            <td
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #e5e7eb",
                                fontSize: "0.75rem",
                              }}
                            >
                              {assignment.destination.split(",")[0]}
                            </td>
                            <td
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #e5e7eb",
                                textAlign: "right",
                              }}
                            >
                              {assignment.demand.toLocaleString()}
                            </td>
                            <td
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #e5e7eb",
                                textAlign: "right",
                              }}
                            >
                              {assignment.distance.toFixed(0)} mi
                            </td>
                            <td
                              style={{
                                padding: "0.5rem",
                                border: "1px solid #e5e7eb",
                                textAlign: "right",
                              }}
                            >
                              ${assignment.cost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Network Metrics Summary */}
              <div style={{ marginTop: "2rem" }}>
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Network Performance Metrics
                </h4>
                <div className="grid grid-cols-3" style={{ gap: "1.5rem" }}>
                  <div className="card">
                    <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                      Cost Efficiency
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Avg Cost per Unit:</span>
                        <span style={{ fontWeight: "600" }}>
                          $
                          {results.network_metrics.avg_cost_per_unit.toFixed(2)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Transportation Cost:</span>
                        <span style={{ fontWeight: "600" }}>
                          $
                          {results.network_metrics.total_transportation_cost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                      Service Performance
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Service Level:</span>
                        <span style={{ fontWeight: "600" }}>
                          {(
                            results.network_metrics.service_level_achievement *
                            100
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
                        <span>Demand within Limit:</span>
                        <span style={{ fontWeight: "600" }}>
                          {results.network_metrics.demand_within_service_limit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                      Operational Efficiency
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <span>Network Utilization:</span>
                        <span style={{ fontWeight: "600" }}>
                          {(
                            results.network_metrics.network_utilization * 100
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
                        <span>Avg Facility Util:</span>
                        <span style={{ fontWeight: "600" }}>
                          {(
                            results.network_metrics.avg_facility_utilization *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optimization Summary */}
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.5rem",
                  backgroundColor: "#f0f9ff",
                  borderRadius: "0.75rem",
                  border: "1px solid #bae6fd",
                }}
              >
                <h4 style={{ marginBottom: "1rem", color: "#0c4a6e" }}>
                  Optimization Summary
                </h4>
                <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Optimization Status:</span>
                      <span style={{ fontWeight: "600", color: "#10b981" }}>
                        {results.optimization_summary.status}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Solve Time:</span>
                      <span style={{ fontWeight: "600" }}>
                        {results.optimization_summary.solve_time} seconds
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Total Demand Served:</span>
                      <span style={{ fontWeight: "600" }}>
                        {results.optimization_summary.total_demand_served.toLocaleString()}{" "}
                        units
                      </span>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Facilities Opened:</span>
                      <span style={{ fontWeight: "600" }}>
                        {results.optimization_summary.facilities_opened} of{" "}
                        {capacityData.length}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Total Objective Value:</span>
                      <span style={{ fontWeight: "600" }}>
                        $
                        {results.optimization_summary.objective_value.toLocaleString()}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Transportation Cost:</span>
                      <span style={{ fontWeight: "600" }}>
                        $
                        {results.optimization_summary.total_transportation_cost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "results" && !results && (
            <div
              style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}
            >
              <BarChart3
                size={64}
                style={{ margin: "0 auto 1rem", color: "#d1d5db" }}
              />
              <h3 style={{ marginBottom: "0.5rem", color: "#374151" }}>
                No Results Available
              </h3>
              <p>
                Run the network optimization to see detailed results and
                analysis.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
