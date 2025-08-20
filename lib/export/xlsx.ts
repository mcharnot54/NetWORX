/**
 * XLSX Export Utility for Optimization Results
 * Supports multi-sheet workbooks and various data formats
 */

// Note: Install xlsx package if not already installed
// npm install xlsx @types/xlsx

export function downloadWorkbook(tabs: Record<string, any[]>, filename = 'network_optimization.xlsx') {
  try {
    // Dynamic import to avoid SSR issues
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      
      for (const [name, rows] of Object.entries(tabs)) {
        if (!rows || rows.length === 0) continue;
        
        const ws = XLSX.utils.json_to_sheet(rows);
        
        // Limit sheet name to 31 characters (Excel limit)
        const sheetName = name.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      
      XLSX.writeFile(wb, filename);
    }).catch((error) => {
      console.error('Failed to load XLSX library:', error);
      // Fallback to JSON download
      downloadJSON(tabs, filename.replace('.xlsx', '.json'));
    });
  } catch (error) {
    console.error('XLSX export failed:', error);
    // Fallback to JSON download
    downloadJSON(tabs, filename.replace('.xlsx', '.json'));
  }
}

export function exportToXlsx(data: Record<string, any[]>, fileName = 'optimizer_results.xlsx'): Blob | null {
  try {
    // This function returns a Blob for programmatic use
    const XLSX = require('xlsx');
    
    const wb = XLSX.utils.book_new();
    for (const [sheet, rows] of Object.entries(data)) {
      if (!rows || rows.length === 0) continue;
      
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheet.substring(0, 31));
    }
    
    const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Blob([wbout], { type: 'application/octet-stream' });
  } catch (error) {
    console.error('XLSX blob export failed:', error);
    return null;
  }
}

// Fallback JSON download function
function downloadJSON(data: Record<string, any[]>, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// CSV export as additional fallback
export function downloadCSV(data: any[], filename = 'export.csv') {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Format data for Excel export with proper types and formatting
export function formatForExcel(data: any[]): any[] {
  return data.map(row => {
    const formatted: any = {};
    
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number') {
        // Keep numbers as numbers
        formatted[key] = value;
      } else if (typeof value === 'string' && value.includes('%')) {
        // Convert percentage strings to numbers
        const numValue = parseFloat(value.replace('%', ''));
        formatted[key] = isNaN(numValue) ? value : numValue / 100;
      } else if (typeof value === 'string' && value.startsWith('$')) {
        // Convert currency strings to numbers
        const numValue = parseFloat(value.replace(/[$,]/g, ''));
        formatted[key] = isNaN(numValue) ? value : numValue;
      } else {
        formatted[key] = value;
      }
    }
    
    return formatted;
  });
}

// Create summary sheet for optimization results
export function createOptimizationSummary(scenarios: any[]): any[] {
  if (!scenarios || scenarios.length === 0) return [];
  
  return scenarios.map((scenario, index) => ({
    Scenario: `Scenario ${index + 1}`,
    Nodes: scenario.nodes || scenario.facilities_count || 'N/A',
    Total_Cost: scenario.total_cost || scenario.kpis?.year1_total_cost || 0,
    Service_Level: scenario.service_level || scenario.kpis?.service_level || 0,
    Facilities_Opened: scenario.facilities_opened || scenario.kpis?.facilities_opened || 0,
    Transport_Cost: scenario.transport_cost || 0,
    Warehouse_Cost: scenario.warehouse_cost || 0,
    Inventory_Cost: scenario.inventory_cost || 0,
  }));
}

// Export comprehensive optimization results
export function exportOptimizationResults(
  scenarios: any[],
  warehouseResults?: any,
  inventoryResults?: any,
  filename = 'optimization_results.xlsx'
) {
  const exportData: Record<string, any[]> = {};
  
  // Summary sheet
  if (scenarios && scenarios.length > 0) {
    exportData['Summary'] = formatForExcel(createOptimizationSummary(scenarios));
  }
  
  // Detailed scenarios
  if (scenarios && scenarios.length > 0) {
    exportData['Scenarios'] = formatForExcel(scenarios.map((s, i) => ({
      Scenario: i + 1,
      Nodes: s.nodes,
      ...s.kpis,
    })));
  }
  
  // Warehouse results
  if (warehouseResults?.results) {
    exportData['Warehouse'] = formatForExcel(warehouseResults.results);
  }
  
  // Inventory results
  if (inventoryResults?.results) {
    exportData['Inventory'] = formatForExcel(inventoryResults.results);
  }
  
  downloadWorkbook(exportData, filename);
}
