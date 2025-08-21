"use client";

import { useState } from "react";
import { Database, Check, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <main className="content-area">
      <div className="card">
        <h2 className="card-title">NetWORX Essentials - System Check</h2>
        <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
          Network Strategy Optimizer - Testing Basic Functionality
        </p>

        <div style={{ 
          padding: "1rem", 
          border: "1px solid #e5e7eb", 
          borderRadius: "0.5rem",
          backgroundColor: "#f9fafb"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={20} />
            <span>System Status: {status}</span>
          </div>
          
          <button 
            onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.25rem",
              cursor: "pointer"
            }}
          >
            Toggle Status
          </button>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <h3>Quick Navigation</h3>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <a href="/data-processor" style={{ color: "#3b82f6", textDecoration: "none" }}>
              → Data Processor
            </a>
            <a href="/warehouse-optimizer" style={{ color: "#3b82f6", textDecoration: "none" }}>
              → Warehouse Optimizer
            </a>
            <a href="/transport-optimizer" style={{ color: "#3b82f6", textDecoration: "none" }}>
              → Transport Optimizer
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
