'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import TimeoutDebugger from '@/components/TimeoutDebugger';
import { AlertTriangle, CheckCircle, RefreshCw, Zap, Settings } from 'lucide-react';

export default function TimeoutDebugPage() {
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [emergencyReset, setEmergencyReset] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fix-timeouts');
      const data = await response.json();
      setHealthCheck(data);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFixes = async () => {
    setFixing(true);
    try {
      const response = await fetch('/api/fix-timeouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix' })
      });
      const data = await response.json();
      console.log('Fixes applied:', data);
      await runHealthCheck(); // Refresh health check
    } catch (error) {
      console.error('Failed to apply fixes:', error);
    } finally {
      setFixing(false);
    }
  };

  const performEmergencyReset = async () => {
    if (!confirm('This will forcibly clear all timeouts and intervals. Continue?')) {
      return;
    }
    
    setEmergencyReset(true);
    try {
      const response = await fetch('/api/fix-timeouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'emergency_reset' })
      });
      const data = await response.json();
      console.log('Emergency reset result:', data);
      await runHealthCheck(); // Refresh health check
    } catch (error) {
      console.error('Emergency reset failed:', error);
    } finally {
      setEmergencyReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ⏱️ Timeout Diagnostics & Fixes
          </h1>
          <p className="text-gray-600">
            Debug and resolve request timeout issues with comprehensive monitoring and automatic fixes.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={runHealthCheck}
            disabled={loading}
            className="flex items-center justify-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-medium text-blue-700">
              {loading ? 'Checking...' : 'Run Health Check'}
            </span>
          </button>

          <button
            onClick={applyFixes}
            disabled={fixing || !healthCheck?.autoFixableIssues}
            className="flex items-center justify-center gap-2 p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
          >
            <Settings className={`w-5 h-5 text-green-600 ${fixing ? 'animate-spin' : ''}`} />
            <span className="font-medium text-green-700">
              {fixing ? 'Fixing...' : 'Apply Auto-Fixes'}
            </span>
          </button>

          <button
            onClick={performEmergencyReset}
            disabled={emergencyReset}
            className="flex items-center justify-center gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <Zap className={`w-5 h-5 text-red-600 ${emergencyReset ? 'animate-pulse' : ''}`} />
            <span className="font-medium text-red-700">
              {emergencyReset ? 'Resetting...' : 'Emergency Reset'}
            </span>
          </button>
        </div>

        {/* Health Check Results */}
        {healthCheck && (
          <div className="mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                {healthCheck.status === 'healthy' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  System Health: {healthCheck.status}
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{healthCheck.totalIssues}</div>
                  <div className="text-sm text-gray-600">Total Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{healthCheck.criticalIssues}</div>
                  <div className="text-sm text-gray-600">Critical</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{healthCheck.highIssues}</div>
                  <div className="text-sm text-gray-600">High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{healthCheck.autoFixableIssues}</div>
                  <div className="text-sm text-gray-600">Auto-Fixable</div>
                </div>
              </div>

              {healthCheck.healthMetrics && (
                <div className="bg-gray-50 rounded p-4">
                  <h4 className="font-medium text-gray-900 mb-2">System Metrics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Memory Usage: {healthCheck.healthMetrics.memoryUsage.toFixed(1)} MB</div>
                    <div>Active Connections: {healthCheck.healthMetrics.activeConnections}</div>
                    <div>Avg Response Time: {healthCheck.healthMetrics.averageResponseTime}ms</div>
                    <div>Error Rate: {healthCheck.healthMetrics.errorRate}%</div>
                  </div>
                </div>
              )}

              {healthCheck.issues && healthCheck.issues.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Detected Issues</h4>
                  <div className="space-y-2">
                    {healthCheck.issues.map((issue: any, index: number) => (
                      <div key={index} className="p-3 border border-gray-200 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{issue.type}</span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            issue.severity === 'high' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">{issue.description}</div>
                        <div className="text-sm text-gray-500">{issue.solution}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeout Monitoring Component */}
        <TimeoutDebugger />

        {/* Manual Tests */}
        <div className="mt-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Timeout Tests</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.open('/api/timeout-diagnostic?test=fast&delay=1000', '_blank')}
                className="p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                Test Fast (1s delay)
              </button>
              <button
                onClick={() => window.open('/api/timeout-diagnostic?test=medium&delay=5000', '_blank')}
                className="p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                Test Medium (5s delay)
              </button>
              <button
                onClick={() => window.open('/api/timeout-diagnostic?test=slow&delay=10000', '_blank')}
                className="p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                Test Slow (10s delay)
              </button>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Health Check</strong>: Scans for timeout-related issues automatically</li>
              <li>• <strong>Auto-Fixes</strong>: Applies safe automatic corrections for detected problems</li>
              <li>• <strong>Emergency Reset</strong>: Clears all active timeouts (use only when necessary)</li>
              <li>• <strong>Timeout Monitor</strong>: Real-time monitoring of request performance</li>
              <li>• <strong>Manual Tests</strong>: Test different timeout scenarios to verify fixes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
