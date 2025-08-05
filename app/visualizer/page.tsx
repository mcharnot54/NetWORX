'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Download,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  Target,
  Settings,
  FileText,
  Calculator,
  Clock,
  MapPin,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  Users,
  Building,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
} from 'lucide-react';

// Comprehensive KPI data structure
interface ComprehensiveResults {
  project_id: number;
  project_name: string;
  scenario_id: number;
  scenario_name: string;
  year_number: number;
  
  // Operational KPIs
  peak_daily_orders_shipped: number;
  average_daily_orders_shipped: number;
  theoretical_max_throughput: number;
  current_labor_force: number;
  peak_inventory_units: number;
  inventory_turns: number;
  order_backlog: number;
  throughput_bottleneck_process: string;
  
  // Capacity KPIs
  candidate_dc_location: string;
  est_new_dc_capacity: number;
  est_new_dc_operational_cost: number;
  automation_investment: number;
  expansion_capacity_added: number;
  expansion_cost: number;
  
  // Forecasting KPIs
  projected_orders_units: number;
  capacity_limit_threshold: number;
  new_dc_golive_date: string;
  incremental_capacity_added: number;
  kpi_targets: string;
  
  // Performance KPIs
  budget_constraint: number;
  capital_investment_amount: number;
  depreciation_period: number;
  current_fulfillment_cost_per_order: number;
  projected_fulfillment_cost_per_order: number;
  
  // Financial KPIs
  annual_cost_savings: number;
  annual_revenue_impact: number;
  roi_percentage: number;
  payback_period_months: number;
  net_present_value: number;
  total_cost_of_ownership: number;
  
  // Cost Breakdown
  transportation_costs: number;
  warehouse_operating_costs: number;
  variable_labor_costs: number;
  facility_rent_costs: number;
  facility_capital_costs: number;
  total_costs: number;
  total_aggregated_costs: number;
  total_costs_per_unit: number;
}

// P&L Comparison data
interface PLComparison {
  scenario_name: string;
  year_number: number;
  total_revenue: number;
  cogs: number;
  transportation_expense: number;
  warehouse_expense: number;
  labor_expense: number;
  facility_expense: number;
  other_operating_expense: number;
  gross_profit: number;
  operating_profit: number;
  net_profit: number;
  gross_margin_percentage: number;
  operating_margin_percentage: number;
  net_margin_percentage: number;
}

export default function Visualizer() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'operational' | 'financial' | 'capacity' | 'scenarios' | 'reports'>('dashboard');
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState('scenario1');
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock comprehensive data - in production, this would come from your API
  const [comprehensiveResults, setComprehensiveResults] = useState<ComprehensiveResults[]>([]);
  const [plComparisons, setPLComparisons] = useState<PLComparison[]>([]);

  useEffect(() => {
    // Mock data generation
    const mockResults: ComprehensiveResults[] = [];
    const mockPL: PLComparison[] = [];
    
    const scenarios = [
      { id: 1, name: 'Lowest Cost (ZIP to ZIP)' },
      { id: 2, name: 'Best Service (Parcel Zone)' },
      { id: 3, name: 'Lowest Miles (City to City)' }
    ];
    
    scenarios.forEach(scenario => {
      for (let year = 1; year <= 5; year++) {
        const growthFactor = Math.pow(1.05, year - 1); // 5% annual growth
        
        mockResults.push({
          project_id: 1,
          project_name: 'NetWORX Optimization Project',
          scenario_id: scenario.id,
          scenario_name: scenario.name,
          year_number: year,
          
          // Operational KPIs
          peak_daily_orders_shipped: Math.floor((8500 + Math.random() * 1500) * growthFactor),
          average_daily_orders_shipped: Math.floor((6200 + Math.random() * 800) * growthFactor),
          theoretical_max_throughput: Math.floor((12000 + Math.random() * 2000) * growthFactor),
          current_labor_force: Math.floor((245 + Math.random() * 55) * Math.pow(1.03, year - 1)),
          peak_inventory_units: Math.floor((125000 + Math.random() * 25000) * growthFactor),
          inventory_turns: Math.round((12.5 + Math.random() * 2.5) * 10) / 10,
          order_backlog: Math.floor(150 + Math.random() * 100),
          throughput_bottleneck_process: ['Picking', 'Packing', 'Shipping', 'Receiving'][Math.floor(Math.random() * 4)],
          
          // Capacity KPIs
          candidate_dc_location: ['Dallas, TX', 'Denver, CO', 'Memphis, TN'][Math.floor(Math.random() * 3)],
          est_new_dc_capacity: Math.floor((85000 + Math.random() * 35000) * growthFactor),
          est_new_dc_operational_cost: Math.floor((2.8 + Math.random() * 1.2) * 1000000),
          automation_investment: Math.floor((1.5 + Math.random() * 2.5) * 1000000),
          expansion_capacity_added: Math.floor((25000 + Math.random() * 15000) * growthFactor),
          expansion_cost: Math.floor((850000 + Math.random() * 350000) * Math.pow(1.04, year - 1)),
          
          // Forecasting KPIs
          projected_orders_units: Math.floor((285000 + Math.random() * 65000) * growthFactor),
          capacity_limit_threshold: 85 + Math.random() * 10,
          new_dc_golive_date: `Q${Math.ceil(Math.random() * 4)} ${2024 + year}`,
          incremental_capacity_added: Math.floor((18000 + Math.random() * 12000) * growthFactor),
          kpi_targets: `${Math.floor(95 + Math.random() * 4)}% efficiency target`,
          
          // Performance KPIs
          budget_constraint: Math.floor((15 + Math.random() * 10) * 1000000),
          capital_investment_amount: Math.floor((3.2 + Math.random() * 2.8) * 1000000),
          depreciation_period: 7 + Math.floor(Math.random() * 6),
          current_fulfillment_cost_per_order: Math.round((8.50 + Math.random() * 2.50) * 100) / 100,
          projected_fulfillment_cost_per_order: Math.round((7.20 + Math.random() * 1.80) * 100) / 100,
          
          // Financial KPIs
          annual_cost_savings: Math.floor((850000 + Math.random() * 450000) * Math.pow(1.05, year - 1)),
          annual_revenue_impact: Math.floor((2.4 + Math.random() * 1.6) * 1000000 * growthFactor),
          roi_percentage: Math.round((15.5 + Math.random() * 8.5) * 10) / 10,
          payback_period_months: Math.floor(18 + Math.random() * 18),
          net_present_value: Math.floor((4.8 + Math.random() * 3.2) * 1000000 * Math.pow(1.08, year - 1)),
          total_cost_of_ownership: Math.floor((28 + Math.random() * 12) * 1000000 * Math.pow(1.06, year - 1)),
          
          // Cost Breakdown
          transportation_costs: Math.floor((5.2 + Math.random() * 2.8) * 1000000 * growthFactor),
          warehouse_operating_costs: Math.floor((3.8 + Math.random() * 2.2) * 1000000 * growthFactor),
          variable_labor_costs: Math.floor((2.1 + Math.random() * 1.4) * 1000000 * growthFactor),
          facility_rent_costs: Math.floor((1.8 + Math.random() * 0.9) * 1000000 * Math.pow(1.03, year - 1)),
          facility_capital_costs: Math.floor((0.8 + Math.random() * 0.6) * 1000000),
          total_costs: 0, // Will be calculated
          total_aggregated_costs: 0, // Will be calculated
          total_costs_per_unit: 0 // Will be calculated
        });
        
        // Calculate total costs
        const lastResult = mockResults[mockResults.length - 1];
        lastResult.total_costs = lastResult.transportation_costs + lastResult.warehouse_operating_costs + 
                                lastResult.variable_labor_costs + lastResult.facility_rent_costs + 
                                lastResult.facility_capital_costs;
        lastResult.total_aggregated_costs = lastResult.total_costs * 1.12; // 12% overhead
        lastResult.total_costs_per_unit = lastResult.total_costs / lastResult.projected_orders_units;
        
        // P&L Data
        const revenue = (48 + Math.random() * 12) * 1000000 * growthFactor;
        const cogs = revenue * (0.35 + Math.random() * 0.1);
        const grossProfit = revenue - cogs;
        const totalExpenses = lastResult.transportation_costs + lastResult.warehouse_operating_costs + 
                             lastResult.variable_labor_costs + lastResult.facility_rent_costs + 
                             (2.5 + Math.random() * 1.5) * 1000000;
        const operatingProfit = grossProfit - totalExpenses;
        const netProfit = operatingProfit * (0.85 + Math.random() * 0.1); // After taxes/interest
        
        mockPL.push({
          scenario_name: scenario.name,
          year_number: year,
          total_revenue: revenue,
          cogs: cogs,
          transportation_expense: lastResult.transportation_costs,
          warehouse_expense: lastResult.warehouse_operating_costs,
          labor_expense: lastResult.variable_labor_costs,
          facility_expense: lastResult.facility_rent_costs,
          other_operating_expense: (2.5 + Math.random() * 1.5) * 1000000,
          gross_profit: grossProfit,
          operating_profit: operatingProfit,
          net_profit: netProfit,
          gross_margin_percentage: (grossProfit / revenue) * 100,
          operating_margin_percentage: (operatingProfit / revenue) * 100,
          net_margin_percentage: (netProfit / revenue) * 100
        });
      }
    });
    
    setComprehensiveResults(mockResults);
    setPLComparisons(mockPL);
  }, []);

  const getCurrentResults = () => {
    return comprehensiveResults.filter(r => 
      r.scenario_name === getScenarioName(selectedScenario) && r.year_number === selectedYear
    );
  };

  const getScenarioName = (scenarioKey: string) => {
    const scenarioMap: { [key: string]: string } = {
      'scenario1': 'Lowest Cost (ZIP to ZIP)',
      'scenario2': 'Best Service (Parcel Zone)',
      'scenario3': 'Lowest Miles (City to City)'
    };
    return scenarioMap[scenarioKey] || 'Lowest Cost (ZIP to ZIP)';
  };

  const getMultiYearData = () => {
    return comprehensiveResults.filter(r => r.scenario_name === getScenarioName(selectedScenario));
  };

  const getCostBreakdownData = () => {
    const current = getCurrentResults()[0];
    if (!current) return [];
    
    return [
      { name: 'Transportation', value: current.transportation_costs, color: '#3b82f6' },
      { name: 'Warehouse Operations', value: current.warehouse_operating_costs, color: '#10b981' },
      { name: 'Variable Labor', value: current.variable_labor_costs, color: '#f59e0b' },
      { name: 'Facility Rent', value: current.facility_rent_costs, color: '#ef4444' },
      { name: 'Facility Capital', value: current.facility_capital_costs, color: '#8b5cf6' }
    ];
  };

  const getPLData = () => {
    return plComparisons.filter(p => p.scenario_name === getScenarioName(selectedScenario));
  };

  const generateComprehensiveReport = async () => {
    setIsGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const blob = new Blob([JSON.stringify({
      project_results: comprehensiveResults,
      pl_comparisons: plComparisons,
      generated_at: new Date().toISOString(),
      scenario_summary: getScenarioComparison()
    }, null, 2)], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive_analysis_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    setIsGenerating(false);
  };

  const getScenarioComparison = () => {
    const scenarios = ['scenario1', 'scenario2', 'scenario3'];
    return scenarios.map(scenario => {
      const data = comprehensiveResults.filter(r => r.scenario_name === getScenarioName(scenario));
      const totalCosts = data.reduce((sum, r) => sum + r.total_costs, 0);
      const totalSavings = data.reduce((sum, r) => sum + r.annual_cost_savings, 0);
      const avgROI = data.reduce((sum, r) => sum + r.roi_percentage, 0) / data.length;
      
      return {
        scenario: getScenarioName(scenario),
        total_5_year_costs: totalCosts,
        total_5_year_savings: totalSavings,
        average_roi: avgROI,
        recommended: avgROI > 20 && totalSavings > 4000000
      };
    });
  };

  return (
    <div className="main-container">
      <Navigation />
      <div className="content-area">
        <div className="results-container">
          <div className="results-header">
            <div>
              <h1 className="page-title">Results & Visualization</h1>
              <p className="page-description">
                Comprehensive analysis of all optimization scenarios with detailed KPI metrics, 
                financial projections, and P&L comparisons across the project timeline.
              </p>
            </div>
            <button 
              className="action-button primary"
              onClick={generateComprehensiveReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="loading-spinner"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Report
                </>
              )}
            </button>
          </div>

          {/* Controls */}
          <div className="controls-section">
            <div className="control-group">
              <label className="control-label">Scenario:</label>
              <select 
                className="control-select"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
              >
                <option value="scenario1">Lowest Cost (ZIP to ZIP)</option>
                <option value="scenario2">Best Service (Parcel Zone)</option>
                <option value="scenario3">Lowest Miles (City to City)</option>
              </select>
            </div>
            
            <div className="control-group">
              <label className="control-label">Year:</label>
              <select 
                className="control-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Activity size={16} />
              Dashboard
            </button>
            <button 
              className={`tab-button ${activeTab === 'operational' ? 'active' : ''}`}
              onClick={() => setActiveTab('operational')}
            >
              <Package size={16} />
              Operational KPIs
            </button>
            <button 
              className={`tab-button ${activeTab === 'financial' ? 'active' : ''}`}
              onClick={() => setActiveTab('financial')}
            >
              <DollarSign size={16} />
              Financial Analysis
            </button>
            <button 
              className={`tab-button ${activeTab === 'capacity' ? 'active' : ''}`}
              onClick={() => setActiveTab('capacity')}
            >
              <Building size={16} />
              Capacity Planning
            </button>
            <button 
              className={`tab-button ${activeTab === 'scenarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('scenarios')}
            >
              <BarChart3 size={16} />
              Scenario Comparison
            </button>
            <button 
              className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={16} />
              P&L Reports
            </button>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              <div className="dashboard-metrics">
                <div className="metrics-grid">
                  {getCurrentResults().map(result => (
                    <div key={result.scenario_id} className="metric-section">
                      <h3 className="metric-section-title">Key Performance Summary</h3>
                      <div className="metric-cards-grid">
                        <div className="metric-card">
                          <div className="metric-icon orders">
                            <Package size={24} />
                          </div>
                          <div className="metric-content">
                            <div className="metric-value">{result.peak_daily_orders_shipped.toLocaleString()}</div>
                            <div className="metric-label">Peak Daily Orders</div>
                            <div className="metric-sublabel">Avg: {result.average_daily_orders_shipped.toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-icon cost">
                            <DollarSign size={24} />
                          </div>
                          <div className="metric-content">
                            <div className="metric-value">${(result.total_costs / 1000000).toFixed(1)}M</div>
                            <div className="metric-label">Total Annual Costs</div>
                            <div className="metric-sublabel">${result.total_costs_per_unit.toFixed(2)} per unit</div>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-icon savings">
                            <TrendingUp size={24} />
                          </div>
                          <div className="metric-content">
                            <div className="metric-value">{result.roi_percentage}%</div>
                            <div className="metric-label">ROI</div>
                            <div className="metric-sublabel">${(result.annual_cost_savings / 1000000).toFixed(1)}M savings</div>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-icon capacity">
                            <Building size={24} />
                          </div>
                          <div className="metric-content">
                            <div className="metric-value">{(result.peak_inventory_units / 1000).toFixed(0)}K</div>
                            <div className="metric-label">Peak Inventory</div>
                            <div className="metric-sublabel">{result.inventory_turns} turns/year</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown Chart */}
                <div className="chart-section">
                  <h3 className="chart-title">Annual Cost Breakdown - Year {selectedYear}</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getCostBreakdownData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: $${(value / 1000000).toFixed(1)}M`}
                        >
                          {getCostBreakdownData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Multi-Year Trend */}
                <div className="chart-section">
                  <h3 className="chart-title">5-Year Cost & Savings Projection</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={getMultiYearData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year_number" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="total_costs" fill="#ef4444" name="Total Costs" />
                        <Line yAxisId="right" type="monotone" dataKey="annual_cost_savings" stroke="#10b981" strokeWidth={3} name="Annual Savings" />
                        <Line yAxisId="right" type="monotone" dataKey="roi_percentage" stroke="#3b82f6" strokeWidth={2} name="ROI %" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational KPIs Tab */}
          {activeTab === 'operational' && (
            <div className="tab-content">
              <div className="kpi-sections">
                {getCurrentResults().map(result => (
                  <div key={result.scenario_id}>
                    {/* Throughput & Capacity Metrics */}
                    <div className="kpi-section">
                      <h3 className="kpi-section-title">Throughput & Capacity Performance</h3>
                      <div className="kpi-grid">
                        <div className="kpi-item">
                          <div className="kpi-label">Peak Daily Orders Shipped</div>
                          <div className="kpi-value">{result.peak_daily_orders_shipped.toLocaleString()}</div>
                          <div className="kpi-description">Highest daily order volume shipped</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Average Daily Orders Shipped</div>
                          <div className="kpi-value">{result.average_daily_orders_shipped.toLocaleString()}</div>
                          <div className="kpi-description">Typical daily throughput</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Theoretical Max Throughput</div>
                          <div className="kpi-value">{result.theoretical_max_throughput.toLocaleString()}</div>
                          <div className="kpi-description">Maximum daily throughput based on staffing/equipment</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Current Labor Force</div>
                          <div className="kpi-value">{result.current_labor_force}</div>
                          <div className="kpi-description">Warehouse labor headcount</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Peak Inventory Units</div>
                          <div className="kpi-value">{result.peak_inventory_units.toLocaleString()}</div>
                          <div className="kpi-description">Highest units on hand during peak periods</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Inventory Turns</div>
                          <div className="kpi-value">{result.inventory_turns}</div>
                          <div className="kpi-description">Number of inventory turns per year</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Order Backlog</div>
                          <div className="kpi-value">{result.order_backlog}</div>
                          <div className="kpi-description">Number of delayed or unfulfilled orders</div>
                        </div>
                        <div className="kpi-item bottleneck">
                          <div className="kpi-label">Throughput Bottleneck Process</div>
                          <div className="kpi-value">{result.throughput_bottleneck_process}</div>
                          <div className="kpi-description">Process step limiting throughput</div>
                        </div>
                      </div>
                    </div>

                    {/* Operational Performance Chart */}
                    <div className="chart-section">
                      <h3 className="chart-title">Daily Throughput Analysis</h3>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={[
                            { name: 'Average Daily', value: result.average_daily_orders_shipped, color: '#3b82f6' },
                            { name: 'Peak Daily', value: result.peak_daily_orders_shipped, color: '#10b981' },
                            { name: 'Theoretical Max', value: result.theoretical_max_throughput, color: '#f59e0b' }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Analysis Tab */}
          {activeTab === 'financial' && (
            <div className="tab-content">
              <div className="financial-sections">
                {getCurrentResults().map(result => (
                  <div key={result.scenario_id}>
                    {/* Cost Performance Metrics */}
                    <div className="kpi-section">
                      <h3 className="kpi-section-title">Cost Performance & ROI Analysis</h3>
                      <div className="kpi-grid">
                        <div className="kpi-item">
                          <div className="kpi-label">Current Fulfillment Cost Per Order</div>
                          <div className="kpi-value">${result.current_fulfillment_cost_per_order}</div>
                          <div className="kpi-description">Baseline cost per order in current state</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Projected Fulfillment Cost Per Order</div>
                          <div className="kpi-value">${result.projected_fulfillment_cost_per_order}</div>
                          <div className="kpi-description">Expected cost per order after improvements</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Annual Cost Savings</div>
                          <div className="kpi-value">${(result.annual_cost_savings / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Expected operational cost savings per year</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Annual Revenue Impact</div>
                          <div className="kpi-value">${(result.annual_revenue_impact / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Additional revenue protected or gained</div>
                        </div>
                        <div className="kpi-item success">
                          <div className="kpi-label">ROI Percentage</div>
                          <div className="kpi-value">{result.roi_percentage}%</div>
                          <div className="kpi-description">Return on investment</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Payback Period</div>
                          <div className="kpi-value">{result.payback_period_months} months</div>
                          <div className="kpi-description">Timeframe to recoup investment cost</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Net Present Value (NPV)</div>
                          <div className="kpi-value">${(result.net_present_value / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Value of discounted cash flows</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Total Cost of Ownership</div>
                          <div className="kpi-value">${(result.total_cost_of_ownership / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Total costs over project life</div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Cost Breakdown */}
                    <div className="kpi-section">
                      <h3 className="kpi-section-title">Detailed Cost Breakdown</h3>
                      <div className="cost-breakdown-table">
                        <div className="cost-breakdown-header">
                          <div>Cost Category</div>
                          <div>Annual Amount</div>
                          <div>Percentage</div>
                          <div>Per Unit</div>
                        </div>
                        {[
                          { name: 'Transportation Costs', value: result.transportation_costs, color: '#3b82f6' },
                          { name: 'Warehouse Operating Costs', value: result.warehouse_operating_costs, color: '#10b981' },
                          { name: 'Variable Labor Costs', value: result.variable_labor_costs, color: '#f59e0b' },
                          { name: 'Facility Rent Costs', value: result.facility_rent_costs, color: '#ef4444' },
                          { name: 'Facility Capital Costs', value: result.facility_capital_costs, color: '#8b5cf6' }
                        ].map((cost, index) => (
                          <div key={index} className="cost-breakdown-row">
                            <div className="cost-category">
                              <div className="cost-color" style={{ backgroundColor: cost.color }}></div>
                              {cost.name}
                            </div>
                            <div className="cost-amount">${(cost.value / 1000000).toFixed(2)}M</div>
                            <div className="cost-percentage">{((cost.value / result.total_costs) * 100).toFixed(1)}%</div>
                            <div className="cost-per-unit">${(cost.value / result.projected_orders_units).toFixed(2)}</div>
                          </div>
                        ))}
                        <div className="cost-breakdown-total">
                          <div className="cost-category"><strong>Total Costs</strong></div>
                          <div className="cost-amount"><strong>${(result.total_costs / 1000000).toFixed(2)}M</strong></div>
                          <div className="cost-percentage"><strong>100.0%</strong></div>
                          <div className="cost-per-unit"><strong>${result.total_costs_per_unit.toFixed(2)}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capacity Planning Tab */}
          {activeTab === 'capacity' && (
            <div className="tab-content">
              <div className="capacity-sections">
                {getCurrentResults().map(result => (
                  <div key={result.scenario_id}>
                    {/* Capacity & Expansion Metrics */}
                    <div className="kpi-section">
                      <h3 className="kpi-section-title">Capacity Planning & Expansion Analysis</h3>
                      <div className="kpi-grid">
                        <div className="kpi-item">
                          <div className="kpi-label">Candidate DC Location</div>
                          <div className="kpi-value">{result.candidate_dc_location}</div>
                          <div className="kpi-description">Proposed new DC location</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Est New DC Capacity</div>
                          <div className="kpi-value">{result.est_new_dc_capacity.toLocaleString()}</div>
                          <div className="kpi-description">Estimated capacity for new DC</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Est New DC Operational Cost</div>
                          <div className="kpi-value">${(result.est_new_dc_operational_cost / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Annual operating cost for new DC</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Automation Investment</div>
                          <div className="kpi-value">${(result.automation_investment / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Capital cost for automation solutions</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Expansion Capacity Added</div>
                          <div className="kpi-value">{result.expansion_capacity_added.toLocaleString()}</div>
                          <div className="kpi-description">Capacity gain from facility expansion</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Expansion Cost</div>
                          <div className="kpi-value">${(result.expansion_cost / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">One-time capital cost of expansion</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Projected Orders Units</div>
                          <div className="kpi-value">{result.projected_orders_units.toLocaleString()}</div>
                          <div className="kpi-description">Forecasted order and unit volume</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Capacity Limit Threshold</div>
                          <div className="kpi-value">{result.capacity_limit_threshold.toFixed(1)}%</div>
                          <div className="kpi-description">When projected volume exceeds capacity</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">New DC Go-Live Date</div>
                          <div className="kpi-value">{result.new_dc_golive_date}</div>
                          <div className="kpi-description">Target operational date of new DC</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Incremental Capacity Added</div>
                          <div className="kpi-value">{result.incremental_capacity_added.toLocaleString()}</div>
                          <div className="kpi-description">Capacity added by strategic initiatives</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">KPI Targets</div>
                          <div className="kpi-value">{result.kpi_targets}</div>
                          <div className="kpi-description">Future performance goals</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Budget Constraint</div>
                          <div className="kpi-value">${(result.budget_constraint / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Annual or project-level investment limit</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Capital Investment Amount</div>
                          <div className="kpi-value">${(result.capital_investment_amount / 1000000).toFixed(2)}M</div>
                          <div className="kpi-description">Upfront capital required for initiatives</div>
                        </div>
                        <div className="kpi-item">
                          <div className="kpi-label">Depreciation Period</div>
                          <div className="kpi-value">{result.depreciation_period} years</div>
                          <div className="kpi-description">Asset life period for capital investments</div>
                        </div>
                      </div>
                    </div>

                    {/* Capacity Growth Chart */}
                    <div className="chart-section">
                      <h3 className="chart-title">Capacity Growth & Investment Timeline</h3>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={350}>
                          <AreaChart data={getMultiYearData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year_number" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="projected_orders_units" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Projected Orders" />
                            <Area type="monotone" dataKey="expansion_capacity_added" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Capacity Added" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenario Comparison Tab */}
          {activeTab === 'scenarios' && (
            <div className="tab-content">
              <div className="scenario-comparison">
                <h3 className="section-title">Multi-Scenario Performance Comparison</h3>
                
                <div className="comparison-table">
                  <div className="comparison-header">
                    <div>Scenario</div>
                    <div>Total 5-Year Costs</div>
                    <div>Total 5-Year Savings</div>
                    <div>Average ROI</div>
                    <div>Recommendation</div>
                  </div>
                  {getScenarioComparison().map((scenario, index) => (
                    <div key={index} className={`comparison-row ${scenario.recommended ? 'recommended' : ''}`}>
                      <div className="scenario-name">{scenario.scenario}</div>
                      <div className="scenario-metric">${(scenario.total_5_year_costs / 1000000).toFixed(1)}M</div>
                      <div className="scenario-metric">${(scenario.total_5_year_savings / 1000000).toFixed(1)}M</div>
                      <div className="scenario-metric">{scenario.average_roi.toFixed(1)}%</div>
                      <div className="scenario-recommendation">
                        {scenario.recommended ? (
                          <span className="recommended-badge">Recommended</span>
                        ) : (
                          <span className="alternative-badge">Alternative</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scenario Comparison Charts */}
                <div className="comparison-charts">
                  <div className="chart-section">
                    <h3 className="chart-title">Cost Comparison by Scenario</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={getScenarioComparison()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="scenario" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                          <Legend />
                          <Bar dataKey="total_5_year_costs" fill="#ef4444" name="5-Year Costs" />
                          <Bar dataKey="total_5_year_savings" fill="#10b981" name="5-Year Savings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chart-section">
                    <h3 className="chart-title">ROI Comparison by Scenario</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={getScenarioComparison()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="scenario" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Line type="monotone" dataKey="average_roi" stroke="#3b82f6" strokeWidth={3} name="Average ROI" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* P&L Reports Tab */}
          {activeTab === 'reports' && (
            <div className="tab-content">
              <div className="pl-reports">
                <h3 className="section-title">P&L Statement Comparison - {getScenarioName(selectedScenario)}</h3>
                
                <div className="pl-table">
                  <div className="pl-header">
                    <div>P&L Item</div>
                    {[1, 2, 3, 4, 5].map(year => (
                      <div key={year}>Year {year}</div>
                    ))}
                  </div>
                  
                  {getPLData().length > 0 && (
                    <>
                      <div className="pl-section-header">Revenue</div>
                      <div className="pl-row">
                        <div className="pl-item">Total Revenue</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.total_revenue / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      
                      <div className="pl-section-header">Cost of Goods Sold</div>
                      <div className="pl-row">
                        <div className="pl-item">COGS</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.cogs / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      
                      <div className="pl-row total">
                        <div className="pl-item"><strong>Gross Profit</strong></div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value"><strong>${(pl.gross_profit / 1000000).toFixed(2)}M</strong></div>
                        ))}
                      </div>
                      
                      <div className="pl-section-header">Operating Expenses</div>
                      <div className="pl-row">
                        <div className="pl-item">Transportation Expense</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.transportation_expense / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      <div className="pl-row">
                        <div className="pl-item">Warehouse Expense</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.warehouse_expense / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      <div className="pl-row">
                        <div className="pl-item">Labor Expense</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.labor_expense / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      <div className="pl-row">
                        <div className="pl-item">Facility Expense</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.facility_expense / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      <div className="pl-row">
                        <div className="pl-item">Other Operating Expense</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">${(pl.other_operating_expense / 1000000).toFixed(2)}M</div>
                        ))}
                      </div>
                      
                      <div className="pl-row total">
                        <div className="pl-item"><strong>Operating Profit</strong></div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value"><strong>${(pl.operating_profit / 1000000).toFixed(2)}M</strong></div>
                        ))}
                      </div>
                      
                      <div className="pl-row total">
                        <div className="pl-item"><strong>Net Profit</strong></div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value"><strong>${(pl.net_profit / 1000000).toFixed(2)}M</strong></div>
                        ))}
                      </div>
                      
                      <div className="pl-section-header">Margins</div>
                      <div className="pl-row">
                        <div className="pl-item">Gross Margin %</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">{pl.gross_margin_percentage.toFixed(1)}%</div>
                        ))}
                      </div>
                      <div className="pl-row">
                        <div className="pl-item">Operating Margin %</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">{pl.operating_margin_percentage.toFixed(1)}%</div>
                        ))}
                      </div>
                      <div className="pl-row">
                        <div className="pl-item">Net Margin %</div>
                        {getPLData().map(pl => (
                          <div key={pl.year_number} className="pl-value">{pl.net_margin_percentage.toFixed(1)}%</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* P&L Trend Chart */}
                <div className="chart-section">
                  <h3 className="chart-title">Profit & Loss Trend Analysis</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={getPLData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year_number" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`} />
                        <Legend />
                        <Line type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={3} name="Revenue" />
                        <Line type="monotone" dataKey="gross_profit" stroke="#10b981" strokeWidth={2} name="Gross Profit" />
                        <Line type="monotone" dataKey="operating_profit" stroke="#f59e0b" strokeWidth={2} name="Operating Profit" />
                        <Line type="monotone" dataKey="net_profit" stroke="#ef4444" strokeWidth={2} name="Net Profit" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .results-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .page-description {
          color: #6b7280;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 2rem;
        }

        .controls-section {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .control-label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .control-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          min-width: 200px;
        }

        .control-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #e5e7eb;
          overflow-x: auto;
        }

        .tab-button {
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tab-button:hover {
          color: #374151;
          background-color: #f9fafb;
        }

        .tab-button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .tab-content {
          background: white;
          border-radius: 0.5rem;
          padding: 2rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .action-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-button.primary {
          background: #3b82f6;
          color: white;
        }

        .action-button.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Dashboard Styles */
        .dashboard-metrics {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .metric-section {
          background: #f9fafb;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .metric-section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1.5rem;
        }

        .metric-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .metric-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .metric-icon.orders {
          background: #3b82f6;
        }

        .metric-icon.cost {
          background: #ef4444;
        }

        .metric-icon.savings {
          background: #10b981;
        }

        .metric-icon.capacity {
          background: #f59e0b;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
        }

        .metric-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .metric-sublabel {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.125rem;
        }

        .chart-section {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .chart-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .chart-container {
          margin-top: 1rem;
        }

        /* KPI Styles */
        .kpi-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .kpi-section {
          background: white;
          border-radius: 0.5rem;
          padding: 2rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .kpi-section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .kpi-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .kpi-item.success {
          background: #f0fdf4;
          border-color: #10b981;
        }

        .kpi-item.bottleneck {
          background: #fef3c7;
          border-color: #f59e0b;
        }

        .kpi-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .kpi-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .kpi-description {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.4;
        }

        /* Financial Styles */
        .financial-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .cost-breakdown-table {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .cost-breakdown-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .cost-breakdown-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          align-items: center;
        }

        .cost-breakdown-total {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          padding: 1rem;
          background: #f9fafb;
          border-top: 2px solid #e5e7eb;
          align-items: center;
        }

        .cost-category {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .cost-color {
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
        }

        .cost-amount,
        .cost-percentage,
        .cost-per-unit {
          font-weight: 500;
          color: #1f2937;
        }

        /* Scenario Comparison Styles */
        .scenario-comparison {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1.5rem;
        }

        .comparison-table {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .comparison-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .comparison-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
          align-items: center;
        }

        .comparison-row.recommended {
          background: #f0fdf4;
          border-left: 4px solid #10b981;
        }

        .scenario-name {
          font-weight: 500;
          color: #1f2937;
        }

        .scenario-metric {
          font-weight: 500;
          color: #374151;
        }

        .recommended-badge {
          background: #dcfce7;
          color: #166534;
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .alternative-badge {
          background: #f3f4f6;
          color: #6b7280;
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .comparison-charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        /* P&L Styles */
        .pl-reports {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .pl-table {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .pl-header {
          display: grid;
          grid-template-columns: 2fr repeat(5, 1fr);
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .pl-section-header {
          grid-column: 1 / -1;
          background: #1f2937;
          color: white;
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .pl-row {
          display: grid;
          grid-template-columns: 2fr repeat(5, 1fr);
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f3f4f6;
          align-items: center;
        }

        .pl-row.total {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          border-bottom: 2px solid #e5e7eb;
        }

        .pl-item {
          font-weight: 500;
          color: #374151;
        }

        .pl-value {
          font-weight: 500;
          color: #1f2937;
          text-align: right;
        }

        @media (max-width: 1024px) {
          .metric-cards-grid,
          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .comparison-charts {
            grid-template-columns: 1fr;
          }

          .cost-breakdown-header,
          .cost-breakdown-row,
          .cost-breakdown-total {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .comparison-header,
          .comparison-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .pl-header,
          .pl-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .controls-section {
            flex-direction: column;
            gap: 1rem;
          }

          .results-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }

        @media (max-width: 768px) {
          .tab-navigation {
            overflow-x: auto;
          }

          .tab-button {
            flex-shrink: 0;
          }
        }
      `}</style>
    </div>
  );
}
