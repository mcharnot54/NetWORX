"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface ProcessingConfig {
  validateSchema: boolean;
  convertUnits: boolean;
  fillMissingValues: boolean;
  removeOutliers: boolean;
  outputFormat: "excel" | "csv" | "json";
}

export default function DataProcessor() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [config, setConfig] = useState<ProcessingConfig>({
    validateSchema: true,
    convertUnits: true,
    fillMissingValues: false,
    removeOutliers: false,
    outputFormat: "excel",
  });
  const [results, setResults] = useState<any>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const fileData = uploadedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    }));
    setFiles(fileData);
  };

  const handleProcess = async () => {
    setProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setResults({
        totalRecords: 1250,
        validRecords: 1200,
        errors: 50,
        warnings: 15,
        processingTime: "2.3 seconds",
      });
      setProcessing(false);
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Data Processor</h2>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280" }}>
            Upload Excel/CSV files for validation, conversion, and preprocessing
            before optimization.
          </p>

          <div className="grid grid-cols-2">
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                File Upload
              </h3>
              <div className="file-upload">
                <Upload
                  size={48}
                  style={{ color: "#6b7280", margin: "0 auto 1rem" }}
                />
                <p style={{ marginBottom: "1rem", color: "#374151" }}>
                  Drop files here or click to upload
                </p>
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{
                    opacity: 0,
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                  }}
                />
                <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  Supports Excel (.xlsx, .xls) and CSV files
                </p>
              </div>

              {files.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.5rem", color: "#111827" }}>
                    Uploaded Files:
                  </h4>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "0.375rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <FileText size={16} style={{ color: "#6b7280" }} />
                      <span style={{ flex: 1, fontSize: "0.875rem" }}>
                        {file.name}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Processing Configuration
              </h3>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={config.validateSchema}
                    onChange={(e) =>
                      setConfig({ ...config, validateSchema: e.target.checked })
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  Validate Data Schema
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={config.convertUnits}
                    onChange={(e) =>
                      setConfig({ ...config, convertUnits: e.target.checked })
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  Convert Units to Standard Format
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={config.fillMissingValues}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        fillMissingValues: e.target.checked,
                      })
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  Fill Missing Values
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={config.removeOutliers}
                    onChange={(e) =>
                      setConfig({ ...config, removeOutliers: e.target.checked })
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  Remove Statistical Outliers
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Output Format</label>
                <select
                  className="form-input"
                  value={config.outputFormat}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      outputFormat: e.target.value as any,
                    })
                  }
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              className="button button-primary"
              onClick={handleProcess}
              disabled={files.length === 0 || processing}
            >
              {processing && <div className="loading-spinner"></div>}
              {processing ? "Processing..." : "Process Data"}
            </button>
          </div>

          {results && (
            <div className="results-container">
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Processing Results
              </h3>
              <div className="grid grid-cols-2">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <CheckCircle size={20} style={{ color: "#10b981" }} />
                  <span>Total Records: {results.totalRecords}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <CheckCircle size={20} style={{ color: "#10b981" }} />
                  <span>Valid Records: {results.validRecords}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={20} style={{ color: "#f59e0b" }} />
                  <span>Warnings: {results.warnings}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={20} style={{ color: "#ef4444" }} />
                  <span>Errors: {results.errors}</span>
                </div>
              </div>
              <p style={{ marginTop: "1rem", color: "#6b7280" }}>
                Processing completed in {results.processingTime}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
