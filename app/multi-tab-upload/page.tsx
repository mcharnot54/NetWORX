"use client";

import { useState, useEffect } from 'react';
import Navigation from "@/components/Navigation";
import MultiTabExcelUploader from "@/components/MultiTabExcelUploader";
import { FileSpreadsheet, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react';

interface MultiTabFile {
  file: File;
  fileName: string;
  fileSize: number;
  tabs: any[];
  fileType: 'UPS' | 'TL' | 'RL' | 'OTHER';
  totalExtracted: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export default function MultiTabUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<MultiTabFile[]>([]);
  const [extractionResults, setExtractionResults] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleFilesProcessed = (files: MultiTabFile[]) => {
    setUploadedFiles(files);
  };

  const handleFilesUploaded = async (files: MultiTabFile[]) => {
    // Files have been uploaded to database, now extract baseline
    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-multi-tab-baseline');
      const data = await response.json();
      
      if (data.success) {
        setExtractionResults(data.multi_tab_transportation_baseline);
      } else {
        console.error('Extraction failed:', data.error);
      }
    } catch (error) {
      console.error('Error extracting baseline:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount > 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount > 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Multi-Tab Excel File Upload
            </h1>
          </div>
          <p className="text-gray-600 max-w-3xl">
            Upload Excel files with multiple tabs to properly extract transportation baseline costs. 
            This interface preserves the individual tab structure instead of flattening to a single array.
          </p>
        </div>

        {/* Expected Results Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Expected Transportation Files:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">UPS Individual Item Cost</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 4 tabs total</li>
                <li>• Extract from "Net Charge" column</li>
                <li>• Expected: Over $2.9M</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">TL Totals (Inbound/Outbound)</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 3 tabs: Inbound + Outbound + Transfers</li>
                <li>• Extract from "Gross Rate" column</li>
                <li>• Sum all tabs</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">R&L Curriculum Associates</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• LTL shipping costs</li>
                <li>• Extract from Column V</li>
                <li>• Net charges/freight costs</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Component */}
        <MultiTabExcelUploader
          onFilesProcessed={handleFilesProcessed}
          onFilesUploaded={handleFilesUploaded}
          scenarioId={2} // You can make this dynamic
        />

        {/* Extraction Results */}
        {isExtracting && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <div className="flex items-center gap-2 text-blue-600">
              <BarChart3 className="h-5 w-5 animate-pulse" />
              <span>Extracting transportation baseline costs...</span>
            </div>
          </div>
        )}

        {extractionResults && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Transportation Baseline Results
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* UPS Results */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">UPS Parcel Costs</h3>
                <div className="text-2xl font-bold text-green-700 mb-2">
                  {extractionResults.ups_parcel_costs.formatted}
                </div>
                <div className="text-sm text-green-600 mb-3">
                  {extractionResults.ups_parcel_costs.tabs_count} tabs processed
                </div>
                {extractionResults.ups_parcel_costs.tabs.map((tab: any, index: number) => (
                  <div key={index} className="text-xs bg-white p-2 rounded mb-1">
                    <span className="font-medium">{tab.name}:</span> {tab.formatted}
                  </div>
                ))}
              </div>

              {/* TL Results */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">TL Freight Costs</h3>
                <div className="text-2xl font-bold text-blue-700 mb-2">
                  {extractionResults.tl_freight_costs.formatted}
                </div>
                <div className="text-sm text-blue-600 mb-3">
                  {extractionResults.tl_freight_costs.tabs_count} tabs processed
                </div>
                {extractionResults.tl_freight_costs.tabs.map((tab: any, index: number) => (
                  <div key={index} className="text-xs bg-white p-2 rounded mb-1">
                    <span className="font-medium">{tab.name}:</span> {tab.formatted}
                  </div>
                ))}
              </div>

              {/* R&L Results */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">LTL Freight Costs</h3>
                <div className="text-2xl font-bold text-purple-700 mb-2">
                  {extractionResults.ltl_freight_costs.formatted}
                </div>
                <div className="text-sm text-purple-600 mb-3">
                  {extractionResults.ltl_freight_costs.tabs_count} tabs processed
                </div>
                {extractionResults.ltl_freight_costs.tabs.map((tab: any, index: number) => (
                  <div key={index} className="text-xs bg-white p-2 rounded mb-1">
                    <span className="font-medium">{tab.name}:</span> {tab.formatted}
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Total */}
            <div className="bg-gray-900 text-white rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Total Transportation Baseline 2024</h3>
              <div className="text-4xl font-bold">
                {extractionResults.grand_total.formatted}
              </div>
              <div className="text-gray-300 mt-2">
                Ready for 2025 baseline calculations
              </div>
            </div>

            {/* Validation Status */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-3 rounded-lg text-center ${extractionResults.ups_parcel_costs.total > 2500000 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${extractionResults.ups_parcel_costs.total > 2500000 ? 'text-green-600' : 'text-yellow-600'}`} />
                <div className="text-xs font-medium">UPS Target</div>
                <div className="text-xs">{extractionResults.ups_parcel_costs.total > 2500000 ? '✓ Met' : '⚠ Low'}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${extractionResults.tl_freight_costs.tabs_count >= 3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${extractionResults.tl_freight_costs.tabs_count >= 3 ? 'text-green-600' : 'text-yellow-600'}`} />
                <div className="text-xs font-medium">TL Tabs</div>
                <div className="text-xs">{extractionResults.tl_freight_costs.tabs_count >= 3 ? '✓ All 3' : '⚠ Missing'}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${extractionResults.ltl_freight_costs.total > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${extractionResults.ltl_freight_costs.total > 0 ? 'text-green-600' : 'text-red-600'}`} />
                <div className="text-xs font-medium">R&L Extract</div>
                <div className="text-xs">{extractionResults.ltl_freight_costs.total > 0 ? '✓ Working' : '✗ Failed'}</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${extractionResults.grand_total.amount > 1000000 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${extractionResults.grand_total.amount > 1000000 ? 'text-green-600' : 'text-yellow-600'}`} />
                <div className="text-xs font-medium">Baseline</div>
                <div className="text-xs">{extractionResults.grand_total.amount > 1000000 ? '✓ Ready' : '⚠ Low'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
