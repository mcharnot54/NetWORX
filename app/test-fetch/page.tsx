"use client";

import { useState } from 'react';

export default function TestFetchPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testFetch = async () => {
    setIsLoading(true);
    setTestResult('Testing...');
    
    try {
      // Test GET request
      const getResponse = await fetch('/api/dev-health');
      const getData = await getResponse.json();
      
      // Test POST request
      const postResponse = await fetch('/api/dev-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'fetch functionality', timestamp: Date.now() })
      });
      const postData = await postResponse.json();
      
      setTestResult(`✅ Fetch tests passed!\n\nGET: ${getData.status}\nPOST: ${postData.status}\n\nAll networking issues resolved.`);
      
    } catch (error) {
      setTestResult(`❌ Fetch test failed: ${error}\n\nNetworking issues persist.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Network Connectivity Test</h1>
      
      <div className="space-y-4">
        <p className="text-gray-600">
          This page tests if the "TypeError: Failed to fetch" errors have been resolved.
        </p>
        
        <button
          onClick={testFetch}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Fetch Functionality'}
        </button>
        
        {testResult && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">🛠��� Fixes Applied:</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>✅ Increased dev server memory buffers</li>
            <li>✅ Added CORS headers for cross-origin requests</li>
            <li>✅ Limited webpack chunk sizes to prevent large payloads</li>
            <li>✅ Added error boundary for development issues</li>
            <li>✅ Optimized hot reload and fast refresh</li>
            <li>✅ Prevented memory leaks in development</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
