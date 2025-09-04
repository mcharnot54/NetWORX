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

interface NetworkFootprintData {
  itemCode: string;      // Column A
  avgCost: number;       // Column M
  unitsPerCase: number;  // Column N
  totalUnits: number;    // Column Q
  inventoryValue: number; // Column S
}

interface HistoricalSalesData {
  itemCode: string;      // Column T
  totalUnits: number;    // Column AI
}

interface BaselineResults {
  summary: {
    totalInventoryValue: number;
    totalUnits: number;
    totalCOGS: number;
    totalPallets: number;
    dsoCalculation: number;
    matchedItems: number;
    unmatchedItems: number;
  };
  calculations: {
    networkFootprint: {
      totalItems: number;
      totalInventoryValue: number;
      totalUnits: number;
    };
    historicalSales: {
      totalItems: number;
      totalUnits: number;
      aggregatedByItem: Record<string, number>;
    };
    matched: {
      items: Array<{
        itemCode: string;
        networkUnits: number;
        salesUnits: number;
        inventoryValue: number;
        avgCost: number;
        cogs: number;
        pallets: number;
      }>;
      totals: {
        units: number;
        inventoryValue: number;
        cogs: number;
        pallets: number;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const { networkFootprintKey, historicalSalesKey } = await request.json();

    if (!networkFootprintKey || !historicalSalesKey) {
      return NextResponse.json(
        { error: 'Both networkFootprintKey and historicalSalesKey are required' },
        { status: 400 }
      );
    }

    console.log('Starting baseline analysis...');
    console.log('Network Footprint Key:', networkFootprintKey);
    console.log('Historical Sales Key:', historicalSalesKey);

    // Download and process Network Footprint file
    const networkData = await downloadAndProcessNetworkFootprint(networkFootprintKey);
    console.log(`Processed ${networkData.length} Network Footprint records`);

    // Download and process Historical Sales file
    const salesData = await downloadAndProcessHistoricalSales(historicalSalesKey);
    console.log(`Processed ${salesData.length} Historical Sales records`);

    // Perform baseline calculations
    const results = calculateBaselineMetrics(networkData, salesData);

    return NextResponse.json({
      success: true,
      message: 'Baseline analysis completed successfully',
      results,
      processedAt: new Date().toISOString(),
      files: {
        networkFootprint: networkFootprintKey,
        historicalSales: historicalSalesKey
      }
    });

  } catch (error) {
    console.error('Error in baseline analysis:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze baseline data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function downloadAndProcessNetworkFootprint(s3Key: string): Promise<NetworkFootprintData[]> {
  // Download file from S3
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Network Footprint file from S3');
  }

  // Parse Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  // Find the sheet with actual data - prioritize "DATA DUMP" specifically
  let targetSheetName = workbook.SheetNames[0]; // fallback

  // First priority: exact match for "DATA DUMP"
  if (workbook.SheetNames.includes('DATA DUMP')) {
    targetSheetName = 'DATA DUMP';
  } else {
    // Second priority: sheets with "dump", "master", or "data" (but not "asks")
    for (const sheetName of workbook.SheetNames) {
      if ((sheetName.toLowerCase().includes('dump') ||
           sheetName.toLowerCase().includes('master') ||
           (sheetName.toLowerCase().includes('data') && !sheetName.toLowerCase().includes('asks')))) {
        targetSheetName = sheetName;
        break;
      }
    }
  }

  console.log(`Network Footprint: Using sheet "${targetSheetName}" from available: ${workbook.SheetNames.join(', ')}`);
  const worksheet = workbook.Sheets[targetSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`Network Footprint file has ${jsonData.length} rows`);

  const data: NetworkFootprintData[] = [];
  
  // Process data starting from row 2 (skip header)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    if (!row || row.length === 0) continue;

    const itemCode = row[0]?.toString()?.trim(); // Column A
    const avgCost = parseFloat(row[12]) || 0;     // Column M (0-indexed = 12)
    const unitsPerCase = parseFloat(row[13]) || 0; // Column N (0-indexed = 13)
    const totalUnits = parseFloat(row[16]) || 0;   // Column Q (0-indexed = 16)
    const inventoryValue = parseFloat(row[18]) || 0; // Column S (0-indexed = 18)

    if (itemCode && (totalUnits > 0 || inventoryValue > 0)) {
      data.push({
        itemCode,
        avgCost,
        unitsPerCase,
        totalUnits,
        inventoryValue
      });
    }
  }

  console.log(`Extracted ${data.length} valid Network Footprint records`);
  return data;
}

async function downloadAndProcessHistoricalSales(s3Key: string): Promise<HistoricalSalesData[]> {
  // Download file from S3
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error('Failed to download Historical Sales file from S3');
  }

  // Parse Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  // Find the sheet with actual sales data - prioritize sheets with dates or sales-related names
  let targetSheetName = workbook.SheetNames[0]; // fallback

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase().includes('may') ||
        sheetName.toLowerCase().includes('sales') ||
        sheetName.toLowerCase().includes('data') ||
        sheetName.match(/\d{2,4}/)) { // Contains year/month numbers
      targetSheetName = sheetName;
      break;
    }
  }

  console.log(`Historical Sales: Using sheet "${targetSheetName}" from available: ${workbook.SheetNames.join(', ')}`);
  const worksheet = workbook.Sheets[targetSheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log(`Historical Sales file has ${jsonData.length} rows`);

  const data: HistoricalSalesData[] = [];
  
  // Process data starting from row 2 (skip header)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    if (!row || row.length === 0) continue;

    const itemCode = row[19]?.toString()?.trim(); // Column T (0-indexed = 19)
    const totalUnits = parseFloat(row[34]) || 0;   // Column AI (0-indexed = 34)

    if (itemCode && totalUnits > 0) {
      data.push({
        itemCode,
        totalUnits
      });
    }
  }

  console.log(`Extracted ${data.length} valid Historical Sales records`);
  return data;
}

function calculateBaselineMetrics(
  networkData: NetworkFootprintData[], 
  salesData: HistoricalSalesData[]
): BaselineResults {
  
  // Aggregate historical sales data by item code
  const salesByItem: Record<string, number> = {};
  let totalSalesUnits = 0;
  
  salesData.forEach(item => {
    if (!salesByItem[item.itemCode]) {
      salesByItem[item.itemCode] = 0;
    }
    salesByItem[item.itemCode] += item.totalUnits;
    totalSalesUnits += item.totalUnits;
  });

  console.log(`Aggregated sales data: ${Object.keys(salesByItem).length} unique items, ${totalSalesUnits.toLocaleString()} total units`);

  // Calculate network footprint totals
  const networkTotals = networkData.reduce(
    (acc, item) => ({
      inventoryValue: acc.inventoryValue + item.inventoryValue,
      units: acc.units + item.totalUnits
    }),
    { inventoryValue: 0, units: 0 }
  );

  console.log(`Network totals: $${networkTotals.inventoryValue.toLocaleString()} inventory, ${networkTotals.units.toLocaleString()} units`);

  // Match data and perform calculations
  const matchedItems = [];
  let matchedCount = 0;
  let totalCOGS = 0;
  let totalPallets = 0;
  let matchedInventoryValue = 0;
  let matchedUnits = 0;

  for (const networkItem of networkData) {
    const salesUnits = salesByItem[networkItem.itemCode] || 0;
    
    if (salesUnits > 0) {
      matchedCount++;
      
      // Calculate COGS: Average Cost × Units
      const cogs = networkItem.avgCost * networkItem.totalUnits;
      
      // Calculate pallets: (Units ÷ Units per Case) ÷ 45 cases per pallet
      const pallets = networkItem.unitsPerCase > 0 
        ? Math.ceil(networkItem.totalUnits / networkItem.unitsPerCase / 45)
        : 0;
      
      totalCOGS += cogs;
      totalPallets += pallets;
      matchedInventoryValue += networkItem.inventoryValue;
      matchedUnits += networkItem.totalUnits;
      
      matchedItems.push({
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

  console.log(`Matched ${matchedCount} items`);
  console.log(`Total COGS: $${totalCOGS.toLocaleString()}`);
  console.log(`Total Pallets: ${totalPallets.toLocaleString()}`);
  console.log(`DSO: ${dsoCalculation.toFixed(1)} days`);

  return {
    summary: {
      totalInventoryValue: networkTotals.inventoryValue,
      totalUnits: networkTotals.units,
      totalCOGS,
      totalPallets,
      dsoCalculation,
      matchedItems: matchedCount,
      unmatchedItems: networkData.length - matchedCount
    },
    calculations: {
      networkFootprint: {
        totalItems: networkData.length,
        totalInventoryValue: networkTotals.inventoryValue,
        totalUnits: networkTotals.units
      },
      historicalSales: {
        totalItems: salesData.length,
        totalUnits: totalSalesUnits,
        aggregatedByItem: salesByItem
      },
      matched: {
        items: matchedItems,
        totals: {
          units: matchedUnits,
          inventoryValue: matchedInventoryValue,
          cogs: totalCOGS,
          pallets: totalPallets
        }
      }
    }
  };
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 's3-analyze-baseline',
    status: 'ok',
    description: 'Analyzes Network Footprint and Historical Sales data for baseline calculations',
    calculations: [
      'DSO (Days Sales Outstanding)',
      'COGS (Cost of Goods Sold)', 
      'Total Pallet Count',
      'Inventory Turnover',
      'Data Matching & Aggregation'
    ],
    timestamp: new Date().toISOString()
  });
}
