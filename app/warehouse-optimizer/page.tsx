'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface TransportScenario {
  id: number;
  scenario_name: string;
  total_cost: number;
  total_miles: number;
  service_score: number;
  volume_allocations?: FacilityVolumeAllocation[];
}

interface FacilityVolumeAllocation {
  facility_id: string;
  facility_name: string;
  location: string;
  total_volume_units: number;
  outbound_volume: number;
  inbound_volume: number;
}

interface MarketData {
  city: string;
  state: string;
  warehouse_lease_rate_per_sqft: number;
  hourly_wage_rate: number;
  fully_burdened_rate: number;
  confidence_score: number;
  last_updated: string;
}

interface WarehouseCostBreakdown {
  facility_id: string;
  facility_name: string;
  location: string;
  year_number: number;
  
  // Facility details
  square_feet: number;
  volume_units: number;
  utilization_rate: number;
  
  // Cost components
  lease_costs: number;
  operating_costs: number;
  labor_costs: number;
  utilities_costs: number;
  maintenance_costs: number;
  insurance_costs: number;
  
  // Labor details
  labor_hours_required: number;
  hourly_wage_rate: number;
  fully_burdened_rate: number;
  
  // Lease details
  lease_rate_per_sqft: number;
  lease_term_years: number;
  annual_lease_cost: number;
  
  // Totals
  total_annual_cost: number;
  cost_per_unit: number;
}

interface WarehouseConfiguration {
  lease_term_years: number;
  utilization_rate: number;
  labor_productivity_units_per_hour: number;
  overhead_cost_multiplier: number;
  maintenance_cost_percentage: number;
  insurance_cost_percentage: number;
  utilities_cost_per_sqft: number;
}

export default function WarehouseOptimizer() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'configuration' | 'costs' | 'analysis' | 'results'>('scenarios');
  
  const [transportScenarios, setTransportScenarios] = useState<TransportScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<TransportScenario | null>(null);
  const [projectYears, setProjectYears] = useState(5);
  
  const [configuration, setConfiguration] = useState<WarehouseConfiguration>({
    lease_term_years: 7,
    utilization_rate: 80,
    labor_productivity_units_per_hour: 120,
    overhead_cost_multiplier: 1.35,
    maintenance_cost_percentage: 2.5,
    insurance_cost_percentage: 1.2,
    utilities_cost_per_sqft: 4.50
  });

  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [warehouseCosts, setWarehouseCosts] = useState<WarehouseCostBreakdown[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Data initialization
  useEffect(() => {
    // Mock transport scenarios with volume allocations
    const mockScenarios: TransportScenario[] = [
      {
        id: 1,
        scenario_name: 'Lowest Cost (ZIP to ZIP)',
        total_cost: 245000,
        total_miles: 120000,
        service_score: 85,
        volume_allocations: [
          { facility_id: 'F001', facility_name: 'Chicago DC', location: 'Chicago, IL', total_volume_units: 125000, outbound_volume: 75000, inbound_volume: 50000 },
          { facility_id: 'F002', facility_name: 'Atlanta DC', location: 'Atlanta, GA', total_volume_units: 98000, outbound_volume: 58000, inbound_volume: 40000 },
          { facility_id: 'F003', facility_name: 'Phoenix DC', location: 'Phoenix, AZ', total_volume_units: 87000, outbound_volume: 52000, inbound_volume: 35000 }
        ]
      },
      {
        id: 2,
        scenario_name: 'Best Service (Parcel Zone)',
        total_cost: 267000,
        total_miles: 105000,
        service_score: 95,
        volume_allocations: [
          { facility_id: 'F001', facility_name: 'Chicago DC', location: 'Chicago, IL', total_volume_units: 115000, outbound_volume: 70000, inbound_volume: 45000 },
          { facility_id: 'F002', facility_name: 'Atlanta DC', location: 'Atlanta, GA', total_volume_units: 105000, outbound_volume: 63000, inbound_volume: 42000 },
          { facility_id: 'F003', facility_name: 'Phoenix DC', location: 'Phoenix, AZ', total_volume_units: 95000, outbound_volume: 57000, inbound_volume: 38000 }
        ]
      },
      {
        id: 3,
        scenario_name: 'Lowest Miles (City to City)',
        total_cost: 255000,
        total_miles: 95000,
        service_score: 88,
        volume_allocations: [
          { facility_id: 'F001', facility_name: 'Chicago DC', location: 'Chicago, IL', total_volume_units: 130000, outbound_volume: 78000, inbound_volume: 52000 },
          { facility_id: 'F002', facility_name: 'Atlanta DC', location: 'Atlanta, GA', total_volume_units: 92000, outbound_volume: 55000, inbound_volume: 37000 },
          { facility_id: 'F003', facility_name: 'Phoenix DC', location: 'Phoenix, AZ', total_volume_units: 85000, outbound_volume: 51000, inbound_volume: 34000 }
        ]
      }
    ];
    setTransportScenarios(mockScenarios);

    // Fetch real-time market data
    fetchMarketData();
  }, []);

  const fetchMarketData = async (forceRefresh = false) => {
    try {
      const uniqueLocations = Array.from(new Set(
        transportScenarios.flatMap(scenario =>
          scenario.volume_allocations?.map(allocation => allocation.location) || []
        )
      )).map(location => {
        const [city, state] = location.split(', ');
        return { city, state };
      });

      if (uniqueLocations.length === 0) return;

      const response = await fetch('/api/market-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: uniqueLocations,
          force_refresh: forceRefresh
        })
      });

      if (!response.ok) {
        throw new Error(`Market data API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setMarketData(result.data);
        console.log(`Loaded market data for ${result.data.length} locations (${result.cache_info?.from_cache || 0} from cache, ${result.cache_info?.from_api || 0} from API)`);
      } else {
        throw new Error(result.error || 'Failed to fetch market data');
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);

      // Use fallback data on error
      const fallbackData: MarketData[] = [
        { city: 'Chicago', state: 'IL', warehouse_lease_rate_per_sqft: 6.25, hourly_wage_rate: 18.50, fully_burdened_rate: 24.95, confidence_score: 25, last_updated: new Date().toISOString().split('T')[0] },
        { city: 'Atlanta', state: 'GA', warehouse_lease_rate_per_sqft: 5.75, hourly_wage_rate: 16.25, fully_burdened_rate: 21.85, confidence_score: 25, last_updated: new Date().toISOString().split('T')[0] },
        { city: 'Phoenix', state: 'AZ', warehouse_lease_rate_per_sqft: 6.95, hourly_wage_rate: 17.75, fully_burdened_rate: 23.90, confidence_score: 25, last_updated: new Date().toISOString().split('T')[0] }
      ];
      setMarketData(fallbackData);
    }
  };

  const calculateWarehouseCosts = async () => {
    if (!selectedScenario) {
      alert('Please select a transport scenario first');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const costs: WarehouseCostBreakdown[] = [];
      
      selectedScenario.volume_allocations?.forEach(allocation => {
        const marketInfo = marketData.find(m => 
          allocation.location.includes(m.city) && allocation.location.includes(m.state)
        );
        
        for (let year = 1; year <= projectYears; year++) {
          // Calculate required square footage based on volume
          const volumeGrowthFactor = Math.pow(1.05, year - 1); // 5% annual growth
          const adjustedVolume = allocation.total_volume_units * volumeGrowthFactor;
          const requiredSqFt = Math.ceil(adjustedVolume / 25); // 25 units per sq ft storage density
          
          // Calculate labor requirements
          const laborHours = (adjustedVolume / configuration.labor_productivity_units_per_hour) * 2080; // Annual hours
          
          // Cost calculations
          const leaseCost = requiredSqFt * (marketInfo?.warehouse_lease_rate_per_sqft || 6.0);
          const laborCost = laborHours * (marketInfo?.fully_burdened_rate || 23.0);
          const utilitiesCost = requiredSqFt * configuration.utilities_cost_per_sqft;
          const maintenanceCost = leaseCost * (configuration.maintenance_cost_percentage / 100);
          const insuranceCost = leaseCost * (configuration.insurance_cost_percentage / 100);
          const operatingCost = utilitiesCost + maintenanceCost + insuranceCost;
          
          const totalCost = leaseCost + laborCost + operatingCost;
          
          costs.push({
            facility_id: allocation.facility_id,
            facility_name: allocation.facility_name,
            location: allocation.location,
            year_number: year,
            square_feet: requiredSqFt,
            volume_units: Math.round(adjustedVolume),
            utilization_rate: configuration.utilization_rate,
            lease_costs: leaseCost,
            operating_costs: operatingCost,
            labor_costs: laborCost,
            utilities_costs: utilitiesCost,
            maintenance_costs: maintenanceCost,
            insurance_costs: insuranceCost,
            labor_hours_required: laborHours,
            hourly_wage_rate: marketInfo?.hourly_wage_rate || 18.0,
            fully_burdened_rate: marketInfo?.fully_burdened_rate || 23.0,
            lease_rate_per_sqft: marketInfo?.warehouse_lease_rate_per_sqft || 6.0,
            lease_term_years: configuration.lease_term_years,
            annual_lease_cost: leaseCost,
            total_annual_cost: totalCost,
            cost_per_unit: totalCost / adjustedVolume
          });
        }
      });
      
      setWarehouseCosts(costs);
      
      // Calculate analysis results
      const totalCosts = costs.reduce((sum, cost) => sum + cost.total_annual_cost, 0);
      const totalVolume = costs.reduce((sum, cost) => sum + cost.volume_units, 0);
      const avgCostPerUnit = totalCosts / totalVolume;
      
      const facilitySummary = costs.reduce((acc, cost) => {
        const existing = acc.find(f => f.facility_id === cost.facility_id);
        if (existing) {
          existing.total_cost += cost.total_annual_cost;
          existing.total_volume += cost.volume_units;
        } else {
          acc.push({
            facility_id: cost.facility_id,
            facility_name: cost.facility_name,
            location: cost.location,
            total_cost: cost.total_annual_cost,
            total_volume: cost.volume_units,
            avg_cost_per_unit: cost.cost_per_unit
          });
        }
        return acc;
      }, [] as any[]);
      
      const results = {
        total_annual_costs: totalCosts,
        total_volume_units: totalVolume,
        average_cost_per_unit: avgCostPerUnit,
        facility_summary: facilitySummary,
        cost_breakdown: {
          lease_costs: costs.reduce((sum, c) => sum + c.lease_costs, 0),
          labor_costs: costs.reduce((sum, c) => sum + c.labor_costs, 0),
          operating_costs: costs.reduce((sum, c) => sum + c.operating_costs, 0)
        },
        recommendations: [
          'Consider longer lease terms for better rates',
          'Implement automation to reduce labor costs',
          'Optimize facility utilization rates',
          'Negotiate better lease rates in high-cost markets'
        ]
      };
      
      setAnalysisResults(results);
      
    } catch (error) {
      console.error('Cost analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateConfiguration = (field: keyof WarehouseConfiguration, value: number) => {
    setConfiguration(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="main-container">
      <Navigation />
      <div className="content-area">
        <div className="warehouse-optimizer-container">
          <h1 className="page-title">Warehouse Optimizer</h1>
          <p className="page-description">
            Analyze warehouse operating costs including lease terms, labor rates, and operational expenses 
            based on transport scenario volume allocations.
          </p>

          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'scenarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('scenarios')}
            >
              Transport Scenarios
            </button>
            <button 
              className={`tab-button ${activeTab === 'configuration' ? 'active' : ''}`}
              onClick={() => setActiveTab('configuration')}
            >
              Configuration
            </button>
            <button 
              className={`tab-button ${activeTab === 'costs' ? 'active' : ''}`}
              onClick={() => setActiveTab('costs')}
            >
              Market Data
            </button>
            <button 
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              Cost Analysis
            </button>
            <button 
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          </div>

          {activeTab === 'scenarios' && (
            <div className="tab-content">
              <h2 className="section-title">Transport Scenarios</h2>
              <p className="section-description">
                Select a transport scenario to analyze warehouse costs based on volume allocations.
              </p>

              <div className="scenarios-list">
                {transportScenarios.map(scenario => (
                  <div 
                    key={scenario.id} 
                    className={`scenario-card ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <div className="scenario-header">
                      <h3 className="scenario-name">{scenario.scenario_name}</h3>
                      <div className="scenario-metrics">
                        <span className="metric">Cost: ${scenario.total_cost.toLocaleString()}</span>
                        <span className="metric">Miles: {scenario.total_miles.toLocaleString()}</span>
                        <span className="metric">Service: {scenario.service_score}%</span>
                      </div>
                    </div>
                    
                    {scenario.volume_allocations && (
                      <div className="volume-allocations">
                        <h4 className="allocations-title">Facility Volume Allocations</h4>
                        <div className="allocations-grid">
                          {scenario.volume_allocations.map(allocation => (
                            <div key={allocation.facility_id} className="allocation-item">
                              <div className="allocation-name">{allocation.facility_name}</div>
                              <div className="allocation-location">{allocation.location}</div>
                              <div className="allocation-volume">{allocation.total_volume_units.toLocaleString()} units</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="tab-content">
              <h2 className="section-title">Warehouse Configuration</h2>
              
              <div className="config-section">
                <h3 className="subsection-title">Project Settings</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Project Duration (Years)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={projectYears}
                      onChange={(e) => setProjectYears(parseInt(e.target.value) || 5)}
                      min="1"
                      max="20"
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h3 className="subsection-title">Lease & Facility Settings</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Default Lease Term (Years)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.lease_term_years}
                      onChange={(e) => updateConfiguration('lease_term_years', parseFloat(e.target.value))}
                      min="1"
                      max="20"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Utilization Rate (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.utilization_rate}
                      onChange={(e) => updateConfiguration('utilization_rate', parseFloat(e.target.value))}
                      min="50"
                      max="95"
                      step="1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Utilities Cost per Sq Ft ($/year)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.utilities_cost_per_sqft}
                      onChange={(e) => updateConfiguration('utilities_cost_per_sqft', parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h3 className="subsection-title">Labor Settings</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Labor Productivity (Units/Hour)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.labor_productivity_units_per_hour}
                      onChange={(e) => updateConfiguration('labor_productivity_units_per_hour', parseFloat(e.target.value))}
                      min="50"
                      max="200"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Overhead Cost Multiplier</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.overhead_cost_multiplier}
                      onChange={(e) => updateConfiguration('overhead_cost_multiplier', parseFloat(e.target.value))}
                      min="1.0"
                      max="2.0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h3 className="subsection-title">Operating Cost Percentages</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Maintenance Cost (% of Lease)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.maintenance_cost_percentage}
                      onChange={(e) => updateConfiguration('maintenance_cost_percentage', parseFloat(e.target.value))}
                      min="0"
                      max="10"
                      step="0.1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Insurance Cost (% of Lease)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.insurance_cost_percentage}
                      onChange={(e) => updateConfiguration('insurance_cost_percentage', parseFloat(e.target.value))}
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="tab-content">
              <h2 className="section-title">Market Data</h2>
              <p className="section-description">
                Current lease rates and labor costs by market. Data sourced from market research APIs.
              </p>

              <div className="market-data-table">
                <div className="table-header">
                  <div className="table-cell">Location</div>
                  <div className="table-cell">Lease Rate ($/sq ft)</div>
                  <div className="table-cell">Hourly Wage</div>
                  <div className="table-cell">Fully Burdened Rate</div>
                  <div className="table-cell">Confidence</div>
                  <div className="table-cell">Last Updated</div>
                </div>

                {marketData.map((data, index) => (
                  <div key={index} className="table-row">
                    <div className="table-cell">
                      <strong>{data.city}, {data.state}</strong>
                    </div>
                    <div className="table-cell">${data.warehouse_lease_rate_per_sqft.toFixed(2)}</div>
                    <div className="table-cell">${data.hourly_wage_rate.toFixed(2)}</div>
                    <div className="table-cell">${data.fully_burdened_rate.toFixed(2)}</div>
                    <div className="table-cell">
                      <span className={`confidence-badge ${data.confidence_score >= 90 ? 'high' : data.confidence_score >= 75 ? 'medium' : 'low'}`}>
                        {data.confidence_score}%
                      </span>
                    </div>
                    <div className="table-cell">{data.last_updated}</div>
                  </div>
                ))}
              </div>

              <div className="data-source-note">
                <p><strong>Note:</strong> Market data is automatically updated via Perplexity API integration for real-time lease and labor rate information.</p>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="tab-content">
              <h2 className="section-title">Cost Analysis</h2>
              
              {selectedScenario ? (
                <>
                  <div className="selected-scenario-info">
                    <h3 className="subsection-title">Selected Scenario</h3>
                    <div className="scenario-info-card">
                      <h4>{selectedScenario.scenario_name}</h4>
                      <p>This analysis will calculate warehouse operating costs for {projectYears} years based on the volume allocations from this transport scenario.</p>
                    </div>
                  </div>

                  <div className="analysis-actions">
                    <button 
                      className="action-button primary large"
                      onClick={calculateWarehouseCosts}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="loading-spinner"></div>
                          Analyzing Costs...
                        </>
                      ) : (
                        'Calculate Warehouse Costs'
                      )}
                    </button>
                  </div>

                  {warehouseCosts.length > 0 && (
                    <div className="cost-breakdown-preview">
                      <h3 className="subsection-title">Cost Breakdown Preview</h3>
                      <div className="cost-table">
                        <div className="cost-table-header">
                          <div>Facility</div>
                          <div>Year</div>
                          <div>Volume</div>
                          <div>Sq Ft</div>
                          <div>Lease Cost</div>
                          <div>Labor Cost</div>
                          <div>Operating Cost</div>
                          <div>Total Cost</div>
                        </div>
                        {warehouseCosts.slice(0, 10).map((cost, index) => (
                          <div key={index} className="cost-table-row">
                            <div>{cost.facility_name}</div>
                            <div>Year {cost.year_number}</div>
                            <div>{cost.volume_units.toLocaleString()}</div>
                            <div>{cost.square_feet.toLocaleString()}</div>
                            <div>${cost.lease_costs.toLocaleString()}</div>
                            <div>${cost.labor_costs.toLocaleString()}</div>
                            <div>${cost.operating_costs.toLocaleString()}</div>
                            <div><strong>${cost.total_annual_cost.toLocaleString()}</strong></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>Please select a transport scenario first to analyze warehouse costs.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="tab-content">
              <h2 className="section-title">Analysis Results</h2>
              
              {analysisResults ? (
                <div className="results-container">
                  <div className="results-summary">
                    <div className="summary-grid">
                      <div className="summary-card">
                        <h3 className="summary-title">Total Annual Costs</h3>
                        <div className="summary-value">${analysisResults.total_annual_costs?.toLocaleString()}</div>
                      </div>
                      
                      <div className="summary-card">
                        <h3 className="summary-title">Total Volume</h3>
                        <div className="summary-value">{analysisResults.total_volume_units?.toLocaleString()} units</div>
                      </div>
                      
                      <div className="summary-card">
                        <h3 className="summary-title">Avg Cost per Unit</h3>
                        <div className="summary-value">${analysisResults.average_cost_per_unit?.toFixed(2)}</div>
                      </div>
                      
                      <div className="summary-card">
                        <h3 className="summary-title">Facilities</h3>
                        <div className="summary-value">{analysisResults.facility_summary?.length}</div>
                      </div>
                    </div>
                  </div>

                  <div className="cost-breakdown-summary">
                    <h3 className="subsection-title">Cost Breakdown</h3>
                    <div className="breakdown-grid">
                      <div className="breakdown-item">
                        <span className="breakdown-label">Lease Costs:</span>
                        <span className="breakdown-value">${analysisResults.cost_breakdown?.lease_costs?.toLocaleString()}</span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Labor Costs:</span>
                        <span className="breakdown-value">${analysisResults.cost_breakdown?.labor_costs?.toLocaleString()}</span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Operating Costs:</span>
                        <span className="breakdown-value">${analysisResults.cost_breakdown?.operating_costs?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="facility-summary">
                    <h3 className="subsection-title">Facility Summary</h3>
                    <div className="facility-cards">
                      {analysisResults.facility_summary?.map((facility: any, index: number) => (
                        <div key={index} className="facility-card">
                          <h4 className="facility-name">{facility.facility_name}</h4>
                          <div className="facility-location">{facility.location}</div>
                          <div className="facility-metrics">
                            <div className="facility-metric">
                              <span>Total Cost:</span>
                              <span>${facility.total_cost?.toLocaleString()}</span>
                            </div>
                            <div className="facility-metric">
                              <span>Total Volume:</span>
                              <span>{facility.total_volume?.toLocaleString()}</span>
                            </div>
                            <div className="facility-metric">
                              <span>Cost per Unit:</span>
                              <span>${facility.avg_cost_per_unit?.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="recommendations">
                    <h3 className="subsection-title">Recommendations</h3>
                    <div className="recommendations-list">
                      {analysisResults.recommendations?.map((rec: string, index: number) => (
                        <div key={index} className="recommendation-item">
                          <div className="recommendation-bullet">•</div>
                          <div className="recommendation-text">{rec}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No analysis results available. Please run cost analysis first.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .warehouse-optimizer-container {
          max-width: 1200px;
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

        .section-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .section-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .subsection-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .scenarios-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .scenario-card {
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scenario-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .scenario-card.selected {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .scenario-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .scenario-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .scenario-metrics {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .metric {
          font-size: 0.875rem;
          color: #6b7280;
          white-space: nowrap;
        }

        .volume-allocations {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .allocations-title {
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .allocations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .allocation-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 0.75rem;
        }

        .allocation-name {
          font-weight: 500;
          color: #1f2937;
        }

        .allocation-location {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .allocation-volume {
          font-size: 0.875rem;
          color: #059669;
          font-weight: 500;
        }

        .config-section {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .config-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .config-field {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .field-input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .field-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .market-data-table {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .table-header {
          display: grid;
          grid-template-columns: 1fr 120px 100px 120px 100px 120px;
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .table-row {
          display: grid;
          grid-template-columns: 1fr 120px 100px 120px 100px 120px;
          border-top: 1px solid #e5e7eb;
        }

        .table-cell {
          padding: 0.75rem;
          display: flex;
          align-items: center;
          min-height: 50px;
        }

        .confidence-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .confidence-badge.high {
          background: #dcfce7;
          color: #166534;
        }

        .confidence-badge.medium {
          background: #fef3c7;
          color: #92400e;
        }

        .confidence-badge.low {
          background: #fee2e2;
          color: #991b1b;
        }

        .data-source-note {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 0.5rem;
          padding: 1rem;
          color: #0c4a6e;
        }

        .selected-scenario-info {
          margin-bottom: 2rem;
        }

        .scenario-info-card {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .scenario-info-card h4 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .scenario-info-card p {
          color: #6b7280;
          margin: 0;
        }

        .analysis-actions {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
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

        .action-button.large {
          padding: 1rem 2rem;
          font-size: 1.125rem;
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

        .cost-breakdown-preview {
          margin-top: 2rem;
        }

        .cost-table {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .cost-table-header {
          display: grid;
          grid-template-columns: 150px 80px 100px 80px 120px 120px 120px 120px;
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          padding: 0.75rem;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .cost-table-row {
          display: grid;
          grid-template-columns: 150px 80px 100px 80px 120px 120px 120px 120px;
          padding: 0.75rem;
          gap: 0.5rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .results-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .summary-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          text-align: center;
        }

        .summary-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
        }

        .breakdown-label {
          font-weight: 500;
          color: #6b7280;
        }

        .breakdown-value {
          font-weight: 600;
          color: #1f2937;
        }

        .facility-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .facility-card {
          background: #f0fdf4;
          border: 1px solid #10b981;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .facility-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .facility-location {
          color: #6b7280;
          margin-bottom: 1rem;
        }

        .facility-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .facility-metric {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .recommendation-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 0.375rem;
        }

        .recommendation-bullet {
          color: #f59e0b;
          font-weight: bold;
          margin-top: 0.125rem;
        }

        .recommendation-text {
          color: #92400e;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .config-grid,
          .allocations-grid,
          .summary-grid,
          .breakdown-grid,
          .facility-cards {
            grid-template-columns: 1fr;
          }

          .table-header,
          .table-row {
            grid-template-columns: 1fr;
          }

          .table-cell {
            border-bottom: 1px solid #e5e7eb;
            min-height: auto;
            padding: 0.5rem 0.75rem;
          }

          .cost-table-header,
          .cost-table-row {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .scenario-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .scenario-metrics {
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
