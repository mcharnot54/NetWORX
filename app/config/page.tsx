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

interface WarehouseConfig {
  DOH: number;
  operating_days: number;
  pallet_length_inches: number;
  pallet_width_inches: number;
  rack_height_inches: number;
  ceiling_height_inches: number;
  max_utilization: number;
  aisle_factor: number;
  min_office: number;
  min_battery: number;
  min_packing: number;
  min_conveyor: number;
  outbound_area_per_door: number;
  outbound_pallets_per_door_per_day: number;
  max_outbound_doors: number;
  inbound_area_per_door: number;
  inbound_pallets_per_door_per_day: number;
  max_inbound_doors: number;
  each_pick_area_fixed: number;
  case_pick_area_fixed: number;
  facility_lease_years: number;
  num_facilities: number;
  initial_facility_area: number;
  facility_design_area: number;
  cost_per_sqft_annual: number;
  labor_cost_per_hour: number;
  equipment_cost_per_sqft: number;
}

interface TransportationConfig {
  required_facilities: number;
  max_facilities: number;
  service_level_requirement: number;
  cost_per_mile: number;
  fixed_cost_per_facility: number;
  variable_cost_per_unit: number;
  max_distance_miles: number;
  max_capacity_per_facility: number;
  thirdparty_cost_per_sqft: number;
  thirdparty_handling_cost: number;
  thirdparty_service_level: number;
}

interface OptimizationConfig {
  solver: string;
  time_limit_seconds: number;
  gap_tolerance: number;
  threads: number;
  weights: {
    cost: number;
    service_level: number;
    utilization: number;
  };
}

interface OutputConfig {
  generate_charts: boolean;
  chart_formats: string[];
  report_formats: string[];
  include_executive_summary: boolean;
}

interface LoggingConfig {
  level: string;
  format: string;
  file_handler: boolean;
  console_handler: boolean;
  max_file_size_mb: number;
  backup_count: number;
}

export default function Configuration() {
  const [activeTab, setActiveTab] = useState("warehouse");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [warehouseConfig, setWarehouseConfig] = useState<WarehouseConfig>({
    DOH: 250,
    operating_days: 240,
    pallet_length_inches: 48,
    pallet_width_inches: 40,
    rack_height_inches: 79.2,
    ceiling_height_inches: 288,
    max_utilization: 0.8,
    aisle_factor: 0.5,
    min_office: 1000,
    min_battery: 500,
    min_packing: 2000,
    min_conveyor: 6000,
    outbound_area_per_door: 4000,
    outbound_pallets_per_door_per_day: 40,
    max_outbound_doors: 10,
    inbound_area_per_door: 4000,
    inbound_pallets_per_door_per_day: 40,
    max_inbound_doors: 10,
    each_pick_area_fixed: 24000,
    case_pick_area_fixed: 44000,
    facility_lease_years: 7,
    num_facilities: 3,
    initial_facility_area: 140000,
    facility_design_area: 350000,
    cost_per_sqft_annual: 8.5,
    labor_cost_per_hour: 18.0,
    equipment_cost_per_sqft: 15.0,
  });

  const [transportationConfig, setTransportationConfig] =
    useState<TransportationConfig>({
      required_facilities: 3,
      max_facilities: 10,
      service_level_requirement: 0.95,
      cost_per_mile: 2.5,
      fixed_cost_per_facility: 100000,
      variable_cost_per_unit: 0.15,
      max_distance_miles: 1000,
      max_capacity_per_facility: 1000000,
      thirdparty_cost_per_sqft: 12.0,
      thirdparty_handling_cost: 0.25,
      thirdparty_service_level: 0.98,
    });

  const [optimizationConfig, setOptimizationConfig] =
    useState<OptimizationConfig>({
      solver: "PULP_CBC_CMD",
      time_limit_seconds: 300,
      gap_tolerance: 0.01,
      threads: 4,
      weights: {
        cost: 0.6,
        service_level: 0.3,
        utilization: 0.1,
      },
    });

  const [outputConfig, setOutputConfig] = useState<OutputConfig>({
    generate_charts: true,
    chart_formats: ["png", "svg"],
    report_formats: ["csv", "json"],
    include_executive_summary: true,
  });

  const [loggingConfig, setLoggingConfig] = useState<LoggingConfig>({
    level: "INFO",
    format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    file_handler: true,
    console_handler: true,
    max_file_size_mb: 10,
    backup_count: 5,
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
      setWarehouseConfig({
        DOH: 250,
        operating_days: 240,
        pallet_length_inches: 48,
        pallet_width_inches: 40,
        rack_height_inches: 79.2,
        ceiling_height_inches: 288,
        max_utilization: 0.8,
        aisle_factor: 0.5,
        min_office: 1000,
        min_battery: 500,
        min_packing: 2000,
        min_conveyor: 6000,
        outbound_area_per_door: 4000,
        outbound_pallets_per_door_per_day: 40,
        max_outbound_doors: 10,
        inbound_area_per_door: 4000,
        inbound_pallets_per_door_per_day: 40,
        max_inbound_doors: 10,
        each_pick_area_fixed: 24000,
        case_pick_area_fixed: 44000,
        facility_lease_years: 7,
        num_facilities: 3,
        initial_facility_area: 140000,
        facility_design_area: 350000,
        cost_per_sqft_annual: 8.5,
        labor_cost_per_hour: 18.0,
        equipment_cost_per_sqft: 15.0,
      });
      // Reset other configs similarly...
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
                className={`button ${activeTab === "warehouse" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("warehouse")}
              >
                Warehouse Config
              </button>
              <button
                className={`button ${activeTab === "transportation" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("transportation")}
              >
                Transportation
              </button>
              <button
                className={`button ${activeTab === "optimization" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("optimization")}
              >
                Optimization
              </button>
              <button
                className={`button ${activeTab === "output" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("output")}
              >
                Output & Logging
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
