"use client";

import { useState } from 'react';
import Navigation from "@/components/Navigation";
import { CheckCircle, AlertCircle, Database } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export default function TestDbFixPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runDatabaseTests = async () => {
    setIsRunning(true);
    setResults([]);

    const tests = [
      { name: 'Test file content retrieval for file ID 65', endpoint: '/api/files/65/content' },
      { name: 'Test file content retrieval for file ID 66', endpoint: '/api/files/66/content' },
      { name: 'Test file content retrieval for file ID 67', endpoint: '/api/files/67/content' },
      { name: 'Test basic database health', endpoint: '/api/health' },
      { name: 'Test project service', endpoint: '/api/projects' }
    ];

    for (const test of tests) {
      try {
        const response = await fetch(test.endpoint);
        const data = await response.json();
        
        setResults(prev => [...prev, {
          success: response.ok,
          message: `${test.name}: ${response.ok ? 'SUCCESS' : 'FAILED'}`,
          details: data
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          success: false,
          message: `${test.name}: ERROR`,
          details: error instanceof Error ? error.message : String(error)
        }]);
      }
    }

    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Database Fix Test
            </h1>
          </div>
          <p className="text-gray-600 max-w-3xl">
            Test database operations after fixing array destructuring issues in the database service.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Database Tests</h3>
          
          <button
            onClick={runDatabaseTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.message}
                    </span>
                  </div>
                  
                  {result.details && (
                    <div className="mt-2">
                      <details className="cursor-pointer">
                        <summary className="text-sm text-gray-600 hover:text-gray-800">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
              <div className="text-sm text-blue-800">
                Passed: {results.filter(r => r.success).length} / {results.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
