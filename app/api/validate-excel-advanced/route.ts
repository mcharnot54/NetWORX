import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const expectedDataType = formData.get('dataType') as string;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    console.log(`=== ADVANCED EXCEL VALIDATION ===`);
    console.log(`File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`Expected data type: ${expectedDataType}`);

    // Import and use enhanced validator
    const { EnhancedExcelValidator } = await import('@/lib/enhanced-excel-validator');
    
    const validator = new EnhancedExcelValidator({
      maxFileSizeMB: 200,
      backupOriginal: false,
      validation: {
        strictMode: false,
        skipEmptyRows: true,
        skipEmptyColumns: true,
        autoDetectDataType: true
      }
    }, (message, level) => {
      console.log(`[${level?.toUpperCase() || 'INFO'}] ${message}`);
    });

    // Process the file
    const result = await validator.processExcelFile(file, expectedDataType);

    // Calculate transportation totals if applicable
    let transportationTotals = null;
    if (result.cleanedData.detectedDataType === 'network' || 
        result.cleanedData.detectedDataType === 'transport' || 
        result.cleanedData.detectedDataType === 'cost') {
      
      transportationTotals = calculateTransportationTotals(result.multiTabData || { [result.cleanedData.sheetName]: result.cleanedData }, file.name);
    }

    console.log(`Validation completed: ${result.validationResult.isValid ? 'VALID' : 'INVALID'}`);
    console.log(`Errors: ${result.validationResult.errors.length}, Warnings: ${result.validationResult.warnings.length}`);
    console.log(`Data quality: ${(result.validationResult.dataQuality.completenessScore * 100).toFixed(1)}% complete`);

    return NextResponse.json({
      success: true,
      validation: {
        isValid: result.validationResult.isValid,
        errors: result.validationResult.errors,
        warnings: result.validationResult.warnings,
        recommendations: result.validationResult.recommendations,
        dataQuality: result.validationResult.dataQuality,
        processingTime: result.validationResult.processingTime,
        detectedDataType: result.validationResult.detectedDataType,
        sheetsProcessed: result.validationResult.sheetsProcessed
      },
      data: {
        primarySheet: {
          name: result.cleanedData.sheetName,
          rows: result.cleanedData.data.length,
          columns: result.cleanedData.columnHeaders.length,
          cleaningReport: result.cleanedData.cleaningReport
        },
        multiTabStructure: result.multiTabData ? Object.keys(result.multiTabData).map(sheetName => ({
          name: sheetName,
          rows: result.multiTabData![sheetName].data.length,
          columns: result.multiTabData![sheetName].columnHeaders.length,
          detectedType: result.multiTabData![sheetName].detectedDataType
        })) : null,
        transportationTotals
      },
      conversion: result.conversionResults ? {
        conversionsApplied: Object.values(result.conversionResults).flatMap((conv: any) => conv.conversionsApplied),
        columnMappings: Object.fromEntries(
          Object.entries(result.conversionResults).map(([sheet, conv]: [string, any]) => [
            sheet, conv.mappedColumns
          ])
        ),
        dataQualityMetrics: Object.fromEntries(
          Object.entries(result.conversionResults).map(([sheet, conv]: [string, any]) => [
            sheet, conv.dataQuality
          ])
        ),
        standardizationSummary: {
          totalSheets: Object.keys(result.conversionResults).length,
          totalConversions: Object.values(result.conversionResults).flatMap((conv: any) => conv.conversionsApplied).length,
          averageCompleteness: Object.values(result.conversionResults).reduce((sum: number, conv: any) =>
            sum + conv.dataQuality.completenessScore, 0) / Object.keys(result.conversionResults).length
        }
      } : null,
      sample: {
        columnHeaders: result.cleanedData.columnHeaders.slice(0, 10),
        sampleRows: result.cleanedData.data.slice(0, 3).map(row => {
          const sample: any = {};
          result.cleanedData.columnHeaders.slice(0, 10).forEach(col => {
            sample[col] = row[col];
          });
          return sample;
        })
      }
    });

  } catch (error) {
    console.error('Error in advanced Excel validation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function calculateTransportationTotals(multiTabData: { [sheetName: string]: any }, fileName: string): any {
  const fileNameLower = fileName.toLowerCase();
  let totalExtracted = 0;
  const tabTotals: any[] = [];

  for (const [sheetName, sheetData] of Object.entries(multiTabData)) {
    let sheetTotal = 0;
    let targetColumn = '';

    if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
      // UPS: Extract from Net Charge
      targetColumn = 'net_charge';
      for (const row of sheetData.data) {
        for (const [key, value] of Object.entries(row)) {
          if (key.includes('net') && key.includes('charge')) {
            const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 0.01) {
              sheetTotal += numValue;
            }
            break;
          }
        }
      }
    } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
      // TL: Extract from Gross Rate
      targetColumn = 'gross_rate';
      for (const row of sheetData.data) {
        for (const [key, value] of Object.entries(row)) {
          if (key.includes('gross') && key.includes('rate')) {
            const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 100) {
              sheetTotal += numValue;
            }
            break;
          }
        }
      }
    } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
      // R&L: Find best cost column
      let bestTotal = 0;
      let bestColumn = '';
      
      for (const col of sheetData.columnHeaders) {
        if (col.includes('charge') || col.includes('cost') || col.includes('net')) {
          let testTotal = 0;
          for (const row of sheetData.data) {
            const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 50) {
              testTotal += numValue;
            }
          }
          if (testTotal > bestTotal) {
            bestTotal = testTotal;
            bestColumn = col;
          }
        }
      }
      
      sheetTotal = bestTotal;
      targetColumn = bestColumn;
    }

    totalExtracted += sheetTotal;
    tabTotals.push({
      sheetName,
      rows: sheetData.data.length,
      targetColumn,
      extracted: sheetTotal,
      formatted: formatCurrency(sheetTotal)
    });
  }

  return {
    totalExtracted,
    formattedTotal: formatCurrency(totalExtracted),
    tabBreakdown: tabTotals,
    extractionMethod: getExtractionMethod(fileName)
  };
}

function formatCurrency(amount: number): string {
  if (amount > 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount > 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
}

function getExtractionMethod(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('ups') && lower.includes('individual')) {
    return 'UPS Net Charge (Column G) from all tabs';
  } else if (lower.includes('2024') && lower.includes('tl')) {
    return 'TL Gross Rate (Column H) from all tabs';
  } else if (lower.includes('r&l') && lower.includes('curriculum')) {
    return 'R&L LTL charges (Column V equivalent)';
  }
  return 'Generic cost extraction';
}
