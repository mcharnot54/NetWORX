"use client";

import React from 'react';
import { CheckCircle2, Database, Truck, Target, Package, Settings } from 'lucide-react';

export default function Dashboard() {
  return (
    <main className="content-area">
      <div className="card">
        <h2 className="card-title">NetWORX Essentials</h2>
        <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
          Network Strategy Optimizer - Warehouse Space Optimization and Freight Cost Minimization
        </p>

        {/* Quick Status Overview */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <CheckCircle2 size={24} style={{ color: "#22c55e" }} />
            <h3 style={{ margin: 0, color: "#15803d", fontSize: "1.5rem", fontWeight: "700" }}>
              System Status: Online
            </h3>
          </div>
          <p style={{ color: "#15803d", fontSize: "0.875rem", margin: 0 }}>
            NetWORX Essentials is ready for optimization tasks. All core systems operational.
          </p>
        </div>

        {/* Quick Navigation */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <a
            href="/data-processor"
            style={{
              display: "block",
              backgroundColor: "white",
              border: "2px solid #3b82f6",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Database size={20} style={{ color: "#3b82f6" }} />
              <h4 style={{ margin: 0, color: "#1e40af", fontSize: "1.125rem", fontWeight: "600" }}>
                Data Processor
              </h4>
            </div>
            <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
              Upload and process your network data files
            </p>
          </a>

          <a
            href="/warehouse-optimizer"
            style={{
              display: "block",
              backgroundColor: "white",
              border: "2px solid #10b981",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Target size={20} style={{ color: "#10b981" }} />
              <h4 style={{ margin: 0, color: "#047857", fontSize: "1.125rem", fontWeight: "600" }}>
                Warehouse Optimizer
              </h4>
            </div>
            <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
              Optimize warehouse layout and capacity
            </p>
          </a>

          <a
            href="/transport-optimizer"
            style={{
              display: "block",
              backgroundColor: "white",
              border: "2px solid #f59e0b",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Truck size={20} style={{ color: "#f59e0b" }} />
              <h4 style={{ margin: 0, color: "#92400e", fontSize: "1.125rem", fontWeight: "600" }}>
                Transport Optimizer
              </h4>
            </div>
            <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
              Optimize transportation routes and costs
            </p>
          </a>

          <a
            href="/inventory-optimizer"
            style={{
              display: "block",
              backgroundColor: "white",
              border: "2px solid #ef4444",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Package size={20} style={{ color: "#ef4444" }} />
              <h4 style={{ margin: 0, color: "#991b1b", fontSize: "1.125rem", fontWeight: "600" }}>
                Inventory Optimizer
              </h4>
            </div>
            <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
              Optimize inventory levels and policies
            </p>
          </a>

          <a
            href="/config"
            style={{
              display: "block",
              backgroundColor: "white",
              border: "2px solid #8b5cf6",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Settings size={20} style={{ color: "#8b5cf6" }} />
              <h4 style={{ margin: 0, color: "#7c3aed", fontSize: "1.125rem", fontWeight: "600" }}>
                Configuration
              </h4>
            </div>
            <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
              Configure system settings and parameters
            </p>
          </a>

          <a
            href="/scenarios"
            style={{
              display: "block",
              backgroundColor: "white",
              border: "2px solid #06b6d4",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Target size={20} style={{ color: "#06b6d4" }} />
              <h4 style={{ margin: 0, color: "#0891b2", fontSize: "1.125rem", fontWeight: "600" }}>
                Scenarios
              </h4>
            </div>
            <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0 }}>
              Run optimization scenarios and comparisons
            </p>
          </a>
        </div>

        {/* System Information */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
            For detailed analytics and advanced features, navigate to the specific optimizer modules above.
          </p>
        </div>
      </div>
    </main>
  );
}
