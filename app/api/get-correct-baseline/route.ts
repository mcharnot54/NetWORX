import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';
import { createS3Client, getBucketName } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const s3Client = createS3Client();
const S3_BUCKET = getBucketName();

export async function GET() {
  try {
    console.log('Starting CORRECTED baseline analysis with all rows...');
    
    const networkFootprintKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';

    // Process Network Footprint file (ALL ROWS)
    const networkData = await processNetworkFootprintComplete(networkFootprintKey);
    console.log(`Network processing complete: ${networkData.validItems} items`);

    // Process Historical Sales file (ALL ROWS)  
    const salesData = await processHistoricalSalesComplete(historicalSalesKey);
    console.log(`Sales processing complete: ${salesData.validRecords} records`);

    // Perform matching and calculations
    const analysis = performFullAnalysis(networkData, salesData);

    return NextResponse.json({
      success: true,
      message: 'CORRECTED baseline analysis completed with ALL data',
      results: analysis,
      processing: {
        networkFootprint: {
          totalRows: networkData.totalRows,
          validItems: networkData.validItems,
          sheet: networkData.sheet
        },
        historicalSales: {
          totalRows: salesData.totalRows,
          validRecords: salesData.validRecords,
          sheet: salesData.sheet
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in corrected baseline analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function processNetworkFootprintComplete(s3Key: string) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Network Footprint file');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const targetSheet = workbook.SheetNames.includes('DATA DUMP') ? 'DATA DUMP' : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheet];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`Network: Processing ALL ${jsonData.length} rows from "${targetSheet}"`);

  const items = [];
  let totalInventoryValue = 0;
  let totalUnits = 0;
  let validItems = 0;

  // Process ALL rows (skip header)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const itemCode = row[0]?.toString()?.trim();          // Column A
    const avgCost = parseFloat(row[12]) || 0;             // Column M (index 12)
    const unitsPerCase = parseFloat(row[13]) || 0;        // Column N (index 13)
    const totalUnitsQ = parseFloat(row[16]) || 0;         // Column Q (index 16)
    const inventoryValue = parseFloat(row[18]) || 0;      // Column S (index 18)

    if (itemCode && (inventoryValue > 0 || totalUnitsQ > 0)) {
      items.push({
        itemCode,
        avgCost,
        unitsPerCase,
        totalUnits: totalUnitsQ,
        inventoryValue
      });
      
      totalInventoryValue += inventoryValue;
      totalUnits += totalUnitsQ;
      validItems++;
    }
  }

  console.log(`Network Totals: $${totalInventoryValue.toLocaleString()} inventory, ${totalUnits.toLocaleString()} units`);

  return {
    items,
    totalRows: jsonData.length,
    validItems,
    totals: {
      totalInventoryValue,
      totalUnits
    },
    sheet: targetSheet
  };
}

async function processHistoricalSalesComplete(s3Key: string) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Historical Sales file');
  }

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  // Find the best sheet for sales data  
  let targetSheet = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes('may') || 
        name.toLowerCase().includes('24') ||
        name.toLowerCase().includes('apr')) {
      targetSheet = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheet];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`Sales: Processing ALL ${jsonData.length} rows from "${targetSheet}"`);

  const salesByItem = new Map();
  let totalUnits = 0;
  let validRecords = 0;

  // Process ALL rows (skip header)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const itemCode = row[19]?.toString()?.trim();   // Column T (index 19)
    const units = parseFloat(row[34]) || 0;         // Column AI (index 34)

    if (itemCode && units > 0) {
      if (!salesByItem.has(itemCode)) {
        salesByItem.set(itemCode, 0);
      }
      salesByItem.set(itemCode, salesByItem.get(itemCode) + units);
      
      totalUnits += units;
      validRecords++;
    }
  }

  console.log(`Sales Totals: ${totalUnits.toLocaleString()} total units, ${salesByItem.size} unique items`);

  return {
    salesByItem,
    totalRows: jsonData.length,
    validRecords,
    totals: {
      totalUnits,
      uniqueItems: salesByItem.size
    },
    sheet: targetSheet
  };
}

function performFullAnalysis(networkData: any, salesData: any) {
  const { items: networkItems } = networkData;
  const { salesByItem } = salesData;

  let matchedItems = 0;
  let totalCOGS = 0;
  let totalPallets = 0;
  let matchedInventoryValue = 0;
  let matchedNetworkUnits = 0;

  const matchedItemsList = [];

  // Match items and calculate metrics
  for (const networkItem of networkItems) {
    const salesUnits = salesByItem.get(networkItem.itemCode) || 0;
    
    if (salesUnits > 0) {
      matchedItems++;
      
      // Calculate COGS: Average Cost × Network Units
      const cogs = networkItem.avgCost * networkItem.totalUnits;
      
      // Calculate pallets: (Units ÷ Units per Case) ÷ 45 cases per pallet
      const pallets = networkItem.unitsPerCase > 0 
        ? Math.ceil(networkItem.totalUnits / networkItem.unitsPerCase / 45)
        : 0;
      
      totalCOGS += cogs;
      totalPallets += pallets;
      matchedInventoryValue += networkItem.inventoryValue;
      matchedNetworkUnits += networkItem.totalUnits;
      
      matchedItemsList.push({
        itemCode: networkItem.itemCode,
        networkUnits: networkItem.totalUnits,
        salesUnits,
        inventoryValue: networkItem.inventoryValue,
        avgCost: networkItem.avgCost,
        cogs,
        pallets
      });
    }
  }

  // Calculate DSO: (Average Inventory Value / COGS) × 365
  const dsoCalculation = totalCOGS > 0 ? (matchedInventoryValue / totalCOGS) * 365 : 0;

  return {
    summary: {
      totalInventoryValue: Math.round(networkData.totals.totalInventoryValue),
      totalNetworkUnits: Math.round(networkData.totals.totalUnits),
      totalHistoricalUnits: Math.round(salesData.totals.totalUnits),
      totalCOGS: Math.round(totalCOGS),
      totalPallets: Math.round(totalPallets),
      dsoCalculation: Math.round(dsoCalculation * 10) / 10,
      matchedItems,
      unmatchedItems: networkItems.length - matchedItems,
      matchRate: Math.round((matchedItems / networkItems.length) * 1000) / 10
    },
    validation: {
      expectedInventory: 48000000,
      actualInventory: Math.round(networkData.totals.totalInventoryValue),
      inventoryDiff: Math.round(networkData.totals.totalInventoryValue - 48000000),
      
      expectedNetworkUnits: 13000000,
      actualNetworkUnits: Math.round(networkData.totals.totalUnits),
      networkUnitsDiff: Math.round(networkData.totals.totalUnits - 13000000),
      
      expectedHistoricalUnits: 15000000,
      actualHistoricalUnits: Math.round(salesData.totals.totalUnits),
      historicalUnitsDiff: Math.round(salesData.totals.totalUnits - 15000000),
      
      expectedPallets: '14K-18K',
      actualPallets: Math.round(totalPallets)
    }
  };
}
