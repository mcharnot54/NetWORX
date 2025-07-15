"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  ReferenceLine,
  Brush,
  ReferenceArea,
} from "recharts";
import {
  Download,
  RefreshCw,
  Filter,
  TrendingUp,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Database,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  BookOpen,
  Globe,
  Settings,
  Users,
  Target,
  Zap,
  Activity,
  Layers,
  TrendingDown,
  DollarSign,
  MapPin,
  Gauge,
  Eye,
} from "lucide-react";

// Comprehensive Result Data Structures
interface WarehouseResults {
  results_df: Array<{
    Year: number;
    Facilities_Needed: number;
    Gross_Area_SqFt: number;
    Total_Cost_Annual: number;
    ThirdParty_SqFt_Required: number;
    Utilization_Percentage: number;
    Volume_Growth_Rate: number;
  }>;
  optimization_summary: {
    status: string;
    objective_value: number;
    total_facilities_added: number;
    total_thirdparty_space: number;
    solve_time: number;
  };
  performance_metrics: {
    avg_utilization: number;
    avg_cost_per_unit: number;
    thirdparty_dependency: number;
    volume_cagr: number;
  };
  yearly_details: { [year: string]: any };
}

interface TransportationResults {
  assignments_df: Array<{
    Facility: string;
    Destination: string;
    Demand: number;
    Flow: number;
    Cost: number;
    Distance: number;
  }>;
  facility_metrics_df: Array<{
    Facility: string;
    Destinations_Served: number;
    Total_Demand: number;
    Capacity_Utilization: number;
    Average_Distance: number;
    Total_Cost: number;
    Cost_Per_Unit: number;
  }>;
  optimization_summary: {
    status: string;
    objective_value: number;
    facilities_opened: number;
    total_demand_served: number;
    total_transportation_cost: number;
  };
  network_metrics: {
    service_level_achievement: number;
    avg_cost_per_unit: number;
    weighted_avg_distance: number;
    avg_facility_utilization: number;
    network_utilization: number;
    destinations_per_facility: number;
    total_transportation_cost: number;
    demand_within_service_limit: number;
  };
  open_facilities: string[];
}

interface ExecutiveSummary {
  report_timestamp: string;
  project_overview: {
    total_optimization_cost: number;
    warehouse_facilities_planned: number;
    network_facilities_opened: number;
    average_utilization: number;
    service_level_achievement: number;
  };
  warehouse_optimization: any;
  transportation_optimization: any;
  key_performance_indicators: {
    total_annual_cost: number;
    cost_per_unit: number;
    warehouse_utilization_pct: number;
    service_level_achievement_pct: number;
    thirdparty_dependency_pct: number;
    avg_transportation_distance: number;
  };
  recommendations: string[];
}

interface OutputFile {
  type: string;
  name: string;
  description: string;
  size: string;
  generated_at: string;
  download_url?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  component: string;
}

export default function Visualizer() {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "outputs" | "reports" | "insights"
  >("analytics");
  const [selectedChart, setSelectedChart] = useState("warehouse");
  const [advancedView, setAdvancedView] = useState(false);
  const [dateRange, setDateRange] = useState("1year");

  // Output Generation State
  const [generating, setGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<OutputFile[]>([]);
  const [executiveSummary, setExecutiveSummary] =
    useState<ExecutiveSummary | null>(null);
  const [outputLogs, setOutputLogs] = useState<LogEntry[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([
    "csv",
    "json",
    "excel",
  ]);

  // Mock comprehensive data
  const [warehouseResults] = useState<WarehouseResults>({
    results_df: [
      {
        Year: 2024,
        Facilities_Needed: 3,
        Gross_Area_SqFt: 450000,
        Total_Cost_Annual: 2850000,
        ThirdParty_SqFt_Required: 75000,
        Utilization_Percentage: 78.5,
        Volume_Growth_Rate: 8.2,
      },
      {
        Year: 2025,
        Facilities_Needed: 4,
        Gross_Area_SqFt: 580000,
        Total_Cost_Annual: 3420000,
        ThirdParty_SqFt_Required: 95000,
        Utilization_Percentage: 82.1,
        Volume_Growth_Rate: 12.5,
      },
      {
        Year: 2026,
        Facilities_Needed: 5,
        Gross_Area_SqFt: 720000,
        Total_Cost_Annual: 4180000,
        ThirdParty_SqFt_Required: 110000,
        Utilization_Percentage: 85.3,
        Volume_Growth_Rate: 15.8,
      },
      {
        Year: 2027,
        Facilities_Needed: 6,
        Gross_Area_SqFt: 890000,
        Total_Cost_Annual: 5020000,
        ThirdParty_SqFt_Required: 125000,
        Utilization_Percentage: 87.9,
        Volume_Growth_Rate: 18.2,
      },
      {
        Year: 2028,
        Facilities_Needed: 7,
        Gross_Area_SqFt: 1080000,
        Total_Cost_Annual: 5950000,
        ThirdParty_SqFt_Required: 140000,
        Utilization_Percentage: 89.4,
        Volume_Growth_Rate: 20.1,
      },
    ],
    optimization_summary: {
      status: "Optimal",
      objective_value: 21420000,
      total_facilities_added: 4,
      total_thirdparty_space: 545000,
      solve_time: 3.2,
    },
    performance_metrics: {
      avg_utilization: 84.6,
      avg_cost_per_unit: 12.45,
      thirdparty_dependency: 0.24,
      volume_cagr: 0.148,
    },
    yearly_details: {},
  });

  const [transportationResults] = useState<TransportationResults>({
    assignments_df: [
      {
        Facility: "Chicago, IL",
        Destination: "New York, NY",
        Demand: 15000,
        Flow: 15000,
        Cost: 2100,
        Distance: 840,
      },
      {
        Facility: "Dallas, TX",
        Destination: "Houston, TX",
        Demand: 8000,
        Flow: 8000,
        Cost: 600,
        Distance: 240,
      },
      {
        Facility: "Los Angeles, CA",
        Destination: "Phoenix, AZ",
        Demand: 6000,
        Flow: 6000,
        Cost: 750,
        Distance: 300,
      },
      {
        Facility: "Chicago, IL",
        Destination: "Philadelphia, PA",
        Demand: 5000,
        Flow: 5000,
        Cost: 2250,
        Distance: 900,
      },
      {
        Facility: "Los Angeles, CA",
        Destination: "Los Angeles, CA",
        Demand: 12000,
        Flow: 12000,
        Cost: 0,
        Distance: 0,
      },
    ],
    facility_metrics_df: [
      {
        Facility: "Chicago, IL",
        Destinations_Served: 2,
        Total_Demand: 20000,
        Capacity_Utilization: 0.8,
        Average_Distance: 870,
        Total_Cost: 87000,
        Cost_Per_Unit: 4.35,
      },
      {
        Facility: "Dallas, TX",
        Destinations_Served: 1,
        Total_Demand: 8000,
        Capacity_Utilization: 0.4,
        Average_Distance: 240,
        Total_Cost: 4800,
        Cost_Per_Unit: 0.6,
      },
      {
        Facility: "Los Angeles, CA",
        Destinations_Served: 2,
        Total_Demand: 18000,
        Capacity_Utilization: 0.6,
        Average_Distance: 150,
        Total_Cost: 9000,
        Cost_Per_Unit: 0.5,
      },
    ],
    optimization_summary: {
      status: "Optimal",
      objective_value: 400800,
      facilities_opened: 3,
      total_demand_served: 46000,
      total_transportation_cost: 100800,
    },
    network_metrics: {
      service_level_achievement: 0.96,
      avg_cost_per_unit: 2.19,
      weighted_avg_distance: 542.3,
      avg_facility_utilization: 0.6,
      network_utilization: 0.613,
      destinations_per_facility: 1.67,
      total_transportation_cost: 100800,
      demand_within_service_limit: 44160,
    },
    open_facilities: ["Chicago, IL", "Dallas, TX", "Los Angeles, CA"],
  });

  // Chart data derived from results
  const warehouseChartData = warehouseResults.results_df.map((row) => ({
    year: row.Year.toString(),
    facilities: row.Facilities_Needed,
    area: row.Gross_Area_SqFt / 1000, // Convert to thousands of sq ft
    cost: row.Total_Cost_Annual / 1000000, // Convert to millions
    utilization: row.Utilization_Percentage,
    thirdparty: row.ThirdParty_SqFt_Required / 1000,
    growth: row.Volume_Growth_Rate,
  }));

  const transportationChartData = transportationResults.assignments_df.map(
    (assignment) => ({
      route: `${assignment.Facility.split(",")[0]} → ${assignment.Destination.split(",")[0]}`,
      demand: assignment.Demand,
      cost: assignment.Cost,
      distance: assignment.Distance,
      efficiency: assignment.Demand / assignment.Cost,
    }),
  );

  const costBreakdownData = [
    {
      name: "Warehouse Operations",
      value: warehouseResults.optimization_summary.objective_value,
      color: "#3b82f6",
    },
    {
      name: "Transportation",
      value:
        transportationResults.optimization_summary.total_transportation_cost,
      color: "#10b981",
    },
    {
      name: "Third Party Storage",
      value: warehouseResults.optimization_summary.total_thirdparty_space * 15,
      color: "#f59e0b",
    },
    { name: "Administrative", value: 2500000, color: "#ef4444" },
  ];

  const networkPerformanceData = transportationResults.facility_metrics_df.map(
    (facility) => ({
      facility: facility.Facility.split(",")[0],
      utilization: facility.Capacity_Utilization * 100,
      destinations: facility.Destinations_Served,
      avgDistance: facility.Average_Distance,
      costPerUnit: facility.Cost_Per_Unit,
      totalDemand: facility.Total_Demand / 1000, // Convert to thousands
    }),
  );

  // Add log entry
  const addLogEntry = (
    level: string,
    message: string,
    component: string = "OutputGenerator",
  ) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      component,
    };
    setOutputLogs((prev) => [...prev.slice(-49), entry]);
  };

  // Generate Executive Summary
  const generateExecutiveSummary = (): ExecutiveSummary => {
    const totalCost =
      warehouseResults.optimization_summary.objective_value +
      transportationResults.optimization_summary.total_transportation_cost;

    return {
      report_timestamp: new Date().toISOString(),
      project_overview: {
        total_optimization_cost: totalCost,
        warehouse_facilities_planned:
          warehouseResults.optimization_summary.total_facilities_added + 1,
        network_facilities_opened:
          transportationResults.optimization_summary.facilities_opened,
        average_utilization:
          warehouseResults.performance_metrics.avg_utilization,
        service_level_achievement:
          transportationResults.network_metrics.service_level_achievement * 100,
      },
      warehouse_optimization: warehouseResults.optimization_summary,
      transportation_optimization: transportationResults.optimization_summary,
      key_performance_indicators: {
        total_annual_cost: totalCost,
        cost_per_unit: warehouseResults.performance_metrics.avg_cost_per_unit,
        warehouse_utilization_pct:
          warehouseResults.performance_metrics.avg_utilization,
        service_level_achievement_pct:
          transportationResults.network_metrics.service_level_achievement * 100,
        thirdparty_dependency_pct:
          warehouseResults.performance_metrics.thirdparty_dependency * 100,
        avg_transportation_distance:
          transportationResults.network_metrics.weighted_avg_distance,
      },
      recommendations: generateRecommendations(),
    };
  };

  // Generate strategic recommendations
  const generateRecommendations = (): string[] => {
    const recommendations = [];

    // Warehouse analysis
    if (warehouseResults.performance_metrics.avg_utilization < 80) {
      recommendations.push(
        "Consider consolidating facilities to improve utilization efficiency",
      );
    }
    if (warehouseResults.performance_metrics.thirdparty_dependency > 0.25) {
      recommendations.push(
        "High 3PL dependency - evaluate building additional internal capacity",
      );
    }
    if (warehouseResults.performance_metrics.volume_cagr > 0.15) {
      recommendations.push(
        "High volume growth expected - plan for phased capacity expansion",
      );
    }

    // Transportation analysis
    if (
      transportationResults.network_metrics.service_level_achievement < 0.95
    ) {
      recommendations.push(
        "Service level below target - consider additional facilities or revised constraints",
      );
    }
    if (transportationResults.network_metrics.avg_cost_per_unit > 3.0) {
      recommendations.push(
        "Transportation cost per unit is high - evaluate route optimization",
      );
    }
    if (transportationResults.network_metrics.network_utilization < 0.8) {
      recommendations.push(
        "Network utilization is low - consider facility consolidation",
      );
    }

    return recommendations;
  };

  // Generate comprehensive outputs
  const generateComprehensiveReport = async () => {
    setGenerating(true);
    setOutputLogs([]);
    addLogEntry(
      "INFO",
      "Starting comprehensive optimization report generation",
    );

    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const generatedFiles: OutputFile[] = [];

      // Simulate file generation process
      await new Promise((resolve) => setTimeout(resolve, 500));
      addLogEntry("INFO", "Generating warehouse optimization outputs");

      // Warehouse Results
      if (selectedFormats.includes("csv")) {
        generatedFiles.push({
          type: "warehouse_results",
          name: `warehouse_results_${timestamp}.csv`,
          description: "Detailed warehouse capacity analysis by year",
          size: "245 KB",
          generated_at: new Date().toLocaleTimeString(),
        });
      }

      if (selectedFormats.includes("json")) {
        generatedFiles.push({
          type: "warehouse_summary",
          name: `warehouse_summary_${timestamp}.json`,
          description: "Warehouse optimization summary and metrics",
          size: "89 KB",
          generated_at: new Date().toLocaleTimeString(),
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
      addLogEntry("INFO", "Generating transportation network outputs");

      // Transportation Results
      if (selectedFormats.includes("csv")) {
        generatedFiles.push({
          type: "transportation_assignments",
          name: `transportation_assignments_${timestamp}.csv`,
          description: "Facility-destination assignments and routing",
          size: "156 KB",
          generated_at: new Date().toLocaleTimeString(),
        });

        generatedFiles.push({
          type: "facility_metrics",
          name: `facility_metrics_${timestamp}.csv`,
          description: "Facility performance metrics and KPIs",
          size: "98 KB",
          generated_at: new Date().toLocaleTimeString(),
        });
      }

      if (selectedFormats.includes("json")) {
        generatedFiles.push({
          type: "network_metrics",
          name: `network_metrics_${timestamp}.json`,
          description: "Transportation network performance metrics",
          size: "67 KB",
          generated_at: new Date().toLocaleTimeString(),
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 600));
      addLogEntry("INFO", "Generating executive summary and combined analysis");

      // Executive Summary
      const summary = generateExecutiveSummary();
      setExecutiveSummary(summary);

      generatedFiles.push({
        type: "executive_summary",
        name: `executive_summary_${timestamp}.json`,
        description: "High-level summary with key metrics and recommendations",
        size: "234 KB",
        generated_at: new Date().toLocaleTimeString(),
      });

      // Combined Analysis
      generatedFiles.push({
        type: "combined_analysis",
        name: `combined_analysis_${timestamp}.csv`,
        description: "Integrated warehouse and transportation analysis",
        size: "187 KB",
        generated_at: new Date().toLocaleTimeString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      addLogEntry("INFO", "Generating Excel workbook and documentation");

      // Excel Export
      if (selectedFormats.includes("excel")) {
        generatedFiles.push({
          type: "excel_workbook",
          name: `network_optimization_results_${timestamp}.xlsx`,
          description:
            "Complete results in Excel workbook with multiple sheets",
          size: "2.4 MB",
          generated_at: new Date().toLocaleTimeString(),
        });
      }

      // README Documentation
      generatedFiles.push({
        type: "documentation",
        name: `README_${timestamp}.md`,
        description: "Documentation and usage instructions for all outputs",
        size: "45 KB",
        generated_at: new Date().toLocaleTimeString(),
      });

      setGeneratedFiles(generatedFiles);
      addLogEntry(
        "SUCCESS",
        `Generated ${generatedFiles.length} output files successfully`,
      );
      addLogEntry("INFO", "All outputs are ready for download and analysis");
    } catch (error) {
      addLogEntry("ERROR", `Error generating reports: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  // Simulate file download
  const downloadFile = (file: OutputFile) => {
    addLogEntry("INFO", `Downloading ${file.name}`);
    // In a real app, this would trigger actual file download
    alert(`Downloading ${file.name} - ${file.description}`);
  };

  // Download all files as ZIP
  const downloadAllFiles = () => {
    addLogEntry("INFO", "Creating ZIP archive with all generated files");
    alert(
      `Downloading complete optimization results package (${generatedFiles.length} files)`,
    );
  };

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
              <h2 className="card-title">Results & Visualization</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Comprehensive analytics, visualizations, and robust output
                generation for optimization results
              </p>
            </div>
            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              <select
                className="form-input"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                style={{ width: "auto" }}
              >
                <option value="1month">Last Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="5years">5-Year Horizon</option>
              </select>
              <button className="button button-secondary">
                <Filter size={16} />
                Filter
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            style={{ borderBottom: "2px solid #e5e7eb", marginBottom: "2rem" }}
          >
            <div style={{ display: "flex", gap: "2rem" }}>
              {[
                {
                  id: "analytics",
                  label: "Analytics & Charts",
                  icon: BarChart3,
                },
                { id: "outputs", label: "Output Generation", icon: Database },
                { id: "reports", label: "Generated Reports", icon: FileText },
                { id: "insights", label: "Strategic Insights", icon: Target },
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

          {/* Analytics & Charts Tab */}
          {activeTab === "analytics" && (
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  <button
                    className={`button ${selectedChart === "warehouse" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart("warehouse")}
                  >
                    <BarChart3 size={16} />
                    Warehouse Analytics
                  </button>
                  <button
                    className={`button ${selectedChart === "transport" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart("transport")}
                  >
                    <LineChartIcon size={16} />
                    Transport Analytics
                  </button>
                  <button
                    className={`button ${selectedChart === "costs" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart("costs")}
                  >
                    <PieChartIcon size={16} />
                    Cost Analysis
                  </button>
                  <button
                    className={`button ${selectedChart === "network" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart("network")}
                  >
                    <Globe size={16} />
                    Network Performance
                  </button>
                  <button
                    className={`button ${selectedChart === "advanced" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart("advanced")}
                  >
                    <Activity size={16} />
                    Advanced Analytics
                  </button>
                  <button
                    className={`button ${selectedChart === "executive" ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart("executive")}
                  >
                    <Eye size={16} />
                    Executive Dashboard
                  </button>
                </div>
              </div>

              {selectedChart === "warehouse" && (
                <div>
                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Facility Growth Projection
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="facilities"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            name="Facilities"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Space & Cost Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="area"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Area (K sq ft)"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="cost"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="Cost ($M)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Utilization & Growth Trends
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="utilization"
                            fill="#8b5cf6"
                            name="Utilization %"
                          />
                          <Bar
                            dataKey="growth"
                            fill="#ec4899"
                            name="Growth Rate %"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Third Party Dependency
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="area"
                            stackId="1"
                            stroke="#10b981"
                            fill="#10b981"
                            name="Internal (K sq ft)"
                          />
                          <Area
                            type="monotone"
                            dataKey="thirdparty"
                            stackId="1"
                            stroke="#ef4444"
                            fill="#ef4444"
                            name="3PL (K sq ft)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {selectedChart === "transport" && (
                <div>
                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Route Demand Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={transportationChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="route"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="demand" fill="#3b82f6" name="Demand" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Cost vs Distance Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart data={transportationChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="distance" name="Distance" unit="mi" />
                          <YAxis dataKey="cost" name="Cost" unit="$" />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                          <Scatter
                            name="Routes"
                            dataKey="cost"
                            fill="#10b981"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Transportation Efficiency
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={transportationChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="route"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="efficiency"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="Demand/Cost Ratio"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Route Performance Matrix
                      </h3>
                      <div style={{ padding: "1rem" }}>
                        <table style={{ width: "100%", fontSize: "0.875rem" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f9fafb" }}>
                              <th
                                style={{ padding: "0.5rem", textAlign: "left" }}
                              >
                                Route
                              </th>
                              <th
                                style={{
                                  padding: "0.5rem",
                                  textAlign: "right",
                                }}
                              >
                                Demand
                              </th>
                              <th
                                style={{
                                  padding: "0.5rem",
                                  textAlign: "right",
                                }}
                              >
                                Cost
                              </th>
                              <th
                                style={{
                                  padding: "0.5rem",
                                  textAlign: "right",
                                }}
                              >
                                Efficiency
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {transportationChartData.map((route, index) => (
                              <tr key={index}>
                                <td style={{ padding: "0.5rem" }}>
                                  {route.route}
                                </td>
                                <td
                                  style={{
                                    padding: "0.5rem",
                                    textAlign: "right",
                                  }}
                                >
                                  {route.demand.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "0.5rem",
                                    textAlign: "right",
                                  }}
                                >
                                  ${route.cost.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "0.5rem",
                                    textAlign: "right",
                                  }}
                                >
                                  {route.efficiency.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedChart === "costs" && (
                <div>
                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Total Cost Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={costBreakdownData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(1)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {costBreakdownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `$${value.toLocaleString()}`,
                              "Cost",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Cost Components Over Time
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="cost"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            name="Warehouse Cost ($M)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Cost Analysis Summary
                    </h3>
                    <div className="grid grid-cols-4" style={{ gap: "1.5rem" }}>
                      {costBreakdownData.map((item, index) => (
                        <div
                          key={index}
                          style={{ textAlign: "center", padding: "1rem" }}
                        >
                          <div
                            style={{
                              width: "60px",
                              height: "60px",
                              backgroundColor: item.color,
                              borderRadius: "50%",
                              margin: "0 auto 0.75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "0.875rem",
                              }}
                            >
                              {(
                                (item.value /
                                  costBreakdownData.reduce(
                                    (sum, c) => sum + c.value,
                                    0,
                                  )) *
                                100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#111827",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: "700",
                              color: item.color,
                            }}
                          >
                            ${(item.value / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedChart === "network" && (
                <div>
                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Facility Performance Radar
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={networkPerformanceData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="facility" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Utilization"
                            dataKey="utilization"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Network Utilization Metrics
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={networkPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="facility" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="utilization"
                            fill="#10b981"
                            name="Utilization %"
                          />
                          <Bar
                            dataKey="destinations"
                            fill="#f59e0b"
                            name="Destinations Served"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Network Performance Summary
                    </h3>
                    <div className="grid grid-cols-3" style={{ gap: "2rem" }}>
                      <div>
                        <h4
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Service Metrics
                        </h4>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Service Level Achievement:</span>
                            <span
                              style={{ fontWeight: "600", color: "#10b981" }}
                            >
                              {(
                                transportationResults.network_metrics
                                  .service_level_achievement * 100
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
                            <span>Avg Transportation Distance:</span>
                            <span style={{ fontWeight: "600" }}>
                              {transportationResults.network_metrics.weighted_avg_distance.toFixed(
                                0,
                              )}{" "}
                              mi
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Network Utilization:</span>
                            <span style={{ fontWeight: "600" }}>
                              {(
                                transportationResults.network_metrics
                                  .network_utilization * 100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Cost Efficiency
                        </h4>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Avg Cost per Unit:</span>
                            <span
                              style={{ fontWeight: "600", color: "#f59e0b" }}
                            >
                              $
                              {transportationResults.network_metrics.avg_cost_per_unit.toFixed(
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
                            <span>Total Transportation Cost:</span>
                            <span style={{ fontWeight: "600" }}>
                              $
                              {transportationResults.network_metrics.total_transportation_cost.toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Destinations per Facility:</span>
                            <span style={{ fontWeight: "600" }}>
                              {transportationResults.network_metrics.destinations_per_facility.toFixed(
                                1,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Operational Metrics
                        </h4>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Facilities Opened:</span>
                            <span
                              style={{ fontWeight: "600", color: "#3b82f6" }}
                            >
                              {
                                transportationResults.optimization_summary
                                  .facilities_opened
                              }
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
                              {transportationResults.optimization_summary.total_demand_served.toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Avg Facility Utilization:</span>
                            <span style={{ fontWeight: "600" }}>
                              {(
                                transportationResults.network_metrics
                                  .avg_facility_utilization * 100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Analytics */}
              {selectedChart === "advanced" && (
                <div>
                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    {/* Capacity Growth Over Time */}
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Capacity Growth Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="area"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.6}
                            name="Gross Area (K sq ft)"
                          />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="thirdparty"
                            stackId="1"
                            stroke="#ef4444"
                            fill="#ef4444"
                            fillOpacity={0.6}
                            name="3PL Area (K sq ft)"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="facilities"
                            stroke="#f59e0b"
                            strokeWidth={3}
                            name="Facilities Count"
                          />
                          <ReferenceLine
                            yAxisId="left"
                            y={80}
                            stroke="red"
                            strokeDasharray="5 5"
                            label="Target"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Cost Analysis with Trends */}
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Integrated Cost Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip
                            formatter={(value: any, name: string) => [
                              name.includes("Cost")
                                ? `$${value.toFixed(1)}M`
                                : `${value.toFixed(1)}%`,
                              name,
                            ]}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="cost"
                            fill="#8b5cf6"
                            name="Warehouse Cost ($M)"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="utilization"
                            stroke="#10b981"
                            strokeWidth={3}
                            name="Utilization %"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="growth"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Growth Rate %"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    {/* Distance Distribution Analysis */}
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Transportation Distance Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { range: "0-250 mi", count: 2, percentage: 40 },
                            { range: "251-500 mi", count: 1, percentage: 20 },
                            { range: "501-750 mi", count: 1, percentage: 20 },
                            { range: "751-1000 mi", count: 1, percentage: 20 },
                            { range: "1000+ mi", count: 0, percentage: 0 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="range"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="#06b6d4"
                            name="Route Count"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "1rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Average Distance:</span>
                          <span style={{ fontWeight: "600" }}>542.3 miles</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Within Service Limit (1000mi):</span>
                          <span style={{ fontWeight: "600", color: "#10b981" }}>
                            100%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Facility Load Distribution */}
                    <div className="card">
                      <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Facility Load Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={networkPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="facility" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="totalDemand"
                            fill="#f59e0b"
                            name="Total Demand (K units)"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="utilization"
                            stroke="#ef4444"
                            strokeWidth={3}
                            name="Utilization %"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ROI Analysis */}
                  <div className="card">
                    <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                      ROI Analysis & Break-even Projection
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart
                        data={[
                          {
                            year: 2024,
                            investment: 2.85,
                            benefits: 0,
                            cumInvestment: 2.85,
                            cumBenefits: 0,
                            netValue: -2.85,
                          },
                          {
                            year: 2025,
                            investment: 3.42,
                            benefits: 1.2,
                            cumInvestment: 6.27,
                            cumBenefits: 1.2,
                            netValue: -5.07,
                          },
                          {
                            year: 2026,
                            investment: 4.18,
                            benefits: 2.8,
                            cumInvestment: 10.45,
                            cumBenefits: 4.0,
                            netValue: -6.45,
                          },
                          {
                            year: 2027,
                            investment: 5.02,
                            benefits: 4.5,
                            cumInvestment: 15.47,
                            cumBenefits: 8.5,
                            netValue: -6.97,
                          },
                          {
                            year: 2028,
                            investment: 5.95,
                            benefits: 6.8,
                            cumInvestment: 21.42,
                            cumBenefits: 15.3,
                            netValue: -6.12,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: any) => [`$${value}M`, ""]}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="cumInvestment"
                          stackId="1"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.6}
                          name="Cumulative Investment"
                        />
                        <Area
                          type="monotone"
                          dataKey="cumBenefits"
                          stackId="2"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.6}
                          name="Cumulative Benefits"
                        />
                        <Line
                          type="monotone"
                          dataKey="netValue"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          name="Net Value"
                        />
                        <ReferenceLine
                          y={0}
                          stroke="#000"
                          strokeDasharray="2 2"
                        />
                        <ReferenceLine
                          x={2027}
                          stroke="#f59e0b"
                          strokeDasharray="5 5"
                          label="Break-even"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop: "1rem" }}>
                      <div className="grid grid-cols-3" style={{ gap: "2rem" }}>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: "#ef4444",
                            }}
                          >
                            2027
                          </div>
                          <div
                            style={{ fontSize: "0.875rem", color: "#6b7280" }}
                          >
                            Break-even Year
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: "#10b981",
                            }}
                          >
                            $21.4M
                          </div>
                          <div
                            style={{ fontSize: "0.875rem", color: "#6b7280" }}
                          >
                            Total Investment
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: "#8b5cf6",
                            }}
                          >
                            $15.3M
                          </div>
                          <div
                            style={{ fontSize: "0.875rem", color: "#6b7280" }}
                          >
                            Projected Benefits
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Executive Dashboard */}
              {selectedChart === "executive" && (
                <div>
                  <div style={{ marginBottom: "2rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                      }}
                    >
                      <h3 style={{ color: "#111827" }}>
                        Executive Performance Dashboard
                      </h3>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="button button-secondary">
                          <Download size={16} />
                          Export Dashboard
                        </button>
                        <button className="button button-secondary">
                          <RefreshCw size={16} />
                          Refresh Data
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* KPI Summary Cards */}
                  <div
                    className="grid grid-cols-4"
                    style={{ gap: "1.5rem", marginBottom: "2rem" }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem 1rem",
                        backgroundColor: "#fef3c7",
                        borderRadius: "0.75rem",
                        border: "2px solid #f59e0b",
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
                        $21.4M
                      </div>
                      <div
                        style={{
                          color: "#78350f",
                          fontWeight: "600",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Total Investment
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#a16207" }}>
                        5-Year Horizon
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem 1rem",
                        backgroundColor: "#dcfce7",
                        borderRadius: "0.75rem",
                        border: "2px solid #16a34a",
                      }}
                    >
                      <Gauge
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
                        84.6%
                      </div>
                      <div
                        style={{
                          color: "#166534",
                          fontWeight: "600",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Avg Utilization
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#16a34a" }}>
                        ↑ Target: 80-90%
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem 1rem",
                        backgroundColor: "#dbeafe",
                        borderRadius: "0.75rem",
                        border: "2px solid #2563eb",
                      }}
                    >
                      <Target
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
                        96.0%
                      </div>
                      <div
                        style={{
                          color: "#1e40af",
                          fontWeight: "600",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Service Level
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#2563eb" }}>
                        Target: 95%+
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        padding: "2rem 1rem",
                        backgroundColor: "#f3e8ff",
                        borderRadius: "0.75rem",
                        border: "2px solid #9333ea",
                      }}
                    >
                      <TrendingUp
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
                        14.8%
                      </div>
                      <div
                        style={{
                          color: "#6b21a8",
                          fontWeight: "600",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Volume CAGR
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#8b5cf6" }}>
                        5-year projection
                      </div>
                    </div>
                  </div>

                  {/* Executive Charts */}
                  <div
                    className="grid grid-cols-2"
                    style={{ gap: "2rem", marginBottom: "2rem" }}
                  >
                    {/* Network Efficiency Trends */}
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Network Efficiency Trends
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={warehouseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis yAxisId="left" domain={[0, 100]} />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="utilization"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.3}
                            name="Utilization %"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="cost"
                            stroke="#ef4444"
                            strokeWidth={3}
                            name="Cost ($M)"
                          />
                          <ReferenceLine
                            yAxisId="left"
                            y={85}
                            stroke="#f59e0b"
                            strokeDasharray="5 5"
                            label="Target"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Risk Assessment Matrix */}
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Risk Assessment Matrix
                      </h4>
                      <div style={{ padding: "1rem" }}>
                        <div style={{ marginBottom: "1.5rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              marginBottom: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#ef4444",
                                borderRadius: "50%",
                              }}
                            ></div>
                            <span
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: "600",
                              }}
                            >
                              High Risk
                            </span>
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "1.5rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <li>
                              High volume growth (14.8% CAGR) may strain
                              capacity
                            </li>
                            <li>
                              3PL dependency at 24% creates operational risk
                            </li>
                          </ul>
                        </div>

                        <div style={{ marginBottom: "1.5rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              marginBottom: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#f59e0b",
                                borderRadius: "50%",
                              }}
                            ></div>
                            <span
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: "600",
                              }}
                            >
                              Medium Risk
                            </span>
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "1.5rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <li>Network utilization optimization needed</li>
                            <li>Transportation cost per unit monitoring</li>
                          </ul>
                        </div>

                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              marginBottom: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#10b981",
                                borderRadius: "50%",
                              }}
                            ></div>
                            <span
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: "600",
                              }}
                            >
                              Low Risk
                            </span>
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: "1.5rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <li>Service level achievement exceeds target</li>
                            <li>
                              Optimization status: Optimal solutions achieved
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Recommendations */}
                  <div className="card">
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Strategic Recommendations
                    </h4>
                    <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                      <div>
                        <h5
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Immediate Actions (0-6 months)
                        </h5>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <CheckCircle
                              size={16}
                              style={{ color: "#10b981" }}
                            />
                            <span>
                              Monitor utilization trends for early warning
                              signals
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <CheckCircle
                              size={16}
                              style={{ color: "#10b981" }}
                            />
                            <span>
                              Evaluate 3PL contracts for cost optimization
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <CheckCircle
                              size={16}
                              style={{ color: "#10b981" }}
                            />
                            <span>
                              Implement transportation route optimization
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Long-term Strategy (6+ months)
                        </h5>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <AlertTriangle
                              size={16}
                              style={{ color: "#f59e0b" }}
                            />
                            <span>
                              Plan for phased capacity expansion by 2026
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <AlertTriangle
                              size={16}
                              style={{ color: "#f59e0b" }}
                            />
                            <span>
                              Consider building additional internal capacity
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <AlertTriangle
                              size={16}
                              style={{ color: "#f59e0b" }}
                            />
                            <span>
                              Develop contingency plans for demand volatility
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Dashboard */}
              <div className="card" style={{ marginTop: "2rem" }}>
                <h3 style={{ marginBottom: "1.5rem", color: "#111827" }}>
                  Key Performance Indicators
                </h3>
                <div className="grid grid-cols-4" style={{ gap: "1.5rem" }}>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1.5rem",
                      backgroundColor: "#fef3c7",
                      borderRadius: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                        color: "#92400e",
                        marginBottom: "0.5rem",
                      }}
                    >
                      $
                      {(
                        (warehouseResults.optimization_summary.objective_value +
                          transportationResults.optimization_summary
                            .total_transportation_cost) /
                        1000000
                      ).toFixed(1)}
                      M
                    </div>
                    <div style={{ color: "#78350f", fontWeight: "600" }}>
                      Total Annual Cost
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#a16207",
                        marginTop: "0.5rem",
                      }}
                    >
                      Warehouse + Transportation
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
                    <div
                      style={{
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                        color: "#15803d",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {warehouseResults.performance_metrics.avg_utilization.toFixed(
                        1,
                      )}
                      %
                    </div>
                    <div style={{ color: "#166534", fontWeight: "600" }}>
                      Avg Utilization
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#16a34a",
                        marginTop: "0.5rem",
                      }}
                    >
                      ↑ Optimal range 80-90%
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
                    <div
                      style={{
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                        color: "#1d4ed8",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {(
                        transportationResults.network_metrics
                          .service_level_achievement * 100
                      ).toFixed(1)}
                      %
                    </div>
                    <div style={{ color: "#1e40af", fontWeight: "600" }}>
                      Service Level
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#2563eb",
                        marginTop: "0.5rem",
                      }}
                    >
                      Target: 95%+
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
                    <div
                      style={{
                        fontSize: "2.5rem",
                        fontWeight: "bold",
                        color: "#7c3aed",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {(
                        warehouseResults.performance_metrics.volume_cagr * 100
                      ).toFixed(1)}
                      %
                    </div>
                    <div style={{ color: "#6b21a8", fontWeight: "600" }}>
                      Volume CAGR
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#8b5cf6",
                        marginTop: "0.5rem",
                      }}
                    >
                      5-year projection
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Output Generation Tab */}
          {activeTab === "outputs" && (
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
                  Comprehensive Output Generation
                </h3>
                <button
                  className="button button-primary"
                  onClick={generateComprehensiveReport}
                  disabled={generating}
                >
                  {generating && <div className="loading-spinner"></div>}
                  <Zap size={16} />
                  {generating
                    ? "Generating..."
                    : "Generate Complete Report Package"}
                </button>
              </div>

              <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                {/* Output Configuration */}
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Output Configuration
                  </h4>

                  <div className="card">
                    <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                      Export Formats
                    </h5>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {[
                        {
                          id: "csv",
                          label: "CSV Files",
                          desc: "Comma-separated values for analysis tools",
                        },
                        {
                          id: "json",
                          label: "JSON Files",
                          desc: "Structured data for APIs and applications",
                        },
                        {
                          id: "excel",
                          label: "Excel Workbook",
                          desc: "Complete results in multi-sheet workbook",
                        },
                      ].map((format) => (
                        <label
                          key={format.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFormats.includes(format.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFormats([
                                  ...selectedFormats,
                                  format.id,
                                ]);
                              } else {
                                setSelectedFormats(
                                  selectedFormats.filter(
                                    (f) => f !== format.id,
                                  ),
                                );
                              }
                            }}
                          />
                          <div>
                            <div
                              style={{ fontWeight: "600", color: "#111827" }}
                            >
                              {format.label}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#6b7280" }}
                            >
                              {format.desc}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: "1rem" }}>
                    <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                      Report Components
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <CheckCircle size={16} style={{ color: "#10b981" }} />
                        <span>
                          Warehouse optimization results and projections
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <CheckCircle size={16} style={{ color: "#10b981" }} />
                        <span>
                          Transportation network assignments and metrics
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <CheckCircle size={16} style={{ color: "#10b981" }} />
                        <span>
                          Executive summary with KPIs and recommendations
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <CheckCircle size={16} style={{ color: "#10b981" }} />
                        <span>Combined analysis with integrated insights</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <CheckCircle size={16} style={{ color: "#10b981" }} />
                        <span>Documentation and usage instructions</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generation Status */}
                <div>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Generation Status
                  </h4>

                  {generating && (
                    <div
                      className="card"
                      style={{
                        backgroundColor: "#fef3c7",
                        border: "1px solid #fbbf24",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div className="loading-spinner"></div>
                        <span style={{ fontWeight: "600", color: "#92400e" }}>
                          Generating comprehensive reports...
                        </span>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#f59e0b",
                          height: "4px",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: "#eab308",
                            height: "100%",
                            width: "70%",
                            borderRadius: "2px",
                            animation: "progress 2s ease-in-out infinite",
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {generatedFiles.length > 0 && (
                    <div
                      className="card"
                      style={{
                        backgroundColor: "#dcfce7",
                        border: "1px solid #16a34a",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <CheckCircle size={20} style={{ color: "#16a34a" }} />
                        <span style={{ fontWeight: "600", color: "#15803d" }}>
                          {generatedFiles.length} files generated successfully
                        </span>
                      </div>
                      <button
                        className="button button-secondary"
                        onClick={downloadAllFiles}
                        style={{ width: "100%" }}
                      >
                        <Download size={16} />
                        Download Complete Package
                      </button>
                    </div>
                  )}

                  {/* Real-time Generation Logs */}
                  {outputLogs.length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                      <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                        Generation Logs
                      </h5>
                      <div
                        style={{
                          backgroundColor: "#1f2937",
                          color: "#f9fafb",
                          padding: "1rem",
                          borderRadius: "0.5rem",
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          maxHeight: "300px",
                          overflowY: "auto",
                        }}
                      >
                        {outputLogs.map((log, index) => (
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
              </div>
            </div>
          )}

          {/* Generated Reports Tab */}
          {activeTab === "reports" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2rem",
                }}
              >
                <h3 style={{ color: "#111827" }}>Generated Report Files</h3>
                {generatedFiles.length > 0 && (
                  <button
                    className="button button-primary"
                    onClick={downloadAllFiles}
                  >
                    <Download size={16} />
                    Download All ({generatedFiles.length} files)
                  </button>
                )}
              </div>

              {generatedFiles.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  <FileText
                    size={64}
                    style={{ margin: "0 auto 1rem", color: "#d1d5db" }}
                  />
                  <h4 style={{ marginBottom: "0.5rem", color: "#374151" }}>
                    No Reports Generated
                  </h4>
                  <p>
                    Use the Output Generation tab to create comprehensive
                    reports.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2" style={{ gap: "1.5rem" }}>
                  {generatedFiles.map((file, index) => (
                    <div key={index} className="card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          {file.type.includes("excel") ? (
                            <FileSpreadsheet
                              size={24}
                              style={{ color: "#16a34a" }}
                            />
                          ) : file.type.includes("csv") ? (
                            <Database size={24} style={{ color: "#3b82f6" }} />
                          ) : file.type.includes("documentation") ? (
                            <BookOpen size={24} style={{ color: "#8b5cf6" }} />
                          ) : (
                            <FileText size={24} style={{ color: "#f59e0b" }} />
                          )}
                          <div>
                            <div
                              style={{ fontWeight: "600", color: "#111827" }}
                            >
                              {file.name}
                            </div>
                            <div
                              style={{ fontSize: "0.875rem", color: "#6b7280" }}
                            >
                              {file.size}
                            </div>
                          </div>
                        </div>
                        <button
                          className="button button-secondary"
                          onClick={() => downloadFile(file)}
                          style={{ padding: "0.5rem" }}
                        >
                          <Download size={16} />
                        </button>
                      </div>

                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "#6b7280",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {file.description}
                      </p>

                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Generated at {file.generated_at}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* File Types Legend */}
              {generatedFiles.length > 0 && (
                <div className="card" style={{ marginTop: "2rem" }}>
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    File Types & Usage
                  </h4>
                  <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                    <div>
                      <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                        Data Files
                      </h5>
                      <div style={{ fontSize: "0.875rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <Database size={16} style={{ color: "#3b82f6" }} />
                          <span>
                            <strong>CSV Files:</strong> Raw data for analysis in
                            Excel, R, Python
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <FileText size={16} style={{ color: "#f59e0b" }} />
                          <span>
                            <strong>JSON Files:</strong> Structured data for
                            APIs and web applications
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FileSpreadsheet
                            size={16}
                            style={{ color: "#16a34a" }}
                          />
                          <span>
                            <strong>Excel Workbook:</strong> Complete analysis
                            with multiple sheets
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 style={{ marginBottom: "0.75rem", color: "#374151" }}>
                        Documentation
                      </h5>
                      <div style={{ fontSize: "0.875rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <BookOpen size={16} style={{ color: "#8b5cf6" }} />
                          <span>
                            <strong>README:</strong> Instructions and metadata
                            for all files
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <Target size={16} style={{ color: "#ec4899" }} />
                          <span>
                            <strong>Executive Summary:</strong> High-level
                            insights and recommendations
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategic Insights Tab */}
          {activeTab === "insights" && (
            <div>
              <h3 style={{ marginBottom: "2rem", color: "#111827" }}>
                Strategic Insights & Recommendations
              </h3>

              {/* Executive Summary */}
              {executiveSummary && (
                <div>
                  <div
                    className="card"
                    style={{
                      marginBottom: "2rem",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #0ea5e9",
                    }}
                  >
                    <h4 style={{ marginBottom: "1rem", color: "#0c4a6e" }}>
                      Executive Summary
                    </h4>
                    <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                      <div>
                        <h5
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Project Overview
                        </h5>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Total Optimization Cost:</span>
                            <span style={{ fontWeight: "600" }}>
                              $
                              {(
                                executiveSummary.project_overview
                                  .total_optimization_cost / 1000000
                              ).toFixed(1)}
                              M
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Warehouse Facilities Planned:</span>
                            <span style={{ fontWeight: "600" }}>
                              {
                                executiveSummary.project_overview
                                  .warehouse_facilities_planned
                              }
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Network Facilities Opened:</span>
                            <span style={{ fontWeight: "600" }}>
                              {
                                executiveSummary.project_overview
                                  .network_facilities_opened
                              }
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>Service Level Achievement:</span>
                            <span
                              style={{ fontWeight: "600", color: "#10b981" }}
                            >
                              {executiveSummary.project_overview.service_level_achievement.toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5
                          style={{ marginBottom: "0.75rem", color: "#374151" }}
                        >
                          Key Performance Indicators
                        </h5>
                        <div style={{ fontSize: "0.875rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span>Warehouse Utilization:</span>
                            <span style={{ fontWeight: "600" }}>
                              {executiveSummary.key_performance_indicators.warehouse_utilization_pct.toFixed(
                                1,
                              )}
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
                            <span>Cost per Unit:</span>
                            <span style={{ fontWeight: "600" }}>
                              $
                              {executiveSummary.key_performance_indicators.cost_per_unit.toFixed(
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
                            <span style={{ fontWeight: "600" }}>
                              {executiveSummary.key_performance_indicators.thirdparty_dependency_pct.toFixed(
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
                            <span>Avg Transportation Distance:</span>
                            <span style={{ fontWeight: "600" }}>
                              {executiveSummary.key_performance_indicators.avg_transportation_distance.toFixed(
                                0,
                              )}{" "}
                              mi
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Recommendations */}
                  <div className="card" style={{ marginBottom: "2rem" }}>
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                      Strategic Recommendations
                    </h4>
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {executiveSummary.recommendations.map(
                        (recommendation, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "0.75rem",
                              padding: "1rem",
                              backgroundColor: "#fef9e7",
                              borderRadius: "0.5rem",
                              border: "1px solid #fbbf24",
                            }}
                          >
                            <AlertTriangle
                              size={20}
                              style={{
                                color: "#f59e0b",
                                marginTop: "0.125rem",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ color: "#92400e" }}>
                              {recommendation}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Analysis */}
              <div className="grid grid-cols-2" style={{ gap: "2rem" }}>
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Warehouse Optimization Analysis
                  </h4>
                  <div style={{ fontSize: "0.875rem" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Optimization Status:
                        <span
                          style={{ color: "#10b981", marginLeft: "0.5rem" }}
                        >
                          {warehouseResults.optimization_summary.status}
                        </span>
                      </div>
                      <div>
                        Solved in{" "}
                        {warehouseResults.optimization_summary.solve_time}{" "}
                        seconds with $
                        {(
                          warehouseResults.optimization_summary
                            .objective_value / 1000000
                        ).toFixed(1)}
                        M total cost
                      </div>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Capacity Planning Insights:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                        <li>
                          Requires{" "}
                          {
                            warehouseResults.optimization_summary
                              .total_facilities_added
                          }{" "}
                          additional facilities over 5 years
                        </li>
                        <li>
                          Average utilization of{" "}
                          {warehouseResults.performance_metrics.avg_utilization.toFixed(
                            1,
                          )}
                          % indicates efficient space planning
                        </li>
                        <li>
                          3PL dependency at{" "}
                          {(
                            warehouseResults.performance_metrics
                              .thirdparty_dependency * 100
                          ).toFixed(1)}
                          % provides operational flexibility
                        </li>
                        <li>
                          Volume CAGR of{" "}
                          {(
                            warehouseResults.performance_metrics.volume_cagr *
                            100
                          ).toFixed(1)}
                          % drives expansion requirements
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Transportation Network Analysis
                  </h4>
                  <div style={{ fontSize: "0.875rem" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Network Status:
                        <span
                          style={{ color: "#10b981", marginLeft: "0.5rem" }}
                        >
                          {transportationResults.optimization_summary.status}
                        </span>
                      </div>
                      <div>
                        Optimized{" "}
                        {
                          transportationResults.optimization_summary
                            .facilities_opened
                        }{" "}
                        facilities serving
                        {transportationResults.optimization_summary.total_demand_served.toLocaleString()}{" "}
                        units
                      </div>
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Network Performance Insights:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                        <li>
                          Service level of{" "}
                          {(
                            transportationResults.network_metrics
                              .service_level_achievement * 100
                          ).toFixed(1)}
                          % meets operational targets
                        </li>
                        <li>
                          Average cost per unit of $
                          {transportationResults.network_metrics.avg_cost_per_unit.toFixed(
                            2,
                          )}{" "}
                          enables competitive pricing
                        </li>
                        <li>
                          Network utilization at{" "}
                          {(
                            transportationResults.network_metrics
                              .network_utilization * 100
                          ).toFixed(1)}
                          % indicates balanced capacity
                        </li>
                        <li>
                          Weighted average distance of{" "}
                          {transportationResults.network_metrics.weighted_avg_distance.toFixed(
                            0,
                          )}{" "}
                          miles optimizes delivery times
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="card" style={{ marginTop: "2rem" }}>
                <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Risk Assessment & Mitigation
                </h4>
                <div className="grid grid-cols-3" style={{ gap: "2rem" }}>
                  <div>
                    <h5 style={{ marginBottom: "0.75rem", color: "#dc2626" }}>
                      High Risk Areas
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      {warehouseResults.performance_metrics.volume_cagr >
                        0.15 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <AlertTriangle
                            size={16}
                            style={{ color: "#dc2626" }}
                          />
                          <span>High volume growth may strain capacity</span>
                        </div>
                      )}
                      {warehouseResults.performance_metrics
                        .thirdparty_dependency > 0.3 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <AlertTriangle
                            size={16}
                            style={{ color: "#dc2626" }}
                          />
                          <span>
                            High 3PL dependency creates operational risk
                          </span>
                        </div>
                      )}
                      {transportationResults.network_metrics
                        .service_level_achievement < 0.95 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <AlertTriangle
                            size={16}
                            style={{ color: "#dc2626" }}
                          />
                          <span>Service level below optimal threshold</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 style={{ marginBottom: "0.75rem", color: "#f59e0b" }}>
                      Medium Risk Areas
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      {warehouseResults.performance_metrics.avg_utilization <
                        80 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <AlertTriangle
                            size={16}
                            style={{ color: "#f59e0b" }}
                          />
                          <span>Utilization below optimal efficiency</span>
                        </div>
                      )}
                      {transportationResults.network_metrics
                        .network_utilization < 0.8 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <AlertTriangle
                            size={16}
                            style={{ color: "#f59e0b" }}
                          />
                          <span>Network underutilization affects ROI</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 style={{ marginBottom: "0.75rem", color: "#10b981" }}>
                      Strengths
                    </h5>
                    <div style={{ fontSize: "0.875rem" }}>
                      {warehouseResults.optimization_summary.status ===
                        "Optimal" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                          <span>
                            Warehouse optimization achieved optimal solution
                          </span>
                        </div>
                      )}
                      {transportationResults.optimization_summary.status ===
                        "Optimal" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                          <span>
                            Transportation network optimally configured
                          </span>
                        </div>
                      )}
                      {transportationResults.network_metrics
                        .service_level_achievement >= 0.95 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                          <span>Service level targets exceeded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
