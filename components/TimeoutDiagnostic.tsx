'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  uptime: number;
  memory: string;
}

interface EmergencyReport {
  criticalIssues: string[];
  fixes: string[];
  systemHealth: 'critical' | 'degraded' | 'healthy';
  recommendations: string[];
  timestamp: string;
}

export function TimeoutDiagnostic() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [lastReport, setLastReport] = useState<EmergencyReport | null>(null);

  // Auto-refresh health status every 30 seconds
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/emergency-fix', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Failed to check health:', error);
    } finally {
      setLoading(false);
    }
  };

  const runEmergencyFix = async () => {
    try {
      setFixing(true);
      const response = await fetch('/api/emergency-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLastReport(data.report);
        // Refresh health status after fix
        setTimeout(checkHealth, 1000);
      }
    } catch (error) {
      console.error('Emergency fix failed:', error);
    } finally {
      setFixing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Timeout Health Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
          <button
            onClick={runEmergencyFix}
            disabled={fixing}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {fixing ? 'Fixing...' : 'Emergency Fix'}
          </button>
        </div>
      </div>

      {health && (
        <div className="space-y-3">
          <div className={`p-3 rounded-lg ${getStatusColor(health.status)}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getStatusIcon(health.status)}</span>
              <span className="font-medium capitalize">{health.status}</span>
              <span className="text-sm opacity-75">
                • Uptime: {Math.round(health.uptime / 60)}m • Memory: {health.memory}
              </span>
            </div>
          </div>

          {health.issues.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Issues Detected:</h4>
              {health.issues.map((issue, index) => (
                <div key={index} className="text-sm text-gray-600 pl-4">
                  • {issue}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lastReport && (
        <div className="space-y-3 border-t pt-3">
          <h4 className="font-medium">Last Emergency Fix Report</h4>
          <div className="text-sm space-y-2">
            <div className={`p-2 rounded ${getStatusColor(lastReport.systemHealth)}`}>
              System Health: {lastReport.systemHealth}
            </div>
            
            {lastReport.fixes.length > 0 && (
              <div>
                <strong>Applied Fixes:</strong>
                {lastReport.fixes.map((fix, index) => (
                  <div key={index} className="text-green-600 pl-4">{fix}</div>
                ))}
              </div>
            )}
            
            {lastReport.criticalIssues.length > 0 && (
              <div>
                <strong>Critical Issues:</strong>
                {lastReport.criticalIssues.map((issue, index) => (
                  <div key={index} className="text-red-600 pl-4">{issue}</div>
                ))}
              </div>
            )}
            
            {lastReport.recommendations.length > 0 && (
              <div>
                <strong>Recommendations:</strong>
                {lastReport.recommendations.map((rec, index) => (
                  <div key={index} className="text-blue-600 pl-4">{rec}</div>
                ))}
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              {new Date(lastReport.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
