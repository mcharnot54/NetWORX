import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'networx-uploads';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const s3Client = new S3Client({
  region: AWS_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    console.log('Starting quick baseline summary...');
    
    const networkFootprintKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';

    // Process Network Footprint file (quick summary)
    const networkSummary = await getNetworkFootprintSummary(networkFootprintKey);
    console.log('Network summary complete');

    // Process Historical Sales file (quick summary)
    const salesSummary = await getHistoricalSalesSummary(historicalSalesKey);
    console.log('Sales summary complete');

    // Basic calculations
    const totalInventoryValue = networkSummary.totalInventory;
    const totalUnits = networkSummary.totalUnits;
    const avgCostPerUnit = totalUnits > 0 ? totalInventoryValue / totalUnits : 0;
    const estimatedCOGS = avgCostPerUnit * salesSummary.totalUnits;
    const estimatedPallets = Math.ceil(totalUnits / 45); // Simple pallet calculation
    const dso = estimatedCOGS > 0 ? (totalInventoryValue / estimatedCOGS) * 365 : 0;

    return NextResponse.json({
      success: true,
      message: 'Quick baseline summary completed',
      summary: {
        totalInventoryValue: Math.round(totalInventoryValue),
        totalUnits: Math.round(totalUnits),
        totalCOGS: Math.round(estimatedCOGS),
        totalPallets: estimatedPallets,
        dsoCalculation: Math.round(dso * 10) / 10,
        avgCostPerUnit: Math.round(avgCostPerUnit * 100) / 100
      },
      details: {
        networkFootprint: {
          totalItems: networkSummary.itemCount,
          totalInventory: Math.round(networkSummary.totalInventory),
          totalUnits: Math.round(networkSummary.totalUnits),
          sheetsFound: networkSummary.sheetNames
        },
        historicalSales: {
          totalRecords: salesSummary.recordCount,
          totalUnits: Math.round(salesSummary.totalUnits),
          uniqueItems: salesSummary.uniqueItems,
          sheetsFound: salesSummary.sheetNames
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in quick baseline summary:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate quick baseline summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getNetworkFootprintSummary(s3Key: string) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Network Footprint file');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  
  // Use DATA DUMP sheet
  const targetSheetName = sheetNames.includes('DATA DUMP') ? 'DATA DUMP' : sheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let totalInventory = 0;
  let totalUnits = 0;
  let itemCount = 0;

  // Process data (skip header row)
  for (let i = 1; i < Math.min(jsonData.length, 1000); i++) { // Limit to 1000 rows for speed
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const itemCode = row[0]?.toString()?.trim();
    const inventoryValue = parseFloat(row[18]) || 0; // Column S
    const units = parseFloat(row[16]) || 0; // Column Q

    if (itemCode && (inventoryValue > 0 || units > 0)) {
      totalInventory += inventoryValue;
      totalUnits += units;
      itemCount++;
    }
  }

  return {
    totalInventory,
    totalUnits,
    itemCount,
    sheetNames
  };
}

async function getHistoricalSalesSummary(s3Key: string) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Historical Sales file');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  
  // Find sheet with sales data
  let targetSheetName = sheetNames[0];
  for (const name of sheetNames) {
    if (name.toLowerCase().includes('may') || name.toLowerCase().includes('sales')) {
      targetSheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let totalUnits = 0;
  let recordCount = 0;
  const uniqueItems = new Set();

  // Process data (skip header row)
  for (let i = 1; i < Math.min(jsonData.length, 1000); i++) { // Limit to 1000 rows for speed
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const itemCode = row[19]?.toString()?.trim(); // Column T
    const units = parseFloat(row[34]) || 0; // Column AI

    if (itemCode && units > 0) {
      totalUnits += units;
      recordCount++;
      uniqueItems.add(itemCode);
    }
  }

  return {
    totalUnits,
    recordCount,
    uniqueItems: uniqueItems.size,
    sheetNames
  };
}
