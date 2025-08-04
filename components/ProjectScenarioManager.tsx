'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Play, Copy, Trash2, Edit, FolderOpen, Settings, BarChart3, 
  Folder, ChevronDown, ChevronRight, Calendar, MapPin, Users, 
  Target, Activity, Building
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'completed';
  owner_id?: string;
  project_duration_years: number;
  base_year: number;
}

interface Scenario {
  id: number;
  project_id: number;
  name: string;
  scenario_number: number;
  number_of_nodes?: number;
  cities?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_progress' | 'completed' | 'failed';
  capacity_analysis_completed: boolean;
  transport_optimization_completed: boolean;
  warehouse_optimization_completed: boolean;
}

interface ProjectScenarioManagerProps {
  onSelectProject: (project: Project) => void;
  onSelectScenario: (scenario: Scenario) => void;
  selectedProject?: Project | null;
  selectedScenario?: Scenario | null;
  optimizationType?: 'capacity' | 'transport' | 'warehouse' | 'all';
}

export default function ProjectScenarioManager({ 
  onSelectProject, 
  onSelectScenario, 
  selectedProject, 
  selectedScenario, 
  optimizationType = 'all' 
}: ProjectScenarioManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scenarios, setScenarios] = useState<{ [key: number]: Scenario[] }>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<number | null>(null);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    project_duration_years: 5,
    base_year: new Date().getFullYear()
  });

  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    number_of_nodes: 3,
    cities: [''] as string[]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // Mock data for now - in production, this would be API calls
      const mockProjects: Project[] = [
        {
          id: 1,
          name: 'NetWORX Optimization 2024',
          description: 'Comprehensive network optimization project for improved efficiency and cost reduction',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-20T00:00:00Z',
          status: 'active',
          owner_id: 'user_001',
          project_duration_years: 5,
          base_year: 2024
        },
        {
          id: 2,
          name: 'East Coast Expansion Strategy',
          description: 'Strategic expansion analysis for east coast operations',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-10T00:00:00Z',
          status: 'active',
          owner_id: 'user_001',
          project_duration_years: 3,
          base_year: 2024
        }
      ];

      const mockScenarios: { [key: number]: Scenario[] } = {
        1: [
          {
            id: 1,
            project_id: 1,
            name: 'NetWORX Optimization 2024 - Scenario 1 - 3 Nodes - Chicago, Atlanta, Phoenix',
            scenario_number: 1,
            number_of_nodes: 3,
            cities: ['Chicago, IL', 'Atlanta, GA', 'Phoenix, AZ'],
            description: 'Baseline scenario with current hub configuration',
            created_at: '2024-01-16T00:00:00Z',
            updated_at: '2024-01-20T00:00:00Z',
            status: 'completed',
            capacity_analysis_completed: true,
            transport_optimization_completed: true,
            warehouse_optimization_completed: true
          },
          {
            id: 2,
            project_id: 1,
            name: 'NetWORX Optimization 2024 - Scenario 2 - 4 Nodes - Chicago, Atlanta, Phoenix, Dallas',
            scenario_number: 2,
            number_of_nodes: 4,
            cities: ['Chicago, IL', 'Atlanta, GA', 'Phoenix, AZ', 'Dallas, TX'],
            description: 'Expanded network with additional Dallas hub',
            created_at: '2024-01-18T00:00:00Z',
            updated_at: '2024-01-22T00:00:00Z',
            status: 'in_progress',
            capacity_analysis_completed: true,
            transport_optimization_completed: true,
            warehouse_optimization_completed: false
          },
          {
            id: 3,
            project_id: 1,
            name: 'NetWORX Optimization 2024 - Scenario 3 - 2 Nodes - Chicago, Atlanta',
            scenario_number: 3,
            number_of_nodes: 2,
            cities: ['Chicago, IL', 'Atlanta, GA'],
            description: 'Consolidated network focusing on core markets',
            created_at: '2024-01-20T00:00:00Z',
            updated_at: '2024-01-25T00:00:00Z',
            status: 'draft',
            capacity_analysis_completed: false,
            transport_optimization_completed: false,
            warehouse_optimization_completed: false
          }
        ],
        2: [
          {
            id: 4,
            project_id: 2,
            name: 'East Coast Expansion Strategy - Scenario 1 - 3 Nodes - New York, Boston, Miami',
            scenario_number: 1,
            number_of_nodes: 3,
            cities: ['New York, NY', 'Boston, MA', 'Miami, FL'],
            description: 'Primary east coast expansion scenario',
            created_at: '2024-02-02T00:00:00Z',
            updated_at: '2024-02-08T00:00:00Z',
            status: 'completed',
            capacity_analysis_completed: true,
            transport_optimization_completed: true,
            warehouse_optimization_completed: true
          }
        ]
      };

      setProjects(mockProjects);
      setScenarios(mockScenarios);
      
      // Auto-expand first project and select first scenario if none selected
      if (mockProjects.length > 0) {
        setExpandedProjects(new Set([mockProjects[0].id]));
        if (!selectedProject) {
          onSelectProject(mockProjects[0]);
        }
        if (!selectedScenario && mockScenarios[mockProjects[0].id]?.length > 0) {
          onSelectScenario(mockScenarios[mockProjects[0].id][0]);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateScenarioName = (projectName: string, scenarioNumber: number, nodes: number, cities: string[]) => {
    const validCities = cities.filter(city => city.trim() !== '');
    const cityNames = validCities.length > 0 ? validCities.join(', ') : 'TBD';
    return `${projectName} - Scenario ${scenarioNumber} - ${nodes} Nodes - ${cityNames}`;
  };

  const createProject = async () => {
    try {
      // Mock creation - in production, this would be an API call
      const newProjectData: Project = {
        id: Math.max(...projects.map(p => p.id), 0) + 1,
        ...newProject,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        owner_id: 'current_user'
      };

      setProjects([newProjectData, ...projects]);
      setScenarios({ ...scenarios, [newProjectData.id]: [] });
      setShowCreateProjectModal(false);
      setNewProject({
        name: '',
        description: '',
        project_duration_years: 5,
        base_year: new Date().getFullYear()
      });
      onSelectProject(newProjectData);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const createScenario = async () => {
    if (!targetProjectId) return;

    try {
      const project = projects.find(p => p.id === targetProjectId);
      if (!project) return;

      const existingScenarios = scenarios[targetProjectId] || [];
      const nextScenarioNumber = Math.max(...existingScenarios.map(s => s.scenario_number), 0) + 1;

      const newScenarioData: Scenario = {
        id: Math.max(...Object.values(scenarios).flat().map(s => s.id), 0) + 1,
        project_id: targetProjectId,
        name: generateScenarioName(project.name, nextScenarioNumber, newScenario.number_of_nodes, newScenario.cities),
        scenario_number: nextScenarioNumber,
        number_of_nodes: newScenario.number_of_nodes,
        cities: newScenario.cities.filter(city => city.trim() !== ''),
        description: newScenario.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'draft',
        capacity_analysis_completed: false,
        transport_optimization_completed: false,
        warehouse_optimization_completed: false
      };

      setScenarios({
        ...scenarios,
        [targetProjectId]: [newScenarioData, ...existingScenarios]
      });

      setShowCreateScenarioModal(false);
      setNewScenario({
        name: '',
        description: '',
        number_of_nodes: 3,
        cities: ['']
      });
      setTargetProjectId(null);
      onSelectScenario(newScenarioData);
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  const toggleProjectExpansion = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const addCityField = () => {
    setNewScenario({
      ...newScenario,
      cities: [...newScenario.cities, '']
    });
  };

  const updateCity = (index: number, value: string) => {
    const updatedCities = [...newScenario.cities];
    updatedCities[index] = value;
    setNewScenario({
      ...newScenario,
      cities: updatedCities
    });
  };

  const removeCity = (index: number) => {
    if (newScenario.cities.length > 1) {
      const updatedCities = newScenario.cities.filter((_, i) => i !== index);
      setNewScenario({
        ...newScenario,
        cities: updatedCities
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'active': return '#10b981';
      case 'archived': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '⟳';
      case 'failed': return '✗';
      case 'active': return '●';
      case 'archived': return '◐';
      default: return '○';
    }
  };

  const getOptimizationProgress = (scenario: Scenario) => {
    const steps = [
      scenario.capacity_analysis_completed,
      scenario.transport_optimization_completed,
      scenario.warehouse_optimization_completed
    ];
    const completedSteps = steps.filter(Boolean).length;
    return { completed: completedSteps, total: 3, percentage: (completedSteps / 3) * 100 };
  };

  if (loading) {
    return (
      <div className="project-scenario-manager">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading projects and scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-scenario-manager">
      <div className="manager-header">
        <div className="header-content">
          <h3>Project & Scenario Management</h3>
          <p>Manage optimization projects and their scenarios</p>
        </div>
        <div className="header-actions">
          <button
            className="action-button secondary"
            onClick={() => setShowCreateProjectModal(true)}
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} />
          <p>No projects found. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="projects-list">
          {projects.map((project) => (
            <div key={project.id} className="project-item">
              <div 
                className={`project-header ${selectedProject?.id === project.id ? 'selected' : ''}`}
                onClick={() => {
                  onSelectProject(project);
                  toggleProjectExpansion(project.id);
                }}
              >
                <div className="project-info">
                  <div className="project-title-row">
                    <button className="expand-button">
                      {expandedProjects.has(project.id) ? 
                        <ChevronDown size={16} /> : 
                        <ChevronRight size={16} />
                      }
                    </button>
                    <Folder size={16} className="project-icon" />
                    <h4 className="project-name">{project.name}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(project.status) }}
                    >
                      {getStatusIcon(project.status)} {project.status.toUpperCase()}
                    </span>
                  </div>
                  {project.description && (
                    <p className="project-description">{project.description}</p>
                  )}
                  <div className="project-meta">
                    <span><Calendar size={12} /> {project.project_duration_years} years</span>
                    <span><Target size={12} /> Base: {project.base_year}</span>
                    <span><Activity size={12} /> {scenarios[project.id]?.length || 0} scenarios</span>
                  </div>
                </div>
                <div className="project-actions">
                  <button
                    className="action-button small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetProjectId(project.id);
                      setShowCreateScenarioModal(true);
                    }}
                    title="Add Scenario"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {expandedProjects.has(project.id) && (
                <div className="scenarios-list">
                  {scenarios[project.id]?.length === 0 ? (
                    <div className="empty-scenarios">
                      <p>No scenarios in this project.</p>
                      <button
                        className="action-button primary small"
                        onClick={() => {
                          setTargetProjectId(project.id);
                          setShowCreateScenarioModal(true);
                        }}
                      >
                        Create First Scenario
                      </button>
                    </div>
                  ) : (
                    scenarios[project.id]?.map((scenario) => {
                      const progress = getOptimizationProgress(scenario);
                      return (
                        <div
                          key={scenario.id}
                          className={`scenario-item ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
                          onClick={() => onSelectScenario(scenario)}
                        >
                          <div className="scenario-header">
                            <div className="scenario-info">
                              <h5 className="scenario-name">{scenario.name}</h5>
                              {scenario.description && (
                                <p className="scenario-description">{scenario.description}</p>
                              )}
                              <div className="scenario-meta">
                                <span><Building size={12} /> {scenario.number_of_nodes} nodes</span>
                                <span><MapPin size={12} /> {scenario.cities?.length || 0} cities</span>
                                <span 
                                  className="status-badge small"
                                  style={{ backgroundColor: getStatusColor(scenario.status) }}
                                >
                                  {getStatusIcon(scenario.status)} {scenario.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="scenario-progress">
                              <div className="progress-info">
                                <span className="progress-text">
                                  {progress.completed}/{progress.total} steps
                                </span>
                                <span className="progress-percentage">
                                  {progress.percentage.toFixed(0)}%
                                </span>
                              </div>
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill"
                                  style={{ width: `${progress.percentage}%` }}
                                ></div>
                              </div>
                              <div className="optimization-steps">
                                <div className={`step ${scenario.capacity_analysis_completed ? 'completed' : ''}`} title="Capacity Analysis">
                                  C
                                </div>
                                <div className={`step ${scenario.transport_optimization_completed ? 'completed' : ''}`} title="Transport Optimization">
                                  T
                                </div>
                                <div className={`step ${scenario.warehouse_optimization_completed ? 'completed' : ''}`} title="Warehouse Optimization">
                                  W
                                </div>
                              </div>
                            </div>
                          </div>

                          {selectedScenario?.id === scenario.id && (
                            <div className="scenario-actions">
                              <button className="action-button secondary small">
                                <Settings size={12} />
                                Configure
                              </button>
                              <button className="action-button secondary small">
                                <Play size={12} />
                                Optimize
                              </button>
                              <button className="action-button secondary small">
                                <BarChart3 size={12} />
                                Results
                              </button>
                              <button className="action-button secondary small">
                                <Copy size={12} />
                                Duplicate
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="modal-overlay" onClick={() => setShowCreateProjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Project</h3>
            
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="form-input"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-input"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Describe this project"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project Duration (Years)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newProject.project_duration_years}
                  onChange={(e) => setNewProject({ ...newProject, project_duration_years: parseInt(e.target.value) || 5 })}
                  min="1"
                  max="20"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Base Year</label>
                <input
                  type="number"
                  className="form-input"
                  value={newProject.base_year}
                  onChange={(e) => setNewProject({ ...newProject, base_year: parseInt(e.target.value) || new Date().getFullYear() })}
                  min="2020"
                  max="2040"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={() => setShowCreateProjectModal(false)}
              >
                Cancel
              </button>
              <button
                className="action-button primary"
                onClick={createProject}
                disabled={!newProject.name.trim()}
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Scenario Modal */}
      {showCreateScenarioModal && (
        <div className="modal-overlay" onClick={() => setShowCreateScenarioModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Scenario</h3>
            <p className="modal-subtitle">
              Project: {projects.find(p => p.id === targetProjectId)?.name}
            </p>
            
            <div className="form-group">
              <label className="form-label">Number of Nodes</label>
              <input
                type="number"
                className="form-input"
                value={newScenario.number_of_nodes}
                onChange={(e) => setNewScenario({ ...newScenario, number_of_nodes: parseInt(e.target.value) || 3 })}
                min="1"
                max="10"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cities</label>
              {newScenario.cities.map((city, index) => (
                <div key={index} className="city-input-row">
                  <input
                    type="text"
                    className="form-input"
                    value={city}
                    onChange={(e) => updateCity(index, e.target.value)}
                    placeholder={`City ${index + 1} (e.g., Chicago, IL)`}
                  />
                  {newScenario.cities.length > 1 && (
                    <button
                      type="button"
                      className="action-button danger small"
                      onClick={() => removeCity(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="action-button secondary small"
                onClick={addCityField}
              >
                <Plus size={14} />
                Add City
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-input"
                value={newScenario.description}
                onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                placeholder="Describe this scenario"
                rows={3}
              />
            </div>

            <div className="scenario-name-preview">
              <label className="form-label">Generated Scenario Name:</label>
              <div className="preview-name">
                {targetProjectId && generateScenarioName(
                  projects.find(p => p.id === targetProjectId)?.name || '',
                  (scenarios[targetProjectId]?.length || 0) + 1,
                  newScenario.number_of_nodes,
                  newScenario.cities
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-button secondary"
                onClick={() => setShowCreateScenarioModal(false)}
              >
                Cancel
              </button>
              <button
                className="action-button primary"
                onClick={createScenario}
                disabled={newScenario.cities.every(city => city.trim() === '')}
              >
                Create Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .project-scenario-manager {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .header-content h3 {
          margin: 0;
          color: #1f2937;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .header-content p {
          margin: 0.25rem 0 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .empty-state svg {
          margin: 0 auto 1rem;
          opacity: 0.5;
        }

        .projects-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .project-item {
          border-bottom: 1px solid #e5e7eb;
        }

        .project-item:last-child {
          border-bottom: none;
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem 1.5rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .project-header:hover {
          background: #f9fafb;
        }

        .project-header.selected {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
        }

        .project-info {
          flex: 1;
        }

        .project-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .expand-button {
          background: none;
          border: none;
          padding: 0.25rem;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: color 0.2s;
        }

        .expand-button:hover {
          color: #374151;
          background: #f3f4f6;
        }

        .project-icon {
          color: #3b82f6;
        }

        .project-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-left: auto;
        }

        .status-badge.small {
          padding: 0.125rem 0.5rem;
          font-size: 0.625rem;
        }

        .project-description {
          margin: 0.5rem 0;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .project-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .project-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .project-actions {
          display: flex;
          gap: 0.5rem;
          margin-left: 1rem;
        }

        .action-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .action-button.primary {
          background: #3b82f6;
          color: white;
        }

        .action-button.primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .action-button.secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .action-button.secondary:hover {
          background: #e5e7eb;
        }

        .action-button.danger {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .action-button.danger:hover {
          background: #fee2e2;
        }

        .action-button.small {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .scenarios-list {
          padding-left: 2rem;
          background: #fafbfc;
        }

        .empty-scenarios {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .scenario-item {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .scenario-item:hover {
          background: #f9fafb;
        }

        .scenario-item.selected {
          background: #f0f9ff;
          border-left: 3px solid #3b82f6;
        }

        .scenario-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .scenario-info {
          flex: 1;
        }

        .scenario-name {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.3;
        }

        .scenario-description {
          margin: 0 0 0.5rem 0;
          color: #6b7280;
          font-size: 0.75rem;
          line-height: 1.3;
        }

        .scenario-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.65rem;
          color: #9ca3af;
          align-items: center;
        }

        .scenario-meta span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .scenario-progress {
          min-width: 120px;
          text-align: right;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .optimization-steps {
          display: flex;
          gap: 0.25rem;
          justify-content: flex-end;
        }

        .step {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 0.25rem;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 600;
          color: #6b7280;
        }

        .step.completed {
          background: #10b981;
          color: white;
        }

        .scenario-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 0.5rem;
          width: 100%;
          max-width: 500px;
          margin: 1rem;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-subtitle {
          margin: -0.5rem 0 1rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .city-input-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .city-input-row .form-input {
          flex: 1;
        }

        .scenario-name-preview {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .preview-name {
          font-weight: 500;
          color: #1f2937;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .modal-actions .action-button {
          flex: 1;
        }

        @media (max-width: 768px) {
          .manager-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .project-header {
            padding: 1rem;
          }

          .project-title-row {
            flex-wrap: wrap;
          }

          .project-meta {
            flex-direction: column;
            gap: 0.5rem;
          }

          .scenario-header {
            flex-direction: column;
            gap: 0.75rem;
          }

          .scenario-progress {
            min-width: auto;
            text-align: left;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .scenario-actions {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
