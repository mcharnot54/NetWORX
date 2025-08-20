'use client';
import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
  ComposedChart, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import {
  Zap, Package, TrendingUp, Building, AlertTriangle, CheckCircle,
  Calendar, Settings, Target, Activity
} from 'lucide-react';

interface CapacityExpansionData {
  year: number;
  base_capacity: number;
  expansion_capacity: number;
  total_capacity: number;
  demand: number;
  utilization: number;
  expansion_events: Array<{
    facility: string;
    tier: string;
    capacity_added: number;
    cost: number;
  }>;
  committed_expansions: number; // Expansions that must stay active due to lease
}

interface ExpansionTier {
  name: string;
  capacity_increment: number;
  fixed_cost_per_year: number;
  color: string;
}

interface CapacityExpansionVisualizationProps {
  data: CapacityExpansionData[];
  expansionTiers: ExpansionTier[];
  leaseYears: number;
}

export default function CapacityExpansionVisualization({ 
  data, 
  expansionTiers,
  leaseYears 
}: CapacityExpansionVisualizationProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stacked' | 'utilization' | 'timeline'>('stacked');

  // Calculate expansion ROI and efficiency metrics
  const expansionMetrics = calculateExpansionMetrics(data, expansionTiers, leaseYears);

  return (
    <div className="space-y-6">
      {/* Header metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Peak Capacity"
          value={`${Math.max(...data.map(d => d.total_capacity / 1_000_000)).toFixed(1)}M`}
          subtitle="Units"
          icon={<Package className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Expansion Events"
          value={data.reduce((sum, d) => sum + d.expansion_events.length, 0).toString()}
          subtitle="Total activations"
          icon={<Zap className="w-5 h-5" />}
          color="purple"
        />
        <MetricCard
          title="Avg Utilization"
          value={`${(data.reduce((sum, d) => sum + d.utilization, 0) / data.length * 100).toFixed(1)}%`}
          subtitle="Across all years"
          icon={<Activity className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          title="Expansion ROI"
          value={`${expansionMetrics.avgROI.toFixed(1)}%`}
          subtitle="Annual return"
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* View mode selector */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'stacked', label: 'Capacity Stacking' },
          { key: 'utilization', label: 'Utilization Analysis' },
          { key: 'timeline', label: 'Expansion Timeline' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key as any)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              viewMode === key 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main visualization */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        {viewMode === 'stacked' && (
          <StackedCapacityView 
            data={data} 
            tiers={expansionTiers}
            selectedTier={selectedTier}
            onTierSelect={setSelectedTier}
          />
        )}
        
        {viewMode === 'utilization' && (
          <UtilizationAnalysisView data={data} />
        )}
        
        {viewMode === 'timeline' && (
          <ExpansionTimelineView data={data} tiers={expansionTiers} leaseYears={leaseYears} />
        )}
      </div>

      {/* Expansion efficiency analysis */}
      <ExpansionEfficiencyPanel metrics={expansionMetrics} tiers={expansionTiers} />
    </div>
  );
}

function StackedCapacityView({ 
  data, 
  tiers, 
  selectedTier, 
  onTierSelect 
}: {
  data: CapacityExpansionData[];
  tiers: ExpansionTier[];
  selectedTier: string | null;
  onTierSelect: (tier: string | null) => void;
}) {
  // Transform data for stacked chart
  const chartData = data.map(d => {
    const result: any = {
      year: d.year,
      base_capacity: d.base_capacity / 1_000_000,
      demand: d.demand / 1_000_000,
      utilization: d.utilization
    };

    // Add expansion tiers
    tiers.forEach(tier => {
      const tierExpansions = d.expansion_events.filter(e => e.tier === tier.name);
      result[`expansion_${tier.name}`] = tierExpansions.reduce((sum, e) => sum + e.capacity_added, 0) / 1_000_000;
    });

    return result;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Capacity Expansion Stacking</h3>
        <div className="flex gap-2">
          {tiers.map(tier => (
            <button
              key={tier.name}
              onClick={() => onTierSelect(selectedTier === tier.name ? null : tier.name)}
              className={`px-3 py-1 rounded text-sm border ${
                selectedTier === tier.name 
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
              style={selectedTier === tier.name ? { borderColor: tier.color } : {}}
            >
              {tier.name}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="capacity" orientation="left" tickFormatter={v => `${v}M`} />
            <YAxis yAxisId="util" orientation="right" tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'utilization') return [`${(value * 100).toFixed(1)}%`, 'Utilization'];
                return [`${value.toFixed(1)}M units`, name.replace('_', ' ')];
              }}
            />
            <Legend />
            
            {/* Base capacity */}
            <Bar yAxisId="capacity" dataKey="base_capacity" stackId="capacity" fill="#3b82f6" name="Base Capacity" />
            
            {/* Expansion tiers */}
            {tiers.map(tier => (
              <Bar 
                key={tier.name}
                yAxisId="capacity" 
                dataKey={`expansion_${tier.name}`} 
                stackId="capacity" 
                fill={tier.color}
                name={`${tier.name} Expansion`}
                opacity={selectedTier && selectedTier !== tier.name ? 0.3 : 1}
              />
            ))}
            
            {/* Demand line */}
            <Line yAxisId="capacity" type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={3} name="Demand" />
            
            {/* Utilization line */}
            <Line yAxisId="util" type="monotone" dataKey="utilization" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" name="Utilization" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function UtilizationAnalysisView({ data }: { data: CapacityExpansionData[] }) {
  const utilizationData = data.map(d => ({
    year: d.year,
    utilization: d.utilization * 100,
    target_utilization: 85, // Target utilization threshold
    over_capacity: Math.max(0, (d.demand - d.total_capacity) / d.total_capacity * 100),
    efficiency_score: Math.min(100, (d.utilization / 0.85) * 100) // Efficiency relative to 85% target
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Capacity Utilization Analysis</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Utilization trend */}
        <div>
          <h4 className="font-medium mb-3">Utilization vs Target</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend />
                
                <Area dataKey="utilization" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="Actual Utilization" />
                <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="5 5" label="Target (85%)" />
                <ReferenceLine y={95} stroke="#dc2626" strokeDasharray="3 3" label="Critical (95%)" />
                <Line type="monotone" dataKey="efficiency_score" stroke="#10b981" strokeWidth={2} name="Efficiency Score" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capacity gaps and surpluses */}
        <div>
          <h4 className="font-medium mb-3">Capacity Optimization Opportunities</h4>
          <div className="space-y-3">
            {utilizationData.map(year => (
              <div key={year.year} className="border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Year {year.year}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    year.utilization > 95 ? 'bg-red-100 text-red-800' :
                    year.utilization > 85 ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {year.utilization.toFixed(1)}% utilized
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      year.utilization > 95 ? 'bg-red-500' :
                      year.utilization > 85 ? 'bg-green-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(100, year.utilization)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Efficiency: {year.efficiency_score.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpansionTimelineView({ 
  data, 
  tiers, 
  leaseYears 
}: { 
  data: CapacityExpansionData[]; 
  tiers: ExpansionTier[];
  leaseYears: number;
}) {
  // Create timeline events for expansions
  const timelineEvents = data.flatMap(year => 
    year.expansion_events.map(event => ({
      year: year.year,
      facility: event.facility,
      tier: event.tier,
      capacity_added: event.capacity_added,
      cost: event.cost,
      lease_end: year.year + leaseYears,
      tier_color: tiers.find(t => t.name === event.tier)?.color || '#6b7280'
    }))
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Expansion Timeline & Commitments</h3>
      
      <div className="grid gap-4">
        {/* Timeline visualization */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="relative">
            {/* Timeline axis */}
            <div className="flex justify-between mb-4">
              {data.map(d => (
                <div key={d.year} className="text-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mx-auto mb-1" />
                  <div className="text-xs text-gray-600">{d.year}</div>
                </div>
              ))}
            </div>
            
            {/* Expansion events */}
            <div className="space-y-2">
              {timelineEvents.map((event, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: event.tier_color }}
                  />
                  <div className="flex-grow">
                    <span className="font-medium">{event.facility}</span>
                    <span className="text-gray-600 ml-2">
                      +{(event.capacity_added / 1_000_000).toFixed(1)}M units ({event.tier})
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {event.year} → {event.lease_end}
                  </div>
                  <div className="text-green-600 font-medium">
                    ${(event.cost / 1000).toFixed(0)}K/yr
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commitment calendar */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b">
            <h4 className="font-medium">Active Commitments by Year</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">Year</th>
                  <th className="text-left p-2">New Expansions</th>
                  <th className="text-left p-2">Active Commitments</th>
                  <th className="text-left p-2">Annual Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.map(year => {
                  const newExpansions = year.expansion_events.length;
                  const activeCommitments = year.committed_expansions;
                  const annualCost = year.expansion_events.reduce((sum, e) => sum + e.cost, 0);
                  
                  return (
                    <tr key={year.year} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{year.year}</td>
                      <td className="p-2">
                        {newExpansions > 0 ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {newExpansions} new
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {activeCommitments} active
                        </span>
                      </td>
                      <td className="p-2 font-medium text-green-600">
                        ${(annualCost / 1000).toFixed(0)}K
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpansionEfficiencyPanel({ 
  metrics, 
  tiers 
}: { 
  metrics: any; 
  tiers: ExpansionTier[];
}) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border p-6">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold">Expansion Efficiency Analysis</h3>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {/* Tier efficiency comparison */}
        <div>
          <h4 className="font-medium mb-3">Tier Efficiency</h4>
          <div className="space-y-2">
            {tiers.map(tier => (
              <div key={tier.name} className="flex justify-between items-center p-2 bg-white rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: tier.color }} />
                  <span className="text-sm font-medium">{tier.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  ${(tier.fixed_cost_per_year / tier.capacity_increment * 1000).toFixed(2)}/k units
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ROI metrics */}
        <div>
          <h4 className="font-medium mb-3">ROI Analysis</h4>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.avgROI.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Average ROI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.paybackYears.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Payback (years)</div>
            </div>
          </div>
        </div>

        {/* Optimization recommendations */}
        <div>
          <h4 className="font-medium mb-3">Recommendations</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Tier A provides best cost efficiency</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
              <span>Consider timing expansions with demand peaks</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Target className="w-4 h-4 text-blue-500 mt-0.5" />
              <span>Maintain 85-90% utilization target</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'emerald';
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-green-600 bg-green-50',
    emerald: 'text-emerald-600 bg-emerald-50'
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function calculateExpansionMetrics(
  data: CapacityExpansionData[], 
  tiers: ExpansionTier[], 
  leaseYears: number
) {
  const totalExpansions = data.reduce((sum, d) => sum + d.expansion_events.length, 0);
  const totalCost = data.reduce((sum, d) => 
    sum + d.expansion_events.reduce((eventSum, e) => eventSum + e.cost, 0), 0
  );
  
  // Simplified ROI calculation
  const avgROI = totalCost > 0 ? (totalExpansions * 500000 / totalCost - 1) * 100 : 0;
  const paybackYears = leaseYears / 2; // Simplified payback

  return {
    totalExpansions,
    totalCost,
    avgROI,
    paybackYears
  };
}
