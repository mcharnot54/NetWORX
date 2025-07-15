"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Database,
  Settings,
  Play,
  Eye,
  Download,
  RefreshCw,
  BarChart3,
} from "lucide-react";

interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sheets?: string[];
  selectedSheet?: string;
  detectedType?: string;
}

interface ProcessingConfig {
  dataType: string;
  autoDetectType: boolean;
  validateSchema: boolean;
  convertUnits: boolean;
  fillMissingValues: boolean;
  removeOutliers: boolean;
  cleanColumnNames: boolean;
  backupOriginal: boolean;
  outputFormat: "excel" | "csv" | "json";
  csvEncoding: "utf-8" | "latin-1" | "cp1252";
  maxFileSizeMB: number;
}

interface DataQuality {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityRate: number;
  errors: string[];
  warnings: string[];
  columnStats: any[];
}

export default function DataProcessor() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [config, setConfig] = useState<ProcessingConfig>({
    dataType: "auto",
    autoDetectType: true,
    validateSchema: true,
    convertUnits: true,
    fillMissingValues: false,
    removeOutliers: false,
    cleanColumnNames: true,
    backupOriginal: true,
    outputFormat: "csv",
    csvEncoding: "utf-8",
    maxFileSizeMB: 100,
  });
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const fileData = uploadedFiles.map((file, index) => {
      const sheets =
        file.name.endsWith(".xlsx") || file.name.endsWith(".xls")
          ? ["Sheet1", "Data", "Forecast", "SKU_Data", "Network"]
          : undefined;

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        sheets,
        selectedSheet: sheets ? sheets[0] : undefined,
        detectedType: autoDetectDataType(file.name),
      };
    });
    setFiles(fileData);
    addToLog(`Uploaded ${fileData.length} file(s)`);
  };

  const autoDetectDataType = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes("forecast") || name.includes("demand")) return "forecast";
    if (name.includes("sku") || name.includes("product")) return "sku";
    if (name.includes("network") || name.includes("location")) return "network";
    if (name.includes("cost") || name.includes("rate")) return "cost";
    if (name.includes("capacity") || name.includes("warehouse"))
      return "capacity";
    return "unknown";
  };

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    addToLog("Starting data processing pipeline...");

    // Simulate processing steps matching Python DataProcessor
    const steps = [
      "Validating file existence and size",
      "Creating backup copy",
      "Detecting relevant sheets",
      "Loading data into DataFrame",
      "Cleaning and standardizing data",
      "Converting to standard format",
      "Running data validation",
      "Generating quality metrics",
      "Saving processed data",
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      addToLog(steps[i]);
    }

    // Simulate data quality results
    setTimeout(() => {
      setDataQuality({
        totalRecords: 1250,
        validRecords: 1210,
        invalidRecords: 40,
        qualityRate: 96.8,
        errors: [
          "Missing postal code in row 45",
          "Invalid latitude value in row 123",
          "Duplicate SKU found in row 234",
        ],
        warnings: [
          "City name formatting inconsistent",
          "Units per case seems unusually high",
          "Some distance values may be in wrong units",
        ],
        columnStats: [
          { name: "city", type: "string", missing: 2, unique: 45 },
          {
            name: "annual_volume",
            type: "numeric",
            missing: 0,
            min: 1000,
            max: 50000,
          },
          {
            name: "latitude",
            type: "numeric",
            missing: 3,
            min: 25.2,
            max: 48.7,
          },
        ],
      });
      addToLog("Data processing completed successfully");
      setProcessing(false);
    }, 4500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDataTypeColor = (type: string) => {
    const colors: any = {
      forecast: "#3b82f6",
      sku: "#10b981",
      network: "#f59e0b",
      cost: "#ef4444",
      capacity: "#8b5cf6",
      unknown: "#6b7280",
    };
    return colors[type] || "#6b7280";
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <h2 className="card-title">Advanced Data Processor</h2>
              <p style={{ color: "#6b7280", margin: 0 }}>
                Excel/CSV processing with comprehensive validation,
                auto-detection, and quality metrics.
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={handleProcess}
              disabled={files.length === 0 || processing}
            >
              {processing && <div className="loading-spinner"></div>}
              <Play size={16} />
              {processing ? "Processing..." : "Process All Files"}
            </button>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className={`button ${activeTab === "upload" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("upload")}
              >
                <Upload size={16} />
                File Upload
              </button>
              <button
                className={`button ${activeTab === "config" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("config")}
              >
                <Settings size={16} />
                Processing Config
              </button>
              <button
                className={`button ${activeTab === "preview" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("preview")}
              >
                <Eye size={16} />
                Data Preview
              </button>
              <button
                className={`button ${activeTab === "quality" ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab("quality")}
              >
                <BarChart3 size={16} />
                Quality Report
              </button>
            </div>
          </div>

          {activeTab === "upload" && (
            <div className="grid grid-cols-2">
              <div>
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  File Upload & Detection
                </h3>
                <div className="file-upload">
                  <Upload
                    size={48}
                    style={{ color: "#6b7280", margin: "0 auto 1rem" }}
                  />
                  <p style={{ marginBottom: "1rem", color: "#374151" }}>
                    Drop Excel/CSV files here or click to upload
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
                    Max file size: {config.maxFileSizeMB}MB | Supported: Excel
                    (.xlsx, .xls), CSV
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
                          padding: "0.75rem",
                          backgroundColor:
                            selectedFile === index ? "#eff6ff" : "#f9fafb",
                          borderRadius: "0.375rem",
                          marginBottom: "0.5rem",
                          border:
                            selectedFile === index
                              ? "1px solid #3b82f6"
                              : "1px solid #e5e7eb",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedFile(index)}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <FileText size={16} style={{ color: "#6b7280" }} />
                          <span
                            style={{
                              flex: 1,
                              fontSize: "0.875rem",
                              fontWeight: "500",
                            }}
                          >
                            {file.name}
                          </span>
                          <span
                            style={{ fontSize: "0.75rem", color: "#6b7280" }}
                          >
                            {formatFileSize(file.size)}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "0.25rem",
                              backgroundColor: getDataTypeColor(
                                file.detectedType || "unknown",
                              ),
                              color: "white",
                              fontSize: "0.6rem",
                            }}
                          >
                            {file.detectedType?.toUpperCase() || "UNKNOWN"}
                          </span>

                          {file.sheets && (
                            <select
                              value={file.selectedSheet}
                              onChange={(e) => {
                                const updated = [...files];
                                updated[index].selectedSheet = e.target.value;
                                setFiles(updated);
                              }}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {file.sheets.map((sheet) => (
                                <option key={sheet} value={sheet}>
                                  {sheet}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                  Processing Log
                </h3>
                <div
                  style={{
                    backgroundColor: "#1f2937",
                    color: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    height: "300px",
                    overflowY: "auto",
                    border: "1px solid #374151",
                  }}
                >
                  {processingLog.length === 0 ? (
                    <div
                      style={{
                        color: "#6b7280",
                        textAlign: "center",
                        padding: "2rem",
                      }}
                    >
                      Processing log will appear here...
                    </div>
                  ) : (
                    processingLog.map((log, index) => (
                      <div
                        key={index}
                        style={{ marginBottom: "0.25rem", color: "#10b981" }}
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ marginBottom: "0.5rem", color: "#111827" }}>
                    Quick Actions
                  </h4>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <RefreshCw size={12} />
                      Clear Log
                    </button>
                    <button
                      className="button button-secondary"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <Download size={12} />
                      Export Log
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "config" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Processing Configuration
              </h3>
              <div className="grid grid-cols-3">
                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Data Type Detection
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={config.autoDetectType}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            autoDetectType: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Auto-Detect Data Type
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Force Data Type</label>
                    <select
                      className="form-input"
                      value={config.dataType}
                      onChange={(e) =>
                        setConfig({ ...config, dataType: e.target.value })
                      }
                      disabled={config.autoDetectType}
                    >
                      <option value="auto">Auto-Detect</option>
                      <option value="forecast">Forecast Data</option>
                      <option value="sku">SKU/Product Data</option>
                      <option value="network">Network/Location Data</option>
                      <option value="cost">Cost/Rate Data</option>
                      <option value="capacity">Capacity Data</option>
                    </select>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.5rem",
                    }}
                  >
                    Auto-detection uses filename patterns and column analysis
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Data Cleaning
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={config.cleanColumnNames}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            cleanColumnNames: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Clean Column Names
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
                          setConfig({
                            ...config,
                            removeOutliers: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Remove Statistical Outliers
                    </label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={config.convertUnits}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            convertUnits: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Standardize Units
                    </label>
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                    Output & Backup
                  </h4>
                  <div className="form-group">
                    <label className="form-label">
                      <input
                        type="checkbox"
                        checked={config.backupOriginal}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            backupOriginal: e.target.checked,
                          })
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      Backup Original Files
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
                      <option value="csv">CSV</option>
                      <option value="excel">Excel (.xlsx)</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">CSV Encoding</label>
                    <select
                      className="form-input"
                      value={config.csvEncoding}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          csvEncoding: e.target.value as any,
                        })
                      }
                    >
                      <option value="utf-8">UTF-8</option>
                      <option value="latin-1">Latin-1</option>
                      <option value="cp1252">CP1252</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max File Size (MB)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.maxFileSizeMB}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          maxFileSizeMB: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Data Preview
              </h3>
              {selectedFile !== null && files[selectedFile] ? (
                <div>
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "1rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "0.375rem",
                    }}
                  >
                    <h4 style={{ marginBottom: "0.5rem" }}>
                      File: {files[selectedFile].name}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      <span>Type: {files[selectedFile].detectedType}</span>
                      <span>
                        Sheet: {files[selectedFile].selectedSheet || "N/A"}
                      </span>
                      <span>
                        Size: {formatFileSize(files[selectedFile].size)}
                      </span>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.875rem",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6" }}>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            City
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            State
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Annual Volume
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Latitude
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            Longitude
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["New York", "NY", "125,000", "40.7128", "-74.0060"],
                          ["Chicago", "IL", "98,500", "41.8781", "-87.6298"],
                          [
                            "Los Angeles",
                            "CA",
                            "156,200",
                            "34.0522",
                            "-118.2437",
                          ],
                          ["Houston", "TX", "89,300", "29.7604", "-95.3698"],
                          ["Phoenix", "AZ", "67,800", "33.4484", "-112.0740"],
                        ].map((row, index) => (
                          <tr key={index}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                style={{
                                  padding: "0.75rem",
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  Select a file from the upload tab to preview its data
                </div>
              )}
            </div>
          )}

          {activeTab === "quality" && (
            <div>
              <h3 style={{ marginBottom: "1rem", color: "#111827" }}>
                Data Quality Report
              </h3>
              {dataQuality ? (
                <div>
                  <div
                    className="grid grid-cols-3"
                    style={{ marginBottom: "1.5rem" }}
                  >
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0f9ff",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#3b82f6",
                        }}
                      >
                        {dataQuality.totalRecords.toLocaleString()}
                      </div>
                      <div style={{ color: "#6b7280" }}>Total Records</div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#10b981",
                        }}
                      >
                        {dataQuality.qualityRate}%
                      </div>
                      <div style={{ color: "#6b7280" }}>Quality Rate</div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        padding: "1rem",
                        backgroundColor: "#fef2f2",
                        borderRadius: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: "bold",
                          color: "#ef4444",
                        }}
                      >
                        {dataQuality.errors.length}
                      </div>
                      <div style={{ color: "#6b7280" }}>Critical Errors</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2">
                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Validation Issues
                      </h4>
                      <div style={{ marginBottom: "1rem" }}>
                        <h5
                          style={{
                            color: "#ef4444",
                            fontSize: "0.875rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Errors ({dataQuality.errors.length})
                        </h5>
                        {dataQuality.errors.map((error, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              backgroundColor: "#fef2f2",
                              borderRadius: "0.25rem",
                              marginBottom: "0.25rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <AlertCircle
                              size={16}
                              style={{ color: "#ef4444" }}
                            />
                            {error}
                          </div>
                        ))}
                      </div>
                      <div>
                        <h5
                          style={{
                            color: "#f59e0b",
                            fontSize: "0.875rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Warnings ({dataQuality.warnings.length})
                        </h5>
                        {dataQuality.warnings.map((warning, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              backgroundColor: "#fffbeb",
                              borderRadius: "0.25rem",
                              marginBottom: "0.25rem",
                              fontSize: "0.875rem",
                            }}
                          >
                            <AlertCircle
                              size={16}
                              style={{ color: "#f59e0b" }}
                            />
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card">
                      <h4 style={{ marginBottom: "1rem", color: "#111827" }}>
                        Column Statistics
                      </h4>
                      <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                        {dataQuality.columnStats.map((col, index) => (
                          <div
                            key={index}
                            style={{
                              padding: "0.75rem",
                              backgroundColor: "#f9fafb",
                              borderRadius: "0.375rem",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <span style={{ fontWeight: "500" }}>
                                {col.name}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#6b7280",
                                }}
                              >
                                {col.type}
                              </span>
                            </div>
                            <div
                              style={{ fontSize: "0.75rem", color: "#6b7280" }}
                            >
                              {col.missing > 0 && (
                                <span>Missing: {col.missing} | </span>
                              )}
                              {col.unique && (
                                <span>Unique: {col.unique} | </span>
                              )}
                              {col.min !== undefined && (
                                <span>
                                  Range: {col.min} - {col.max}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "#6b7280",
                  }}
                >
                  Process files to view data quality report
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
