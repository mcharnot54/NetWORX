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

export async function GET() {
  try {
    console.log('🎯 Starting FINAL CORRECTED baseline analysis...');
    
    const networkFootprintKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';

    // Process Network Footprint file completely
    const networkData = await processNetworkFootprintFinal(networkFootprintKey);
    console.log(`✅ Network processing complete: ${networkData.validItems} items`);

    // Calculate baseline metrics
    const baseline = calculateFinalBaseline(networkData);

    return NextResponse.json({
      success: true,
      message: '🎯 FINAL CORRECTED BASELINE ANALYSIS',
      baseline: {
        "📊 TOTAL INVENTORY VALUE": `$${(baseline.totalInventoryValue / 1000000).toFixed(1)}M`,
        "📦 TOTAL UNITS": `${(baseline.totalUnits / 1000000).toFixed(1)}M units`,
        "💰 AVERAGE COST PER UNIT": `$${baseline.avgCostPerUnit.toFixed(2)}`,
        "🚛 TOTAL PALLETS": `${baseline.totalPallets.toLocaleString()} pallets`,
        "🎯 TOTAL COGS (ESTIMATED)": `$${(baseline.estimatedCOGS / 1000000).toFixed(1)}M`,
        "📈 DSO (ESTIMATED)": `${baseline.estimatedDSO.toFixed(1)} days`
      },
      validation: {
        "✅ INVENTORY VALUE": {
          expected: "$48M",
          actual: `$${(baseline.totalInventoryValue / 1000000).toFixed(1)}M`,
          status: Math.abs(baseline.totalInventoryValue - 48000000) < 5000000 ? "✅ MATCH" : "❌ DIFF",
          difference: `${((baseline.totalInventoryValue - 48000000) / 1000000).toFixed(1)}M`
        },
        "✅ NETWORK UNITS": {
          expected: "13M",
          actual: `${(baseline.totalUnits / 1000000).toFixed(1)}M`,
          status: Math.abs(baseline.totalUnits - 13000000) < 1000000 ? "✅ MATCH" : "❌ DIFF",
          difference: `${((baseline.totalUnits - 13000000) / 1000000).toFixed(1)}M`
        },
        "✅ PALLET COUNT": {
          expected: "14K-18K",
          actual: `${(baseline.totalPallets / 1000).toFixed(1)}K`,
          status: baseline.totalPallets >= 14000 && baseline.totalPallets <= 18000 ? "✅ IN RANGE" : "❌ OUT OF RANGE"
        }
      },
      details: {
        processedItems: networkData.validItems,
        totalRows: networkData.totalRows,
        sheet: networkData.sheet,
        calculations: {
          totalInventoryValue: baseline.totalInventoryValue,
          totalUnits: baseline.totalUnits,
          avgCostPerUnit: baseline.avgCostPerUnit,
          totalPallets: baseline.totalPallets,
          estimatedCOGS: baseline.estimatedCOGS,
          estimatedDSO: baseline.estimatedDSO
        }
      },
      note: "Historical Sales file had parsing issues - using Network Footprint for baseline calculations",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in final corrected baseline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function processNetworkFootprintFinal(s3Key: string) {
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

  console.log(`📋 Processing ALL ${jsonData.length} rows from "${targetSheet}"`);

  const items = [];
  let totalInventoryValue = 0;
  let totalUnits = 0;
  let totalAvgCost = 0;
  let totalUnitsPerCase = 0;
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
      totalAvgCost += avgCost;
      totalUnitsPerCase += unitsPerCase;
      validItems++;
    }
  }

  return {
    items,
    totalRows: jsonData.length,
    validItems,
    totals: {
      totalInventoryValue,
      totalUnits,
      avgAvgCost: validItems > 0 ? totalAvgCost / validItems : 0,
      avgUnitsPerCase: validItems > 0 ? totalUnitsPerCase / validItems : 0
    },
    sheet: targetSheet
  };
}

function calculateFinalBaseline(networkData: any) {
  const { totals, items } = networkData;
  
  // Calculate key metrics
  const avgCostPerUnit = totals.totalUnits > 0 ? totals.totalInventoryValue / totals.totalUnits : 0;
  
  // Calculate total pallets using the formula: (Units ÷ Units per Case) ÷ 45 cases per pallet
  let totalPallets = 0;
  for (const item of items) {
    if (item.unitsPerCase > 0) {
      const itemPallets = Math.ceil(item.totalUnits / item.unitsPerCase / 45);
      totalPallets += itemPallets;
    }
  }

  // Estimate COGS using average cost × total units
  const estimatedCOGS = totals.avgAvgCost * totals.totalUnits;
  
  // Estimate DSO: (Inventory Value / COGS) × 365
  const estimatedDSO = estimatedCOGS > 0 ? (totals.totalInventoryValue / estimatedCOGS) * 365 : 0;

  return {
    totalInventoryValue: totals.totalInventoryValue,
    totalUnits: totals.totalUnits,
    avgCostPerUnit,
    totalPallets,
    estimatedCOGS,
    estimatedDSO
  };
}
