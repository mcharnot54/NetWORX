"use client";
import { useEffect, useState } from 'react';

export default function AdminBaselinePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/direct-tl-check');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch detection');
        setDetected(json);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const createPr = async () => {
    if (!detected) return;
    const baseline = detected?.baseline_extracted?.value || detected?.detected_baseline?.value || (detected?.files_details && detected.files_details[0]?.baseline_candidates?.[0]?.value);
    if (!baseline) {
      setError('No baseline detected to apply');
      return;
    }

    setCreating(true);
    setError(null);
    setResult(null);
    try {
      const body = {
        baselineValue: baseline,
        filePath: 'app/api/simple-transport-generation/route.ts',
        prTitle: `Apply extracted baseline: $${Math.round(baseline).toLocaleString()}`
      };

      const res = await fetch('/api/admin/create-baseline-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || JSON.stringify(json));
      setResult(json);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{padding: 20}}>
      <h1>Admin: Apply Baseline via GitHub PR</h1>

      {loading && <p>Loading detected baseline...</p>}
      {error && <div style={{color: 'red'}}>{error}</div>}

      {!loading && detected && (
        <div>
          <h3>Detection Summary</h3>
          <pre style={{whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 10}}>{JSON.stringify(detected, null, 2)}</pre>

          <div style={{marginTop: 12}}>
            <button onClick={createPr} disabled={creating} style={{padding: '8px 12px'}}>
              {creating ? 'Creating PR...' : 'Create PR to apply baseline'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div style={{marginTop: 12}}>
          <h3>PR Created</h3>
          <div>PR URL: <a href={result.prUrl} target="_blank" rel="noreferrer">{result.prUrl}</a></div>
          <div>Branch: {result.branch}</div>
        </div>
      )}
    </div>
  );
}
