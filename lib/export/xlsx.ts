import * as XLSX from 'xlsx';

export function downloadWorkbook(tabs: Record<string, any[]>, filename = 'network_optimization.xlsx') {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(tabs)) {
    if (rows && rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows);
      // Truncate sheet name to Excel's 31 character limit
      const sheetName = name.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }
  XLSX.writeFile(wb, filename);
}

export function exportToXlsx(data: Record<string, any[]>, fileName = 'optimizer_results.xlsx') {
  const wb = XLSX.utils.book_new();
  for (const [sheet, rows] of Object.entries(data)) {
    if (rows && rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows);
      const sheetName = sheet.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([wbout], { type: 'application/octet-stream' });
}
