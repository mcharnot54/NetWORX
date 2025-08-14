// Database schema types for NetWORX Essentials comprehensive system

export interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: string;
  owner_id?: string;
  project_duration_years: number;
  base_year: number;
}

export interface Scenario {
  id: number;
  project_id: number;
  name: string;
  scenario_number: number;
  number_of_nodes?: number;
  cities?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
  status: string;
  capacity_analysis_completed: boolean;
  transport_optimization_completed: boolean;
  warehouse_optimization_completed: boolean;
}

export interface ProjectConfiguration {
  id: number;
  project_id: number;
  default_lease_term_years: number;
  default_utilization_rate: number;
  outbound_weight_percentage: number;
  inbound_weight_percentage: number;
  service_zone_weighting?: any;
  currency: string;
  measurement_system: string;
  created_at: string;
  updated_at: string;
}

export interface GrowthForecast {
  id: number;
  project_id: number;
  year_number: number;
  forecast_type: 'actual' | 'forecast' | 'linear';
  units_growth_rate?: number;
  dollar_growth_rate?: number;
  absolute_units?: number;
  absolute_dollars?: number;
  is_actual_data: boolean;
  confidence_level?: number;
  notes?: string;
  created_at: string;
}

export interface Facility {
  id: number;
  project_id: number;
  name: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  square_feet?: number;
  capacity_units?: number;
  is_forced: boolean;
  force_start_year?: number;
  force_end_year?: number;
  allow_expansion: boolean;
  lease_rate_per_sqft?: number;
  operating_cost_per_sqft?: number;
  created_at: string;
  updated_at: string;
}

export interface MarketData {
  id: number;
  city?: string;
  state?: string;
  zip_code?: string;
  warehouse_lease_rate_per_sqft?: number;
  office_lease_rate_per_sqft?: number;
  hourly_wage_rate?: number;
  fully_burdened_rate?: number;
  data_source?: string;
  last_updated: string;
  confidence_score: number;
}

export interface CapacityAnalysis {
  id: number;
  scenario_id: number;
  year_number: number;
  required_square_feet?: number;
  required_capacity_units?: number;
  number_of_facilities_required?: number;
  facility_allocations?: any;
  analysis_date: string;
  confidence_level?: number;
  assumptions?: string[];
}

export interface TransportScenario {
  id: number;
  scenario_id: number;
  scenario_type?: string;
  scenario_name?: string;
  total_miles?: number;
  total_cost?: number;
  service_score?: number;
  route_details?: any;
  volume_allocations?: any;
  optimization_data?: any;
  created_at: string;
}

export interface WarehouseOptimization {
  id: number;
  transport_scenario_id: number;
  year_number: number;
  facility_costs?: any;
  total_lease_costs?: number;
  total_operating_costs?: number;
  total_labor_costs?: number;
  total_facility_capital?: number;
  analysis_date: string;
  lease_term_used?: number;
  utilization_rate_used?: number;
}

export interface ScenarioResults {
  id: number;
  scenario_id: number;
  year_number: number;
  
  // Operational KPIs
  peak_daily_orders_shipped?: number;
  average_daily_orders_shipped?: number;
  theoretical_max_throughput?: number;
  current_labor_force?: number;
  peak_inventory_units?: number;
  inventory_turns?: number;
  order_backlog?: number;
  throughput_bottleneck_process?: string;
  
  // Capacity KPIs
  candidate_dc_location?: string;
  est_new_dc_capacity?: number;
  est_new_dc_operational_cost?: number;
  automation_investment?: number;
  expansion_capacity_added?: number;
  expansion_cost?: number;
  
  // Forecasting KPIs
  projected_orders_units?: number;
  capacity_limit_threshold?: number;
  new_dc_golive_date?: string;
  incremental_capacity_added?: number;
  
  // Performance KPIs
  budget_constraint?: number;
  capital_investment_amount?: number;
  depreciation_period?: number;
  current_fulfillment_cost_per_order?: number;
  projected_fulfillment_cost_per_order?: number;
  
  // Financial KPIs
  annual_cost_savings?: number;
  annual_revenue_impact?: number;
  roi_percentage?: number;
  payback_period_months?: number;
  net_present_value?: number;
  total_cost_of_ownership?: number;
  
  // Cost Breakdown
  transportation_costs?: number;
  warehouse_operating_costs?: number;
  variable_labor_costs?: number;
  facility_rent_costs?: number;
  facility_capital_costs?: number;
  total_costs?: number;
  total_aggregated_costs?: number;
  total_costs_per_unit?: number;
  
  created_at: string;
}

export interface PLComparison {
  id: number;
  scenario_id: number;
  year_number: number;
  
  // P&L Statement
  total_revenue?: number;
  cogs?: number;
  transportation_expense?: number;
  warehouse_expense?: number;
  labor_expense?: number;
  facility_expense?: number;
  other_operating_expense?: number;
  gross_profit?: number;
  operating_profit?: number;
  net_profit?: number;
  
  // Margins
  gross_margin_percentage?: number;
  operating_margin_percentage?: number;
  net_margin_percentage?: number;
  
  created_at: string;
}

export interface APIIntegration {
  id: number;
  integration_type: string;
  request_params?: any;
  response_data?: any;
  status: string;
  error_message?: string;
  cache_expiry?: string;
  request_count: number;
  created_at: string;
}

export interface OperationalDataRecord {
  id: number;
  project_id: number;
  scenario_id?: number;
  data_category: string;
  data_subcategory?: string;
  data_fields?: any;
  file_source?: string;
  data_quality_score?: number;
  validation_results?: any;
  created_at: string;
  processed_at?: string;
}

export interface FinancialDataRecord {
  id: number;
  project_id: number;
  cost_category: string;
  amount?: number;
  currency: string;
  year_number?: number;
  data_source?: string;
  confidence_level?: number;
  created_at: string;
}

// Input types for creating new records
export interface CreateProjectInput {
  name: string;
  description?: string;
  owner_id?: string;
  project_duration_years?: number;
  base_year?: number;
}

export interface CreateScenarioInput {
  project_id: number;
  name: string;
  scenario_number: number;
  number_of_nodes?: number;
  cities?: string[];
  description?: string;
}

export interface CreateGrowthForecastInput {
  project_id: number;
  year_number: number;
  forecast_type: 'actual' | 'forecast' | 'linear';
  units_growth_rate?: number;
  dollar_growth_rate?: number;
  absolute_units?: number;
  absolute_dollars?: number;
  is_actual_data?: boolean;
  confidence_level?: number;
  notes?: string;
}

export interface CreateFacilityInput {
  project_id: number;
  name: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  square_feet?: number;
  capacity_units?: number;
  is_forced?: boolean;
  force_start_year?: number;
  force_end_year?: number;
  allow_expansion?: boolean;
  lease_rate_per_sqft?: number;
  operating_cost_per_sqft?: number;
}

// Comprehensive scenario naming structure
export interface ScenarioNaming {
  projectName: string;
  scenarioNumber: number;
  numberOfNodes: number;
  cities: string[];
  fullName: string; // Generated combination
}

// Service zone configuration for transport optimization
export interface ServiceZoneWeighting {
  parcel_zone_weight: number;
  ltl_zone_weight: number;
  tl_daily_miles_weight: number;
}

// Market data fetching configuration
export interface MarketDataRequest {
  location: {
    city: string;
    state: string;
    zip_code?: string;
  };
  data_types: ('warehouse_lease' | 'office_lease' | 'hourly_wage' | 'burdened_rate')[];
}

// Optimization workflow status
export interface OptimizationWorkflowStatus {
  capacity_analysis: 'pending' | 'in_progress' | 'completed' | 'failed';
  transport_optimization: 'pending' | 'in_progress' | 'completed' | 'failed';
  warehouse_optimization: 'pending' | 'in_progress' | 'completed' | 'failed';
  overall_status: 'not_started' | 'in_progress' | 'completed' | 'failed';
}
