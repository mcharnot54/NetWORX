"use client";

import { useState } from 'react';
import Navigation from "@/components/Navigation";
import { AlertCircle, CheckCircle, FileX, Upload, RefreshCw } from 'lucide-react';

interface DiagnosisResult {
  summary: {
    total_files: number;
    files_with_content: number;
    files_missing_content: number;
    recommendation: string;
  };
  files: Array<{
    id: number;
    file_name: string;
    processing_status: string;
    content_status: string;
    content_length: number;
  }>;
  solution: {
    immediate_fix: string;
    technical_fix: string;
    why_happened: string;
  };
}

export default function FixMissingContentPage() {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runDiagnosis = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog('Running diagnosis on uploaded files...');

    try {
      const response = await fetch('/api/diagnose-missing-content');
      const data = await response.json();
      
      if (response.ok) {
        setDiagnosis(data);
        addLog(`✓ Diagnosis complete: ${data.summary.files_missing_content} of ${data.summary.total_files} files missing content`);
      } else {
        addLog(`✗ Diagnosis failed: ${data.error}`);
      }
    } catch (error) {
      addLog(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const markForReupload = async () => {
    setIsLoading(true);
    addLog('Marking files for re-upload...');

    try {
      const response = await fetch('/api/diagnose-missing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_for_reupload' })
      });

      const data = await response.json();
      
      if (response.ok) {
        addLog(`✓ ${data.message}: ${data.files_updated} files updated`);
        addLog(`Next step: ${data.next_step}`);
        // Re-run diagnosis to see updated status
        setTimeout(runDiagnosis, 1000);
      } else {
        addLog(`✗ Failed to mark files: ${data.error}`);
      }
    } catch (error) {
      addLog(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileX className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Fix Missing File Content
            </h1>
          </div>
          <p className="text-gray-600 max-w-3xl">
            This tool helps diagnose and fix files that were uploaded but are missing their content data.
            When files show "File content length: 0" during validation, this indicates the file content wasn't properly preserved.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnostic Actions</h3>
          
          <div className="flex gap-4">
            <button
              onClick={runDiagnosis}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Run Diagnosis
            </button>
            
            {diagnosis && diagnosis.summary.files_missing_content > 0 && (
              <button
                onClick={markForReupload}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Mark for Re-upload
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {diagnosis && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Diagnosis Results
            </h3>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Files</div>
                <div className="text-2xl font-bold text-blue-800">{diagnosis.summary.total_files}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Files with Content</div>
                <div className="text-2xl font-bold text-green-800">{diagnosis.summary.files_with_content}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Missing Content</div>
                <div className="text-2xl font-bold text-red-800">{diagnosis.summary.files_missing_content}</div>
              </div>
            </div>

            {/* File Details */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">File Status</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-50 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">File Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Content Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Content Length</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosis.files.map((file, index) => (
                      <tr key={file.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm text-gray-700">{file.id}</td>
                        <td className="px-3 py-2 text-sm text-gray-700 font-medium">{file.file_name}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            file.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                            file.processing_status === 'needs_reupload' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {file.processing_status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            file.content_status === 'has_file_content' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {file.content_status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">{file.content_length.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Solution */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-yellow-900 mb-3">Solution</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <div><strong>Immediate Fix:</strong> {diagnosis.solution.immediate_fix}</div>
                <div><strong>Why this happened:</strong> {diagnosis.solution.why_happened}</div>
                <div><strong>Technical Fix:</strong> {diagnosis.solution.technical_fix}</div>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Log</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Fix Missing Content</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
            <li>Run the diagnosis above to identify files missing content</li>
            <li>Click "Mark for Re-upload" to prepare the files for re-uploading</li>
            <li>Go to the <a href="/multi-tab-upload" className="text-blue-600 underline">Multi-Tab Upload</a> page</li>
            <li>Re-upload the original Excel files to restore their content</li>
            <li>The system will replace the existing files with proper content preservation</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
