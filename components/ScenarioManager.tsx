"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Copy, Trash2, Edit, FolderOpen, Settings, BarChart3 } from "lucide-react";

interface Scenario {
  id: number;
  name: string;
  description?: string;
  scenario_type: 'warehouse' | 'transport' | 'combined';
  status: 'draft' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata: any;
}

interface ScenarioManagerProps {
  onSelectScenario: (scenario: Scenario) => void;
  selectedScenario?: Scenario | null;
  scenarioType?: 'warehouse' | 'transport' | 'combined';
  onOptimizeScenario?: (scenario: Scenario) => Promise<void>;
}

export default function ScenarioManager({ onSelectScenario, selectedScenario, scenarioType, onOptimizeScenario }: ScenarioManagerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    scenario_type: scenarioType || 'combined' as const
  });

  useEffect(() => {
    fetchScenarios();
  }, [scenarioType]);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const url = scenarioType ? `/api/scenarios?type=${scenarioType}` : '/api/scenarios';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setScenarios(data.data);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const createScenario = async () => {
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newScenario.name,
          description: newScenario.description,
          scenario_type: newScenario.scenario_type,
          metadata: {
            created_via: 'web_interface',
            initial_configuration: {}
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setScenarios([data.data, ...scenarios]);
        setShowCreateModal(false);
        setNewScenario({
          name: '',
          description: '',
          scenario_type: scenarioType || 'combined'
        });
        onSelectScenario(data.data);
      }
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  const duplicateScenario = async (scenario: Scenario) => {
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${scenario.name} (Copy)`,
          description: scenario.description,
          scenario_type: scenario.scenario_type,
          metadata: {
            ...scenario.metadata,
            duplicated_from: scenario.id,
            duplicated_at: new Date().toISOString()
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setScenarios([data.data, ...scenarios]);
      }
    } catch (error) {
      console.error('Error duplicating scenario:', error);
    }
  };

  const deleteScenario = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scenario? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/scenarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setScenarios(scenarios.filter(s => s.id !== id));
        if (selectedScenario?.id === id) {
          onSelectScenario(scenarios.find(s => s.id !== id) || scenarios[0]);
        }
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
    }
  };

  const setScenarioStatus = (id: number, status: Scenario['status']) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const runOptimize = async (scenario: Scenario) => {
    if (onOptimizeScenario) {
      try {
        setScenarioStatus(scenario.id, 'running');
        await onOptimizeScenario(scenario);
        setScenarioStatus(scenario.id, 'completed');
      } catch (err) {
        console.error('Optimize handler error:', err);
        setScenarioStatus(scenario.id, 'failed');
      }
      return;
    }

    // Default optimize flow: call backend run-batch and update status optimistically
    try {
      setScenarioStatus(scenario.id, 'running');
      const res = await fetch('/api/optimize/run-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenario.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScenarioStatus(scenario.id, 'completed');
      } else {
        console.error('Optimize API error:', data);
        setScenarioStatus(scenario.id, 'failed');
      }
    } catch (err) {
      console.error('Optimize error:', err);
      setScenarioStatus(scenario.id, 'failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'running': return '⟳';
      case 'failed': return '✗';
      default: return '○';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warehouse': return '#3b82f6';
      case 'transport': return '#10b981';
      case 'combined': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: '#6b7280' }}>Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#111827' }}>Scenario Management</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
              Create, manage, and compare optimization scenarios
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            New Scenario
          </button>
        </div>

        {scenarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <FolderOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No scenarios found. Create your first scenario to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="card"
                style={{
                  border: selectedScenario?.id === scenario.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => onSelectScenario(scenario)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: '#111827', fontSize: '1rem' }}>
                      {scenario.name}
                    </h4>
                    {scenario.description && (
                      <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                        {scenario.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                    <button
                      className="button button-secondary"
                      style={{ padding: '0.25rem', minWidth: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateScenario(scenario);
                      }}
                      title="Duplicate scenario"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="button button-secondary"
                      style={{ padding: '0.25rem', minWidth: 'auto', color: '#ef4444' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScenario(scenario.id);
                      }}
                      title="Delete scenario"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      backgroundColor: getTypeColor(scenario.scenario_type),
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    {scenario.scenario_type.toUpperCase()}
                  </span>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      backgroundColor: getStatusColor(scenario.status),
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {getStatusIcon(scenario.status)} {scenario.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <div>Created: {new Date(scenario.created_at).toLocaleDateString()}</div>
                  <div>Updated: {new Date(scenario.updated_at).toLocaleDateString()}</div>
                </div>

                {selectedScenario?.id === scenario.id && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <button
                        className="button button-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        <Settings size={12} />
                        Configure
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                        onClick={(e) => { e.stopPropagation(); runOptimize(scenario); }}
                      >
                        <Play size={12} />
                        Optimize
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}
                      >
                        <BarChart3 size={12} />
                        Results
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem', color: '#111827' }}>Create New Scenario</h3>
            
            <div className="form-group">
              <label className="form-label">Scenario Name</label>
              <input
                type="text"
                className="form-input"
                value={newScenario.name}
                onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                placeholder="Enter scenario name"
              />
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

            <div className="form-group">
              <label className="form-label">Scenario Type</label>
              <select
                className="form-input"
                value={newScenario.scenario_type}
                onChange={(e) => setNewScenario({ ...newScenario, scenario_type: e.target.value as any })}
              >
                <option value="warehouse">Warehouse Optimization</option>
                <option value="transport">Transport Optimization</option>
                <option value="combined">Combined Optimization</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="button button-secondary"
                onClick={() => setShowCreateModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                onClick={createScenario}
                disabled={!newScenario.name.trim()}
                style={{ flex: 1 }}
              >
                Create Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
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
        }
      `}</style>
    </div>
  );
}
