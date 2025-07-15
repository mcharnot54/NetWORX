"use client";

import { useState } from "react";
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
} from "recharts";
import { Download, RefreshCw, Filter, TrendingUp } from "lucide-react";

const mockWarehouseData = [
  { name: "Warehouse A", utilization: 85, capacity: 100000, cost: 45000 },
  { name: "Warehouse B", utilization: 72, capacity: 75000, cost: 38000 },
  { name: "Warehouse C", utilization: 91, capacity: 120000, cost: 52000 },
  { name: "Warehouse D", utilization: 68, capacity: 80000, cost: 41000 },
];

const mockTransportData = [
  { month: "Jan", cost: 125000, efficiency: 78, emissions: 45 },
  { month: "Feb", cost: 118000, efficiency: 82, emissions: 42 },
  { month: "Mar", cost: 135000, efficiency: 75, emissions: 48 },
  { month: "Apr", cost: 122000, efficiency: 85, emissions: 40 },
  { month: "May", cost: 115000, efficiency: 88, emissions: 38 },
  { month: "Jun", cost: 128000, efficiency: 80, emissions: 44 },
];

const mockCostBreakdown = [
  { name: "Warehouse Operations", value: 45, color: "#3b82f6" },
  { name: "Transportation", value: 35, color: "#10b981" },
  { name: "Fuel Costs", value: 15, color: "#f59e0b" },
  { name: "Administrative", value: 5, color: "#ef4444" },
];

export default function Visualizer() {
  const [selectedChart, setSelectedChart] = useState("warehouse");
  const [dateRange, setDateRange] = useState("6months");
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      // In a real app, this would trigger a download
      alert("Report generated successfully!");
    }, 2000);
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
                Comprehensive analytics and visualizations of optimization
                results.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
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
              </select>
              <button className="button button-secondary">
                <Filter size={16} />
                Filter
              </button>
              <button
                className="button button-primary"
                onClick={generateReport}
                disabled={generating}
              >
                {generating && <div className="loading-spinner"></div>}
                <Download size={16} />
                {generating ? "Generating..." : "Export Report"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}
            >
              <button
                className={`button ${selectedChart === "warehouse" ? "button-primary" : "button-secondary"}`}
                onClick={() => setSelectedChart("warehouse")}
              >
                Warehouse Analytics
              </button>
              <button
                className={`button ${selectedChart === "transport" ? "button-primary" : "button-secondary"}`}
                onClick={() => setSelectedChart("transport")}
              >
                Transport Analytics
              </button>
              <button
                className={`button ${selectedChart === "costs" ? "button-primary" : "button-secondary"}`}
                onClick={() => setSelectedChart("costs")}
              >
                Cost Breakdown
              </button>
            </div>
          </div>

          {selectedChart === "warehouse" && (
            <div className="grid grid-cols-2">
              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Warehouse Utilization
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockWarehouseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="utilization"
                      fill="#3b82f6"
                      name="Utilization %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Capacity vs Cost
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockWarehouseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="capacity" fill="#10b981" name="Capacity" />
                    <Bar dataKey="cost" fill="#f59e0b" name="Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedChart === "transport" && (
            <div className="grid grid-cols-2">
              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Transportation Costs Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockTransportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Cost ($)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Efficiency vs Emissions
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockTransportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Efficiency %"
                    />
                    <Line
                      type="monotone"
                      dataKey="emissions"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Emissions (tons)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedChart === "costs" && (
            <div className="grid grid-cols-2">
              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Cost Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockCostBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockCostBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Cost Trends
                </h3>
                <div style={{ padding: "2rem" }}>
                  {mockCostBreakdown.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.375rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            backgroundColor: item.color,
                            borderRadius: "50%",
                          }}
                        ></div>
                        <span>{item.name}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span style={{ fontWeight: "bold" }}>
                          {item.value}%
                        </span>
                        <TrendingUp size={16} style={{ color: "#10b981" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
              Key Performance Indicators
            </h3>
            <div className="grid grid-cols-3">
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    color: "#3b82f6",
                  }}
                >
                  23.5%
                </div>
                <div style={{ color: "#6b7280" }}>Cost Reduction</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#10b981",
                    marginTop: "0.25rem",
                  }}
                >
                  ↑ 5.2% vs last period
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    color: "#10b981",
                  }}
                >
                  87.2%
                </div>
                <div style={{ color: "#6b7280" }}>Average Efficiency</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#10b981",
                    marginTop: "0.25rem",
                  }}
                >
                  ↑ 3.8% vs last period
                </div>
              </div>
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    color: "#f59e0b",
                  }}
                >
                  42.1
                </div>
                <div style={{ color: "#6b7280" }}>Tons CO₂ Saved</div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#10b981",
                    marginTop: "0.25rem",
                  }}
                >
                  ↑ 12.3% vs last period
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
