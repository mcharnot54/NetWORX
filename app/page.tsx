import Navigation from "@/components/Navigation";
import Link from "next/link";
import {
  Activity,
  Database,
  Truck,
  Target,
  BarChart3,
  Settings,
  Package,
} from "lucide-react";

export default function Dashboard() {
  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Welcome to NetWORX Essentials</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Your comprehensive network strategy optimization solution for
            warehouse space optimization and freight cost minimization.
          </p>

          <div className="grid grid-cols-3">
            <Link href="/data-processor" className="card dashboard-card">
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
            </Link>

            <Link href="/warehouse-optimizer" className="card dashboard-card">
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
            </Link>

            <Link href="/inventory-optimizer" className="card dashboard-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <Package size={24} style={{ color: "#3b82f6" }} />
                <h3 style={{ margin: 0, color: "#111827" }}>
                  Inventory Optimizer
                </h3>
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Validate inventory levels, aggregate SKU volumes, and optimize
                warehouse stocking with detailed CSV reports.
              </p>
            </Link>

            <Link href="/transport-optimizer" className="card dashboard-card">
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
            </Link>

            <Link href="/visualizer" className="card dashboard-card">
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
            </Link>

            <Link href="/config" className="card dashboard-card">
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
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
