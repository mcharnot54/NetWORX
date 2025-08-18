"use client";

import { useState } from 'react';
import Navigation from "@/components/Navigation";

export default function DebugUPSPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-ups-columns');
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">UPS Column Analysis</h1>
        
        <button 
          onClick={runAnalysis}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-6"
        >
          {isLoading ? 'Analyzing...' : 'Analyze UPS Columns'}
        </button>

        {analysis && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Summary</h2>
              <p>Total Tabs: {analysis.summary?.total_tabs}</p>
              <p>Expected Total: ${analysis.summary?.expected_total?.toLocaleString()}</p>
            </div>

            {analysis.tab_analysis?.map((tab: any, index: number) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold mb-4">{tab.sheet_name}</h3>
                <p>Rows: {tab.total_rows}, Columns: {tab.total_columns}</p>
                <p>Recommended Column: <strong>{tab.recommended_column}</strong></p>
                
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Charge Columns Analysis:</h4>
                  {tab.column_analysis?.map((col: any, colIndex: number) => (
                    <div key={colIndex} className="border-l-4 border-blue-500 pl-4 mb-4">
                      <div className="font-medium">{col.column_name}</div>
                      <div>Full Total: ${col.full_total?.toLocaleString()}</div>
                      <div>Valid Values: {col.full_valid_count}</div>
                      <div className="text-sm text-gray-600">
                        Sample values: {col.sample_values?.map((v: any) => `Row ${v.row}: $${v.parsed?.toLocaleString()}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
