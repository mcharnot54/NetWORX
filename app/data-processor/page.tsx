"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import ScenarioManager from "@/components/ScenarioManager";
import * as XLSX from "xlsx";
import { useData } from "@/context/DataContext";
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
  Save,
} from "lucide-react";

interface Scenario {
  id: number;
  name: string;
  description?: string;
  scenario_type: 'warehouse' | 'transport' | 'combined';
  status: 'draft' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata: any;
}

interface FileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  sheets?: string[];
  selectedSheet?: string;
  detectedType?: string;
  scenarioId?: number;
  file?: File;
  parsedData?: any[];
  columnNames?: string[];
}

export default function DataProcessor() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { setProcessedData } = useData();
  const [files, setFiles] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("scenarios");
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessingLog((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const autoDetectDataType = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes("forecast") || name.includes("demand")) return "forecast";
    if (name.includes("sku") || name.includes("product")) return "sku";
    if (name.includes("network") || name.includes("location")) return "network";
    return "unknown";
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedScenario) {
      alert('Please select a scenario first');
      return;
    }

    const uploadedFiles = Array.from(event.target.files || []);
    if (uploadedFiles.length === 0) {
      addToLog("No files selected for upload");
      return;
    }

    const fileData = uploadedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      detectedType: autoDetectDataType(file.name),
      scenarioId: selectedScenario.id,
      file,
    }));

    setFiles(fileData);
    addToLog(`Uploaded ${fileData.length} file(s) for scenario "${selectedScenario.name}"`);
  };

  return (
    <>
      <Navigation />
      <main className="content-area">
        <div className="card">
          <h2 className="card-title">Data Processor</h2>
          
          <div style={{ marginBottom: "2rem" }}>
            <ScenarioManager
              selectedScenario={selectedScenario}
              onSelectScenario={setSelectedScenario}
            />
          </div>

          {selectedScenario && (
            <div className="card">
              <h3>File Upload</h3>
              <div className="file-upload">
                <input
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <p>Upload Excel or CSV files for processing</p>
              </div>

              {files.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4>Uploaded Files:</h4>
                  <ul>
                    {files.map((file, index) => (
                      <li key={index}>
                        {file.name} ({Math.round(file.size / 1024)}KB) - {file.detectedType}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {processingLog.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4>Processing Log:</h4>
                  <div style={{ 
                    height: "200px", 
                    overflow: "auto", 
                    backgroundColor: "#f8f9fa", 
                    padding: "1rem",
                    fontFamily: "monospace",
                    fontSize: "0.875rem"
                  }}>
                    {processingLog.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
