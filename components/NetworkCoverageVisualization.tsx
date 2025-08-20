'use client';
import React, { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  ComposedChart, Line, Area, AreaChart
} from 'recharts';
import {
  MapPin, Target, Clock, TrendingUp, AlertTriangle, CheckCircle,
  Navigation, Zap, Package, DollarSign, Activity, Users
} from 'lucide-react';

interface NetworkNode {
  facility: string;
  lat: number;
  lng: number;
  capacity: number;
  utilization: number;
  cost_per_unit: number;
  service_radius: number;
  destinations_served: string[];
  years_active: number[];
}

interface ServiceMetrics {
  year: number;
  avg_distance: number;
  service_level: number;
  coverage_efficiency: number;
  network_density: number;
  cost_efficiency: number;
  customer_satisfaction: number;
}

interface ROIAnalysis {
  year: number;
  investment: number;
  annual_savings: number;
  cumulative_savings: number;
  roi_percentage: number;
  payback_achieved: boolean;
  net_present_value: number;
}

interface NetworkCoverageVisualizationProps {
  nodes: NetworkNode[];
  serviceMetrics: ServiceMetrics[];
  roiAnalysis: ROIAnalysis[];
  leaseYears: number;
  baseline_cost?: number;
}

export default function NetworkCoverageVisualization({
  nodes,
  serviceMetrics,
  roiAnalysis,
  leaseYears,
  baseline_cost = 6_560_000
}: NetworkCoverageVisualizationProps) {
  const [selectedYear, setSelectedYear] = useState(serviceMetrics[0]?.year || 2025);
  const [viewMode, setViewMode] = useState<'coverage' | 'service' | 'roi' | 'comparison'>('coverage');

  // Calculate derived metrics
  const totalROI = roiAnalysis[roiAnalysis.length - 1]?.roi_percentage || 0;
  const paybackYear = roiAnalysis.find(r => r.payback_achieved)?.year;
  const avgServiceLevel = serviceMetrics.reduce((sum, m) => sum + m.service_level, 0) / serviceMetrics.length;

  return (
    <div className="space-y-6">
      {/* Key performance indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Network ROI"
          value={`${totalROI.toFixed(1)}%`}
          subtitle={`${leaseYears}-year horizon`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          trend={totalROI > 15 ? 'positive' : totalROI > 0 ? 'neutral' : 'negative'}
        />
        <KPICard
          title="Service Level"
          value={`${(avgServiceLevel * 100).toFixed(1)}%`}
          subtitle="Average across years"
          icon={<Target className="w-5 h-5" />}
          color="blue"
          trend={avgServiceLevel > 0.95 ? 'positive' : avgServiceLevel > 0.9 ? 'neutral' : 'negative'}
        />
        <KPICard
          title="Payback Period"
          value={paybackYear ? `${paybackYear - serviceMetrics[0].year} years` : 'N/A'}
          subtitle="To break even"
          icon={<Clock className="w-5 h-5" />}
          color="purple"
          trend={paybackYear && (paybackYear - serviceMetrics[0].year) <= leaseYears / 2 ? 'positive' : 'neutral'}
        />
        <KPICard
          title="Active Facilities"
          value={nodes.filter(n => n.years_active.includes(selectedYear)).length.toString()}
          subtitle={`In year ${selectedYear}`}
          icon={<MapPin className="w-5 h-5" />}
          color="orange"
          trend="neutral"
        />
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Analysis Year:</label>
        <select 
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border rounded px-3 py-1"
        >
          {serviceMetrics.map(m => (
            <option key={m.year} value={m.year}>{m.year}</option>
          ))}
        </select>
      </div>

      {/* View mode selector */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'coverage', label: 'Network Coverage', icon: MapPin },
          { key: 'service', label: 'Service Analytics', icon: Target },
          { key: 'roi', label: 'ROI Analysis', icon: TrendingUp },
          { key: 'comparison', label: 'Baseline Comparison', icon: Activity }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setViewMode(key as any)}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
              viewMode === key 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Main visualization content */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        {viewMode === 'coverage' && (
          <NetworkCoverageView 
            nodes={nodes} 
            selectedYear={selectedYear}
            serviceMetrics={serviceMetrics.find(m => m.year === selectedYear)!}
          />
        )}
        
        {viewMode === 'service' && (
          <ServiceAnalyticsView metrics={serviceMetrics} selectedYear={selectedYear} />
        )}
        
        {viewMode === 'roi' && (
          <ROIAnalysisView analysis={roiAnalysis} leaseYears={leaseYears} />
        )}
        
        {viewMode === 'comparison' && (
          <BaselineComparisonView 
            analysis={roiAnalysis} 
            baselineCost={baseline_cost}
            serviceMetrics={serviceMetrics}
          />
        )}
      </div>

      {/* Investment summary */}
      <InvestmentSummaryPanel 
        roiAnalysis={roiAnalysis} 
        leaseYears={leaseYears}
        nodes={nodes}
      />
    </div>
  );
}

function NetworkCoverageView({ 
  nodes, 
  selectedYear, 
  serviceMetrics 
}: {
  nodes: NetworkNode[];
  selectedYear: number;
  serviceMetrics: ServiceMetrics;
}) {
  const activeNodes = nodes.filter(n => n.years_active.includes(selectedYear));
  
  // Create scatter data for network visualization
  const scatterData = activeNodes.map(node => ({
    x: node.lng, // Longitude
    y: node.lat, // Latitude  
    facility: node.facility,
    capacity: node.capacity / 1_000_000,
    utilization: node.utilization * 100,
    cost_per_unit: node.cost_per_unit,
    service_radius: node.service_radius,
    destinations: node.destinations_served.length
  }));

  // Service coverage radar data
  const radarData = [
    { metric: 'Distance Efficiency', value: (1000 - serviceMetrics.avg_distance) / 10, fullMark: 100 },
    { metric: 'Service Level', value: serviceMetrics.service_level * 100, fullMark: 100 },
    { metric: 'Coverage Efficiency', value: serviceMetrics.coverage_efficiency * 100, fullMark: 100 },
    { metric: 'Network Density', value: Math.min(100, serviceMetrics.network_density * 20), fullMark: 100 },
    { metric: 'Cost Efficiency', value: serviceMetrics.cost_efficiency * 100, fullMark: 100 },
    { metric: 'Customer Satisfaction', value: serviceMetrics.customer_satisfaction * 100, fullMark: 100 }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Network Coverage Analysis - Year {selectedYear}</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Geographic distribution */}
        <div>
          <h4 className="font-medium mb-3">Facility Geographic Distribution</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="Longitude" />
                <YAxis dataKey="y" name="Latitude" />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <div className="font-medium">{data.facility}</div>
                          <div>Capacity: {data.capacity.toFixed(1)}M units</div>
                          <div>Utilization: {data.utilization.toFixed(1)}%</div>
                          <div>Cost/Unit: ${data.cost_per_unit.toFixed(2)}</div>
                          <div>Service Radius: {data.service_radius} miles</div>
                          <div>Destinations: {data.destinations}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  dataKey="capacity" 
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service performance radar */}
        <div>
          <h4 className="font-medium mb-3">Service Performance Profile</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar 
                  name="Performance" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Facility performance table */}
      <div>
        <h4 className="font-medium mb-3">Facility Performance Summary</h4>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Facility</th>
                <th className="text-left p-3">Capacity</th>
                <th className="text-left p-3">Utilization</th>
                <th className="text-left p-3">Cost/Unit</th>
                <th className="text-left p-3">Service Radius</th>
                <th className="text-left p-3">Destinations</th>
                <th className="text-left p-3">Performance</th>
              </tr>
            </thead>
            <tbody>
              {activeNodes.map(node => {
                const performance = node.utilization > 0.9 ? 'excellent' : 
                                  node.utilization > 0.7 ? 'good' : 'needs-improvement';
                return (
                  <tr key={node.facility} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{node.facility}</td>
                    <td className="p-3">{(node.capacity / 1_000_000).toFixed(1)}M</td>
                    <td className="p-3">{(node.utilization * 100).toFixed(1)}%</td>
                    <td className="p-3">${node.cost_per_unit.toFixed(2)}</td>
                    <td className="p-3">{node.service_radius} mi</td>
                    <td className="p-3">{node.destinations_served.length}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        performance === 'excellent' ? 'bg-green-100 text-green-800' :
                        performance === 'good' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {performance.replace('-', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ServiceAnalyticsView({ 
  metrics, 
  selectedYear 
}: {
  metrics: ServiceMetrics[];
  selectedYear: number;
}) {
  const trendData = metrics.map(m => ({
    year: m.year,
    avg_distance: m.avg_distance,
    service_level: m.service_level * 100,
    coverage_efficiency: m.coverage_efficiency * 100,
    cost_efficiency: m.cost_efficiency * 100,
    customer_satisfaction: m.customer_satisfaction * 100
  }));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Service Analytics Trends</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Service level and distance trends */}
        <div>
          <h4 className="font-medium mb-3">Service Performance</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="service" orientation="left" domain={[0, 100]} />
                <YAxis yAxisId="distance" orientation="right" />
                <Tooltip />
                <Legend />
                <Area yAxisId="service" dataKey="service_level" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="Service Level %" />
                <Line yAxisId="distance" type="monotone" dataKey="avg_distance" stroke="#ef4444" strokeWidth={2} name="Avg Distance (mi)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency metrics */}
        <div>
          <h4 className="font-medium mb-3">Efficiency Metrics</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                <Area dataKey="coverage_efficiency" fill="#10b981" fillOpacity={0.3} stroke="#10b981" name="Coverage Efficiency" />
                <Area dataKey="cost_efficiency" fill="#8b5cf6" fillOpacity={0.3} stroke="#8b5cf6" name="Cost Efficiency" />
                <Area dataKey="customer_satisfaction" fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" name="Customer Satisfaction" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year-over-year comparison */}
      <div>
        <h4 className="font-medium mb-3">Year-over-Year Improvements</h4>
        <div className="grid md:grid-cols-3 gap-4">
          {metrics.slice(1).map((current, idx) => {
            const previous = metrics[idx];
            const improvements = {
              service_level: ((current.service_level - previous.service_level) / previous.service_level * 100),
              avg_distance: ((previous.avg_distance - current.avg_distance) / previous.avg_distance * 100),
              cost_efficiency: ((current.cost_efficiency - previous.cost_efficiency) / previous.cost_efficiency * 100)
            };

            return (
              <div key={current.year} className="border rounded p-4">
                <div className="font-medium mb-2">{previous.year} → {current.year}</div>
                <div className="space-y-2 text-sm">
                  <ImprovementMetric 
                    label="Service Level" 
                    value={improvements.service_level} 
                    isPositive={true}
                  />
                  <ImprovementMetric 
                    label="Distance Reduction" 
                    value={improvements.avg_distance} 
                    isPositive={true}
                  />
                  <ImprovementMetric 
                    label="Cost Efficiency" 
                    value={improvements.cost_efficiency} 
                    isPositive={true}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ROIAnalysisView({ 
  analysis, 
  leaseYears 
}: {
  analysis: ROIAnalysis[];
  leaseYears: number;
}) {
  const cumulativeData = analysis.map(a => ({
    year: a.year,
    investment: a.investment / 1_000_000,
    annual_savings: a.annual_savings / 1_000_000,
    cumulative_savings: a.cumulative_savings / 1_000_000,
    roi_percentage: a.roi_percentage,
    npv: a.net_present_value / 1_000_000
  }));

  const totalInvestment = Math.max(...cumulativeData.map(d => d.investment));
  const totalSavings = cumulativeData[cumulativeData.length - 1]?.cumulative_savings || 0;
  const finalROI = cumulativeData[cumulativeData.length - 1]?.roi_percentage || 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">ROI Analysis - {leaseYears} Year Investment</h3>
      
      {/* ROI summary cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">${totalInvestment.toFixed(1)}M</div>
          <div className="text-sm text-blue-800">Total Investment</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">${totalSavings.toFixed(1)}M</div>
          <div className="text-sm text-green-800">Total Savings</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{finalROI.toFixed(1)}%</div>
          <div className="text-sm text-purple-800">Final ROI</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {analysis.find(a => a.payback_achieved)?.year || 'N/A'}
          </div>
          <div className="text-sm text-orange-800">Payback Year</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Cumulative ROI progression */}
        <div>
          <h4 className="font-medium mb-3">ROI Progression</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="money" orientation="left" tickFormatter={v => `$${v}M`} />
                <YAxis yAxisId="percent" orientation="right" tickFormatter={v => `${v}%`} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name.includes('percentage')) return [`${value.toFixed(1)}%`, name];
                    return [`$${value.toFixed(1)}M`, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="money" dataKey="investment" fill="#ef4444" name="Investment" />
                <Bar yAxisId="money" dataKey="cumulative_savings" fill="#10b981" name="Cumulative Savings" />
                <Line yAxisId="percent" type="monotone" dataKey="roi_percentage" stroke="#3b82f6" strokeWidth={3} name="ROI %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NPV analysis */}
        <div>
          <h4 className="font-medium mb-3">Net Present Value</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={v => `$${v}M`} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(1)}M`} />
                <Area 
                  dataKey="npv" 
                  fill="#8b5cf6" 
                  fillOpacity={0.3} 
                  stroke="#8b5cf6" 
                  name="Net Present Value"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function BaselineComparisonView({ 
  analysis, 
  baselineCost, 
  serviceMetrics 
}: {
  analysis: ROIAnalysis[];
  baselineCost: number;
  serviceMetrics: ServiceMetrics[];
}) {
  const comparisonData = analysis.map((roi, idx) => {
    const service = serviceMetrics[idx];
    return {
      year: roi.year,
      baseline_cost: baselineCost / 1_000_000,
      optimized_cost: (baselineCost - roi.annual_savings) / 1_000_000,
      baseline_service: 85, // Assumed baseline service level
      optimized_service: service?.service_level * 100 || 90,
      savings: roi.annual_savings / 1_000_000
    };
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Baseline vs Optimized Comparison</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cost comparison */}
        <div>
          <h4 className="font-medium mb-3">Cost Comparison</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={v => `$${v}M`} />
                <Tooltip formatter={(value: number) => `$${value.toFixed(1)}M`} />
                <Legend />
                <Bar dataKey="baseline_cost" fill="#ef4444" name="Baseline Cost" opacity={0.7} />
                <Bar dataKey="optimized_cost" fill="#10b981" name="Optimized Cost" />
                <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={3} name="Annual Savings" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service level comparison */}
        <div>
          <h4 className="font-medium mb-3">Service Level Comparison</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis domain={[80, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                <Area dataKey="baseline_service" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" name="Baseline Service" />
                <Area dataKey="optimized_service" fill="#10b981" fillOpacity={0.3} stroke="#10b981" name="Optimized Service" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  trend 
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  trend: 'positive' | 'negative' | 'neutral';
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  const trendIcons = {
    positive: <CheckCircle className="w-4 h-4 text-green-500" />,
    negative: <AlertTriangle className="w-4 h-4 text-red-500" />,
    neutral: <Activity className="w-4 h-4 text-gray-500" />
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trendIcons[trend]}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function ImprovementMetric({ 
  label, 
  value, 
  isPositive 
}: {
  label: string;
  value: number;
  isPositive: boolean;
}) {
  const isGood = isPositive ? value > 0 : value < 0;
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {isGood ? '+' : ''}{value.toFixed(1)}%
      </span>
    </div>
  );
}

function InvestmentSummaryPanel({ 
  roiAnalysis, 
  leaseYears, 
  nodes 
}: {
  roiAnalysis: ROIAnalysis[];
  leaseYears: number;
  nodes: NetworkNode[];
}) {
  const totalInvestment = roiAnalysis[roiAnalysis.length - 1]?.investment || 0;
  const totalSavings = roiAnalysis[roiAnalysis.length - 1]?.cumulative_savings || 0;
  const netGain = totalSavings - totalInvestment;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border p-6">
      <div className="flex items-center gap-3 mb-4">
        <DollarSign className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-semibold">Investment Summary ({leaseYears} Years)</h3>
      </div>
      
      <div className="grid md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            ${(totalInvestment / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Total Investment</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            ${(totalSavings / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Total Savings</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${netGain > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ${(netGain / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Net Gain/Loss</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {nodes.length}
          </div>
          <div className="text-sm text-gray-600">Facilities Optimized</div>
        </div>
      </div>
    </div>
  );
}
