'use client';

import { useState } from 'react';
import { robustFetchJson } from '@/lib/fetch-utils';

export default function DbTest() {
  const [output, setOutput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const addToOutput = (message: string) => {
    setOutput(prev => prev + '\n' + new Date().toLocaleTimeString() + ': ' + message);
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      addToOutput('Testing database connection...');
      const response = await fetch('/api/test-db');
      const result = await response.json();
      addToOutput(`Connection test: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.error) addToOutput(`Error: ${result.error}`);
    } catch (error) {
      addToOutput(`Connection test failed: ${error}`);
    }
    setLoading(false);
  };

  const setupDatabase = async () => {
    setLoading(true);
    try {
      addToOutput('Setting up database tables...');
      const response = await fetch('/api/setup-db', { method: 'POST' });
      const result = await response.json();
      addToOutput(`Setup: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.stats) {
        addToOutput(`Current data - Projects: ${result.stats.projects}, Scenarios: ${result.stats.scenarios}`);
      }
      if (result.error) addToOutput(`Error: ${result.error}`);
    } catch (error) {
      addToOutput(`Setup failed: ${error}`);
    }
    setLoading(false);
  };

  const seedDatabase = async () => {
    setLoading(true);
    try {
      addToOutput('Seeding database with sample data...');
      const response = await fetch('/api/seed-db', { method: 'POST' });
      const result = await response.json();
      addToOutput(`Seed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.message) addToOutput(`Message: ${result.message}`);
      if (result.error) addToOutput(`Error: ${result.error}`);
    } catch (error) {
      addToOutput(`Seeding failed: ${error}`);
    }
    setLoading(false);
  };

  const testProjectCreation = async () => {
    setLoading(true);
    try {
      addToOutput('Testing project creation...');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Project ' + Date.now(),
          description: 'Test project created from db-test page',
          project_duration_years: 5,
          base_year: new Date().getFullYear()
        })
      });
      const result = await response.json();
      addToOutput(`Project creation: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.data) addToOutput(`Created project ID: ${result.data.id}, Name: ${result.data.name}`);
      if (result.error) addToOutput(`Error: ${result.error}`);
    } catch (error) {
      addToOutput(`Project creation failed: ${error}`);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      addToOutput('Fetching all projects...');
      const result = await robustFetchJson('/api/projects', {
        timeout: 10000,
        retries: 1
      });
      addToOutput(`Fetch projects: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.data) {
        addToOutput(`Found ${result.data.length} projects:`);
        result.data.forEach((project: any) => {
          addToOutput(`  - ${project.name} (ID: ${project.id}, Status: ${project.status})`);
        });
      }
      if (result.error) addToOutput(`Error: ${result.error}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        addToOutput('Fetch was cancelled');
      } else {
        addToOutput(`Fetch failed: ${error}`);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Database Test Page</h1>
      <p>Use this page to test database operations and troubleshoot issues.</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={testConnection} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Test Connection
        </button>
        <button onClick={setupDatabase} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Setup Tables
        </button>
        <button onClick={seedDatabase} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Seed Data
        </button>
        <button onClick={testProjectCreation} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Test Create Project
        </button>
        <button onClick={fetchProjects} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#06b6d4', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Fetch Projects
        </button>
        <button onClick={() => setOutput('')} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '0.25rem' }}>
          Clear Output
        </button>
      </div>

      <div style={{ backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', minHeight: '300px' }}>
        <h3>Output:</h3>
        <pre style={{ fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0 }}>
          {output || 'No output yet. Click a button above to test database operations.'}
        </pre>
      </div>

      {loading && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '0.25rem' }}>
          <strong>Processing...</strong> Please wait for the operation to complete.
        </div>
      )}
    </div>
  );
}
