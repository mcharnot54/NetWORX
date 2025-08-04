'use client';

import { useState } from 'react';

export default function TestScenario() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testScenarioCreation = async () => {
    setLoading(true);
    try {
      // First, create a test project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Project ${Date.now()}`,
          description: 'Test project for debugging scenario creation',
          project_duration_years: 5,
          base_year: new Date().getFullYear()
        }),
      });

      const projectResult = await projectResponse.json();
      
      if (!projectResult.success) {
        throw new Error(`Project creation failed: ${projectResult.error}`);
      }

      console.log('Project created:', projectResult.data);

      // Then, create a test scenario
      const scenarioResponse = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectResult.data.id,
          name: `Test Scenario ${Date.now()}`,
          description: 'Test scenario for debugging',
          scenario_number: 1,
          number_of_nodes: 3,
          cities: ['Chicago, IL', 'New York, NY', 'Los Angeles, CA'],
          scenario_type: 'combined',
          created_by: 'test_user',
          metadata: {
            project_id: projectResult.data.id,
            scenario_number: 1,
            number_of_nodes: 3,
            cities: ['Chicago, IL', 'New York, NY', 'Los Angeles, CA'],
            status: 'draft',
            capacity_analysis_completed: false,
            transport_optimization_completed: false,
            warehouse_optimization_completed: false
          }
        }),
      });

      const scenarioResult = await scenarioResponse.json();
      
      setResult({
        project: projectResult,
        scenario: scenarioResult,
        success: scenarioResult.success
      });

    } catch (error) {
      console.error('Test failed:', error);
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      setResult(result);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test Scenario Creation</h1>
      <p>This page is for debugging the scenario creation issue.</p>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={initializeDatabase}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : 'Initialize Database'}
        </button>

        <button
          onClick={testScenarioCreation}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Testing...' : 'Test Create Scenario'}
        </button>
      </div>

      {result && (
        <div style={{
          padding: '1rem',
          border: `2px solid ${result.success ? '#10b981' : '#ef4444'}`,
          borderRadius: '0.5rem',
          backgroundColor: result.success ? '#f0fdf4' : '#fef2f2'
        }}>
          <h3 style={{
            color: result.success ? '#15803d' : '#dc2626',
            margin: '0 0 1rem 0'
          }}>
            {result.success ? 'Success!' : 'Error'}
          </h3>
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
