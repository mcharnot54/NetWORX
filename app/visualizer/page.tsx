'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
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
  Area
} from 'recharts';

// Comprehensive KPI data structure
interface ComprehensiveResults {
  project_id: number;
  project_name: string;
  scenario_id: number;
  scenario_name: string;
  
  // Financial Metrics
  total_cost: number;
  warehouse_cost: number;
  transport_cost: number;
  inventory_cost: number;
  cost_per_unit: number;
  annual_savings: number;
  roi_percentage: number;
  payback_period_years: number;
  
  // Operational Metrics
  service_level: number;
  avg_distance_miles: number;
  capacity_utilization: number;
  facilities_count: number;
  inventory_turns: number;
  order_fill_rate: number;
  
  // Network Metrics
  coverage_area_sq_miles: number;
  customers_served: number;
  avg_delivery_time_days: number;
  network_efficiency_score: number;
  carbon_footprint_tons: number;
  
  // Quality Metrics
  on_time_delivery_rate: number;
  customer_satisfaction_score: number;
  damage_rate_percentage: number;
  error_rate_percentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function VisualizerPage() {
  const [results, setResults] = useState<ComprehensiveResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');

  // Mock data for demonstration
  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setResults({
        project_id: 1,
        project_name: "NetWORX Optimization Project",
        scenario_id: 1,
        scenario_name: "Multi-Year Transport Optimization",
        
        // Financial Metrics
        total_cost: 12500000,
        warehouse_cost: 4800000,
        transport_cost: 6200000,
        inventory_cost: 1500000,
        cost_per_unit: 0.52,
        annual_savings: 2300000,
        roi_percentage: 18.4,
        payback_period_years: 2.8,
        
        // Operational Metrics
        service_level: 94.2,
        avg_distance_miles: 347,
        capacity_utilization: 82.1,
        facilities_count: 4,
        inventory_turns: 12.5,
        order_fill_rate: 97.8,
        
        // Network Metrics
        coverage_area_sq_miles: 125000,
        customers_served: 2450,
        avg_delivery_time_days: 1.8,
        network_efficiency_score: 89.3,
        carbon_footprint_tons: 1240,
        
        // Quality Metrics
        on_time_delivery_rate: 96.1,
        customer_satisfaction_score: 4.7,
        damage_rate_percentage: 0.3,
        error_rate_percentage: 0.8
      });
      setLoading(false);
    }, 1000);
  }, []);

  const exportResults = () => {
    if (!results) return;
    
    const exportData = {
      ...results,
      export_timestamp: new Date().toISOString(),
      export_format: 'JSON'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimization_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading optimization results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Results Available</h2>
            <p className="text-gray-600">Run an optimization scenario to view results and analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📊 Optimization Results & Analytics
              </h1>
              <p className="text-gray-600">
                {results.project_name} - {results.scenario_name}
              </p>
            </div>
            <button
              onClick={exportResults}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Results
            </button>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
              <span className="text-sm text-green-600 font-medium">+{results.roi_percentage}%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              ${(results.total_cost / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-gray-600">Total Network Cost</div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">{results.service_level}%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {results.avg_distance_miles}mi
            </div>
            <div className="text-sm text-gray-600">Avg Shipping Distance</div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <Building className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-purple-600 font-medium">{results.capacity_utilization}%</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {results.facilities_count}
            </div>
            <div className="text-sm text-gray-600">Active Facilities</div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
              <span className="text-sm text-emerald-600 font-medium">${(results.annual_savings / 1000000).toFixed(1)}M</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {results.payback_period_years}y
            </div>
            <div className="text-sm text-gray-600">Payback Period</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'financial', label: 'Financial', icon: DollarSign },
            { key: 'operational', label: 'Operational', icon: Settings },
            { key: 'network', label: 'Network', icon: MapPin },
            { key: 'quality', label: 'Quality', icon: CheckCircle }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeView === key 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {activeView === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Warehouse', value: results.warehouse_cost, fill: '#0088FE' },
                        { name: 'Transport', value: results.transport_cost, fill: '#00C49F' },
                        { name: 'Inventory', value: results.inventory_cost, fill: '#FFBB28' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                    </Pie>
                    <Tooltip formatter={(value: any) => [`$${(value / 1000000).toFixed(1)}M`, 'Cost']}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[
                      { month: 'Jan', service: 92.1, target: 94.2 },
                      { month: 'Feb', service: 93.4, target: 94.2 },
                      { month: 'Mar', service: 94.8, target: 94.2 },
                      { month: 'Apr', service: 93.9, target: 94.2 },
                      { month: 'May', service: 95.1, target: 94.2 },
                      { month: 'Jun', service: 94.2, target: 94.2 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[90, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="service" stroke="#0088FE" name="Actual Service Level" />
                    <Line type="monotone" dataKey="target" stroke="#FF8042" strokeDasharray="5 5" name="Target" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeView === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">ROI Analysis</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { year: 'Year 1', investment: -2.5, savings: 0.8, roi: -6.8 },
                        { year: 'Year 2', investment: -0.5, savings: 2.3, roi: 7.2 },
                        { year: 'Year 3', investment: 0, savings: 2.3, roi: 18.4 },
                        { year: 'Year 4', investment: 0, savings: 2.3, roi: 18.4 },
                        { year: 'Year 5', investment: 0, savings: 2.3, roi: 18.4 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${value > 0 ? '+' : ''}${value}%`, 'ROI']}/>
                      <Legend />
                      <Bar dataKey="roi" fill="#00C49F" name="ROI %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Cost Efficiency</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={[
                        { month: 'Jan', baseline: 0.68, optimized: 0.52 },
                        { month: 'Feb', baseline: 0.67, optimized: 0.51 },
                        { month: 'Mar', baseline: 0.69, optimized: 0.52 },
                        { month: 'Apr', baseline: 0.68, optimized: 0.51 },
                        { month: 'May', baseline: 0.66, optimized: 0.52 },
                        { month: 'Jun', baseline: 0.67, optimized: 0.52 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0.4, 0.8]} />
                      <Tooltip formatter={(value: any) => [`$${value}`, 'Cost per Unit']}/>
                      <Legend />
                      <Area type="monotone" dataKey="baseline" stackId="1" stroke="#FF8042" fill="#FF8042" name="Baseline" />
                      <Area type="monotone" dataKey="optimized" stackId="2" stroke="#00C49F" fill="#00C49F" name="Optimized" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${(results.warehouse_cost / 1000000).toFixed(1)}M</div>
                    <div className="text-sm text-gray-600">Warehouse Costs</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${(results.transport_cost / 1000000).toFixed(1)}M</div>
                    <div className="text-sm text-gray-600">Transport Costs</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${(results.inventory_cost / 1000000).toFixed(1)}M</div>
                    <div className="text-sm text-gray-600">Inventory Costs</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">${results.cost_per_unit.toFixed(2)}</div>
                    <div className="text-sm text-gray-600">Cost per Unit</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'operational' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Capacity Utilization</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { facility: 'Chicago', utilization: 85.2, capacity: 100 },
                      { facility: 'St. Louis', utilization: 78.9, capacity: 100 },
                      { facility: 'Memphis', utilization: 82.1, capacity: 100 },
                      { facility: 'Atlanta', utilization: 79.4, capacity: 100 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="facility" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Utilization']}/>
                    <Legend />
                    <Bar dataKey="utilization" fill="#0088FE" name="Utilization %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Service Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Service Level</span>
                    <span className="font-semibold">{results.service_level}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Order Fill Rate</span>
                    <span className="font-semibold">{results.order_fill_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Inventory Turns</span>
                    <span className="font-semibold">{results.inventory_turns}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Capacity Utilization</span>
                    <span className="font-semibold">{results.capacity_utilization}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'network' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Network Coverage</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={[
                      { region: 'Northeast', coverage: 95, efficiency: 89 },
                      { region: 'Southeast', coverage: 92, efficiency: 91 },
                      { region: 'Midwest', coverage: 98, efficiency: 87 },
                      { region: 'Southwest', coverage: 88, efficiency: 85 },
                      { region: 'West', coverage: 85, efficiency: 88 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="coverage" stackId="1" stroke="#0088FE" fill="#0088FE" name="Coverage %" />
                    <Area type="monotone" dataKey="efficiency" stackId="2" stroke="#00C49F" fill="#00C49F" name="Efficiency %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border shadow-sm p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{results.coverage_area_sq_miles.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Coverage Area (sq mi)</div>
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{results.customers_served.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Customers Served</div>
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">{results.network_efficiency_score}%</div>
                  <div className="text-sm text-gray-600">Network Efficiency</div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'quality' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Quality Metrics</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">On-Time Delivery</span>
                      <span className="text-sm font-semibold">{results.on_time_delivery_rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${results.on_time_delivery_rate}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Customer Satisfaction</span>
                      <span className="text-sm font-semibold">{results.customer_satisfaction_score}/5.0</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(results.customer_satisfaction_score / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Error Rates</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={[
                      { month: 'Jan', damage: 0.4, error: 1.1, onTime: 95.2 },
                      { month: 'Feb', damage: 0.3, error: 0.9, onTime: 95.8 },
                      { month: 'Mar', damage: 0.2, error: 0.8, onTime: 96.1 },
                      { month: 'Apr', damage: 0.3, error: 0.7, onTime: 96.3 },
                      { month: 'May', damage: 0.3, error: 0.8, onTime: 96.1 },
                      { month: 'Jun', damage: 0.3, error: 0.8, onTime: 96.1 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" domain={[0, 2]} />
                    <YAxis yAxisId="right" orientation="right" domain={[94, 98]} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="damage" stroke="#FF8042" name="Damage Rate %" />
                    <Line yAxisId="left" type="monotone" dataKey="error" stroke="#FFBB28" name="Error Rate %" />
                    <Line yAxisId="right" type="monotone" dataKey="onTime" stroke="#00C49F" name="On-Time Delivery %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
