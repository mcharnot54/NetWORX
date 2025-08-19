/**
 * Simplified Excel processor for multi-tab uploads
 * Avoids chunk loading issues with the enhanced validator
 */

export interface SimpleExcelData {
  data: any[];
  columnHeaders: string[];
  sheetName: string;
  rowCount: number;
}

export interface SimpleProcessingResult {
  isValid: boolean;
  sheets: { [sheetName: string]: SimpleExcelData };
  detectedFileType: 'UPS' | 'TL' | 'RL' | 'OTHER';
  totalExtracted: number;
  errors: string[];
  warnings: string[];
}

export class SimpleExcelProcessor {
  static async processFile(file: File): Promise<SimpleProcessingResult> {
    try {
      // Import XLSX dynamically to avoid bundle issues
      const XLSX = await import('xlsx');
      
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      console.log(`Processing ${file.name} with ${workbook.SheetNames.length} sheets`);

      const sheets: { [sheetName: string]: SimpleExcelData } = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with proper handling
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: null 
          });

          if (jsonData.length === 0) {
            warnings.push(`Sheet '${sheetName}' is empty`);
            continue;
          }

          // Find header row (skip empty rows at top)
          let headerRowIndex = 0;
          let headerRow: any[] = [];

          for (let i = 0; i < Math.min(10, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (row && row.length > 0 && row.some(cell => cell && String(cell).trim() !== '')) {
              headerRow = row;
              headerRowIndex = i;
              break;
            }
          }

          if (headerRow.length === 0) {
            warnings.push(`No valid header found in sheet '${sheetName}'`);
            continue;
          }

          // Convert to object format using detected headers
          const objectData = XLSX.utils.sheet_to_json(worksheet, {
            header: headerRow.map((h, i) => h ? String(h).trim() : `Column_${i + 1}`),
            range: headerRowIndex,
            defval: null
          });

          // Clean the data
          const cleanedData = objectData.filter(row => {
            // Remove empty rows
            return Object.values(row).some(value => 
              value !== null && value !== undefined && String(value).trim() !== ''
            );
          });

          sheets[sheetName] = {
            data: cleanedData,
            columnHeaders: headerRow.map((h, i) => h ? String(h).trim() : `Column_${i + 1}`),
            sheetName: sheetName,
            rowCount: cleanedData.length
          };

          console.log(`Processed sheet '${sheetName}': ${cleanedData.length} rows`);

        } catch (sheetError) {
          const errorMsg = `Error processing sheet '${sheetName}': ${sheetError instanceof Error ? sheetError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Detect file type based on filename
      const detectedFileType = this.detectFileType(file.name);

      // Calculate simple extraction for display
      const totalExtracted = this.calculateSimpleExtraction(sheets, detectedFileType);

      return {
        isValid: Object.keys(sheets).length > 0,
        sheets,
        detectedFileType,
        totalExtracted,
        errors,
        warnings
      };

    } catch (error) {
      const errorMsg = `Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      
      return {
        isValid: false,
        sheets: {},
        detectedFileType: 'OTHER',
        totalExtracted: 0,
        errors: [errorMsg],
        warnings: []
      };
    }
  }

  private static detectFileType(fileName: string): 'UPS' | 'TL' | 'RL' | 'OTHER' {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('ups') && lowerName.includes('individual')) {
      return 'UPS';
    }
    if (lowerName.includes('tl') || lowerName.includes('inbound') || lowerName.includes('outbound')) {
      return 'TL';
    }
    if (lowerName.includes('r&l') || lowerName.includes('curriculum')) {
      return 'RL';
    }
    
    return 'OTHER';
  }

  private static calculateSimpleExtraction(
    sheets: { [sheetName: string]: SimpleExcelData }, 
    fileType: 'UPS' | 'TL' | 'RL' | 'OTHER'
  ): number {
    let total = 0;

    try {
      for (const [sheetName, sheetData] of Object.entries(sheets)) {
        // Simple cost extraction based on file type
        if (fileType === 'UPS') {
          // Look for Net Charge columns
          const netChargeColumns = sheetData.columnHeaders.filter(col =>
            col.toLowerCase().includes('net') && col.toLowerCase().includes('charge')
          );
          
          for (const col of netChargeColumns) {
            for (const row of sheetData.data) {
              const value = row[col];
              if (value) {
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 0) {
                  total += numValue;
                }
              }
            }
          }
        } 
        else if (fileType === 'TL') {
          // Look for rate/charge columns
          const costColumns = sheetData.columnHeaders.filter(col => {
            const colLower = col.toLowerCase();
            return colLower.includes('rate') || colLower.includes('charge') || colLower.includes('cost');
          });
          
          for (const col of costColumns) {
            for (const row of sheetData.data) {
              const value = row[col];
              if (value) {
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 0) {
                  total += numValue;
                }
              }
            }
          }
        }
        else if (fileType === 'RL') {
          // Look for any cost/charge columns
          const costColumns = sheetData.columnHeaders.filter(col => {
            const colLower = col.toLowerCase();
            return colLower.includes('charge') || colLower.includes('cost') || colLower.includes('freight');
          });
          
          for (const col of costColumns) {
            for (const row of sheetData.data) {
              const value = row[col];
              if (value) {
                const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
                if (!isNaN(numValue) && numValue > 0) {
                  total += numValue;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error calculating extraction total:', error);
    }

    return total;
  }
}
