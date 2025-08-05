'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ProjectScenarioManager from '@/components/ProjectScenarioManager';

interface GrowthForecast {
  year_number: number;
  forecast_type: 'actual' | 'forecast' | 'linear';
  units_growth_rate?: number;
  dollar_growth_rate?: number;
  absolute_units?: number;
  absolute_dollars?: number;
  is_actual_data: boolean;
  confidence_level?: number;
  notes?: string;
}

interface Facility {
  id?: number;
  name: string;
  city: string;
  state: string;
  zip_code: string;
  square_feet: number;
  capacity_units: number;
  is_forced: boolean;
  force_start_year?: number;
  force_end_year?: number;
  allow_expansion: boolean;
  lease_rate_per_sqft?: number;
  operating_cost_per_sqft?: number;
}

interface ProjectConfiguration {
  default_lease_term_years: number;
  default_utilization_rate: number;
  project_duration_years: number;
  base_year: number;
}

export default function CapacityOptimizer() {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);

  const [projectConfig, setProjectConfig] = useState<ProjectConfiguration>({
    default_lease_term_years: 7,
    default_utilization_rate: 80,
    project_duration_years: 5,
    base_year: new Date().getFullYear()
  });

  const [growthForecasts, setGrowthForecasts] = useState<GrowthForecast[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'config' | 'growth' | 'facilities' | 'analysis'>('projects');

  // Initialize default growth forecasts
  useEffect(() => {
    const defaultForecasts = Array.from({ length: projectConfig.project_duration_years }, (_, i) => ({
      year_number: i + 1,
      forecast_type: 'forecast' as const,
      units_growth_rate: 0,
      dollar_growth_rate: 0,
      is_actual_data: false,
      confidence_level: 50
    }));
    setGrowthForecasts(defaultForecasts);
  }, [projectConfig.project_duration_years]);

  const updateGrowthForecast = (index: number, field: keyof GrowthForecast, value: any) => {
    const updatedForecasts = [...growthForecasts];
    updatedForecasts[index] = { ...updatedForecasts[index], [field]: value };
    setGrowthForecasts(updatedForecasts);
  };

  const addFacility = () => {
    const newFacility: Facility = {
      name: '',
      city: '',
      state: '',
      zip_code: '',
      square_feet: 0,
      capacity_units: 0,
      is_forced: false,
      allow_expansion: true
    };
    setFacilities([...facilities, newFacility]);
  };

  const updateFacility = (index: number, field: keyof Facility, value: any) => {
    const updatedFacilities = [...facilities];
    updatedFacilities[index] = { ...updatedFacilities[index], [field]: value };
    setFacilities(updatedFacilities);
  };

  const removeFacility = (index: number) => {
    setFacilities(facilities.filter((_, i) => i !== index));
  };

  const runCapacityAnalysis = async () => {
    // TODO: Implement API call to run capacity analysis
    console.log('Running capacity analysis with:', {
      projectConfig,
      growthForecasts,
      facilities
    });
  };

  return (
    <div className="main-container">
      <Navigation />
      <div className="content-area">
        <div className="capacity-optimizer-container">
          <h1 className="page-title">Capacity Optimizer</h1>
          <p className="page-description">
            Configure capacity constraints, growth forecasts, and facility parameters to determine 
            optimal warehouse capacity requirements over the project timeline.
          </p>

          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              Projects & Scenarios
            </button>
            <button
              className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              Project Configuration
            </button>
            <button
              className={`tab-button ${activeTab === 'growth' ? 'active' : ''}`}
              onClick={() => setActiveTab('growth')}
            >
              Growth Forecasts
            </button>
            <button
              className={`tab-button ${activeTab === 'facilities' ? 'active' : ''}`}
              onClick={() => setActiveTab('facilities')}
            >
              Facility Constraints
            </button>
            <button
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              Capacity Analysis
            </button>
          </div>

          {activeTab === 'projects' && (
            <div className="tab-content">
              <ProjectScenarioManager
                onSelectProject={setSelectedProject}
                onSelectScenario={setSelectedScenario}
                selectedProject={selectedProject}
                selectedScenario={selectedScenario}
                optimizationType="capacity"
              />
            </div>
          )}

          {activeTab === 'config' && (
            <div className="tab-content">
              <h2 className="section-title">Project Configuration</h2>
              <div className="config-grid">
                <div className="config-field">
                  <label className="field-label">Project Duration (Years)</label>
                  <input
                    type="number"
                    className="field-input"
                    value={projectConfig.project_duration_years}
                    onChange={(e) => setProjectConfig({
                      ...projectConfig,
                      project_duration_years: parseInt(e.target.value) || 5
                    })}
                    min="1"
                    max="20"
                  />
                </div>

                <div className="config-field">
                  <label className="field-label">Base Year</label>
                  <input
                    type="number"
                    className="field-input"
                    value={projectConfig.base_year}
                    onChange={(e) => setProjectConfig({
                      ...projectConfig,
                      base_year: parseInt(e.target.value) || new Date().getFullYear()
                    })}
                    min="2020"
                    max="2040"
                  />
                </div>

                <div className="config-field">
                  <label className="field-label">Default Lease Term (Years)</label>
                  <input
                    type="number"
                    className="field-input"
                    value={projectConfig.default_lease_term_years}
                    onChange={(e) => setProjectConfig({
                      ...projectConfig,
                      default_lease_term_years: parseInt(e.target.value) || 7
                    })}
                    min="1"
                    max="20"
                  />
                </div>

                <div className="config-field">
                  <label className="field-label">Default Utilization Rate (%)</label>
                  <input
                    type="number"
                    className="field-input"
                    value={projectConfig.default_utilization_rate}
                    onChange={(e) => setProjectConfig({
                      ...projectConfig,
                      default_utilization_rate: parseFloat(e.target.value) || 80
                    })}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="tab-content">
              <h2 className="section-title">Annual Growth Forecasts</h2>
              <p className="section-description">
                Configure expected growth rates for each year. You can mix actual data, forecasts, 
                and linear projections.
              </p>

              <div className="growth-forecasts-table">
                <div className="table-header">
                  <div className="table-cell">Year</div>
                  <div className="table-cell">Type</div>
                  <div className="table-cell">Units Growth %</div>
                  <div className="table-cell">Dollar Growth %</div>
                  <div className="table-cell">Absolute Units</div>
                  <div className="table-cell">Absolute Dollars</div>
                  <div className="table-cell">Confidence %</div>
                  <div className="table-cell">Notes</div>
                </div>

                {growthForecasts.map((forecast, index) => (
                  <div key={index} className="table-row">
                    <div className="table-cell">
                      {projectConfig.base_year + forecast.year_number - 1}
                    </div>
                    <div className="table-cell">
                      <select
                        className="field-select"
                        value={forecast.forecast_type}
                        onChange={(e) => updateGrowthForecast(index, 'forecast_type', e.target.value)}
                      >
                        <option value="actual">Actual</option>
                        <option value="forecast">Forecast</option>
                        <option value="linear">Linear</option>
                      </select>
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        className="field-input small"
                        value={forecast.units_growth_rate || ''}
                        onChange={(e) => updateGrowthForecast(index, 'units_growth_rate', parseFloat(e.target.value))}
                        step="0.1"
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        className="field-input small"
                        value={forecast.dollar_growth_rate || ''}
                        onChange={(e) => updateGrowthForecast(index, 'dollar_growth_rate', parseFloat(e.target.value))}
                        step="0.1"
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        className="field-input small"
                        value={forecast.absolute_units || ''}
                        onChange={(e) => updateGrowthForecast(index, 'absolute_units', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        className="field-input small"
                        value={forecast.absolute_dollars || ''}
                        onChange={(e) => updateGrowthForecast(index, 'absolute_dollars', parseFloat(e.target.value))}
                        step="0.01"
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        className="field-input small"
                        value={forecast.confidence_level || ''}
                        onChange={(e) => updateGrowthForecast(index, 'confidence_level', parseFloat(e.target.value))}
                        min="0"
                        max="100"
                        step="1"
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="text"
                        className="field-input"
                        value={forecast.notes || ''}
                        onChange={(e) => updateGrowthForecast(index, 'notes', e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'facilities' && (
            <div className="tab-content">
              <h2 className="section-title">Facility Constraints</h2>
              <p className="section-description">
                Define existing facilities, forced/fixed requirements, and expansion parameters.
              </p>

              <button className="action-button primary" onClick={addFacility}>
                Add Facility
              </button>

              <div className="facilities-list">
                {facilities.map((facility, index) => (
                  <div key={index} className="facility-card">
                    <div className="facility-header">
                      <h3 className="facility-name">Facility {index + 1}</h3>
                      <button 
                        className="action-button danger"
                        onClick={() => removeFacility(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="facility-grid">
                      <div className="facility-field">
                        <label className="field-label">Facility Name</label>
                        <input
                          type="text"
                          className="field-input"
                          value={facility.name}
                          onChange={(e) => updateFacility(index, 'name', e.target.value)}
                          placeholder="Enter facility name"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label">City</label>
                        <input
                          type="text"
                          className="field-input"
                          value={facility.city}
                          onChange={(e) => updateFacility(index, 'city', e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label">State</label>
                        <input
                          type="text"
                          className="field-input"
                          value={facility.state}
                          onChange={(e) => updateFacility(index, 'state', e.target.value)}
                          placeholder="Enter state"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label">ZIP Code</label>
                        <input
                          type="text"
                          className="field-input"
                          value={facility.zip_code}
                          onChange={(e) => updateFacility(index, 'zip_code', e.target.value)}
                          placeholder="Enter ZIP code"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label">Square Feet</label>
                        <input
                          type="number"
                          className="field-input"
                          value={facility.square_feet}
                          onChange={(e) => updateFacility(index, 'square_feet', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label">Capacity Units</label>
                        <input
                          type="number"
                          className="field-input"
                          value={facility.capacity_units}
                          onChange={(e) => updateFacility(index, 'capacity_units', parseInt(e.target.value) || 0)}
                          min="0"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label checkbox-label">
                          <input
                            type="checkbox"
                            className="field-checkbox"
                            checked={facility.is_forced}
                            onChange={(e) => updateFacility(index, 'is_forced', e.target.checked)}
                          />
                          Forced/Fixed Facility
                        </label>
                      </div>

                      {facility.is_forced && (
                        <>
                          <div className="facility-field">
                            <label className="field-label">Force Start Year</label>
                            <input
                              type="number"
                              className="field-input"
                              value={facility.force_start_year || ''}
                              onChange={(e) => updateFacility(index, 'force_start_year', parseInt(e.target.value))}
                              min={projectConfig.base_year}
                            />
                          </div>

                          <div className="facility-field">
                            <label className="field-label">Force End Year (Optional)</label>
                            <input
                              type="number"
                              className="field-input"
                              value={facility.force_end_year || ''}
                              onChange={(e) => updateFacility(index, 'force_end_year', parseInt(e.target.value))}
                              min={projectConfig.base_year}
                            />
                          </div>
                        </>
                      )}

                      <div className="facility-field">
                        <label className="field-label checkbox-label">
                          <input
                            type="checkbox"
                            className="field-checkbox"
                            checked={facility.allow_expansion}
                            onChange={(e) => updateFacility(index, 'allow_expansion', e.target.checked)}
                          />
                          Allow Expansion
                        </label>
                      </div>

                      <div className="facility-field">
                        <label className="field-label">Lease Rate per Sq Ft (Optional)</label>
                        <input
                          type="number"
                          className="field-input"
                          value={facility.lease_rate_per_sqft || ''}
                          onChange={(e) => updateFacility(index, 'lease_rate_per_sqft', parseFloat(e.target.value))}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="facility-field">
                        <label className="field-label">Operating Cost per Sq Ft (Optional)</label>
                        <input
                          type="number"
                          className="field-input"
                          value={facility.operating_cost_per_sqft || ''}
                          onChange={(e) => updateFacility(index, 'operating_cost_per_sqft', parseFloat(e.target.value))}
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="tab-content">
              <h2 className="section-title">Capacity Analysis</h2>
              <p className="section-description">
                Run capacity analysis to determine optimal facility requirements based on
                growth forecasts and constraints.
              </p>

              {selectedProject && selectedScenario ? (
                <>
                  <div className="selected-context">
                    <div className="context-card">
                      <h3>Selected Context</h3>
                      <p><strong>Project:</strong> {selectedProject.name}</p>
                      <p><strong>Scenario:</strong> {selectedScenario.name}</p>
                      <p><strong>Duration:</strong> {selectedProject.project_duration_years} years</p>
                    </div>
                  </div>

                  <div className="analysis-actions">
                    <button
                      className="action-button primary large"
                      onClick={runCapacityAnalysis}
                    >
                      Run Capacity Analysis
                    </button>
                  </div>

                  <div className="analysis-results">
                    <p className="placeholder-text">
                      Analysis results will appear here after running the capacity analysis.
                    </p>
                  </div>
                </>
              ) : (
                <div className="no-selection">
                  <p>Please select a project and scenario from the "Projects & Scenarios" tab to run capacity analysis.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .capacity-optimizer-container {
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

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .field-input.small {
          max-width: 120px;
        }

        .field-select {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
        }

        .field-checkbox {
          width: 1rem;
          height: 1rem;
        }

        .growth-forecasts-table {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .table-header {
          display: grid;
          grid-template-columns: 80px 100px 120px 120px 120px 130px 100px 1fr;
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .table-row {
          display: grid;
          grid-template-columns: 80px 100px 120px 120px 120px 130px 100px 1fr;
          border-top: 1px solid #e5e7eb;
        }

        .table-cell {
          padding: 0.75rem;
          display: flex;
          align-items: center;
          min-height: 50px;
        }

        .action-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button.primary {
          background: #3b82f6;
          color: white;
        }

        .action-button.primary:hover {
          background: #2563eb;
        }

        .action-button.danger {
          background: #ef4444;
          color: white;
        }

        .action-button.danger:hover {
          background: #dc2626;
        }

        .action-button.large {
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }

        .facilities-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .facility-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.5rem;
          background: #f9fafb;
        }

        .facility-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .facility-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .facility-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .facility-field {
          display: flex;
          flex-direction: column;
        }

        .analysis-actions {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .analysis-results {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 2rem;
          text-align: center;
        }

        .placeholder-text {
          color: #6b7280;
          font-style: italic;
        }

        .selected-context {
          margin-bottom: 2rem;
        }

        .context-card {
          background: #f0f9ff;
          border: 1px solid #3b82f6;
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .context-card h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .context-card p {
          margin: 0.5rem 0;
          color: #374151;
        }

        .no-selection {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .table-header,
          .table-row {
            grid-template-columns: 1fr;
          }

          .table-cell {
            border-bottom: 1px solid #e5e7eb;
          }

          .config-grid,
          .facility-grid {
            grid-template-columns: 1fr;
          }

          .tab-navigation {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
