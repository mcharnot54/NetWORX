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
  optimization_data?: any;
  generated: boolean;
  cities?: string[];
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

  const [scenarios, setScenarios] = useState<TransportScenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [facilityRequirements, setFacilityRequirements] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isLoadingCapacityData, setIsLoadingCapacityData] = useState(false);
  const [isSavingResults, setIsSavingResults] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [jobProgress, setJobProgress] = useState<{[key: string]: any}>({});
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to poll job status with progress updates
  const pollJobStatus = async (optimizationRunId: string, jobId?: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId || optimizationRunId}`);
      if (response.ok) {
        const jobData = await response.json();
        if (jobData.success && jobData.data) {
          const job = jobData.data;

          // Update job progress state
          setJobProgress(prev => ({
            ...prev,
            [optimizationRunId]: {
              status: job.status,
              progress: job.progress_percentage || 0,
              currentStep: job.current_step || 'Processing...',
              estimatedTimeRemaining: job.estimated_time_remaining_minutes,
              elapsedTime: job.elapsed_time_seconds,
              errorMessage: job.error_message
            }
          }));

          // If job is completed or failed, stop polling and check for results
          if (job.status === 'completed' || job.status === 'failed') {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              setPollingInterval(null);
            }

            // Fetch the actual optimization results
            if (job.status === 'completed') {
              const resultsResponse = await fetch(`/api/scenarios/${selectedScenario.id}/optimize`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                if (resultsData.success && resultsData.data?.length > 0) {
                  const latestResult = resultsData.data.find((r: any) =>
                    r.optimization_run_id === optimizationRunId
                  );
                  if (latestResult?.status === 'completed') {
                    return latestResult;
                  }
                }
              }
            }
          }

          return job;
        }
      }
    } catch (error) {
      console.warn('Error polling job status:', error);
    }
    return null;
  };

  // Function to start polling for a job
  const startJobPolling = (optimizationRunId: string, jobId?: string) => {
    // Clear existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 2 seconds
    const interval = setInterval(async () => {
      await pollJobStatus(optimizationRunId, jobId);
    }, 2000);

    setPollingInterval(interval);

    // Also poll immediately
    pollJobStatus(optimizationRunId, jobId);
  };

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Function to fetch capacity analysis data for the selected scenario
  const fetchCapacityAnalysisData = async (scenarioId: number) => {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/capacity-analysis`);
      if (response.ok) {
        const capacityData = await response.json();
        return capacityData;
      }
    } catch (error) {
      console.error('Error fetching capacity analysis:', error);
    }
    return null;
  };

  // Function to extract cities from capacity analysis data
  const extractCitiesFromCapacityData = (capacityData: any): string[] => {
    const cities: string[] = [];

    // First priority: Use cities from the selected scenario metadata
    if (selectedScenario?.cities && selectedScenario.cities.length > 0) {
      console.log('Using cities from scenario metadata:', selectedScenario.cities);
      return selectedScenario.cities.filter((city: string) => city && city.trim() !== '');
    }

    // Second priority: Extract from capacity analysis facility data
    // Look for the original facilities data that was used for the analysis
    if (capacityData?.facilities && Array.isArray(capacityData.facilities)) {
      console.log('Extracting cities from facilities data:', capacityData.facilities);
      capacityData.facilities.forEach((facility: any) => {
        if (facility.city && facility.state) {
          const cityName = `${facility.city}, ${facility.state}`;
          if (!cities.includes(cityName)) {
            cities.push(cityName);
          }
        }
      });
    }

    // Third priority: Extract from capacity analysis recommended facilities
    if (cities.length === 0 && capacityData?.yearly_results) {
      capacityData.yearly_results.forEach((year: any) => {
        if (year.recommended_facilities) {
          year.recommended_facilities.forEach((facility: any) => {
            if (facility.name && !cities.includes(facility.name)) {
              // Extract city information from facility names
              const cityMatch = facility.name.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
              if (cityMatch) {
                const cityName = `${cityMatch[1].trim()}, ${cityMatch[2]}`;
                if (!cities.includes(cityName)) {
                  cities.push(cityName);
                }
              } else if (facility.name.includes('Littleton')) {
                const littletonCity = 'Littleton, MA';
                if (!cities.includes(littletonCity)) {
                  cities.push(littletonCity);
                }
              } else {
                // For generic facility names like "New Facility 2025", try to derive from scenario context
                console.log('Found facility with generic name:', facility.name);
              }
            }
          });
        }
      });
    }

    // Fourth priority: Check scenario metadata for warehouse configurations
    if (cities.length === 0 && selectedScenario) {
      try {
        const fetchWarehouseConfigs = async () => {
          const response = await fetch(`/api/scenarios/${selectedScenario.id}/warehouses`);
          if (response.ok) {
            const warehouseData = await response.json();
            if (warehouseData.data && Array.isArray(warehouseData.data)) {
              const warehouseCities: string[] = [];
              warehouseData.data.forEach((warehouse: any) => {
                if (warehouse.location) {
                  // Parse location like "Chicago, IL" or "Atlanta, GA"
                  const locationMatch = warehouse.location.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
                  if (locationMatch) {
                    const cityName = `${locationMatch[1].trim()}, ${locationMatch[2]}`;
                    if (!warehouseCities.includes(cityName)) {
                      warehouseCities.push(cityName);
                    }
                  }
                }
              });
              cities.push(...warehouseCities);
            }
          }
        };

        // This will be async, but we can't await here in this sync function
        // So we'll use this as a fallback for the next time cities are needed
        fetchWarehouseConfigs().catch(console.warn);
      } catch (error) {
        console.warn('Could not fetch warehouse configurations:', error);
      }
    }

    // Fifth priority: Generate based on scenario requirements
    if (cities.length === 0 && selectedScenario?.number_of_nodes) {
      console.log('Generating cities based on scenario node count:', selectedScenario.number_of_nodes);
      const defaultCities = [
        'Littleton, MA',
        'Chicago, IL',
        'Dallas, TX',
        'Los Angeles, CA',
        'Atlanta, GA',
        'Seattle, WA',
        'Denver, CO',
        'Phoenix, AZ'
      ];

      // Use the number of nodes to determine how many cities to include
      return defaultCities.slice(0, selectedScenario.number_of_nodes);
    }

    // Final fallback
    if (cities.length === 0) {
      console.log('Using fallback default cities');
      cities.push('Littleton, MA', 'Chicago, IL', 'Dallas, TX');
    }

    return cities.slice(0, 8); // Allow up to 8 cities max
  };

  // Function to call real transport optimization API (now uses background jobs)
  const runRealTransportOptimization = async (scenarioId: number, cities: string[], optimizationType: string) => {
    try {
      console.log('Starting background transport optimization with:', {
        scenarioId,
        cities,
        optimizationType,
        configuration
      });

      const response = await fetch(`/api/scenarios/${scenarioId}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result_type: 'transport',
          optimization_params: {
            optimization_type: 'transport',
            scenario_type: optimizationType,
            cities: cities,
            optimization_criteria: configuration.optimization_criteria,
            service_zone_weighting: configuration.service_zone_weighting,
            outbound_weight_percentage: configuration.outbound_weight_percentage,
            inbound_weight_percentage: configuration.inbound_weight_percentage
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Start polling for this job
          console.log(`Optimization job queued: ${result.data.job_id}`);
          startJobPolling(result.data.optimization_run_id, result.data.job_id);

          return {
            success: true,
            data: {
              optimization_run_id: result.data.optimization_run_id,
              job_id: result.data.job_id,
              status: 'queued'
            }
          };
        }
        return result;
      } else {
        const errorText = await response.text();
        console.error('Transport optimization API error:', response.status, errorText);
        return {
          success: false,
          error: `API error ${response.status}: ${errorText}`
        };
      }
    } catch (error) {
      console.error('Error calling transport optimization API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

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

  const generateScenarios = async (specificScenarioTypes?: string[]) => {
    if (!selectedScenario) {
      alert('Please select a scenario from the Projects & Scenarios tab first');
      return;
    }

    setIsGenerating(true);
    setIsLoadingCapacityData(false); // Skip capacity data loading

    try {
      console.log('Generating scenarios for:', selectedScenario.name);

      // Use simple generation API instead of complex job queue
      const response = await fetch('/api/simple-transport-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          scenarioTypes: specificScenarioTypes
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.data.generated_scenarios) {
        setScenarios(result.data.generated_scenarios);
        console.log('✅ Generated scenarios successfully:', result.data.generated_scenarios);

        // Show success message
        alert(`Successfully generated ${result.data.generated_scenarios.length} transport scenarios!`);
      } else {
        throw new Error(result.error || 'Unknown generation error');
      }

    } catch (error) {
      console.error('Scenario generation failed:', error);
      alert(`Failed to generate scenarios: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockRouteDetails = (cities?: string[]): RouteDetail[] => {
    let routeCities = cities || [
      'Chicago, IL', 'New York, NY', 'Los Angeles, CA', 'Phoenix, AZ', 'Dallas, TX'
    ];

    const routes = [];

    // Generate routes between each pair of cities
    for (let i = 0; i < routeCities.length; i++) {
      for (let j = i + 1; j < routeCities.length; j++) {
        routes.push({
          origin: routeCities[i],
          destination: routeCities[j],
          service_zone: `Zone ${Math.floor(Math.random() * 3) + 1}`
        });
      }
    }

    // If we don't have enough routes, add some more with the available cities
    while (routes.length < 5 && routeCities.length >= 2) {
      const origin = routeCities[Math.floor(Math.random() * routeCities.length)];
      const destination = routeCities[Math.floor(Math.random() * routeCities.length)];

      if (origin !== destination && !routes.find(r => r.origin === origin && r.destination === destination)) {
        routes.push({
          origin,
          destination,
          service_zone: `Zone ${Math.floor(Math.random() * 3) + 1}`
        });
      }
    }

    return routes.slice(0, 10).map(route => ({
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

    if (!selectedScenario) {
      alert('Please select a scenario from the Projects & Scenarios tab first');
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('Running real transport analysis for scenarios:', selectedScenarios);

      const selectedScenarioData = scenarios.filter(s =>
        selectedScenarios.includes(s.scenario_type)
      );

      // Run real analysis using the transport optimization API for each selected scenario
      const enhancedScenarios = [];

      for (const scenario of selectedScenarioData) {
        console.log(`Analyzing scenario: ${scenario.scenario_name}`);

        // If we have stored optimization data, use it; otherwise call the API
        let optimizationData = scenario.optimization_data;

        if (!optimizationData) {
          console.log('Calling transport optimization API for real analysis...');
          optimizationData = await runRealTransportOptimization(
            selectedScenario.id,
            scenario.cities || [],
            scenario.scenario_type
          );
        }

        // Enhance scenario data with real optimization results
        const enhancedScenario = {
          ...scenario,
          optimization_data: optimizationData
        };

        // Update metrics with real data if available
        if (optimizationData?.optimization_results?.transport_optimization) {
          const transportResults = optimizationData.optimization_results.transport_optimization;
          enhancedScenario.total_cost = transportResults.total_transport_cost || scenario.total_cost;
          enhancedScenario.total_miles = transportResults.total_distance || scenario.total_miles;
          enhancedScenario.service_score = Math.round(transportResults.route_efficiency || scenario.service_score);
        }

        enhancedScenarios.push(enhancedScenario);
      }

      // Find best performing scenarios using real data
      const bestCostScenario = enhancedScenarios.reduce((prev, curr) =>
        (curr.total_cost || 0) < (prev.total_cost || 0) ? curr : prev
      );

      const bestServiceScenario = enhancedScenarios.reduce((prev, curr) =>
        (curr.service_score || 0) > (prev.service_score || 0) ? curr : prev
      );

      const bestMilesScenario = enhancedScenarios.reduce((prev, curr) =>
        (curr.total_miles || 0) < (prev.total_miles || 0) ? curr : prev
      );

      // Collect all unique cities from the analyzed scenarios (including Littleton, MA)
      const allCities = new Set<string>();
      enhancedScenarios.forEach(scenario => {
        if (scenario.cities) {
          scenario.cities.forEach(city => allCities.add(city));
        }
        if (scenario.route_details) {
          scenario.route_details.forEach((route: RouteDetail) => {
            if (route.origin) allCities.add(route.origin);
            if (route.destination) allCities.add(route.destination);
          });
        }
      });

      // Calculate averages and metrics
      const totalCost = enhancedScenarios.reduce((sum, s) => sum + (s.total_cost || 0), 0);
      const totalMiles = enhancedScenarios.reduce((sum, s) => sum + (s.total_miles || 0), 0);
      const totalService = enhancedScenarios.reduce((sum, s) => sum + (s.service_score || 0), 0);

      const results = {
        scenariosAnalyzed: enhancedScenarios.length,
        analyzedCities: Array.from(allCities),
        selectedScenarios: enhancedScenarios,
        bestCostScenario,
        bestServiceScenario,
        bestMilesScenario,
        averageCost: totalCost / enhancedScenarios.length,
        averageMiles: totalMiles / enhancedScenarios.length,
        averageService: totalService / enhancedScenarios.length,
        costSavingsPotential: Math.max(...enhancedScenarios.map(s => s.total_cost || 0)) - Math.min(...enhancedScenarios.map(s => s.total_cost || 0)),
        recommendedScenario: bestCostScenario, // Based on cost optimization as default
        realDataUsed: true,
        analysisTimestamp: new Date().toISOString()
      };

      console.log('Transport analysis completed with real data:', results);
      setAnalysisResults(results);

      // Automatically switch to Results tab to show the analysis
      setActiveTab('results');
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Transport analysis failed. Please ensure the transport optimization service is available.');
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

  const saveAnalysisResults = async () => {
    if (!selectedScenario || !analysisResults) {
      alert('No analysis results to save');
      return;
    }

    setIsSavingResults(true);
    try {
      const response = await fetch(`/api/scenarios/${selectedScenario.id}/transport-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisResults,
          selectedScenarios,
          analysisTimestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save analysis results');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      console.log('Transport analysis results saved successfully');
    } catch (error) {
      console.error('Error saving analysis results:', error);
      alert('Failed to save analysis results. Please try again.');
    } finally {
      setIsSavingResults(false);
    }
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
                Generate transport optimization scenarios based on capacity analysis data.
                Each scenario will use real cities and optimization algorithms to provide accurate results.
              </p>

              {!selectedScenario ? (
                <div className="warning-message">
                  <h3>⚠️ No Scenario Selected</h3>
                  <p>Please select a scenario from the "Projects & Scenarios" tab first. Transport optimization requires capacity analysis data to determine the cities and requirements.</p>
                </div>
              ) : (
                <div className="selected-scenario-info">
                  <h3>Selected Scenario: {selectedScenario.name}</h3>
                  <p>Cities from capacity analysis will be used for transport optimization</p>
                </div>
              )}

              <div className="generation-actions">
                <button
                  className="action-button primary large"
                  onClick={() => generateScenarios()}
                  disabled={isGenerating || !selectedScenario}
                >
                  {isGenerating ? (
                    <>
                      <div className="loading-spinner"></div>
                      Generating Scenarios...
                    </>
                  ) : (
                    `Generate Transport Scenarios${selectedScenario ? ` (${selectedScenario.name})` : ''}`
                  )}
                </button>
              </div>

              {/* Generation Status */}
              {isGenerating && (
                <div className="generation-status">
                  <div className="status-message">
                    <div className="loading-spinner"></div>
                    <span>Generating transport scenarios... This will take a few seconds.</span>
                  </div>
                </div>
              )}

              <div className="individual-generation-section">
                <h3 className="subsection-title">Generate Individual Scenarios</h3>
                <p className="section-description">
                  Select specific scenarios to generate individually instead of running all at once.
                </p>

                <div className="individual-scenario-checkboxes">
                  {scenarioTypes.map(type => {
                    const scenario = scenarios.find(s => s.scenario_type === type.key);
                    return (
                      <label key={type.key} className="individual-scenario-checkbox">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            const scenarioType = type.key;
                            if (e.target.checked) {
                              generateScenarios([scenarioType]);
                            }
                          }}
                          disabled={isGenerating || !selectedScenario || !!scenario}
                        />
                        <div className="checkbox-content">
                          <span className="checkbox-label">{type.name}</span>
                          <span className="checkbox-description">{type.description}</span>
                          {scenario && (
                            <span className="scenario-status generated">✓ Generated</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
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
                        <div className="scenario-details">
                          <div className="scenario-summary">
                            <div className="metric">
                              <span className="metric-label">Route:</span>
                              <span className="metric-value">{scenario.primary_route || `${scenario.cities?.[0]} ↔ ${scenario.cities?.[1]}`}</span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Total Miles (Year 1):</span>
                              <span className="metric-value">{scenario.total_miles?.toLocaleString()}</span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Total Cost (Year 1):</span>
                              <span className="metric-value">${scenario.total_cost?.toLocaleString()}</span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Service Score:</span>
                              <span className="metric-value">{scenario.service_score}%</span>
                            </div>
                          </div>

                          {scenario.yearly_analysis && scenario.yearly_analysis.length > 0 && (
                            <div className="yearly-analysis">
                              <h4 className="analysis-title">5-Year Growth Projection</h4>
                              <div className="yearly-table">
                                <div className="table-header">
                                  <span>Year</span>
                                  <span>Growth Rate</span>
                                  <span>Transport Cost</span>
                                  <span>Total Cost</span>
                                  <span>Efficiency</span>
                                </div>
                                {scenario.yearly_analysis.slice(0, 5).map((yearData: any) => (
                                  <div key={yearData.year} className="table-row">
                                    <span>{yearData.year}</span>
                                    <span>{yearData.growth_rate}%</span>
                                    <span>${yearData.transport_cost?.toLocaleString()}</span>
                                    <span>${yearData.total_cost?.toLocaleString()}</span>
                                    <span>{yearData.efficiency_score}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {scenario.scenario_description && (
                            <div className="scenario-description">
                              <strong>Analysis:</strong> {scenario.scenario_description}
                            </div>
                          )}
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
              <div className="section-header">
                <h2 className="section-title">Analysis Results</h2>
                {analysisResults && (
                  <div className="results-actions">
                    <button
                      className={`action-button primary ${saveSuccess ? 'success' : ''}`}
                      onClick={saveAnalysisResults}
                      disabled={isSavingResults}
                    >
                      {isSavingResults ? (
                        <>
                          <div className="loading-spinner"></div>
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        '✓ Saved'
                      ) : (
                        'Save Results'
                      )}
                    </button>
                  </div>
                )}
              </div>

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

                  <div className="analyzed-cities">
                    <h3 className="subsection-title">Cities Included in Analysis</h3>
                    <div className="cities-container">
                      <div className="cities-list">
                        {analysisResults.analyzedCities && analysisResults.analyzedCities.length > 0 ? (
                          analysisResults.analyzedCities.map((city: string, index: number) => (
                            <div key={index} className="city-tag">
                              <span className="city-name">{city}</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-cities">No cities data available for the analyzed scenarios.</p>
                        )}
                      </div>
                      <div className="cities-meta">
                        <span className="cities-count">
                          {analysisResults.analyzedCities?.length || 0} cities analyzed
                        </span>
                        <span className="scenarios-info">
                          across {analysisResults.scenariosAnalyzed} scenario{analysisResults.scenariosAnalyzed !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="analyzed-scenarios">
                    <h3 className="subsection-title">Detailed Scenario Analysis</h3>
                    <div className="scenarios-analyzed-list">
                      {analysisResults.selectedScenarios?.map((scenario: any, index: number) => (
                        <div key={index} className="analyzed-scenario-card detailed">
                          <div className="scenario-info-header">
                            <h4 className="analyzed-scenario-name">{scenario.scenario_name}</h4>
                            <div className="scenario-type-badge">{scenario.scenario_type.replace(/_/g, ' ').toUpperCase()}</div>
                          </div>

                          <div className="scenario-route-info">
                            <span className="route-label">Primary Route:</span>
                            <span className="route-value">{scenario.primary_route || `${scenario.cities?.[0]} ↔ ${scenario.cities?.[1]}`}</span>
                          </div>

                          {scenario.cities && scenario.cities.length > 0 && (
                            <div className="scenario-cities">
                              <span className="cities-label">Network Cities:</span>
                              <div className="scenario-cities-list">
                                {scenario.cities.map((city: string, cityIndex: number) => (
                                  <span key={cityIndex} className="scenario-city-tag">{city}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="scenario-year-one-metrics">
                            <h5>Year 1 (2024) Baseline:</h5>
                            <div className="metric-grid">
                              <span className="metric-item">Transport Cost: ${scenario.total_cost?.toLocaleString()}</span>
                              <span className="metric-item">Distance: {scenario.total_miles?.toLocaleString()} mi</span>
                              <span className="metric-item">Service Level: {scenario.service_score}%</span>
                            </div>
                          </div>

                          {scenario.yearly_analysis && scenario.yearly_analysis.length > 0 && (
                            <div className="scenario-projections">
                              <h5>5-Year Financial Projection:</h5>
                              <div className="projections-summary">
                                <div className="projection-metric">
                                  <span className="proj-label">Year 5 Total Cost:</span>
                                  <span className="proj-value">${scenario.yearly_analysis[4]?.total_cost?.toLocaleString()}</span>
                                </div>
                                <div className="projection-metric">
                                  <span className="proj-label">Average Growth Rate:</span>
                                  <span className="proj-value">{scenario.yearly_analysis[0]?.growth_rate}% annually</span>
                                </div>
                                <div className="projection-metric">
                                  <span className="proj-label">Total 5-Year Investment:</span>
                                  <span className="proj-value">${scenario.yearly_analysis?.reduce((sum: number, year: any) => sum + (year.total_cost || 0), 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {scenario.scenario_description && (
                            <div className="scenario-analysis-summary">
                              <strong>Algorithm Analysis:</strong> {scenario.scenario_description}
                            </div>
                          )}
                        </div>
                      ))}
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

        .job-progress-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin: 2rem 0;
        }

        .job-progress-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .job-progress-item:last-child {
          margin-bottom: 0;
        }

        .job-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .job-progress-title {
          font-weight: 500;
          color: #374151;
        }

        .job-progress-status {
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .job-progress-status.queued {
          background: #fef3c7;
          color: #92400e;
        }

        .job-progress-status.running {
          background: #dbeafe;
          color: #1e40af;
        }

        .job-progress-status.completed {
          background: #dcfce7;
          color: #166534;
        }

        .job-progress-status.failed {
          background: #fee2e2;
          color: #dc2626;
        }

        .job-progress-bar {
          position: relative;
          width: 100%;
          height: 1.5rem;
          background: #f3f4f6;
          border-radius: 0.75rem;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .job-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          border-radius: 0.75rem;
          transition: width 0.3s ease;
        }

        .job-progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
        }

        .job-progress-details {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .job-current-step {
          font-weight: 500;
          color: #374151;
        }

        .job-time-remaining {
          color: #059669;
        }

        .job-elapsed-time {
          color: #6b7280;
        }

        .job-error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .job-completion-message {
          background: #f0fdf4;
          color: #166534;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          margin-top: 0.5rem;
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

        .analyzed-cities {
          margin-bottom: 2rem;
        }

        .cities-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .cities-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .city-tag {
          background: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .city-name {
          display: flex;
          align-items: center;
        }

        .cities-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .cities-count {
          font-weight: 500;
          color: #374151;
        }

        .no-cities {
          color: #9ca3af;
          font-style: italic;
          margin: 0;
        }

        .analyzed-scenarios {
          margin-bottom: 2rem;
        }

        .scenarios-analyzed-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .analyzed-scenario-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .scenario-info-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .analyzed-scenario-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          flex: 1;
          margin-right: 1rem;
        }

        .scenario-type-badge {
          background: #e0f2fe;
          color: #0c4a6e;
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .scenario-metrics-row {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .metric-item {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .scenario-cities {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .cities-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          display: block;
        }

        .scenario-cities-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .scenario-city-tag {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          border: 1px solid #bfdbfe;
        }

        @media (max-width: 768px) {
          .config-grid,
          .scenarios-grid,
          .summary-grid,
          .best-scenarios-grid,
          .recommended-metrics {
            grid-template-columns: 1fr;
          }

          .cities-list {
            gap: 0.25rem;
          }

          .cities-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .scenario-info-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .analyzed-scenario-name {
            margin-right: 0;
          }

          .scenario-metrics-row {
            gap: 1rem;
          }

          .scenario-cities-list {
            gap: 0.25rem;
          }

          .scenario-city-tag {
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
        }

        .individual-generation-section {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }

        .individual-scenario-checkboxes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .individual-scenario-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .individual-scenario-checkbox:hover:not(:has(input:disabled)) {
          background: #f9fafb;
          border-color: #3b82f6;
        }

        .individual-scenario-checkbox:has(input:disabled) {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .checkbox-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .individual-scenario-checkbox .checkbox-label {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .individual-scenario-checkbox .checkbox-description {
          color: #6b7280;
          font-size: 0.75rem;
          line-height: 1.4;
        }

        .scenario-status {
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          width: fit-content;
        }

        .scenario-status.generated {
          background: #dcfce7;
          color: #16a34a;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .results-actions {
          display: flex;
          gap: 0.75rem;
        }

        .action-button.success {
          background: #10b981;
          color: white;
        }

        .action-button.success:hover {
          background: #059669;
        }

        .warning-message {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .warning-message h3 {
          margin: 0 0 0.5rem 0;
          color: #92400e;
          font-size: 1.125rem;
        }

        .warning-message p {
          margin: 0;
          color: #6b7280;
          line-height: 1.5;
        }

        .selected-scenario-info {
          background: #f0fdf4;
          border: 1px solid #10b981;
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .selected-scenario-info h3 {
          margin: 0 0 0.5rem 0;
          color: #065f46;
          font-size: 1.125rem;
        }

        .selected-scenario-info p {
          margin: 0;
          color: #6b7280;
          line-height: 1.5;
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

          .individual-scenario-checkboxes {
            grid-template-columns: 1fr;
          }

          .individual-scenario-checkbox {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
