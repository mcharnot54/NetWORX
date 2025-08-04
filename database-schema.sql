-- NetWORX Essentials Database Schema
-- Comprehensive schema for Projects, Scenarios, and Optimization Data

-- Projects (top-level organization)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'active',
    owner_id VARCHAR(255),
    project_duration_years INTEGER DEFAULT 5,
    base_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())
);

-- Scenarios (under Projects)
CREATE TABLE IF NOT EXISTS scenarios (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    scenario_number INTEGER NOT NULL,
    number_of_nodes INTEGER,
    cities TEXT[], -- Array of city names
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Optimization workflow status
    capacity_analysis_completed BOOLEAN DEFAULT FALSE,
    transport_optimization_completed BOOLEAN DEFAULT FALSE,
    warehouse_optimization_completed BOOLEAN DEFAULT FALSE,
    
    UNIQUE(project_id, scenario_number)
);

-- Configuration Settings (per project)
CREATE TABLE IF NOT EXISTS project_configurations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Capacity Analysis Configuration
    default_lease_term_years INTEGER DEFAULT 7,
    default_utilization_rate DECIMAL(5,2) DEFAULT 80.00,
    
    -- Transport Optimizer Configuration
    outbound_weight_percentage DECIMAL(5,2) DEFAULT 50.00,
    inbound_weight_percentage DECIMAL(5,2) DEFAULT 50.00,
    service_zone_weighting JSONB, -- Custom weightings for blended service zones
    
    -- General Configuration
    currency VARCHAR(3) DEFAULT 'USD',
    measurement_system VARCHAR(10) DEFAULT 'imperial', -- imperial or metric
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Annual Growth Forecasts (per project)
CREATE TABLE IF NOT EXISTS growth_forecasts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL, -- 1, 2, 3, etc. relative to base year
    forecast_type VARCHAR(20) NOT NULL, -- 'actual', 'forecast', 'linear'
    
    -- Growth data
    units_growth_rate DECIMAL(5,2),
    dollar_growth_rate DECIMAL(5,2),
    absolute_units BIGINT,
    absolute_dollars DECIMAL(15,2),
    
    -- Metadata
    is_actual_data BOOLEAN DEFAULT FALSE,
    confidence_level DECIMAL(5,2), -- 0-100
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, year_number)
);

-- Facilities (including forced/fixed facilities)
CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    
    -- Location data
    city VARCHAR(255),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Facility characteristics
    square_feet INTEGER,
    capacity_units BIGINT,
    
    -- Constraint settings
    is_forced BOOLEAN DEFAULT FALSE,
    force_start_year INTEGER,
    force_end_year INTEGER,
    allow_expansion BOOLEAN DEFAULT TRUE,
    
    -- Costs (can be overridden by market data)
    lease_rate_per_sqft DECIMAL(10,2),
    operating_cost_per_sqft DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Data (lease rates, labor costs by location)
CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    city VARCHAR(255),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    
    -- Lease data
    warehouse_lease_rate_per_sqft DECIMAL(10,2),
    office_lease_rate_per_sqft DECIMAL(10,2),
    
    -- Labor data
    hourly_wage_rate DECIMAL(10,2),
    fully_burdened_rate DECIMAL(10,2),
    
    -- Data source and freshness
    data_source VARCHAR(100), -- 'perplexity_api', 'manual', etc.
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_score DECIMAL(5,2) DEFAULT 50.00,
    
    UNIQUE(city, state, zip_code)
);

-- Capacity Analysis Results
CREATE TABLE IF NOT EXISTS capacity_analysis (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL,
    
    -- Capacity requirements
    required_square_feet INTEGER,
    required_capacity_units BIGINT,
    number_of_facilities_required INTEGER,
    
    -- Facility assignments
    facility_allocations JSONB, -- JSON object with facility_id -> capacity allocation
    
    -- Analysis metadata
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence_level DECIMAL(5,2),
    assumptions TEXT[],
    
    UNIQUE(scenario_id, year_number)
);

-- Transport Optimization Scenarios (generated scenarios)
CREATE TABLE IF NOT EXISTS transport_scenarios (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    
    -- Scenario identification
    scenario_type VARCHAR(50), -- 'lowest_miles_zip', 'lowest_miles_city', 'lowest_miles_state', 'lowest_cost_zip', etc.
    scenario_name VARCHAR(255),
    
    -- Results
    total_miles DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    service_score DECIMAL(10,2),
    
    -- Route details
    route_details JSONB, -- Detailed routing information
    volume_allocations JSONB, -- Volume allocation per facility
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse Optimization Results
CREATE TABLE IF NOT EXISTS warehouse_optimization (
    id SERIAL PRIMARY KEY,
    transport_scenario_id INTEGER REFERENCES transport_scenarios(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL,
    
    -- Costs per facility
    facility_costs JSONB, -- JSON object with facility costs breakdown
    
    -- Totals
    total_lease_costs DECIMAL(15,2),
    total_operating_costs DECIMAL(15,2),
    total_labor_costs DECIMAL(15,2),
    total_facility_capital DECIMAL(15,2),
    
    -- Analysis metadata
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lease_term_used INTEGER,
    utilization_rate_used DECIMAL(5,2),
    
    UNIQUE(transport_scenario_id, year_number)
);

-- Operational Data (from existing schema, enhanced)
CREATE TABLE IF NOT EXISTS operational_data (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE SET NULL,
    
    -- Data categorization
    data_category VARCHAR(100), -- 'network_footprint', 'order_payment', 'order_shipment', etc.
    data_subcategory VARCHAR(100),
    
    -- Data payload
    data_fields JSONB, -- Flexible storage for all operational data fields
    
    -- Metadata
    file_source VARCHAR(255),
    data_quality_score DECIMAL(5,2),
    validation_results JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Financial Data
CREATE TABLE IF NOT EXISTS financial_data (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Cost categories
    cost_category VARCHAR(100), -- 'warehouse_operating', 'lease', 'inventory_carrying', etc.
    
    -- Financial data
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    year_number INTEGER,
    
    -- Source and quality
    data_source VARCHAR(100),
    confidence_level DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comprehensive Results Table (for all KPIs mentioned)
CREATE TABLE IF NOT EXISTS scenario_results (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL,
    
    -- Operational KPIs
    peak_daily_orders_shipped INTEGER,
    average_daily_orders_shipped INTEGER,
    theoretical_max_throughput INTEGER,
    current_labor_force INTEGER,
    peak_inventory_units BIGINT,
    inventory_turns DECIMAL(10,2),
    order_backlog INTEGER,
    throughput_bottleneck_process VARCHAR(255),
    
    -- Capacity KPIs
    candidate_dc_location VARCHAR(255),
    est_new_dc_capacity BIGINT,
    est_new_dc_operational_cost DECIMAL(15,2),
    automation_investment DECIMAL(15,2),
    expansion_capacity_added BIGINT,
    expansion_cost DECIMAL(15,2),
    
    -- Forecasting KPIs
    projected_orders_units BIGINT,
    capacity_limit_threshold DECIMAL(10,2),
    new_dc_golive_date DATE,
    incremental_capacity_added BIGINT,
    
    -- Performance KPIs
    budget_constraint DECIMAL(15,2),
    capital_investment_amount DECIMAL(15,2),
    depreciation_period INTEGER,
    current_fulfillment_cost_per_order DECIMAL(10,2),
    projected_fulfillment_cost_per_order DECIMAL(10,2),
    
    -- Financial KPIs
    annual_cost_savings DECIMAL(15,2),
    annual_revenue_impact DECIMAL(15,2),
    roi_percentage DECIMAL(10,2),
    payback_period_months INTEGER,
    net_present_value DECIMAL(15,2),
    total_cost_of_ownership DECIMAL(15,2),
    
    -- Cost Breakdown
    transportation_costs DECIMAL(15,2),
    warehouse_operating_costs DECIMAL(15,2),
    variable_labor_costs DECIMAL(15,2),
    facility_rent_costs DECIMAL(15,2),
    facility_capital_costs DECIMAL(15,2),
    total_costs DECIMAL(15,2),
    total_aggregated_costs DECIMAL(15,2),
    total_costs_per_unit DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(scenario_id, year_number)
);

-- P&L Comparisons
CREATE TABLE IF NOT EXISTS pl_comparisons (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    year_number INTEGER NOT NULL,
    
    -- Revenue
    total_revenue DECIMAL(15,2),
    
    -- Cost of Goods Sold
    cogs DECIMAL(15,2),
    
    -- Operating Expenses
    transportation_expense DECIMAL(15,2),
    warehouse_expense DECIMAL(15,2),
    labor_expense DECIMAL(15,2),
    facility_expense DECIMAL(15,2),
    other_operating_expense DECIMAL(15,2),
    
    -- Calculated fields
    gross_profit DECIMAL(15,2),
    operating_profit DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    
    -- Margins
    gross_margin_percentage DECIMAL(5,2),
    operating_margin_percentage DECIMAL(5,2),
    net_margin_percentage DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(scenario_id, year_number)
);

-- API Integration Logs
CREATE TABLE IF NOT EXISTS api_integrations (
    id SERIAL PRIMARY KEY,
    integration_type VARCHAR(100), -- 'perplexity_lease_rates', 'perplexity_labor_rates'
    request_params JSONB,
    response_data JSONB,
    status VARCHAR(50), -- 'success', 'error', 'partial'
    error_message TEXT,
    
    -- Rate limiting and caching
    cache_expiry TIMESTAMP WITH TIME ZONE,
    request_count INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_operational_data_project_id ON operational_data(project_id);
CREATE INDEX IF NOT EXISTS idx_operational_data_scenario_id ON operational_data(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_results_scenario_id ON scenario_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_results_year ON scenario_results(year_number);
CREATE INDEX IF NOT EXISTS idx_market_data_location ON market_data(city, state);
CREATE INDEX IF NOT EXISTS idx_transport_scenarios_scenario_id ON transport_scenarios(scenario_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_optimization_transport_scenario ON warehouse_optimization(transport_scenario_id);

-- Updated triggers for timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_scenarios_modtime BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_facilities_modtime BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_project_configurations_modtime BEFORE UPDATE ON project_configurations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
