"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import {
  Settings,
  Save,
  RefreshCw,
  Upload,
  Download,
  CheckCircle,
} from "lucide-react";

interface SystemConfig {
  maxFileSize: number;
  defaultCurrency: string;
  distanceUnit: "km" | "miles";
  weightUnit: "kg" | "lbs";
  autoSave: boolean;
  enableLogging: boolean;
  logLevel: "debug" | "info" | "warning" | "error";
}

interface ValidationSchema {
  warehouseCapacity: { min: number; max: number };
  transportDistance: { min: number; max: number };
  costThresholds: { warning: number; error: number };
  utilizationLimits: { min: number; max: number };
}

export default function Configuration() {
  const [activeTab, setActiveTab] = useState("system");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maxFileSize: 50,
    defaultCurrency: "USD",
    distanceUnit: "km",
    weightUnit: "kg",
    autoSave: true,
    enableLogging: true,
    logLevel: "info",
  });

  const [validationSchema, setValidationSchema] = useState<ValidationSchema>({
    warehouseCapacity: { min: 1000, max: 1000000 },
    transportDistance: { min: 1, max: 10000 },
    costThresholds: { warning: 100000, error: 500000 },
    utilizationLimits: { min: 0, max: 100 },
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  const resetToDefaults = () => {
    if (
      confirm("Are you sure you want to reset all settings to default values?")
    ) {
      setSystemConfig({
        maxFileSize: 50,
        defaultCurrency: "USD",
        distanceUnit: "km",
        weightUnit: "kg",
        autoSave: true,
        enableLogging: true,
        logLevel: "info",
      });
      setValidationSchema({
        warehouseCapacity: { min: 1000, max: 1000000 },
        transportDistance: { min: 1, max: 10000 },
        costThresholds: { warning: 100000, error: 500000 },
        utilizationLimits: { min: 0, max: 100 },
      });
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
              <h2 className="card-title">Configuration Management</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Manage system settings, validation schemas, and output
                templates.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button button-secondary"
                onClick={resetToDefaults}
              >
                <RefreshCw size={16} />
                Reset Defaults
              </button>
              <button
                className="button button-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <div className="loading-spinner"></div>}
                {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className={`button ${activeTab === "system" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("system")}
              >
                System Settings
              </button>
              <button
                className={`button ${activeTab === "validation" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("validation")}
              >
                Validation Rules
              </button>
              <button
                className={`button ${activeTab === "templates" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("templates")}
              >
                Output Templates
              </button>
              <button
                className={`button ${activeTab === "import-export" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("import-export")}
              >
                Import/Export
              </button>
            </div>
          </div>

          {activeTab === "system" && (
            <div className="grid grid-cols-2">
              <div>
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  General Settings
                </h3>

                <div className="form-group">
                  <label className="form-label">Maximum File Size (MB)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={systemConfig.maxFileSize}
                    onChange={(e) =>
                      setSystemConfig({
                        ...systemConfig,
                        maxFileSize: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Currency</label>
                  <select
                    className="form-input"
                    value={systemConfig.defaultCurrency}
                    onChange={(e) =>
                      setSystemConfig({
                        ...systemConfig,
                        defaultCurrency: e.target.value,
                      })
                    }
                  >
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="CAD">Canadian Dollar (CAD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Distance Unit</label>
                  <select
                    className="form-input"
                    value={systemConfig.distanceUnit}
                    onChange={(e) =>
                      setSystemConfig({
                        ...systemConfig,
                        distanceUnit: e.target.value as any,
                      })
                    }
                  >
                    <option value="km">Kilometers</option>
                    <option value="miles">Miles</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Weight Unit</label>
                  <select
                    className="form-input"
                    value={systemConfig.weightUnit}
                    onChange={(e) =>
                      setSystemConfig({
                        ...systemConfig,
                        weightUnit: e.target.value as any,
                      })
                    }
                  >
                    <option value="kg">Kilograms</option>
                    <option value="lbs">Pounds</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  System Preferences
                </h3>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={systemConfig.autoSave}
                      onChange={(e) =>
                        setSystemConfig({
                          ...systemConfig,
                          autoSave: e.target.checked,
                        })
                      }
                      style={{ marginRight: "0.5rem" }}
                    />
                    Enable Auto-Save
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={systemConfig.enableLogging}
                      onChange={(e) =>
                        setSystemConfig({
                          ...systemConfig,
                          enableLogging: e.target.checked,
                        })
                      }
                      style={{ marginRight: "0.5rem" }}
                    />
                    Enable System Logging
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Log Level</label>
                  <select
                    className="form-input"
                    value={systemConfig.logLevel}
                    onChange={(e) =>
                      setSystemConfig({
                        ...systemConfig,
                        logLevel: e.target.value as any,
                      })
                    }
                    disabled={!systemConfig.enableLogging}
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div
                  className="card"
                  style={{ backgroundColor: "#f9fafb", marginTop: "1rem" }}
                >
                  <h4 style={{ marginBottom: "0.75rem", color: "#111827" }}>
                    Performance Settings
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        style={{ marginRight: "0.5rem" }}
                      />
                      Enable Parallel Processing
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        style={{ marginRight: "0.5rem" }}
                      />
                      Cache Optimization Results
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "validation" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Data Validation Rules
              </h3>

              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Warehouse Validation
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Minimum Capacity</label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.warehouseCapacity.min}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          warehouseCapacity: {
                            ...validationSchema.warehouseCapacity,
                            min: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum Capacity</label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.warehouseCapacity.max}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          warehouseCapacity: {
                            ...validationSchema.warehouseCapacity,
                            max: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Transport Validation
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Minimum Distance</label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.transportDistance.min}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          transportDistance: {
                            ...validationSchema.transportDistance,
                            min: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Maximum Distance</label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.transportDistance.max}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          transportDistance: {
                            ...validationSchema.transportDistance,
                            max: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Cost Thresholds
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Warning Threshold ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.costThresholds.warning}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          costThresholds: {
                            ...validationSchema.costThresholds,
                            warning: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Error Threshold ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.costThresholds.error}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          costThresholds: {
                            ...validationSchema.costThresholds,
                            error: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Utilization Limits
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      Minimum Utilization (%)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.utilizationLimits.min}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          utilizationLimits: {
                            ...validationSchema.utilizationLimits,
                            min: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Maximum Utilization (%)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={validationSchema.utilizationLimits.max}
                      onChange={(e) =>
                        setValidationSchema({
                          ...validationSchema,
                          utilizationLimits: {
                            ...validationSchema.utilizationLimits,
                            max: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Output Templates
              </h3>
              <div className="grid grid-cols-1">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Report Template Configuration
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Report Title Template</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="NetWORX Optimization Report - {date}"
                      defaultValue="NetWORX Optimization Report - {date}"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Header Information</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Include company info, analysis period, etc."
                      defaultValue="Generated by NetWORX Essentials&#10;Analysis Period: {start_date} to {end_date}&#10;Report Generated: {current_date}"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Footer Information</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="Disclaimer, contact info, etc."
                      defaultValue="This report is generated automatically and contains confidential information.&#10;For questions, contact: support@networx-essentials.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "import-export" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Configuration Import/Export
              </h3>
              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Export Configuration
                  </h4>
                  <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
                    Export current settings to a JSON file for backup or
                    sharing.
                  </p>
                  <button className="button button-primary">
                    <Download size={16} />
                    Export Settings
                  </button>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Import Configuration
                  </h4>
                  <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
                    Import settings from a previously exported JSON file.
                  </p>
                  <div className="file-upload" style={{ marginBottom: "1rem" }}>
                    <Upload
                      size={24}
                      style={{ color: "#6b7280", margin: "0 auto 0.5rem" }}
                    />
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                      Click to upload configuration file
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      style={{
                        opacity: 0,
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        cursor: "pointer",
                      }}
                    />
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
