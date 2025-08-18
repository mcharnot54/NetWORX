"use client";

import { useState } from 'react';

export default function TestFixPage() {
  const [result, setResult] = useState<any>(null);

  const testFix = async () => {
    try {
      const response = await fetch('/api/fix-file-content-issue');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to test fix' });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>File Content Fix Test</h1>
      <button onClick={testFix}>Test File Content Issue</button>
      {result && (
        <pre style={{ background: '#f5f5f5', padding: '10px', marginTop: '20px' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
