"use client";

import { useState, useRef } from 'react';

export default function TestUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleFileSelect = (files: FileList | null) => {
    console.log('handleFileSelect called with:', files);
    addLog(`File selection triggered`);
    
    if (!files || files.length === 0) {
      addLog('No files detected');
      setSelectedFiles(null);
      return;
    }

    addLog(`${files.length} files selected:`);
    Array.from(files).forEach((file, index) => {
      addLog(`  ${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    });

    setSelectedFiles(files);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h1>File Upload Test</h1>
      
      <div style={{ 
        border: '2px dashed #ccc', 
        padding: '40px', 
        textAlign: 'center', 
        marginBottom: '20px',
        cursor: 'pointer' 
      }} onClick={() => fileInputRef.current?.click()}>
        <p>Click here to select Excel files</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {selectedFiles && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Selected Files:</h3>
          {Array.from(selectedFiles).map((file, index) => (
            <div key={index} style={{ padding: '5px', background: '#f5f5f5', margin: '5px 0' }}>
              {file.name} - {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
        <h3>Logs:</h3>
        {logs.map((log, index) => (
          <div key={index} style={{ fontFamily: 'monospace', fontSize: '12px', margin: '2px 0' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
