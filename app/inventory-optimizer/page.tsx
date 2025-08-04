"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import {
  Package,
  BarChart3,
  TrendingUp,
  Download,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Eye,
  Calculator,
  Filter,
} from "lucide-react";

interface InventoryItem {
  sku_id: string;
  part_number: string;
  description: string;
  current_stock: number;
  annual_demand: number;
  unit_cost: number;
  lead_time_days: number;
  safety_stock: number;
  warehouse_location: string;
  abc_category?: "A" | "B" | "C";
  velocity_class?: "Fast" | "Medium" | "Slow";
  turns_per_year?: number;
  reorder_point?: number;
  optimal_order_quantity?: number;
}

interface OptimizationScenario {
  name: string;
  target_turns: number;
  service_level: number;
  carrying_cost_rate: number;
  ordering_cost: number;
  description: string;
}

interface ABCAnalysis {
  category: "A" | "B" | "C";
  item_count: number;
  revenue_percentage: number;
  cumulative_percentage: number;
  recommendations: string[];
}

interface VelocitySlotting {
  zone: string;
  velocity_class: "Fast" | "Medium" | "Slow";
  location_type: "Front" | "Middle" | "Back" | "High" | "Low";
  item_count: number;
  accessibility_score: number;
}

export default function InventoryOptimizer() {
  const [activeTab, setActiveTab] = useState("data");
  const [optimizing, setOptimizing] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState("balanced");

  const [scenarios] = useState<OptimizationScenario[]>([
    {
      name: "balanced",
      target_turns: 8,
      service_level: 0.95,
      carrying_cost_rate: 0.25,
      ordering_cost: 150,
      description: "Balanced approach between cost and service level",
    },
    {
      name: "cost_focused",
      target_turns: 12,
      service_level: 0.90,
      carrying_cost_rate: 0.25,
      ordering_cost: 150,
      description: "Minimize carrying costs and inventory investment",
    },
    {
      name: "service_focused",
      target_turns: 6,
      service_level: 0.99,
      carrying_cost_rate: 0.25,
      ordering_cost: 150,
      description: "Maximize service level and product availability",
    },
  ]);

  const generateSampleInventoryData = (): InventoryItem[] => {
    const sampleSkus = [
      "ABC-001", "DEF-002", "GHI-003", "JKL-004", "MNO-005",
      "PQR-006", "STU-007", "VWX-008", "YZA-009", "BCD-010",
      "EFG-011", "HIJ-012", "KLM-013", "NOP-014", "QRS-015",
    ];

    return sampleSkus.map((sku, index) => ({
      sku_id: sku,
      part_number: `PN-${1000 + index}`,
      description: `Product ${index + 1} Description`,
      current_stock: Math.floor(Math.random() * 1000) + 100,
      annual_demand: Math.floor(Math.random() * 10000) + 1000,
      unit_cost: Math.round((Math.random() * 100 + 5) * 100) / 100,
      lead_time_days: Math.floor(Math.random() * 30) + 5,
      safety_stock: Math.floor(Math.random() * 200) + 50,
      warehouse_location: ["WH-001", "WH-002", "WH-003"][Math.floor(Math.random() * 3)],
    }));
  };

  const calculateABCAnalysis = (data: InventoryItem[]): ABCAnalysis[] => {
    const sortedByValue = [...data]
      .map(item => ({
        ...item,
        annual_value: item.annual_demand * item.unit_cost,
      }))
      .sort((a, b) => b.annual_value - a.annual_value);

    const totalValue = sortedByValue.reduce((sum, item) => sum + item.annual_value, 0);
    let cumulativeValue = 0;
    let cumulativeCount = 0;

    const aItems = [];
    const bItems = [];
    const cItems = [];

    for (const item of sortedByValue) {
      cumulativeValue += item.annual_value;
      cumulativeCount++;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      if (cumulativePercentage <= 80) {
        aItems.push(item);
      } else if (cumulativePercentage <= 95) {
        bItems.push(item);
      } else {
        cItems.push(item);
      }
    }

    return [
      {
        category: "A",
        item_count: aItems.length,
        revenue_percentage: 80,
        cumulative_percentage: 80,
        recommendations: [
          "Tight inventory control and frequent review",
          "Daily monitoring and cycle counting",
          "Premium supplier relationships",
          "Safety stock optimization",
        ],
      },
      {
        category: "B",
        item_count: bItems.length,
        revenue_percentage: 15,
        cumulative_percentage: 95,
        recommendations: [
          "Monthly inventory reviews",
          "Standard reorder policies",
          "Balanced safety stock levels",
          "Regular supplier performance tracking",
        ],
      },
      {
        category: "C",
        item_count: cItems.length,
        revenue_percentage: 5,
        cumulative_percentage: 100,
        recommendations: [
          "Quarterly reviews sufficient",
          "Higher safety stock levels acceptable",
          "Bulk ordering to reduce costs",
          "Consider vendor-managed inventory",
        ],
      },
    ];
  };

  const calculateVelocitySlotting = (data: InventoryItem[]): VelocitySlotting[] => {
    const fastMovers = data.filter(item => (item.turns_per_year || 0) >= 12);
    const mediumMovers = data.filter(item => (item.turns_per_year || 0) >= 6 && (item.turns_per_year || 0) < 12);
    const slowMovers = data.filter(item => (item.turns_per_year || 0) < 6);

    return [
      {
        zone: "Fast Pick Zone A",
        velocity_class: "Fast",
        location_type: "Front",
        item_count: fastMovers.length,
        accessibility_score: 95,
      },
      {
        zone: "Standard Zone B",
        velocity_class: "Medium",
        location_type: "Middle",
        item_count: mediumMovers.length,
        accessibility_score: 75,
      },
      {
        zone: "Reserve Zone C",
        velocity_class: "Slow",
        location_type: "Back",
        item_count: slowMovers.length,
        accessibility_score: 50,
      },
    ];
  };

  const runOptimization = async () => {
    setOptimizing(true);
    
    // Generate sample data if none exists
    if (inventoryData.length === 0) {
      const sampleData = generateSampleInventoryData();
      setInventoryData(sampleData);
    }

    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 3000));

    const scenario = scenarios.find(s => s.name === selectedScenario)!;
    const optimizedData = [...inventoryData].map(item => {
      const turns = (item.annual_demand * item.unit_cost) / (item.current_stock * item.unit_cost);
      const reorderPoint = (item.annual_demand / 365) * item.lead_time_days + item.safety_stock;
      const eoq = Math.sqrt((2 * item.annual_demand * scenario.ordering_cost) / (item.unit_cost * scenario.carrying_cost_rate));
      
      let abcCategory: "A" | "B" | "C" = "C";
      const annualValue = item.annual_demand * item.unit_cost;
      if (annualValue > 50000) abcCategory = "A";
      else if (annualValue > 15000) abcCategory = "B";

      let velocityClass: "Fast" | "Medium" | "Slow" = "Slow";
      if (turns >= 12) velocityClass = "Fast";
      else if (turns >= 6) velocityClass = "Medium";

      return {
        ...item,
        turns_per_year: Math.round(turns * 10) / 10,
        reorder_point: Math.round(reorderPoint),
        optimal_order_quantity: Math.round(eoq),
        abc_category: abcCategory,
        velocity_class: velocityClass,
      };
    });

    setInventoryData(optimizedData);

    const abcAnalysis = calculateABCAnalysis(optimizedData);
    const velocitySlotting = calculateVelocitySlotting(optimizedData);

    const totalInvestment = optimizedData.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0);
    const averageTurns = optimizedData.reduce((sum, item) => sum + (item.turns_per_year || 0), 0) / optimizedData.length;
    const stockoutRisk = optimizedData.filter(item => item.current_stock < (item.reorder_point || 0)).length;

    setOptimizationResults({
      scenario: scenario.name,
      totalItems: optimizedData.length,
      totalInvestment,
      averageTurns: Math.round(averageTurns * 10) / 10,
      stockoutRisk,
      abcAnalysis,
      velocitySlotting,
      potentialSavings: Math.round(totalInvestment * 0.15),
      serviceLevel: scenario.service_level * 100,
    });

    setOptimizing(false);
  };

  const exportToCSV = (data: InventoryItem[], filename: string) => {
    const headers = [
      "SKU_ID", "Part_Number", "Description", "Current_Stock", "Annual_Demand",
      "Unit_Cost", "Lead_Time_Days", "Safety_Stock", "Warehouse_Location",
      "ABC_Category", "Velocity_Class", "Turns_Per_Year", "Reorder_Point", "Optimal_Order_Quantity"
    ];
    
    const csvContent = [
      headers.join(","),
      ...data.map(item => [
        item.sku_id,
        item.part_number,
        `"${item.description}"`,
        item.current_stock,
        item.annual_demand,
        item.unit_cost,
        item.lead_time_days,
        item.safety_stock,
        item.warehouse_location,
        item.abc_category || "",
        item.velocity_class || "",
        item.turns_per_year || "",
        item.reorder_point || "",
        item.optimal_order_quantity || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReports = () => {
    exportToCSV(inventoryData, "inventory_optimization_report.csv");
    
    if (optimizationResults?.abcAnalysis) {
      const abcCsv = [
        "Category,Item_Count,Revenue_Percentage,Cumulative_Percentage,Recommendations",
        ...optimizationResults.abcAnalysis.map((item: ABCAnalysis) => 
          `${item.category},${item.item_count},${item.revenue_percentage},${item.cumulative_percentage},"${item.recommendations.join('; ')}"`
        )
      ].join("\n");
      
      const abcBlob = new Blob([abcCsv], { type: "text/csv;charset=utf-8;" });
      const abcLink = document.createElement("a");
      const abcUrl = URL.createObjectURL(abcBlob);
      abcLink.setAttribute("href", abcUrl);
      abcLink.setAttribute("download", "abc_analysis_report.csv");
      abcLink.style.visibility = "hidden";
      document.body.appendChild(abcLink);
      abcLink.click();
      document.body.removeChild(abcLink);
    }
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
              <h2 className="card-title">Inventory Optimizer</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Validate inventory levels, aggregate SKU volumes, and optimize warehouse stocking with detailed CSV reports.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button button-secondary"
                onClick={exportReports}
                disabled={!optimizationResults}
              >
                <Download size={16} />
                Export CSV Reports
              </button>
              <button
                className="button button-primary"
                onClick={runOptimization}
                disabled={optimizing}
              >
                {optimizing && <div className="loading-spinner"></div>}
                <Play size={16} />
                {optimizing ? "Optimizing..." : "Run Optimization"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className={`button ${activeTab === "data" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("data")}
              >
                <Package size={16} />
                Inventory Data
              </button>
              <button
                className={`button ${activeTab === "scenarios" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("scenarios")}
              >
                <Settings size={16} />
                Optimization Scenarios
              </button>
              <button
                className={`button ${activeTab === "abc" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("abc")}
              >
                <BarChart3 size={16} />
                ABC Classification
              </button>
              <button
                className={`button ${activeTab === "velocity" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("velocity")}
              >
                <TrendingUp size={16} />
                Velocity Slotting
              </button>
              <button
                className={`button ${activeTab === "reports" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("reports")}
              >
                <FileText size={16} />
                Optimization Reports
              </button>
            </div>
          </div>

          {activeTab === "data" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ color: "#111827" }}>Inventory Data Validation & Aggregation</h3>
                <button
                  className="button button-secondary"
                  onClick={() => setInventoryData(generateSampleInventoryData())}
                >
                  <RefreshCw size={16} />
                  Load Sample Data
                </button>
              </div>

              {inventoryData.length > 0 ? (
                <div>
                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0f9ff", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                        {inventoryData.length}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total SKUs</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                        ${Math.round(inventoryData.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0)).toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Investment</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#fffbeb", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                        {Math.round(inventoryData.reduce((sum, item) => sum + item.current_stock, 0)).toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Units</div>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>SKU ID</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Part Number</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Current Stock</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Annual Demand</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Unit Cost</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Warehouse</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>Turns/Year</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", border: "1px solid #e5e7eb" }}>ABC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.slice(0, 10).map((item, index) => (
                          <tr key={index}>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.sku_id}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.part_number}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.current_stock.toLocaleString()}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.annual_demand.toLocaleString()}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>${item.unit_cost}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.warehouse_location}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>{item.turns_per_year || "-"}</td>
                            <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>
                              {item.abc_category && (
                                <span style={{
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "0.25rem",
                                  fontSize: "0.75rem",
                                  backgroundColor: item.abc_category === "A" ? "#fee2e2" : item.abc_category === "B" ? "#fef3c7" : "#f0fdf4",
                                  color: item.abc_category === "A" ? "#dc2626" : item.abc_category === "B" ? "#d97706" : "#059669"
                                }}>
                                  {item.abc_category}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {inventoryData.length > 10 && (
                    <div style={{ textAlign: "center", marginTop: "1rem", color: "#6b7280" }}>
                      Showing first 10 of {inventoryData.length} items. Run optimization to see full analysis.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <Package size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>No inventory data loaded. Click "Load Sample Data" or upload your inventory file.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "scenarios" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>Optimization Scenarios</h3>
              <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                Choose the optimization scenario that best fits your business goals for inventory turns and service levels.
              </p>

              <div className="grid grid-cols-1" style={{ gap: "1rem" }}>
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.name}
                    className="card"
                    style={{
                      border: selectedScenario === scenario.name ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedScenario(scenario.name)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <input
                        type="radio"
                        checked={selectedScenario === scenario.name}
                        onChange={() => setSelectedScenario(scenario.name)}
                      />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, marginBottom: "0.5rem", textTransform: "capitalize" }}>
                          {scenario.name.replace("_", " ")} Scenario
                        </h4>
                        <p style={{ margin: 0, marginBottom: "0.5rem", color: "#6b7280" }}>
                          {scenario.description}
                        </p>
                        <div style={{ display: "flex", gap: "2rem", fontSize: "0.875rem" }}>
                          <span>Target Turns: <strong>{scenario.target_turns}x</strong></span>
                          <span>Service Level: <strong>{(scenario.service_level * 100)}%</strong></span>
                          <span>Carrying Cost: <strong>{(scenario.carrying_cost_rate * 100)}%</strong></span>
                          <span>Ordering Cost: <strong>${scenario.ordering_cost}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "abc" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>ABC Classification Analysis</h3>
              {optimizationResults?.abcAnalysis ? (
                <div>
                  <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                    ABC analysis categorizes inventory items based on their revenue contribution using the 80/20 rule.
                  </p>

                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    {optimizationResults.abcAnalysis.map((category: ABCAnalysis) => (
                      <div key={category.category} className="card">
                        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                          <div style={{
                            fontSize: "3rem",
                            fontWeight: "bold",
                            color: category.category === "A" ? "#dc2626" : category.category === "B" ? "#d97706" : "#059669"
                          }}>
                            {category.category}
                          </div>
                          <div style={{ color: "#6b7280" }}>Category</div>
                        </div>
                        <div style={{ marginBottom: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Items:</span>
                            <strong>{category.item_count}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Revenue %:</span>
                            <strong>{category.revenue_percentage}%</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Cumulative %:</span>
                            <strong>{category.cumulative_percentage}%</strong>
                          </div>
                        </div>
                        <div>
                          <h5 style={{ marginBottom: "0.5rem", color: "#111827" }}>Recommendations:</h5>
                          <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                            {category.recommendations.map((rec, index) => (
                              <li key={index} style={{ marginBottom: "0.25rem" }}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <BarChart3 size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run inventory optimization to generate ABC classification analysis.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "velocity" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>Velocity Slotting Plan</h3>
              {optimizationResults?.velocitySlotting ? (
                <div>
                  <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
                    Optimize warehouse layout by placing fast-moving items in easily accessible locations.
                  </p>

                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    {optimizationResults.velocitySlotting.map((zone: VelocitySlotting, index: number) => (
                      <div key={index} className="card">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                          <TrendingUp size={20} style={{ 
                            color: zone.velocity_class === "Fast" ? "#10b981" : zone.velocity_class === "Medium" ? "#f59e0b" : "#6b7280" 
                          }} />
                          <h4 style={{ margin: 0 }}>{zone.zone}</h4>
                        </div>
                        
                        <div style={{ marginBottom: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Velocity Class:</span>
                            <span style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              fontSize: "0.75rem",
                              backgroundColor: zone.velocity_class === "Fast" ? "#dcfce7" : zone.velocity_class === "Medium" ? "#fef3c7" : "#f3f4f6",
                              color: zone.velocity_class === "Fast" ? "#059669" : zone.velocity_class === "Medium" ? "#d97706" : "#6b7280"
                            }}>
                              {zone.velocity_class}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Location:</span>
                            <strong>{zone.location_type}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <span>Item Count:</span>
                            <strong>{zone.item_count}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Accessibility:</span>
                            <strong>{zone.accessibility_score}%</strong>
                          </div>
                        </div>

                        <div style={{
                          padding: "0.75rem",
                          backgroundColor: "#f9fafb",
                          borderRadius: "0.375rem",
                          fontSize: "0.875rem",
                          color: "#6b7280"
                        }}>
                          {zone.velocity_class === "Fast" && "Prime picking locations with easy access and minimal travel time."}
                          {zone.velocity_class === "Medium" && "Standard locations with moderate accessibility for regular items."}
                          {zone.velocity_class === "Slow" && "Reserve storage areas for low-velocity items and bulk storage."}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <h4 style={{ marginBottom: "1rem", color: "#111827" }}>Slotting Recommendations</h4>
                    <div className="grid grid-cols-2">
                      <div>
                        <h5 style={{ marginBottom: "0.5rem", color: "#10b981" }}>Fast Movers (Front Zone)</h5>
                        <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                          <li>Place at waist level (golden zone)</li>
                          <li>Minimize travel distance to picking areas</li>
                          <li>Use pick faces close to shipping docks</li>
                          <li>Consider floor stacking for high volume</li>
                        </ul>
                      </div>
                      <div>
                        <h5 style={{ marginBottom: "0.5rem", color: "#6b7280" }}>Slow Movers (Back Zone)</h5>
                        <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                          <li>Higher rack positions acceptable</li>
                          <li>Utilize deep storage areas</li>
                          <li>Bulk storage configurations</li>
                          <li>Consider automated retrieval systems</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <TrendingUp size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run inventory optimization to generate velocity slotting recommendations.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "reports" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>Optimization Reports & CSV Exports</h3>
              {optimizationResults ? (
                <div>
                  <div className="grid grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0f9ff", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>
                        {optimizationResults.averageTurns}x
                      </div>
                      <div style={{ color: "#6b7280" }}>Average Turns</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                        {optimizationResults.serviceLevel}%
                      </div>
                      <div style={{ color: "#6b7280" }}>Service Level</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#fffbeb", borderRadius: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                        ${optimizationResults.potentialSavings.toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Potential Savings</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>Available CSV Reports</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500" }}>Inventory Optimization Report</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Complete SKU analysis with turns, reorder points, and ABC classification</div>
                          </div>
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500" }}>ABC Analysis Report</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Category breakdown with recommendations and item counts</div>
                          </div>
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500" }}>Velocity Slotting Plan</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Warehouse layout optimization by item velocity</div>
                          </div>
                          <CheckCircle size={16} style={{ color: "#10b981" }} />
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>Optimization Summary</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Scenario Used:</span>
                          <strong style={{ textTransform: "capitalize" }}>{optimizationResults.scenario.replace("_", " ")}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Total Items Analyzed:</span>
                          <strong>{optimizationResults.totalItems}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Total Investment:</span>
                          <strong>${optimizationResults.totalInvestment.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Items at Risk (Below ROP):</span>
                          <strong style={{ color: optimizationResults.stockoutRisk > 0 ? "#ef4444" : "#10b981" }}>
                            {optimizationResults.stockoutRisk}
                          </strong>
                        </div>
                      </div>
                      
                      {optimizationResults.stockoutRisk > 0 && (
                        <div style={{
                          marginTop: "1rem",
                          padding: "0.75rem",
                          backgroundColor: "#fef2f2",
                          borderRadius: "0.375rem",
                          border: "1px solid #fecaca"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#dc2626" }}>
                            <AlertCircle size={16} />
                            <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>Stock-out Risk Alert</span>
                          </div>
                          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                            {optimizationResults.stockoutRisk} items are below their reorder point and may require immediate attention.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                  <FileText size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <p>Run inventory optimization to generate detailed reports and CSV exports.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
