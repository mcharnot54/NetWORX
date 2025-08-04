"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { useData } from "@/context/DataContext";
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
} from "recharts";
import {
  Download,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  Target,
  Settings,
  FileText,
  Eye,
  RefreshCw,
  Play,
} from "lucide-react";

// Sample data for demonstration
const warehouseData = [
  { year: 2024, capacity: 150000, utilization: 78, cost: 2400000 },
  { year: 2025, capacity: 165000, utilization: 82, cost: 2520000 },
  { year: 2026, capacity: 180000, utilization: 85, cost: 2640000 },
  { year: 2027, capacity: 195000, utilization: 88, cost: 2760000 },
];

const transportData = [
  { route: "Chicago-NYC", cost: 125000, distance: 790, efficiency: 92 },
  { route: "Atlanta-Miami", cost: 89000, distance: 660, efficiency: 88 },
  { route: "LA-Phoenix", cost: 67000, distance: 370, efficiency: 94 },
  { route: "Dallas-Houston", cost: 45000, distance: 240, efficiency: 90 },
];

const costBreakdown = [
  { name: "Fixed Costs", value: 45, color: "#3b82f6" },
  { name: "Variable Costs", value: 30, color: "#10b981" },
  { name: "Transport", value: 20, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#ef4444" },
];

interface OutputFile {
  type: string;
  name: string;
  description: string;
  size: string;
  generated_at: string;
}

export default function Visualizer() {
  const {
    transportResults,
    warehouseResults,
    inventoryResults,
  } = useData();

  const [activeTab, setActiveTab] = useState<"analytics" | "reports" | "insights">("analytics");
  const [selectedChart, setSelectedChart] = useState("warehouse");
  const [generatedFiles, setGeneratedFiles] = useState<OutputFile[]>([]);
  const [generating, setGenerating] = useState(false);

  const generateReports = async () => {
    setGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const timestamp = new Date().toISOString().split('T')[0];
    const files: OutputFile[] = [
      {
        type: "warehouse",
        name: `warehouse_analysis_${timestamp}.csv`,
        description: "Warehouse capacity and utilization analysis",
        size: "245 KB",
        generated_at: new Date().toLocaleTimeString(),
      },
      {
        type: "transport",
        name: `transport_optimization_${timestamp}.csv`,
        description: "Transportation route optimization results",
        size: "156 KB", 
        generated_at: new Date().toLocaleTimeString(),
      },
      {
        type: "summary",
        name: `executive_summary_${timestamp}.pdf`,
        description: "Executive summary with key insights",
        size: "89 KB",
        generated_at: new Date().toLocaleTimeString(),
      },
    ];
    
    setGeneratedFiles(files);
    setGenerating(false);
  };

  const downloadFile = (file: OutputFile) => {
    alert(`Downloading ${file.name}`);
  };

  const renderChart = () => {
    switch (selectedChart) {
      case "warehouse":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={warehouseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="capacity" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                name="Capacity"
              />
              <Area 
                type="monotone" 
                dataKey="utilization" 
                stackId="2" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
                name="Utilization %"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "transport":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={transportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="route" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cost" fill="#3b82f6" name="Cost ($)" />
              <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "costs":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={costBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {costBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Select a chart type</div>;
    }
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h2 className="card-title">Results & Visualization</h2>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Analyze optimization results and generate comprehensive reports
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid #e5e7eb" }}>
            {["analytics", "reports", "insights"].map((tab) => (
              <button
                key={tab}
                className={`button ${activeTab === tab ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab(tab as any)}
                style={{ 
                  borderRadius: "0.5rem 0.5rem 0 0",
                  borderBottom: activeTab === tab ? "2px solid #3b82f6" : "none"
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div>
              {/* Chart Selection */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                {[
                  { key: "warehouse", label: "Warehouse Analysis", icon: <Package size={16} /> },
                  { key: "transport", label: "Transport Routes", icon: <Truck size={16} /> },
                  { key: "costs", label: "Cost Breakdown", icon: <DollarSign size={16} /> },
                ].map((chart) => (
                  <button
                    key={chart.key}
                    className={`button ${selectedChart === chart.key ? "button-primary" : "button-secondary"}`}
                    onClick={() => setSelectedChart(chart.key)}
                  >
                    {chart.icon}
                    {chart.label}
                  </button>
                ))}
              </div>

              {/* Chart Display */}
              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  {selectedChart === "warehouse" && "Warehouse Capacity Analysis"}
                  {selectedChart === "transport" && "Transportation Performance"}
                  {selectedChart === "costs" && "Cost Distribution"}
                </h3>
                {renderChart()}
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3" style={{ marginTop: "2rem" }}>
                <div className="card">
                  <h4 style={{ color: "#10b981", marginBottom: "0.5rem" }}>
                    $2.4M
                  </h4>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Total Annual Savings</p>
                </div>
                <div className="card">
                  <h4 style={{ color: "#3b82f6", marginBottom: "0.5rem" }}>
                    87%
                  </h4>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Average Efficiency</p>
                </div>
                <div className="card">
                  <h4 style={{ color: "#f59e0b", marginBottom: "0.5rem" }}>
                    15
                  </h4>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Optimized Routes</p>
                </div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <h3>Generated Reports</h3>
                <button 
                  className="button button-primary" 
                  onClick={generateReports}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <div className="loading-spinner" style={{ marginRight: "0.5rem" }}></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Generate Reports
                    </>
                  )}
                </button>
              </div>

              {generatedFiles.length > 0 ? (
                <div className="grid grid-cols-1" style={{ gap: "1rem" }}>
                  {generatedFiles.map((file, index) => (
                    <div key={index} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h4 style={{ margin: 0, color: "#111827" }}>{file.name}</h4>
                          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                            {file.description}
                          </p>
                          <p style={{ margin: "0.25rem 0 0", color: "#9ca3af", fontSize: "0.75rem" }}>
                            {file.size} • Generated at {file.generated_at}
                          </p>
                        </div>
                        <button 
                          className="button button-secondary"
                          onClick={() => downloadFile(file)}
                        >
                          <Download size={16} />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <FileText size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>No reports generated yet. Click "Generate Reports" to create analysis outputs.</p>
                </div>
              )}
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === "insights" && (
            <div>
              <h3 style={{ marginBottom: "2rem" }}>Key Insights & Recommendations</h3>
              
              <div className="card">
                <h4 style={{ color: "#10b981", marginBottom: "1rem" }}>💡 Optimization Opportunities</h4>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Consolidate shipments on Chicago-NYC route to reduce costs by 15%
                  </li>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Increase warehouse automation to improve efficiency by 12%
                  </li>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Implement cross-docking at Atlanta facility for 8% cost reduction
                  </li>
                </ul>
              </div>

              <div className="card">
                <h4 style={{ color: "#3b82f6", marginBottom: "1rem" }}>📊 Performance Summary</h4>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Overall network efficiency improved by 18% compared to baseline
                  </li>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Transportation costs reduced by $340K annually
                  </li>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Warehouse utilization optimized to 85% across all facilities
                  </li>
                </ul>
              </div>

              <div className="card">
                <h4 style={{ color: "#f59e0b", marginBottom: "1rem" }}>⚠️ Areas for Improvement</h4>
                <ul style={{ paddingLeft: "1.5rem" }}>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Phoenix facility is underutilized - consider capacity reallocation
                  </li>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Dallas-Houston route has higher than average transit times
                  </li>
                  <li style={{ marginBottom: "0.5rem", color: "#6b7280" }}>
                    Inventory holding costs are 23% above industry benchmark
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
