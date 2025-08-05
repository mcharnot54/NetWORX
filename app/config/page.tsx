"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import {
  Settings,
  Save,
  RotateCcw,
  Upload,
  Download,
  CheckCircle,
  FileText,
  Monitor,
  AlertCircle,
  Clock,
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
  const [logs, setLogs] = useState<any[]>([]);
  const [logLevel, setLogLevel] = useState("INFO");

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
    // Simulate API call to save configuration
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
      // Reset all configurations to default values from Python ConfigManager
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
                Manage warehouse, transportation, and optimization parameters
                based on Python ConfigManager.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="button button-secondary"
                onClick={resetToDefaults}
              >
                <RotateCcw size={16} />
                Reset Defaults
              </button>
              <button
                className="button button-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <div className="loading-spinner"></div>}
                {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Configuration"}
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
                Output Config
              </button>
              <button
                className={`button ${activeTab === "logging" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("logging")}
              >
                Logging System
              </button>
              <button
                className={`button ${activeTab === "import-export" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("import-export")}
              >
                Import/Export
              </button>
            </div>
          </div>

          {activeTab === "warehouse" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Warehouse Configuration Parameters
              </h3>
              <div className="grid grid-cols-3">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Basic Parameters
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Days of Holding (DOH)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseConfig.DOH}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          DOH: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Operating Days</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseConfig.operating_days}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          operating_days: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Utilization</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseConfig.max_utilization}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          max_utilization: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aisle Factor</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseConfig.aisle_factor}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          aisle_factor: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Physical Dimensions (inches)
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Pallet Length</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseConfig.pallet_length_inches}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          pallet_length_inches: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pallet Width</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseConfig.pallet_width_inches}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          pallet_width_inches: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rack Height</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={warehouseConfig.rack_height_inches}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          rack_height_inches: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ceiling Height</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseConfig.ceiling_height_inches}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          ceiling_height_inches: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Cost Parameters
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      Cost per Sq Ft (Annual) $
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseConfig.cost_per_sqft_annual}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          cost_per_sqft_annual: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Labor Cost per Hour $</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseConfig.labor_cost_per_hour}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          labor_cost_per_hour: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Equipment Cost per Sq Ft $
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={warehouseConfig.equipment_cost_per_sqft}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          equipment_cost_per_sqft: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facility Lease Years</label>
                    <input
                      type="number"
                      className="form-input"
                      value={warehouseConfig.facility_lease_years}
                      onChange={(e) =>
                        setWarehouseConfig({
                          ...warehouseConfig,
                          facility_lease_years: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ marginTop: "1rem" }}>
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Area Requirements (sq ft)
                  </h4>
                  <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">Min Office</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.min_office}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            min_office: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Min Battery</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.min_battery}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            min_battery: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Min Packing</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.min_packing}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            min_packing: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Min Conveyor</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.min_conveyor}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            min_conveyor: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Each Pick Area Fixed</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.each_pick_area_fixed}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            each_pick_area_fixed: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Case Pick Area Fixed</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.case_pick_area_fixed}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            case_pick_area_fixed: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Dock & Facility Configuration
                  </h4>
                  <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">Max Outbound Doors</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.max_outbound_doors}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            max_outbound_doors: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Inbound Doors</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.max_inbound_doors}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            max_inbound_doors: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Number of Facilities</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.num_facilities}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            num_facilities: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Initial Facility Area
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.initial_facility_area}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            initial_facility_area: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Facility Design Area</label>
                      <input
                        type="number"
                        className="form-input"
                        value={warehouseConfig.facility_design_area}
                        onChange={(e) =>
                          setWarehouseConfig({
                            ...warehouseConfig,
                            facility_design_area: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "transportation" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Transportation Configuration Parameters
              </h3>
              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Facility Parameters
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Required Facilities</label>
                    <input
                      type="number"
                      className="form-input"
                      value={transportationConfig.required_facilities}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          required_facilities: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Facilities</label>
                    <input
                      type="number"
                      className="form-input"
                      value={transportationConfig.max_facilities}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          max_facilities: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Service Level Requirement
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={transportationConfig.service_level_requirement}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          service_level_requirement: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Max Capacity per Facility
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={transportationConfig.max_capacity_per_facility}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          max_capacity_per_facility: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Cost Parameters
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Cost per Mile ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={transportationConfig.cost_per_mile}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          cost_per_mile: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Fixed Cost per Facility ($)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={transportationConfig.fixed_cost_per_facility}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          fixed_cost_per_facility: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Variable Cost per Unit ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={transportationConfig.variable_cost_per_unit}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          variable_cost_per_unit: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Distance (miles)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={transportationConfig.max_distance_miles}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          max_distance_miles: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Third Party Options
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      Third Party Cost per Sq Ft ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={transportationConfig.thirdparty_cost_per_sqft}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          thirdparty_cost_per_sqft: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Third Party Handling Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={transportationConfig.thirdparty_handling_cost}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          thirdparty_handling_cost: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Third Party Service Level
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={transportationConfig.thirdparty_service_level}
                      onChange={(e) =>
                        setTransportationConfig({
                          ...transportationConfig,
                          thirdparty_service_level: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "optimization" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Optimization Configuration
              </h3>
              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Solver Parameters
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Solver</label>
                    <select
                      className="form-input"
                      value={optimizationConfig.solver}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          solver: e.target.value,
                        })
                      }
                    >
                      <option value="PULP_CBC_CMD">PULP CBC CMD</option>
                      <option value="GUROBI_CMD">Gurobi</option>
                      <option value="CPLEX_CMD">CPLEX</option>
                      <option value="SCIP_CMD">SCIP</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Limit (seconds)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={optimizationConfig.time_limit_seconds}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          time_limit_seconds: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gap Tolerance</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-input"
                      value={optimizationConfig.gap_tolerance}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          gap_tolerance: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Threads</label>
                    <input
                      type="number"
                      className="form-input"
                      value={optimizationConfig.threads}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          threads: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Objective Weights
                  </h4>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      marginBottom: "1rem",
                    }}
                  >
                    Weights should sum to 1.0 for balanced optimization
                  </p>
                  <div className="form-group">
                    <label className="form-label">Cost Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={optimizationConfig.weights.cost}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          weights: {
                            ...optimizationConfig.weights,
                            cost: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Level Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={optimizationConfig.weights.service_level}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          weights: {
                            ...optimizationConfig.weights,
                            service_level: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Utilization Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={optimizationConfig.weights.utilization}
                      onChange={(e) =>
                        setOptimizationConfig({
                          ...optimizationConfig,
                          weights: {
                            ...optimizationConfig.weights,
                            utilization: parseFloat(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div
                    style={{
                      padding: "0.75rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.375rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    Total Weight:{" "}
                    {(
                      optimizationConfig.weights.cost +
                      optimizationConfig.weights.service_level +
                      optimizationConfig.weights.utilization
                    ).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "output" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Output Configuration
              </h3>
              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Report Generation
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={outputConfig.generate_charts}
                        onChange={(e) =>
                          setOutputConfig({
                            ...outputConfig,
                            generate_charts: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Generate Charts
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={outputConfig.include_executive_summary}
                        onChange={(e) =>
                          setOutputConfig({
                            ...outputConfig,
                            include_executive_summary: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Include Executive Summary
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chart Formats</label>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <label>
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{ marginRight: "0.25rem" }}
                        />
                        PNG
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{ marginRight: "0.25rem" }}
                        />
                        SVG
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          style={{ marginRight: "0.25rem" }}
                        />
                        PDF
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Report Formats</label>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <label>
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{ marginRight: "0.25rem" }}
                        />
                        CSV
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{ marginRight: "0.25rem" }}
                        />
                        JSON
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          style={{ marginRight: "0.25rem" }}
                        />
                        Excel
                      </label>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Output Paths & Templates
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Output Directory</label>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue="data/output/"
                      placeholder="data/output/"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temp Directory</label>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue="data/temp/"
                      placeholder="data/temp/"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Report Template</label>
                    <textarea
                      className="form-input form-textarea"
                      placeholder="NetWORX Optimization Report - {date}"
                      defaultValue="NetWORX Optimization Report - {date}\nGenerated: {timestamp}\nAnalysis Period: {start_date} to {end_date}"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "logging" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                NetworkStrategyLogger System
              </h3>
              <div className="grid grid-cols-2">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Logger Configuration
                  </h4>
                  <div className="form-group">
                    <label className="form-label">Log Level</label>
                    <select
                      className="form-input"
                      value={loggingConfig.level}
                      onChange={(e) =>
                        setLoggingConfig({
                          ...loggingConfig,
                          level: e.target.value,
                        })
                      }
                    >
                      <option value="DEBUG">
                        DEBUG - Detailed diagnostic info
                      </option>
                      <option value="INFO">INFO - General information</option>
                      <option value="WARNING">
                        WARNING - Warning messages
                      </option>
                      <option value="ERROR">ERROR - Error messages only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Log Format</label>
                    <textarea
                      className="form-input form-textarea"
                      value={loggingConfig.format}
                      onChange={(e) =>
                        setLoggingConfig({
                          ...loggingConfig,
                          format: e.target.value,
                        })
                      }
                      placeholder="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Log Directory</label>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue="logs/"
                      placeholder="logs/"
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Handler Configuration
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={loggingConfig.file_handler}
                        onChange={(e) =>
                          setLoggingConfig({
                            ...loggingConfig,
                            file_handler: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Enable File Handler (Rotating)
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={loggingConfig.console_handler}
                        onChange={(e) =>
                          setLoggingConfig({
                            ...loggingConfig,
                            console_handler: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Enable Console Handler
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max File Size (MB)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={loggingConfig.max_file_size_mb}
                      onChange={(e) =>
                        setLoggingConfig({
                          ...loggingConfig,
                          max_file_size_mb: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Backup Count</label>
                    <input
                      type="number"
                      className="form-input"
                      value={loggingConfig.backup_count}
                      onChange={(e) =>
                        setLoggingConfig({
                          ...loggingConfig,
                          backup_count: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h4 style={{ color: "#111827", margin: 0 }}>
                    Live Log Monitor
                  </h4>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      className="form-input"
                      value={logLevel}
                      onChange={(e) => setLogLevel(e.target.value)}
                      style={{ width: "auto" }}
                    >
                      <option value="ALL">All Levels</option>
                      <option value="ERROR">Errors Only</option>
                      <option value="WARNING">Warnings+</option>
                      <option value="INFO">Info+</option>
                    </select>
                    <button className="button button-secondary">
                      <RotateCcw size={16} />
                      Refresh
                    </button>
                    <button className="button button-secondary">
                      <Download size={16} />
                      Export Logs
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#1f2937",
                    color: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    height: "300px",
                    overflowY: "auto",
                    border: "1px solid #374151",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#10b981",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <Clock size={12} />
                    <span>
                      2024-01-15 14:23:45 -
                      NetworkStrategyOptimizer.DataProcessor - INFO - Starting
                      data validation process
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#3b82f6",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <FileText size={12} />
                    <span>
                      2024-01-15 14:23:46 -
                      NetworkStrategyOptimizer.DataProcessor - INFO - Loaded
                      1,250 records from input file
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#10b981",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <CheckCircle size={12} />
                    <span>
                      2024-01-15 14:23:47 - NetworkStrategyOptimizer.Validators
                      - INFO - Data Quality Rate: 96.8%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#f59e0b",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <AlertCircle size={12} />
                    <span>
                      2024-01-15 14:23:48 - NetworkStrategyOptimizer.Validators
                      - WARNING - 40 records with missing postal codes
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#10b981",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <Monitor size={12} />
                    <span>
                      2024-01-15 14:23:50 -
                      NetworkStrategyOptimizer.WarehouseOptimizer - INFO -
                      Function warehouse_optimization executed in 2.34 seconds
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#10b981",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <CheckCircle size={12} />
                    <span>
                      2024-01-15 14:23:52 -
                      NetworkStrategyOptimizer.TransportOptimizer - INFO -
                      Optimization Status: Optimal, Objective Value: 485,000.00
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#ef4444",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <AlertCircle size={12} />
                    <span>
                      2024-01-15 14:23:53 -
                      NetworkStrategyOptimizer.OutputGenerator - ERROR - Failed
                      to generate chart: FileNotFoundError
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#6b7280",
                    }}
                  >
                    <span>
                      ⚡ Live logging enabled - Real-time updates from
                      NetworkStrategyLogger
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3" style={{ marginTop: "1rem" }}>
                <div className="card">
                  <h4 style={{ marginBottom: "0.75rem", color: "#111827" }}>
                    Specialized Logging
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Execution Time Logging
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Data Quality Logging
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Optimization Results Logging
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        defaultChecked
                        style={{ marginRight: "0.5rem" }}
                      />
                      Error Detail Logging
                    </label>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "0.75rem", color: "#111827" }}>
                    Log Statistics
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>Today's Logs:</span>
                    <span style={{ fontWeight: "bold" }}>1,247</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>Errors:</span>
                    <span style={{ fontWeight: "bold", color: "#ef4444" }}>
                      3
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>Warnings:</span>
                    <span style={{ fontWeight: "bold", color: "#f59e0b" }}>
                      12
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>File Size:</span>
                    <span style={{ fontWeight: "bold" }}>2.3 MB</span>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "0.75rem", color: "#111827" }}>
                    Log Management
                  </h4>
                  <button
                    className="button button-secondary"
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                  >
                    <FileText size={16} />
                    View Log Files
                  </button>
                  <button
                    className="button button-secondary"
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                  >
                    <DownloadIcon size={16} />
                    Archive Old Logs
                  </button>
                  <button
                    className="button button-secondary"
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                  >
                    <RotateCcw size={16} />
                    Rotate Log Files
                  </button>
                  <button
                    className="button button-secondary"
                    style={{ width: "100%" }}
                  >
                    <Settings size={16} />
                    Test Logger
                  </button>
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
                    Export current configuration as YAML file (matching Python
                    ConfigManager format).
                  </p>
                  <button className="button button-primary">
                    <Download size={16} />
                    Export as YAML
                  </button>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Import Configuration
                  </h4>
                  <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
                    Import configuration from YAML file generated by Python
                    ConfigManager.
                  </p>
                  <div className="file-upload" style={{ marginBottom: "1rem" }}>
                    <Upload
                      size={24}
                      style={{ color: "#6b7280", margin: "0 auto 0.5rem" }}
                    />
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                      Click to upload config.yaml
                    </p>
                    <input
                      type="file"
                      accept=".yaml,.yml"
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
