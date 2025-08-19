// Advanced optimization types that integrate with existing NetWORX system
export type ForecastRow = { year: number; annual_units: number };

export type SKU = {
  sku: string;
  annual_volume: number;
  units_per_case: number;
  cases_per_pallet: number;
};

export type WarehouseParams = {
  operating_days: number;           // e.g., 260
  DOH: number;                      // days of holding for storage sizing
  pallet_length_inches: number;     // 48
  pallet_width_inches: number;      // 40
  ceiling_height_inches: number;    // e.g., 432 (36 ft)
  rack_height_inches: number;       // e.g., 96 (8 ft per level)
  aisle_factor: number;             // 0..1 (space lost to aisles)
  outbound_pallets_per_door_per_day: number;
  inbound_pallets_per_door_per_day: number;
  max_outbound_doors: number;
  max_inbound_doors: number;
  outbound_area_per_door: number;
  inbound_area_per_door: number;
  min_office: number;
  min_battery: number;
  min_packing: number;
  max_utilization: number;          // 0..1

  initial_facility_area: number;    // existing internal sq ft
  case_pick_area_fixed: number;     // per facility
  each_pick_area_fixed: number;     // per facility
  min_conveyor: number;             // per facility
  facility_design_area: number;     // max size you can add at once

  cost_per_sqft_annual: number;     // internal space cost $/sf/yr
  thirdparty_cost_per_sqft: number; // 3PL overflow cost $/sf/yr
  max_facilities?: number;
};

export type TransportParams = {
  fixed_cost_per_facility: number;
  cost_per_mile: number;            // for translating cost matrix -> distance if needed
  service_level_requirement: number; // 0..1
  max_distance_miles: number;
  required_facilities: number;      // minimum opened
  max_facilities: number;           // maximum opened
  max_capacity_per_facility?: number;
  mandatory_facilities?: string[];  // facility names that must be open
  weights?: { cost?: number; service_level?: number };
};

export type OptimizationParams = {
  solver?: 'JSLP_SOLVER';
  time_limit_seconds?: number;
  gap_tolerance?: number;
  threads?: number;
  weights?: { cost?: number; utilization?: number; service_level?: number };
};

export type OptimizationConfig = {
  warehouse: WarehouseParams;
  transportation: TransportParams;
  optimization: OptimizationParams;
};

export type CostMatrix = {
  rows: string[];      // candidate facility names (cities)
  cols: string[];      // destination names (markets)
  // cost[i][j] = $/unit from rows[i] -> cols[j]
  cost: number[][];
};

export type DemandMap = Record<string, number>;      // dest -> units
export type CapacityMap = Record<string, number>;    // facility -> units capacity

export type WarehouseYearRow = {
  Year: number;
  Storage_Pallets: number;
  Storage_Area_SqFt: number;
  Outbound_Dock_Area: number;
  Inbound_Dock_Area: number;
  Support_Area: number;
  Case_Pick_Area: number;
  Each_Pick_Area: number;
  Conveyor_Area: number;
  Net_Area_SqFt: number;
  Gross_Area_SqFt: number;
  Facilities_Needed: number;
  Facility_Size_Added: number;
  Cumulative_Facility_Size: number;
  ThirdParty_SqFt_Required: number;
  Internal_Cost_Annual: number;
  ThirdParty_Cost_Annual: number;
  Total_Cost_Annual: number;
  Cost_Per_Unit: number;
  Utilization_Percentage: number;
  Outbound_Doors: number;
  Inbound_Doors: number;
};

export type WarehouseResult = {
  results: WarehouseYearRow[];
  optimization_summary: {
    status: string;
    objective_value: number | null;
    solve_time: number;
    total_facilities_added: number;
    total_facility_size_added: number;
    total_thirdparty_space: number;
  };
  performance_metrics: {
    volume_cagr: number;
    cost_cagr: number;
    avg_utilization: number;
    avg_cost_per_unit: number;
    thirdparty_dependency: number;
    total_internal_space: number;
    total_thirdparty_space: number;
  };
};

export type TransportAssignment = {
  Facility: string;
  Destination: string;
  Demand: number;
  Cost: number;      // $/unit
  Distance: number;  // miles (derived)
};

export type TransportResult = {
  open_facilities: string[];
  assignments: TransportAssignment[];
  facility_metrics: {
    Facility: string;
    Destinations_Served: number;
    Total_Demand: number;
    Capacity_Utilization: number;
    Average_Distance: number;
    Total_Cost: number;
    Cost_Per_Unit: number;
  }[];
  optimization_summary: {
    status: string;
    objective_value: number | null;
    solve_time: number;
    facilities_opened: number;
    total_demand_served: number;
    total_transportation_cost: number;
  };
  network_metrics: {
    service_level_achievement: number; // 0..1
    avg_cost_per_unit: number;
    weighted_avg_distance: number;
    avg_facility_utilization: number;
    network_utilization: number;
    destinations_per_facility: number;
    total_transportation_cost: number;
    demand_within_service_limit: number;
    total_demand_served: number;
    facilities_opened: number;
    total_capacity_available: number;
  };
};

export type IntegratedRunPayload = {
  config: OptimizationConfig;
  forecast: ForecastRow[];     // baseline and horizon years
  skus: SKU[];                 // baseline assortment
  costMatrix: CostMatrix;      // for transportation
  demand?: DemandMap;          // optional overrides (else equal weight)
  capacity?: CapacityMap;      // optional per facility
  limits?: { minFacilities?: number; maxFacilities?: number };
  baseline_transport_cost?: number; // Integration with actual $6.56M baseline
};

export type IntegratedRunResult = {
  warehouse: WarehouseResult;
  transportation: TransportResult;
  combined: {
    yearRows: Array<{
      Year: number;
      Warehouse_Facilities: number;
      Warehouse_Gross_Area: number;
      Warehouse_Cost: number;
      ThirdParty_Space: number;
      Network_Facilities: number;
      Transportation_Cost: number;
      Total_Annual_Cost: number;
      Utilization_Pct: number;
      Service_Level_Achievement: number; // 0..100
    }>;
  };
  baseline_integration: {
    current_transport_baseline: number;
    optimized_transport_cost: number;
    projected_savings: number;
    savings_percentage: number;
  };
};

// Types for LP Solver integration
export type LpConstraintBound = { max?: number; min?: number; equal?: number };
export type LpModel = {
  optimize: string;         // objective key
  opType: 'min' | 'max';
  constraints: Record<string, LpConstraintBound>;
  variables: Record<string, Record<string, number>>;
  ints?: Record<string, 1>;
  binaries?: Record<string, 1>;
};

export type LpSolveResult = {
  feasible: boolean;
  result: number; // objective value
  bounded?: boolean;
  [varName: string]: any;
};
