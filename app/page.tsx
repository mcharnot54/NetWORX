"use client";

import Navigation from "@/components/Navigation";
import DatabaseStatus from "@/components/DatabaseStatus";
import {
  Activity,
  Database,
  Truck,
  Target,
  BarChart3,
  Settings,
  CheckCircle2,
  Circle,
  AlertCircle,
  Play,
  Package,
  FileText,
  MapPin,
  DollarSign,
  Gauge,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ReadinessTracker } from "@/lib/readiness-tracker";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  page: string;
  category: "data" | "warehouse" | "transport" | "inventory" | "config";
}

interface BaselineCosts {
  warehouse_costs: {
    operating_costs_other: { raw: number; formatted: string; percentage: string };
    total_labor_costs: { raw: number; formatted: string; percentage: string };
    rent_and_overhead: { raw: number; formatted: string; percentage: string };
    subtotal: { raw: number; formatted: string; percentage: string };
  };
  transport_costs: {
    freight_costs: { raw: number; formatted: string; percentage: string };
  };
  inventory_costs: {
    total_inventory_costs: { raw: number; formatted: string; percentage: string };
  };
  total_baseline: { raw: number; formatted: string; percentage: string };
}

export default function Dashboard() {
  const [baselineCosts, setBaselineCosts] = useState<BaselineCosts | null>(null);
  const [costsLoading, setCostsLoading] = useState(true);
  const [costsError, setCostsError] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    // Data Processing Requirements
    {
      id: "data-forecast",
      title: "Forecast Data Upload",
      description:
        "Upload historical demand/forecast data with year and volume columns",
      completed: false,
      required: true,
      page: "Data Processor",
      category: "data",
    },
    {
      id: "data-sku",
      title: "SKU Master Data",
      description:
        "Upload SKU data with units per case, cases per pallet, and volume information",
      completed: false,
      required: true,
      page: "Data Processor",
      category: "data",
    },
    {
      id: "data-network",
      title: "Network Locations",
      description:
        "Upload location data with city names, coordinates, and capacity information",
      completed: false,
      required: true,
      page: "Data Processor",
      category: "data",
    },
    {
      id: "data-validation",
      title: "Data Validation Complete",
      description:
        "All uploaded data has passed validation checks with acceptable quality rates",
      completed: false,
      required: true,
      page: "Data Processor",
      category: "data",
    },

    // Configuration Requirements
    {
      id: "config-constraints",
      title: "Business Constraints",
      description:
        "Define business rules, capacity limits, and operational constraints",
      completed: false,
      required: true,
      page: "Configuration",
      category: "config",
    },
    {
      id: "config-optimization",
      title: "Optimization Parameters",
      description:
        "Set solver settings, convergence criteria, and performance targets",
      completed: false,
      required: true,
      page: "Configuration",
      category: "config",
    },
    {
      id: "config-scenarios",
      title: "Scenario Definitions",
      description: "Configure scenario parameters and simulation settings",
      completed: false,
      required: false,
      page: "Configuration",
      category: "config",
    },

    // Warehouse Optimization Requirements
    {
      id: "warehouse-facilities",
      title: "Facility Configuration",
      description:
        "Define warehouse locations, capacities, and operational parameters",
      completed: false,
      required: true,
      page: "Warehouse Optimizer",
      category: "warehouse",
    },
    {
      id: "warehouse-costs",
      title: "Warehouse Cost Structure",
      description:
        "Input fixed costs, variable costs, and handling rates for each facility",
      completed: false,
      required: true,
      page: "Warehouse Optimizer",
      category: "warehouse",
    },
    {
      id: "warehouse-constraints",
      title: "Capacity Constraints",
      description:
        "Set storage limits, throughput constraints, and operational restrictions",
      completed: false,
      required: true,
      page: "Warehouse Optimizer",
      category: "warehouse",
    },
    {
      id: "warehouse-optimization",
      title: "Space Optimization Settings",
      description:
        "Configure space allocation algorithms and optimization objectives",
      completed: false,
      required: false,
      page: "Warehouse Optimizer",
      category: "warehouse",
    },

    // Transportation Requirements
    {
      id: "transport-lanes",
      title: "Transportation Lanes",
      description:
        "Define shipping lanes with origin-destination pairs and distances",
      completed: false,
      required: true,
      page: "Transport Optimizer",
      category: "transport",
    },
    {
      id: "transport-rates",
      title: "Freight Rate Structure",
      description:
        "Input transportation costs, fuel surcharges, and carrier rates",
      completed: false,
      required: true,
      page: "Transport Optimizer",
      category: "transport",
    },
    {
      id: "transport-modes",
      title: "Transportation Modes",
      description:
        "Configure available transportation modes and service levels",
      completed: false,
      required: true,
      page: "Transport Optimizer",
      category: "transport",
    },
    {
      id: "transport-constraints",
      title: "Routing Constraints",
      description:
        "Set capacity limits, transit time requirements, and routing restrictions",
      completed: false,
      required: true,
      page: "Transport Optimizer",
      category: "transport",
    },

    // Inventory Optimization Requirements
    {
      id: "inventory-stratification",
      title: "SKU Stratification",
      description: "Complete ABC analysis and demand variability assessment",
      completed: false,
      required: true,
      page: "Inventory Optimizer",
      category: "inventory",
    },
    {
      id: "inventory-service-levels",
      title: "Service Level Targets",
      description: "Define target service levels for different SKU categories",
      completed: false,
      required: true,
      page: "Inventory Optimizer",
      category: "inventory",
    },
    {
      id: "inventory-lead-times",
      title: "Lead Time Configuration",
      description: "Input supplier lead times and replenishment parameters",
      completed: false,
      required: true,
      page: "Inventory Optimizer",
      category: "inventory",
    },
    {
      id: "inventory-policies",
      title: "Inventory Policies",
      description:
        "Configure reorder points, safety stock policies, and ordering rules",
      completed: false,
      required: false,
      page: "Inventory Optimizer",
      category: "inventory",
    },
  ]);

  const [showDetails, setShowDetails] = useState(false);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Load baseline costs on component mount
  useEffect(() => {
    loadBaselineCosts();
  }, []);

  const loadBaselineCosts = async () => {
    try {
      setCostsLoading(true);
      setCostsError(null);
      const response = await fetch('/api/current-baseline-costs');
      const result = await response.json();

      if (result.success) {
        setBaselineCosts(result.baseline_costs);
      } else {
        setCostsError(result.error || 'Failed to load baseline costs');
      }
    } catch (error) {
      setCostsError('Error loading baseline costs');
      console.error('Error loading baseline costs:', error);
    } finally {
      setCostsLoading(false);
    }
  };

  // Calculate completion statistics
  const totalItems = checklistItems.length;
  const requiredItems = checklistItems.filter((item) => item.required);
  const completedItems = checklistItems.filter((item) => item.completed);
  const completedRequired = checklistItems.filter(
    (item) => item.completed && item.required,
  );

  const overallProgress = Math.round(
    (completedItems.length / totalItems) * 100,
  );
  const requiredProgress = Math.round(
    (completedRequired.length / requiredItems.length) * 100,
  );
  const isReadyForOptimization =
    completedRequired.length === requiredItems.length;

  // Group items by category
  const groupedItems = checklistItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>,
  );

  const categoryInfo = {
    data: { title: "Data Processing", icon: Database, color: "#3b82f6" },
    config: { title: "Configuration", icon: Settings, color: "#8b5cf6" },
    warehouse: {
      title: "Warehouse Optimization",
      icon: Target,
      color: "#10b981",
    },
    transport: { title: "Transportation", icon: Truck, color: "#f59e0b" },
    inventory: {
      title: "Inventory Management",
      icon: Package,
      color: "#ef4444",
    },
  };

  // Automatic readiness tracking based on actual system status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const performAutomaticUpdate = async () => {
      if (isAutoUpdating) return; // Prevent concurrent updates

      setIsAutoUpdating(true);
      try {
        console.log('Checking system status for automatic readiness update...');

        // Debug: Show current scenario selection
        const scenarioId = ReadinessTracker.getSelectedScenarioId();
        console.log('Selected scenario ID:', scenarioId);

        // Load any previously saved manual completions
        const savedProgress = ReadinessTracker.loadChecklistFromStorage();
        const baseItems = savedProgress || checklistItems;

        // Perform automatic update based on system status
        const updatedItems = await ReadinessTracker.performAutomaticUpdate(baseItems);
        setChecklistItems(updatedItems);
        setLastUpdateTime(new Date());

        console.log('Readiness checklist updated automatically');
      } catch (error) {
        console.error('Error in automatic readiness update:', error);
      } finally {
        setIsAutoUpdating(false);
      }
    };

    // Initial update
    performAutomaticUpdate();

    // Set up periodic updates every 15 seconds
    interval = setInterval(performAutomaticUpdate, 15000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []); // Only run once on mount

  // Manual refresh function
  const refreshReadinessStatus = async () => {
    if (isAutoUpdating) return;

    setIsAutoUpdating(true);
    try {
      const updatedItems = await ReadinessTracker.performAutomaticUpdate(checklistItems);
      setChecklistItems(updatedItems);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error refreshing readiness status:', error);
    } finally {
      setIsAutoUpdating(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setChecklistItems((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item,
      );
      // Save to localStorage using ReadinessTracker
      ReadinessTracker.saveChecklistToStorage(updated);
      return updated;
    });
  };

  const getCategoryProgress = (category: string) => {
    const categoryItems = groupedItems[category] || [];
    const completed = categoryItems.filter((item) => item.completed).length;
    return categoryItems.length > 0
      ? Math.round((completed / categoryItems.length) * 100)
      : 0;
  };

  const runOptimization = () => {
    if (isReadyForOptimization) {
      alert(
        "🚀 All required configurations are complete! Network optimization simulation would start here.",
      );
    } else {
      alert(
        "⚠️ Please complete all required checklist items before running optimization.",
      );
    }
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        {/* Welcome Section */}
        <div className="card">
          <h2 className="card-title">Welcome to NetWORX Essentials</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Your comprehensive network strategy optimization solution for
            warehouse space optimization and freight cost minimization.
          </p>

          {/* Database Status Component */}
          <DatabaseStatus />

          {/* Network Optimization Readiness Checklist */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "2px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: "0 0 0.5rem 0",
                    color: "#111827",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                  }}
                >
                  Network Optimization Readiness
                  {isAutoUpdating && (
                    <RefreshCw
                      size={16}
                      style={{
                        marginLeft: "0.5rem",
                        color: "#3b82f6",
                        animation: "spin 1s linear infinite"
                      }}
                    />
                  )}
                </h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p
                    style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}
                  >
                    Automatically tracks file uploads and system configuration
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    {lastUpdateTime && (
                      <span>
                        Last updated: {lastUpdateTime.toLocaleTimeString()}
                      </span>
                    )}
                    <button
                      onClick={refreshReadinessStatus}
                      disabled={isAutoUpdating}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        cursor: isAutoUpdating ? "not-allowed" : "pointer",
                        opacity: isAutoUpdating ? 0.6 : 1
                      }}
                    >
                      <RefreshCw size={12} />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={runOptimization}
                disabled={!isReadyForOptimization}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: isReadyForOptimization
                    ? "#10b981"
                    : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: isReadyForOptimization ? "pointer" : "not-allowed",
                  opacity: isReadyForOptimization ? 1 : 0.6,
                }}
              >
                <Play size={16} />
                {isReadyForOptimization ? "Run Optimization" : "Setup Required"}
              </button>
            </div>

            {/* Progress Summary */}
            <div
              className="grid grid-cols-4"
              style={{ marginBottom: "1.5rem" }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "1rem",
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: isReadyForOptimization ? "#10b981" : "#f59e0b",
                  }}
                >
                  {isReadyForOptimization ? "✓" : requiredProgress + "%"}
                </div>
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  Required Complete
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: "1rem",
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#3b82f6",
                  }}
                >
                  {completedRequired.length}/{requiredItems.length}
                </div>
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  Required Items
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: "1rem",
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#8b5cf6",
                  }}
                >
                  {completedItems.length}/{totalItems}
                </div>
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  Total Items
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: "1rem",
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#10b981",
                  }}
                >
                  {overallProgress}%
                </div>
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  Overall Progress
                </div>
              </div>
            </div>

            {/* Category Progress Bars */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h4 style={{ margin: 0, color: "#374151", fontSize: "1rem" }}>
                  Configuration Progress by Module
                </h4>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "transparent",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  {showDetails ? "Hide Details" : "Show Details"}
                  <ChevronRight
                    size={12}
                    style={{
                      transform: showDetails ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "0.75rem",
                }}
              >
                {Object.entries(categoryInfo).map(([category, info]) => {
                  const progress = getCategoryProgress(category);
                  const Icon = info.icon;
                  const categoryItems = groupedItems[category] || [];
                  const completedCount = categoryItems.filter(
                    (item) => item.completed,
                  ).length;

                  return (
                    <div
                      key={category}
                      style={{
                        backgroundColor: "white",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <Icon size={16} style={{ color: info.color }} />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          {info.title}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "4px",
                          backgroundColor: "#e5e7eb",
                          borderRadius: "2px",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            backgroundColor: info.color,
                            borderRadius: "2px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "0.625rem",
                          color: "#6b7280",
                          textAlign: "center",
                        }}
                      >
                        {completedCount}/{categoryItems.length} ({progress}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Checklist */}
            {showDetails && (
              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      color: "#374151",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                    }}
                  >
                    Detailed Configuration Checklist
                  </h4>
                </div>

                {Object.entries(groupedItems).map(([category, items]) => {
                  const info =
                    categoryInfo[category as keyof typeof categoryInfo];
                  const Icon = info.icon;

                  return (
                    <div
                      key={category}
                      style={{ borderBottom: "1px solid #f3f4f6" }}
                    >
                      <div
                        style={{
                          padding: "0.75rem 1rem",
                          backgroundColor: "#fafafa",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <Icon size={16} style={{ color: info.color }} />
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          {info.title}
                        </span>
                      </div>

                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          style={{
                            padding: "0.75rem 1rem",
                            borderBottom:
                              index < items.length - 1
                                ? "1px solid #f3f4f6"
                                : "none",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                          }}
                        >
                          <button
                            onClick={() => toggleItem(item.id)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              marginTop: "0.125rem",
                            }}
                          >
                            {item.completed ? (
                              <CheckCircle2
                                size={16}
                                style={{ color: "#10b981" }}
                              />
                            ) : (
                              <Circle size={16} style={{ color: "#d1d5db" }} />
                            )}
                          </button>

                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: "500",
                                  color: item.completed ? "#374151" : "#111827",
                                  textDecoration: item.completed
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {item.title}
                              </span>
                              {item.completed && (
                                <span
                                  style={{
                                    fontSize: "0.625rem",
                                    backgroundColor: "#dcfce7",
                                    color: "#166534",
                                    padding: "0.125rem 0.375rem",
                                    borderRadius: "0.25rem",
                                    fontWeight: "500",
                                    marginLeft: "0.5rem"
                                  }}
                                >
                                  AUTO-DETECTED
                                </span>
                              )}
                              {item.required && (
                                <span
                                  style={{
                                    fontSize: "0.625rem",
                                    backgroundColor: "#fef2f2",
                                    color: "#dc2626",
                                    padding: "0.125rem 0.375rem",
                                    borderRadius: "0.25rem",
                                    fontWeight: "500",
                                  }}
                                >
                                  REQUIRED
                                </span>
                              )}
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                lineHeight: "1.4",
                              }}
                            >
                              {item.description}
                            </p>
                            <div
                              style={{
                                marginTop: "0.25rem",
                                fontSize: "0.625rem",
                                color: "#9ca3af",
                              }}
                            >
                              Configure in: {item.page}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Module Overview Grid */}
          <div className="grid grid-cols-3">
            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Database size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>Data Processor</h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Upload and process Excel/CSV files with comprehensive data
                validation and conversion utilities.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Target size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>
                  Warehouse Optimizer
                </h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Optimize warehouse space allocation and capacity planning with
                advanced algorithms.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Truck size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>
                  Transport Optimizer
                </h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Minimize transportation costs and optimize routing strategies
                across your network.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <BarChart3 size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>
                  Results & Visualization
                </h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Generate comprehensive reports and interactive visualizations of
                optimization results.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Settings size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>Configuration</h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Manage system settings, validation schemas, and output
                templates.
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Activity size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>System Status</h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Monitor system performance and view processing logs and
                activity.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
