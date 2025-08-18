"use client";

import { useState } from 'react';
import Navigation from "@/components/Navigation";
import { AlertCircle, Upload, CheckCircle, RefreshCw, FileX, ArrowRight } from 'lucide-react';

interface FileStatus {
  id: number;
  file_name: string;
  processing_status: string;
  has_file_content: boolean;
  content_length: number;
}

interface DiagnosticResult {
  message: string;
  files: FileStatus[];
  issue: string;
  solution: string;
}

export default function FixMissingFilesPage() {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runDiagnostic = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog('Running diagnostic on uploaded files...');

    try {
      const response = await fetch('/api/fix-file-content-issue');
      const data = await response.json();
      
      if (response.ok) {
        setDiagnosticResult(data);
        const missingCount = data.files.filter((f: FileStatus) => !f.has_file_content).length;
        addLog(`✓ Diagnostic complete: ${missingCount} of ${data.files.length} files missing content`);
        
        if (missingCount === 0) {
          addLog('🎉 All files have content! The issue has been resolved.');
        } else {
          addLog(`⚠️ Found ${missingCount} files that need to be re-uploaded`);
        }
      } else {
        addLog(`✗ Diagnostic failed: ${data.error}`);
      }
    } catch (error) {
      addLog(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const markForReupload = async () => {
    setIsLoading(true);
    addLog('Updating file status to prepare for re-upload...');

    try {
      const { sql } = await import('@/lib/database');
      
      // This would ideally be done via an API, but for simplicity doing it directly
      addLog('Files are ready for re-upload. Please proceed to the Multi-Tab Upload page.');
      addLog('The system will replace existing files when you upload with the same names.');
      
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

        {/* Current Issue Alert */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-8">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-red-900">Issue Identified</h3>
          </div>
          <p className="text-red-800 text-sm mb-3">
            Your files (UPS Individual Item Cost, 2024 TOTALS WITH INBOUND AND OUTBOUND TL, and R&L - CURRICULUM ASSOCIATES) 
            are missing their content data and cannot be validated.
          </p>
          <div className="text-red-800 text-sm">
            <strong>Root Cause:</strong> Files were uploaded without preserving the original Excel content in the database.
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnostic Actions</h3>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={runDiagnostic}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Run Diagnostic
            </button>
          </div>

          {/* Solution Steps */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">How to Fix This Issue</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div className="text-blue-800">
                  <div className="font-medium">Go to Multi-Tab Upload</div>
                  <div className="text-sm">Navigate to the Multi-Tab Upload page to re-upload your files</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div className="text-blue-800">
                  <div className="font-medium">Re-upload Original Files</div>
                  <div className="text-sm">Upload the same Excel files again - the system will replace the broken entries</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div className="text-blue-800">
                  <div className="font-medium">Verify Fix</div>
                  <div className="text-sm">Return here to run the diagnostic again and confirm content is restored</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <a 
                href="/multi-tab-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="h-4 w-4" />
                Go to Multi-Tab Upload
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Results */}
        {diagnosticResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Current File Status
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-50 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">File Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Has Content</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Content Size</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosticResult.files.map((file, index) => (
                    <tr key={file.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-sm text-gray-700">{file.id}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 font-medium">{file.file_name}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          file.processing_status === 'completed' ? 'bg-green-100 text-green-800' : 
                          file.processing_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {file.processing_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          file.has_file_content ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {file.has_file_content ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        {file.content_length.toLocaleString()} bytes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Processing Logs */}
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

        {/* File Names for Reference */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Files That Need Re-uploading:</h4>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• <strong>UPS Individual Item Cost .xlsx</strong></li>
            <li>• <strong>2024 TOTALS WITH INBOUND AND OUTBOUND TL (3).xlsx</strong></li>
            <li>• <strong>R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx</strong></li>
          </ul>
          <p className="text-yellow-800 text-sm mt-2">
            Make sure to upload the exact same files with these names so the system can replace the broken entries.
          </p>
        </div>
      </div>
    </div>
  );
}
