'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProjectScenarioManager from '@/components/ProjectScenarioManager';

interface TransportScenario {
  id?: number;
  scenario_type: 'lowest_miles_zip' | 'lowest_miles_city' | 'lowest_miles_state' | 
                 'lowest_cost_zip' | 'lowest_cost_city' | 'lowest_cost_state' |
                 'best_service_parcel' | 'best_service_ltl' | 'best_service_tl' | 'blended_service';
  scenario_name: string;
  total_miles?: number;
  total_cost?: number;
  service_score?: number;
  route_details?: any;
  volume_allocations?: any;
  generated: boolean;
}

interface TransportConfiguration {
  outbound_weight_percentage: number;
  inbound_weight_percentage: number;
  service_zone_weighting: {
    parcel_zone_weight: number;
    ltl_zone_weight: number;
    tl_daily_miles_weight: number;
  };
  optimization_criteria: {
    cost_weight: number;
    service_weight: number;
    distance_weight: number;
  };
}

interface FacilityAllocation {
  facility_id: string;
  facility_name: string;
  total_volume_units: number;
  outbound_volume: number;
  inbound_volume: number;
  capacity_utilization: number;
}

interface RouteDetail {
  origin: string;
  destination: string;
  distance_miles: number;
  cost_per_mile: number;
  service_zone: string;
  volume_units: number;
  transit_time_hours: number;
}

export default function TransportOptimizer() {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'configuration' | 'scenarios' | 'generation' | 'analysis' | 'results'>('projects');
  
  const [configuration, setConfiguration] = useState<TransportConfiguration>({
    outbound_weight_percentage: 50,
    inbound_weight_percentage: 50,
    service_zone_weighting: {
      parcel_zone_weight: 40,
      ltl_zone_weight: 35,
      tl_daily_miles_weight: 25
    },
    optimization_criteria: {
      cost_weight: 40,
      service_weight: 35,
      distance_weight: 25
    }
  });

  const [scenarios, setScenarios] = useState<TransportScenario[]>([
    {
      id: 1,
      scenario_type: 'lowest_cost_zip',
      scenario_name: 'Lowest Cost (ZIP to ZIP)',
      total_miles: 125000,
      total_cost: 245000,
      service_score: 85,
      generated: true
    },
    {
      id: 2,
      scenario_type: 'lowest_miles_city',
      scenario_name: 'Lowest Miles (City to City)',
      total_miles: 98000,
      total_cost: 285000,
      service_score: 78,
      generated: true
    },
    {
      id: 3,
      scenario_type: 'best_service_parcel',
      scenario_name: 'Best Service (Parcel Zone)',
      total_miles: 142000,
      total_cost: 265000,
      service_score: 92,
      generated: true
    }
  ]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [facilityRequirements, setFacilityRequirements] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const scenarioTypes = [
    { key: 'lowest_miles_zip', name: 'Lowest Miles (ZIP to ZIP)', description: 'Minimize total miles for ZIP code to ZIP code routes' },
    { key: 'lowest_miles_city', name: 'Lowest Miles (City to City)', description: 'Minimize total miles for city-to-city routes' },
    { key: 'lowest_miles_state', name: 'Lowest Miles (State Average)', description: 'Minimize average state-to-state miles' },
    { key: 'lowest_cost_zip', name: 'Lowest Cost (ZIP to ZIP)', description: 'Minimize total cost for ZIP code to ZIP code routes' },
    { key: 'lowest_cost_city', name: 'Lowest Cost (City to City)', description: 'Minimize total cost for city-to-city routes' },
    { key: 'lowest_cost_state', name: 'Lowest Cost (State Average)', description: 'Minimize average state-to-state costs' },
    { key: 'best_service_parcel', name: 'Best Service (Parcel Zone)', description: 'Optimize based on parcel service zones' },
    { key: 'best_service_ltl', name: 'Best Service (LTL Zone)', description: 'Optimize based on LTL service zones' },
    { key: 'best_service_tl', name: 'Best Service (TL Daily Miles)', description: 'Optimize based on TL daily miles' },
    { key: 'blended_service', name: 'Blended Service Zone', description: 'Weighted combination of all service factors' }
  ];

  const generateScenarios = async () => {
    setIsGenerating(true);
    try {
      // Simulate scenario generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedScenarios = scenarioTypes.map((type, index) => ({
        id: Date.now() + index,
        scenario_type: type.key as any,
        scenario_name: type.name,
        total_miles: Math.floor(Math.random() * 50000) + 100000,
        total_cost: Math.floor(Math.random() * 100000) + 200000,
        service_score: Math.floor(Math.random() * 20) + 80,
        generated: true,
        route_details: generateMockRouteDetails(),
        volume_allocations: generateMockVolumeAllocations()
      }));

      setScenarios(generatedScenarios);
    } catch (error) {
      console.error('Scenario generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockRouteDetails = (): RouteDetail[] => {
    const routes = [
      { origin: 'Chicago, IL', destination: 'New York, NY', service_zone: 'Zone 3' },
      { origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', service_zone: 'Zone 2' },
      { origin: 'Dallas, TX', destination: 'Houston, TX', service_zone: 'Zone 1' },
      { origin: 'Atlanta, GA', destination: 'Miami, FL', service_zone: 'Zone 2' },
      { origin: 'Seattle, WA', destination: 'Portland, OR', service_zone: 'Zone 1' }
    ];

    return routes.map(route => ({
      ...route,
      distance_miles: Math.floor(Math.random() * 800) + 200,
      cost_per_mile: Math.random() * 2 + 1.5,
      volume_units: Math.floor(Math.random() * 10000) + 5000,
      transit_time_hours: Math.floor(Math.random() * 20) + 8
    }));
  };

  const generateMockVolumeAllocations = (): FacilityAllocation[] => {
    return Array.from({ length: facilityRequirements }, (_, i) => ({
      facility_id: `facility_${i + 1}`,
      facility_name: `Distribution Center ${i + 1}`,
      total_volume_units: Math.floor(Math.random() * 50000) + 25000,
      outbound_volume: Math.floor(Math.random() * 30000) + 15000,
      inbound_volume: Math.floor(Math.random() * 20000) + 10000,
      capacity_utilization: Math.random() * 30 + 70
    }));
  };

  const runTransportAnalysis = async () => {
    if (selectedScenarios.length === 0) {
      alert('Please select at least one scenario to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const selectedScenarioData = scenarios.filter(s => 
        selectedScenarios.includes(s.scenario_type)
      );

      const bestCostScenario = selectedScenarioData.reduce((prev, curr) => 
        (curr.total_cost || 0) < (prev.total_cost || 0) ? curr : prev
      );

      const bestServiceScenario = selectedScenarioData.reduce((prev, curr) => 
        (curr.service_score || 0) > (prev.service_score || 0) ? curr : prev
      );

      const bestMilesScenario = selectedScenarioData.reduce((prev, curr) => 
        (curr.total_miles || 0) < (prev.total_miles || 0) ? curr : prev
      );

      const results = {
        scenariosAnalyzed: selectedScenarioData.length,
        bestCostScenario,
        bestServiceScenario,
        bestMilesScenario,
        averageCost: selectedScenarioData.reduce((sum, s) => sum + (s.total_cost || 0), 0) / selectedScenarioData.length,
        averageMiles: selectedScenarioData.reduce((sum, s) => sum + (s.total_miles || 0), 0) / selectedScenarioData.length,
        averageService: selectedScenarioData.reduce((sum, s) => sum + (s.service_score || 0), 0) / selectedScenarioData.length,
        costSavingsPotential: Math.max(...selectedScenarioData.map(s => s.total_cost || 0)) - Math.min(...selectedScenarioData.map(s => s.total_cost || 0)),
        recommendedScenario: bestCostScenario // Can be customized based on weighted criteria
      };

      setAnalysisResults(results);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleScenarioSelection = (scenarioType: string) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioType) 
        ? prev.filter(s => s !== scenarioType)
        : [...prev, scenarioType]
    );
  };

  const updateConfiguration = (section: keyof TransportConfiguration, updates: any) => {
    setConfiguration(prev => {
      if (typeof prev[section] === 'object' && prev[section] !== null) {
        return {
          ...prev,
          [section]: {
            ...(prev[section] as object),
            ...updates
          }
        };
      } else {
        return {
          ...prev,
          [section]: updates
        };
      }
    });
  };

  return (
    <div className="main-container">
      <Navigation />
      <div className="content-area">
        <div className="transport-optimizer-container">
          <h1 className="page-title">Transport Optimizer</h1>
          <p className="page-description">
            Generate and analyze multiple transport scenarios to determine optimal routing strategies 
            based on cost, service, and distance optimization criteria.
          </p>

          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              Projects & Scenarios
            </button>
            <button
              className={`tab-button ${activeTab === 'configuration' ? 'active' : ''}`}
              onClick={() => setActiveTab('configuration')}
            >
              Configuration
            </button>
            <button
              className={`tab-button ${activeTab === 'scenarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('scenarios')}
            >
              Scenario Generation
            </button>
            <button
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              Scenario Analysis
            </button>
            <button
              className={`tab-button ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
          </div>

          {activeTab === 'projects' && (
            <div className="tab-content">
              <ProjectScenarioManager
                onSelectProject={setSelectedProject}
                onSelectScenario={setSelectedScenario}
                selectedProject={selectedProject}
                selectedScenario={selectedScenario}
                optimizationType="transport"
              />
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="tab-content">
              <h2 className="section-title">Transport Configuration</h2>
              
              <div className="config-section">
                <h3 className="subsection-title">Shipment Direction Weighting</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Outbound Weight Percentage (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.outbound_weight_percentage}
                      onChange={(e) => setConfiguration(prev => ({ ...prev, outbound_weight_percentage: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Inbound Weight Percentage (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.inbound_weight_percentage}
                      onChange={(e) => setConfiguration(prev => ({ ...prev, inbound_weight_percentage: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
                <p className="config-note">
                  Note: Outbound + Inbound should equal 100%. Adjust based on shipment volume distribution.
                </p>
              </div>

              <div className="config-section">
                <h3 className="subsection-title">Service Zone Weighting</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Parcel Zone Weight (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.service_zone_weighting.parcel_zone_weight}
                      onChange={(e) => updateConfiguration('service_zone_weighting', { 
                        parcel_zone_weight: parseFloat(e.target.value) 
                      })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">LTL Zone Weight (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.service_zone_weighting.ltl_zone_weight}
                      onChange={(e) => updateConfiguration('service_zone_weighting', { 
                        ltl_zone_weight: parseFloat(e.target.value) 
                      })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">TL Daily Miles Weight (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.service_zone_weighting.tl_daily_miles_weight}
                      onChange={(e) => updateConfiguration('service_zone_weighting', { 
                        tl_daily_miles_weight: parseFloat(e.target.value) 
                      })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h3 className="subsection-title">Optimization Criteria</h3>
                <div className="config-grid">
                  <div className="config-field">
                    <label className="field-label">Cost Weight (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.optimization_criteria.cost_weight}
                      onChange={(e) => updateConfiguration('optimization_criteria', { 
                        cost_weight: parseFloat(e.target.value) 
                      })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Service Weight (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.optimization_criteria.service_weight}
                      onChange={(e) => updateConfiguration('optimization_criteria', { 
                        service_weight: parseFloat(e.target.value) 
                      })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>

                  <div className="config-field">
                    <label className="field-label">Distance Weight (%)</label>
                    <input
                      type="number"
                      className="field-input"
                      value={configuration.optimization_criteria.distance_weight}
                      onChange={(e) => updateConfiguration('optimization_criteria', { 
                        distance_weight: parseFloat(e.target.value) 
                      })}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              <div className="config-section">
                <h3 className="subsection-title">Facility Requirements</h3>
                <div className="config-field">
                  <label className="field-label">Required Number of Facilities</label>
                  <input
                    type="number"
                    className="field-input"
                    value={facilityRequirements}
                    onChange={(e) => setFacilityRequirements(parseInt(e.target.value) || 3)}
                    min="1"
                    max="20"
                  />
                  <p className="field-note">
                    This will determine how many scenarios are generated and analyzed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scenarios' && (
            <div className="tab-content">
              <h2 className="section-title">Scenario Generation</h2>
              <p className="section-description">
                Generate transport optimization scenarios based on different criteria. 
                Each scenario will be optimized for specific objectives.
              </p>

              <div className="generation-actions">
                <button 
                  className="action-button primary large"
                  onClick={generateScenarios}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="loading-spinner"></div>
                      Generating Scenarios...
                    </>
                  ) : (
                    'Generate All Scenarios'
                  )}
                </button>
              </div>

              <div className="scenarios-grid">
                {scenarioTypes.map(type => {
                  const scenario = scenarios.find(s => s.scenario_type === type.key);
                  return (
                    <div key={type.key} className={`scenario-card ${scenario ? 'generated' : 'pending'}`}>
                      <div className="scenario-header">
                        <h3 className="scenario-name">{type.name}</h3>
                        <div className={`scenario-status ${scenario ? 'completed' : 'pending'}`}>
                          {scenario ? 'Generated' : 'Pending'}
                        </div>
                      </div>
                      <p className="scenario-description">{type.description}</p>
                      
                      {scenario && (
                        <div className="scenario-metrics">
                          <div className="metric">
                            <span className="metric-label">Total Miles:</span>
                            <span className="metric-value">{scenario.total_miles?.toLocaleString()}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Total Cost:</span>
                            <span className="metric-value">${scenario.total_cost?.toLocaleString()}</span>
                          </div>
                          <div className="metric">
                            <span className="metric-label">Service Score:</span>
                            <span className="metric-value">{scenario.service_score}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="tab-content">
              <h2 className="section-title">Scenario Analysis</h2>
              <p className="section-description">
                Select scenarios to analyze and compare their performance across different metrics.
              </p>

              {scenarios.length > 0 ? (
                <>
                  <div className="scenario-selection">
                    <h3 className="subsection-title">Select Scenarios for Analysis</h3>
                    <div className="scenario-checkboxes">
                      {scenarios.map(scenario => (
                        <label key={scenario.scenario_type} className="scenario-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedScenarios.includes(scenario.scenario_type)}
                            onChange={() => toggleScenarioSelection(scenario.scenario_type)}
                          />
                          <span className="checkbox-label">{scenario.scenario_name}</span>
                          <span className="checkbox-metrics">
                            (${scenario.total_cost?.toLocaleString()} | {scenario.total_miles?.toLocaleString()} mi | {scenario.service_score}%)
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="analysis-actions">
                    <button 
                      className="action-button primary large"
                      onClick={runTransportAnalysis}
                      disabled={isAnalyzing || selectedScenarios.length === 0}
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="loading-spinner"></div>
                          Analyzing Scenarios...
                        </>
                      ) : (
                        `Analyze Selected Scenarios (${selectedScenarios.length})`
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p>No scenarios available. Please generate scenarios first.</p>
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
                        <h3 className="summary-title">Scenarios Analyzed</h3>
                        <div className="summary-value">{analysisResults.scenariosAnalyzed}</div>
                      </div>
                      
                      <div className="summary-card">
                        <h3 className="summary-title">Average Cost</h3>
                        <div className="summary-value">${analysisResults.averageCost?.toLocaleString()}</div>
                      </div>
                      
                      <div className="summary-card">
                        <h3 className="summary-title">Average Miles</h3>
                        <div className="summary-value">{analysisResults.averageMiles?.toLocaleString()}</div>
                      </div>
                      
                      <div className="summary-card">
                        <h3 className="summary-title">Average Service</h3>
                        <div className="summary-value">{analysisResults.averageService?.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="best-scenarios">
                    <h3 className="subsection-title">Best Performing Scenarios</h3>
                    
                    <div className="best-scenarios-grid">
                      <div className="best-scenario-card">
                        <h4 className="best-scenario-title">Lowest Cost</h4>
                        <div className="best-scenario-name">{analysisResults.bestCostScenario?.scenario_name}</div>
                        <div className="best-scenario-metric">${analysisResults.bestCostScenario?.total_cost?.toLocaleString()}</div>
                      </div>
                      
                      <div className="best-scenario-card">
                        <h4 className="best-scenario-title">Best Service</h4>
                        <div className="best-scenario-name">{analysisResults.bestServiceScenario?.scenario_name}</div>
                        <div className="best-scenario-metric">{analysisResults.bestServiceScenario?.service_score}%</div>
                      </div>
                      
                      <div className="best-scenario-card">
                        <h4 className="best-scenario-title">Shortest Distance</h4>
                        <div className="best-scenario-name">{analysisResults.bestMilesScenario?.scenario_name}</div>
                        <div className="best-scenario-metric">{analysisResults.bestMilesScenario?.total_miles?.toLocaleString()} mi</div>
                      </div>
                    </div>
                  </div>

                  <div className="recommended-scenario">
                    <h3 className="subsection-title">Recommended Scenario</h3>
                    <div className="recommended-card">
                      <h4 className="recommended-name">{analysisResults.recommendedScenario?.scenario_name}</h4>
                      <p className="recommended-description">
                        Based on your optimization criteria, this scenario provides the best balance 
                        of cost, service, and distance factors.
                      </p>
                      <div className="recommended-metrics">
                        <div className="recommended-metric">
                          <span className="metric-label">Total Cost:</span>
                          <span className="metric-value">${analysisResults.recommendedScenario?.total_cost?.toLocaleString()}</span>
                        </div>
                        <div className="recommended-metric">
                          <span className="metric-label">Total Miles:</span>
                          <span className="metric-value">{analysisResults.recommendedScenario?.total_miles?.toLocaleString()}</span>
                        </div>
                        <div className="recommended-metric">
                          <span className="metric-label">Service Score:</span>
                          <span className="metric-value">{analysisResults.recommendedScenario?.service_score}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="savings-potential">
                    <h3 className="subsection-title">Cost Savings Potential</h3>
                    <div className="savings-card">
                      <div className="savings-amount">${analysisResults.costSavingsPotential?.toLocaleString()}</div>
                      <p className="savings-description">
                        Potential annual savings by choosing the optimal scenario versus the most expensive option.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No analysis results available. Please run scenario analysis first.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .transport-optimizer-container {
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

        .config-note, .field-note {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.5rem;
          font-style: italic;
        }

        .generation-actions, .analysis-actions {
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

        .scenarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .scenario-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          background: white;
          transition: all 0.2s;
        }

        .scenario-card.generated {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .scenario-card.pending {
          background: #f9fafb;
          opacity: 0.7;
        }

        .scenario-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }

        .scenario-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .scenario-status {
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .scenario-status.completed {
          background: #dcfce7;
          color: #166534;
        }

        .scenario-status.pending {
          background: #f3f4f6;
          color: #6b7280;
        }

        .scenario-description {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .scenario-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .metric-label {
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          color: #1f2937;
          font-weight: 600;
        }

        .scenario-selection {
          margin-bottom: 2rem;
        }

        .scenario-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .scenario-checkbox {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scenario-checkbox:hover {
          background: #f9fafb;
        }

        .checkbox-label {
          font-weight: 500;
          color: #1f2937;
        }

        .checkbox-metrics {
          color: #6b7280;
          font-size: 0.875rem;
          margin-left: auto;
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

        .best-scenarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .best-scenario-card {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .best-scenario-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #0c4a6e;
          margin-bottom: 0.5rem;
        }

        .best-scenario-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .best-scenario-metric {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0ea5e9;
        }

        .recommended-card {
          background: #f0fdf4;
          border: 1px solid #10b981;
          border-radius: 0.5rem;
          padding: 2rem;
        }

        .recommended-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.75rem;
        }

        .recommended-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .recommended-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .recommended-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
        }

        .savings-card {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
        }

        .savings-amount {
          font-size: 2rem;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 0.75rem;
        }

        .savings-description {
          color: #6b7280;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .config-grid,
          .scenarios-grid,
          .summary-grid,
          .best-scenarios-grid,
          .recommended-metrics {
            grid-template-columns: 1fr;
          }

          .tab-navigation {
            flex-wrap: wrap;
          }

          .scenario-checkbox {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .checkbox-metrics {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
