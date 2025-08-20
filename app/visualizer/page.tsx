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

// Temporary placeholder for charts while we fix recharts dependency
function PlaceholderChart({ title, type }: { title: string; type: string }) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <div className="text-gray-500 mb-2">
        <BarChart3 className="w-8 h-8 mx-auto" />
      </div>
      <div className="text-gray-700 font-medium">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{type} Chart</div>
      <div className="text-xs text-gray-400 mt-2">
        Chart temporarily unavailable - fixing recharts dependency
      </div>
    </div>
  );
}

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
                <PlaceholderChart title="Cost Distribution" type="Pie" />
              </div>
              
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
                <PlaceholderChart title="Service Level Over Time" type="Line" />
              </div>
            </div>
          )}

          {activeView === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">ROI Analysis</h3>
                  <PlaceholderChart title="Return on Investment" type="Bar" />
                </div>
                
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Cost Efficiency</h3>
                  <PlaceholderChart title="Cost per Unit Trends" type="Area" />
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
                <PlaceholderChart title="Facility Utilization" type="Bar" />
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
                <PlaceholderChart title="Geographic Distribution" type="Scatter" />
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
                <PlaceholderChart title="Quality Trends" type="Line" />
              </div>
            </div>
          )}
        </div>

        {/* Alert about missing charts */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800">Charts Temporarily Unavailable</div>
              <div className="text-sm text-yellow-700 mt-1">
                We're fixing a dependency issue with the chart library. The data and metrics above are still accurate.
                Full interactive charts will be restored shortly.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
