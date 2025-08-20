'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface TimeoutStats {
  status: string;
  stats: {
    total: number;
    success: number;
    timeouts: number;
    errors: number;
    successRate: number;
    timeoutRate: number;
    avgDuration: number;
    activeRequests: number;
  };
  slowRequests: Array<{
    endpoint: string;
    duration: number;
    timestamp: Date;
  }>;
  recommendations: string[];
}

export default function TimeoutDebugger() {
  const [stats, setStats] = useState<TimeoutStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchTimeoutStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/timeout-status', {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch timeout stats');
    } finally {
      setLoading(false);
    }
  };

  const cleanupTimeouts = async () => {
    try {
      const response = await fetch('/api/timeout-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' }),
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        await fetchTimeoutStats();
      }
    } catch (err) {
      setError('Failed to cleanup timeouts');
    }
  };

  useEffect(() => {
    fetchTimeoutStats();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchTimeoutStats, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          🔍 Timeout Monitor
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchTimeoutStats}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={cleanupTimeouts}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
          >
            Cleanup
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <div className="space-y-4">
          {/* Status Overview */}
          <div className={`flex items-center gap-2 ${getStatusColor(stats.status)}`}>
            {getStatusIcon(stats.status)}
            <span className="font-medium capitalize">{stats.status}</span>
            {stats.stats.activeRequests > 0 && (
              <span className="text-sm text-gray-500">
                ({stats.stats.activeRequests} active requests)
              </span>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">
                {stats.stats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-green-700">Success Rate</div>
            </div>
            
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">
                {stats.stats.timeoutRate.toFixed(1)}%
              </div>
              <div className="text-sm text-red-700">Timeout Rate</div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {stats.stats.avgDuration}ms
              </div>
              <div className="text-sm text-blue-700">Avg Duration</div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-2xl font-bold text-gray-600">
                {stats.stats.total}
              </div>
              <div className="text-sm text-gray-700">Total Requests</div>
            </div>
          </div>

          {/* Slow Requests */}
          {stats.slowRequests.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Slow Requests (Last 5min)</h4>
              <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                {stats.slowRequests.map((req, index) => (
                  <div key={index} className="flex justify-between items-center text-sm py-1">
                    <span className="font-mono text-gray-700">{req.endpoint}</span>
                    <span className="text-red-600 font-medium">{req.duration}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {stats.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {stats.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Stats for Debugging */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Raw Statistics
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(stats.stats, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {loading && !stats && (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Loading timeout statistics...</p>
        </div>
      )}
    </div>
  );
}
