'use client';
import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
  AreaChart, Area, ComposedChart, ResponsiveContainer, ScatterChart, Scatter,
  PieChart, Pie, Cell, ReferenceLine
} from 'recharts';
import {
  Building, Zap, TrendingUp, TrendingDown, DollarSign, Calendar, 
  MapPin, Package, Target, Clock, AlertTriangle, CheckCircle,
  BarChart3, Activity, Users, Layers, Settings
} from 'lucide-react';

interface FacilityTimeline {
  facility: string;
  years: Array<{
    year: number;
    status: 'closed' | 'open' | 'opening' | 'expanding';
    capacity: number;
    utilization: number;
    expansions: string[];
    leaseYearsRemaining: number;
  }>;
}

interface RollingLeaseResults {
  perYear: Array<{
    year: number;
    open_facilities: string[];
    assignments: any[];
    facility_metrics: Array<{
      Facility: string;
      Year: number;
      Total_Demand: number;
      Capacity: number;
      Capacity_Utilization: number;
      Average_Distance: number;
      Total_Cost: number;
      Cost_Per_Unit: number;
    }>;
    totals: {
      transportation_cost: number;
      demand_served: number;
    };
  }>;
  openByYear: Record<number, string[]>;
  totals: {
    total_transportation_cost: number;
    total_demand: number;
    weighted_service_level: number;
    avg_cost_per_unit: number;
  };
}

interface MultiYearVisualizationProps {
  results: RollingLeaseResults;
  leaseYears: number;
  expansionTiers?: Array<{
    name: string;
    capacity_increment: number;
    fixed_cost_per_year: number;
  }>;
}

export default function MultiYearRollingLeaseVisualization({ 
  results, 
  leaseYears = 7,
  expansionTiers = []
}: MultiYearVisualizationProps) {
  const [selectedView, setSelectedView] = useState<'timeline' | 'costs' | 'capacity' | 'roi' | 'network'>('timeline');
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  // Transform data for visualizations
  const facilityTimeline = transformToFacilityTimeline(results);
  const costBreakdown = transformToCostBreakdown(results);
  const capacityAnalysis = transformToCapacityAnalysis(results);
  const roiAnalysis = transformToROIAnalysis(results, leaseYears);
  const networkMetrics = transformToNetworkMetrics(results);

  return (
    <div className="space-y-6">
      {/* Header with key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Network Cost"
          value={`$${(results.totals.total_transportation_cost / 1_000_000).toFixed(1)}M`}
          change="+12.3%"
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Service Level"
          value={`${(results.totals.weighted_service_level * 100).toFixed(1)}%`}
          change="+2.1%"
          icon={<Target className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Active Facilities"
          value={Object.values(results.openByYear).reduce((max, facilities) => Math.max(max, facilities.length), 0).toString()}
          change="Peak"
          icon={<Building className="w-5 h-5" />}
          trend="neutral"
        />
        <MetricCard
          title="Planning Horizon"
          value={`${results.perYear.length} Years`}
          change={`${leaseYears}yr lease`}
          icon={<Calendar className="w-5 h-5" />}
          trend="neutral"
        />
      </div>

      {/* View selector */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'timeline', label: 'Facility Timeline', icon: Calendar },
          { key: 'costs', label: 'Cost Analysis', icon: DollarSign },
          { key: 'capacity', label: 'Capacity & Utilization', icon: BarChart3 },
          { key: 'roi', label: 'ROI Analysis', icon: TrendingUp },
          { key: 'network', label: 'Network Metrics', icon: MapPin }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedView(key as any)}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
              selectedView === key 
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
        {selectedView === 'timeline' && (
          <FacilityTimelineView 
            timeline={facilityTimeline} 
            leaseYears={leaseYears}
            onFacilitySelect={setSelectedFacility}
            selectedFacility={selectedFacility}
          />
        )}
        
        {selectedView === 'costs' && (
          <CostAnalysisView breakdown={costBreakdown} />
        )}
        
        {selectedView === 'capacity' && (
          <CapacityAnalysisView analysis={capacityAnalysis} />
        )}
        
        {selectedView === 'roi' && (
          <ROIAnalysisView analysis={roiAnalysis} leaseYears={leaseYears} />
        )}
        
        {selectedView === 'network' && (
          <NetworkMetricsView metrics={networkMetrics} />
        )}
      </div>

      {/* Lease commitment summary */}
      <LeaseCommitmentSummary results={results} leaseYears={leaseYears} />
    </div>
  );
}

// Facility Timeline Visualization
function FacilityTimelineView({ 
  timeline, 
  leaseYears, 
  onFacilitySelect, 
  selectedFacility 
}: {
  timeline: FacilityTimeline[];
  leaseYears: number;
  onFacilitySelect: (facility: string | null) => void;
  selectedFacility: string | null;
}) {
  // Create timeline data for Gantt-like chart
  const timelineData = timeline.flatMap(facility =>
    facility.years.map(year => ({
      facility: facility.facility,
      year: year.year,
      status: year.status,
      capacity: year.capacity,
      utilization: year.utilization,
      leaseRemaining: year.leaseYearsRemaining,
      isSelected: selectedFacility === facility.facility
    }))
  );

  const statusColors = {
    closed: '#e5e7eb',
    open: '#10b981',
    opening: '#f59e0b',
    expanding: '#8b5cf6'
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Facility Opening & Lease Timeline</h3>
        <div className="flex gap-4 text-xs">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive timeline chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} />
            <YAxis dataKey="facility" type="category" />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <div className="font-medium">{data.facility}</div>
                      <div>Year: {data.year}</div>
                      <div>Status: <span className="capitalize">{data.status}</span></div>
                      <div>Capacity: {(data.capacity / 1_000_000).toFixed(1)}M units</div>
                      <div>Utilization: {(data.utilization * 100).toFixed(1)}%</div>
                      <div>Lease Remaining: {data.leaseRemaining} years</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              dataKey="capacity"
              fill="#10b981"
              onClick={(data: any) => onFacilitySelect(data.facility)}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Facility details table */}
      <div className="max-h-64 overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-2">Facility</th>
              <th className="text-left p-2">Years Active</th>
              <th className="text-left p-2">Peak Capacity</th>
              <th className="text-left p-2">Avg Utilization</th>
              <th className="text-left p-2">Lease Status</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map(facility => {
              const activeYears = facility.years.filter(y => y.status !== 'closed').length;
              const peakCapacity = Math.max(...facility.years.map(y => y.capacity));
              const avgUtilization = facility.years
                .filter(y => y.status !== 'closed')
                .reduce((sum, y) => sum + y.utilization, 0) / activeYears || 0;
              
              return (
                <tr 
                  key={facility.facility}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedFacility === facility.facility ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onFacilitySelect(
                    selectedFacility === facility.facility ? null : facility.facility
                  )}
                >
                  <td className="p-2 font-medium">{facility.facility}</td>
                  <td className="p-2">{activeYears}</td>
                  <td className="p-2">{(peakCapacity / 1_000_000).toFixed(1)}M</td>
                  <td className="p-2">{(avgUtilization * 100).toFixed(1)}%</td>
                  <td className="p-2">
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      {leaseYears}-year commitment
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Cost Analysis View
function CostAnalysisView({ breakdown }: { breakdown: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Multi-Year Cost Analysis</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stacked cost breakdown by year */}
        <div>
          <h4 className="font-medium mb-3">Annual Cost Breakdown</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `$${(value / 1_000_000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: number) => [`$${(value / 1_000_000).toFixed(2)}M`, '']}
                  labelFormatter={(year) => `Year ${year}`}
                />
                <Legend />
                <Area type="monotone" dataKey="fixed_costs" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Fixed Costs" />
                <Area type="monotone" dataKey="transport_costs" stackId="1" stroke="#10b981" fill="#10b981" name="Transport Costs" />
                <Area type="monotone" dataKey="expansion_costs" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Expansion Costs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost per unit trends */}
        <div>
          <h4 className="font-medium mb-3">Cost Efficiency Trends</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="cost" orientation="left" tickFormatter={(value) => `$${value.toFixed(2)}`} />
                <YAxis yAxisId="volume" orientation="right" tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}M`} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="volume" dataKey="demand_served" fill="#e5e7eb" name="Demand Served (M units)" />
                <Line yAxisId="cost" type="monotone" dataKey="cost_per_unit" stroke="#ef4444" strokeWidth={3} name="Cost per Unit ($)" />
                <Line yAxisId="cost" type="monotone" dataKey="target_cost_per_unit" stroke="#22c55e" strokeDasharray="5 5" name="Target Cost" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Additional views would continue here...
// Capacity Analysis, ROI Analysis, Network Metrics, etc.

// Utility components
function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  trend 
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="text-gray-600">{icon}</div>
        <div className={`text-sm ${trendColors[trend]}`}>
          {trend === 'up' && <TrendingUp className="w-4 h-4 inline mr-1" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 inline mr-1" />}
          {change}
        </div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
      </div>
    </div>
  );
}

function LeaseCommitmentSummary({ results, leaseYears }: { results: RollingLeaseResults; leaseYears: number }) {
  const totalCommitments = calculateTotalCommitments(results, leaseYears);
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Building className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold">Lease Commitment Summary</h3>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalCommitments.facilities}</div>
          <div className="text-sm text-gray-600">Total Facility Commitments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{totalCommitments.expansions}</div>
          <div className="text-sm text-gray-600">Expansion Commitments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            ${(totalCommitments.totalValue / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-sm text-gray-600">Total Commitment Value</div>
        </div>
      </div>
    </div>
  );
}

// Data transformation functions
function transformToFacilityTimeline(results: RollingLeaseResults): FacilityTimeline[] {
  const allFacilities = new Set<string>();
  results.perYear.forEach(year => {
    year.open_facilities.forEach(f => allFacilities.add(f));
  });

  return Array.from(allFacilities).map(facility => ({
    facility,
    years: results.perYear.map(year => {
      const isOpen = year.open_facilities.includes(facility);
      const metrics = year.facility_metrics.find(m => m.Facility === facility);
      
      return {
        year: year.year,
        status: isOpen ? 'open' : 'closed' as const,
        capacity: metrics?.Capacity || 0,
        utilization: metrics?.Capacity_Utilization || 0,
        expansions: [], // Would be populated from expansion data
        leaseYearsRemaining: 7 // Would be calculated based on opening year
      };
    })
  }));
}

function transformToCostBreakdown(results: RollingLeaseResults) {
  return results.perYear.map(year => ({
    year: year.year,
    fixed_costs: year.open_facilities.length * 250000, // Approximate
    transport_costs: year.totals.transportation_cost,
    expansion_costs: 0, // Would be calculated from expansion data
    demand_served: year.totals.demand_served,
    cost_per_unit: year.totals.demand_served > 0 ? year.totals.transportation_cost / year.totals.demand_served : 0,
    target_cost_per_unit: 0.5 // Target benchmark
  }));
}

function transformToCapacityAnalysis(results: RollingLeaseResults) {
  return results.perYear.map(year => ({
    year: year.year,
    total_capacity: year.facility_metrics.reduce((sum, f) => sum + f.Capacity, 0),
    utilized_capacity: year.facility_metrics.reduce((sum, f) => sum + f.Total_Demand, 0),
    utilization_rate: year.facility_metrics.length > 0 
      ? year.facility_metrics.reduce((sum, f) => sum + f.Capacity_Utilization, 0) / year.facility_metrics.length 
      : 0,
    facilities_count: year.open_facilities.length
  }));
}

function transformToROIAnalysis(results: RollingLeaseResults, leaseYears: number) {
  // ROI calculation would involve comparing costs vs baseline
  return results.perYear.map(year => ({
    year: year.year,
    investment: year.open_facilities.length * 250000 * leaseYears,
    annual_savings: 0, // Would calculate vs baseline
    cumulative_roi: 0,
    payback_years: leaseYears / 2
  }));
}

function transformToNetworkMetrics(results: RollingLeaseResults) {
  return results.perYear.map(year => ({
    year: year.year,
    service_level: year.facility_metrics.length > 0 
      ? year.facility_metrics.reduce((sum, f) => sum + (f.Average_Distance <= 500 ? f.Total_Demand : 0), 0) / year.totals.demand_served
      : 0,
    avg_distance: year.facility_metrics.length > 0
      ? year.facility_metrics.reduce((sum, f) => sum + f.Average_Distance, 0) / year.facility_metrics.length
      : 0,
    network_density: year.open_facilities.length / (year.totals.demand_served / 1_000_000),
    coverage_efficiency: 0.95 // Would calculate based on service zones
  }));
}

function calculateTotalCommitments(results: RollingLeaseResults, leaseYears: number) {
  const facilities = new Set<string>();
  results.perYear.forEach(year => {
    year.open_facilities.forEach(f => facilities.add(f));
  });

  return {
    facilities: facilities.size,
    expansions: 0, // Would count expansion events
    totalValue: facilities.size * 250000 * leaseYears
  };
}

// Placeholder for other view components
function CapacityAnalysisView({ analysis }: { analysis: any[] }) {
  return <div>Capacity Analysis View - Implementation continues...</div>;
}

function ROIAnalysisView({ analysis, leaseYears }: { analysis: any[]; leaseYears: number }) {
  return <div>ROI Analysis View - Implementation continues...</div>;
}

function NetworkMetricsView({ metrics }: { metrics: any[] }) {
  return <div>Network Metrics View - Implementation continues...</div>;
}
