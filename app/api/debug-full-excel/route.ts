import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'networx-uploads';

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  
  try {
    const networkFootprintKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';
    
    if (file === 'network') {
      return NextResponse.json(await debugNetworkFootprint(networkFootprintKey));
    } else if (file === 'sales') {
      return NextResponse.json(await debugHistoricalSales(historicalSalesKey));
    } else {
      // Debug both files
      const networkDebug = await debugNetworkFootprint(networkFootprintKey);
      const salesDebug = await debugHistoricalSales(historicalSalesKey);
      
      return NextResponse.json({
        networkFootprint: networkDebug,
        historicalSales: salesDebug,
        comparison: {
          expectedNetworkInventory: 48000000,
          actualNetworkInventory: networkDebug.totals.totalInventoryValue,
          expectedNetworkUnits: 13000000, 
          actualNetworkUnits: networkDebug.totals.totalUnits,
          expectedHistoricalUnits: 15000000,
          actualHistoricalUnits: salesDebug.totals.totalUnits,
          expectedPallets: '14K-18K',
          actualPallets: networkDebug.totals.estimatedPallets
        }
      });
    }
    
  } catch (error) {
    console.error('Error in full Excel debug:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function debugNetworkFootprint(s3Key: string) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Network Footprint file');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  
  console.log(`Network Footprint sheets: ${sheetNames.join(', ')}`);
  
  // Try DATA DUMP sheet first
  let targetSheet = 'DATA DUMP';
  if (!sheetNames.includes(targetSheet)) {
    targetSheet = sheetNames[0];
  }
  
  const worksheet = workbook.Sheets[targetSheet];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Network: Processing ${jsonData.length} total rows from sheet "${targetSheet}"`);
  
  // Check header row to understand column structure
  const headerRow = jsonData[0] as any[];
  console.log('Network header columns (first 25):', headerRow?.slice(0, 25));
  
  let totalInventoryValue = 0;
  let totalUnits = 0;
  let totalAvgCost = 0;
  let validItems = 0;
  let totalUnitsPerCase = 0;
  let rowsWithData = 0;
  
  const sampleData = [];
  
  // Process ALL rows (not just 1000)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const itemCode = row[0]?.toString()?.trim();          // Column A
    const avgCost = parseFloat(row[12]) || 0;             // Column M (0-indexed = 12)  
    const unitsPerCase = parseFloat(row[13]) || 0;        // Column N (0-indexed = 13)
    const totalUnitsInQ = parseFloat(row[16]) || 0;       // Column Q (0-indexed = 16)
    const inventoryValue = parseFloat(row[18]) || 0;      // Column S (0-indexed = 18)
    
    if (itemCode && itemCode.length > 0) {
      rowsWithData++;
      
      if (inventoryValue > 0 || totalUnitsInQ > 0) {
        totalInventoryValue += inventoryValue;
        totalUnits += totalUnitsInQ;
        totalAvgCost += avgCost;
        totalUnitsPerCase += unitsPerCase;
        validItems++;
        
        // Collect sample data
        if (sampleData.length < 10) {
          sampleData.push({
            row: i + 1,
            itemCode,
            avgCost,
            unitsPerCase,
            totalUnits: totalUnitsInQ,
            inventoryValue
          });
        }
      }
    }
  }
  
  const avgUnitsPerCase = validItems > 0 ? totalUnitsPerCase / validItems : 0;
  const estimatedPallets = avgUnitsPerCase > 0 ? Math.ceil(totalUnits / avgUnitsPerCase / 45) : 0;
  
  return {
    file: 'Network Footprint',
    sheet: targetSheet,
    sheetsAvailable: sheetNames,
    totalRows: jsonData.length,
    rowsWithData,
    validItems,
    headerColumns: headerRow?.slice(0, 25) || [],
    totals: {
      totalInventoryValue: Math.round(totalInventoryValue),
      totalUnits: Math.round(totalUnits),
      avgCostPerUnit: validItems > 0 ? Math.round((totalAvgCost / validItems) * 100) / 100 : 0,
      avgUnitsPerCase: Math.round(avgUnitsPerCase * 10) / 10,
      estimatedPallets
    },
    sampleData,
    columnMapping: {
      A: 'Item Code',
      M: 'Avg Cost', 
      N: 'Units Per Case',
      Q: 'Total Units',
      S: 'Inventory Value'
    }
  };
}

async function debugHistoricalSales(s3Key: string) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Historical Sales file');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  
  console.log(`Historical Sales sheets: ${sheetNames.join(', ')}`);
  
  // Find the best sheet for sales data
  let targetSheet = sheetNames[0];
  for (const name of sheetNames) {
    if (name.toLowerCase().includes('may') || 
        name.toLowerCase().includes('24') ||
        name.toLowerCase().includes('sales') ||
        name.toLowerCase().includes('data')) {
      targetSheet = name;
      break;
    }
  }
  
  const worksheet = workbook.Sheets[targetSheet];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`Sales: Processing ${jsonData.length} total rows from sheet "${targetSheet}"`);
  
  // Check header row
  const headerRow = jsonData[0] as any[];
  console.log('Sales header columns (first 40):', headerRow?.slice(0, 40));
  
  let totalUnits = 0;
  let validRecords = 0;
  let rowsWithData = 0;
  const uniqueItems = new Set();
  const sampleData = [];
  
  // Process ALL rows
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;
    
    const itemCode = row[19]?.toString()?.trim();   // Column T (0-indexed = 19)
    const units = parseFloat(row[34]) || 0;         // Column AI (0-indexed = 34)
    
    if (itemCode && itemCode.length > 0) {
      rowsWithData++;
      uniqueItems.add(itemCode);
      
      if (units > 0) {
        totalUnits += units;
        validRecords++;
        
        // Collect sample data
        if (sampleData.length < 10) {
          sampleData.push({
            row: i + 1,
            itemCode,
            units
          });
        }
      }
    }
  }
  
  return {
    file: 'Historical Sales',
    sheet: targetSheet,
    sheetsAvailable: sheetNames,
    totalRows: jsonData.length,
    rowsWithData,
    validRecords,
    headerColumns: headerRow?.slice(0, 40) || [],
    totals: {
      totalUnits: Math.round(totalUnits),
      uniqueItems: uniqueItems.size
    },
    sampleData,
    columnMapping: {
      T: 'Item Code (Column 20)',
      AI: 'Units (Column 35)'
    }
  };
}
