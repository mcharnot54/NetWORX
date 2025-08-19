import { NextRequest, NextResponse } from 'next/server';
import { withApiTimeout, TIMEOUT_CONFIGS } from '@/lib/api-timeout-utils';

export async function POST(request: NextRequest) {
  return withApiTimeout(async () => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const fileType = formData.get('fileType') as string || 'INVENTORY_TRACKER';
      const scenarioId = formData.get('scenarioId') as string || '1';

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      
      if (!isValidFile) {
        return NextResponse.json(
          { success: false, error: 'Invalid file type. Only Excel and CSV files are supported.' },
          { status: 400 }
        );
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return NextResponse.json(
          { success: false, error: 'File too large. Maximum size is 50MB.' },
          { status: 400 }
        );
      }

      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract inventory data based on file type
      const inventoryData = await extractInventoryData(file, fileType);

      // Simulate database storage
      await new Promise(resolve => setTimeout(resolve, 500));

      return NextResponse.json({
        success: true,
        message: 'File uploaded and processed successfully',
        fileId: Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        fileSize: file.size,
        fileType,
        scenarioId,
        inventoryValue: inventoryData.totalValue,
        skuCount: inventoryData.skuCount,
        tabs: inventoryData.tabs,
        processingTime: Date.now(),
        extractedData: {
          categories: inventoryData.categories,
          locations: inventoryData.locations,
          summary: inventoryData.summary
        }
      });

    } catch (error) {
      console.error('Inventory upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Handle specific error types
      if (errorMessage.includes('timeout')) {
        return NextResponse.json(
          { success: false, error: 'File processing timed out. Please try with a smaller file.' },
          { status: 408 }
        );
      }

      if (errorMessage.includes('memory')) {
        return NextResponse.json(
          { success: false, error: 'File too large to process. Please reduce file size.' },
          { status: 413 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  }, TIMEOUT_CONFIGS.slow);
}

async function extractInventoryData(file: File, fileType: string) {
  // Simulate inventory data extraction
  const buffer = await file.arrayBuffer();
  
  // Mock data extraction based on file size and type
  const baseSkuCount = Math.floor(file.size / 10000) + 50; // Rough estimate
  const skuCount = Math.min(baseSkuCount, 10000); // Cap at 10k SKUs
  
  const categories = [
    { name: 'Raw Materials', value: Math.floor(Math.random() * 500000) + 100000, skus: Math.floor(skuCount * 0.3) },
    { name: 'Work in Progress', value: Math.floor(Math.random() * 300000) + 50000, skus: Math.floor(skuCount * 0.2) },
    { name: 'Finished Goods', value: Math.floor(Math.random() * 800000) + 200000, skus: Math.floor(skuCount * 0.5) }
  ];

  const locations = [
    { name: 'Main Warehouse', value: Math.floor(Math.random() * 600000) + 200000 },
    { name: 'Secondary Storage', value: Math.floor(Math.random() * 400000) + 100000 },
    { name: 'Distribution Center', value: Math.floor(Math.random() * 300000) + 50000 }
  ];

  const totalValue = categories.reduce((sum, cat) => sum + cat.value, 0);

  // Simulate tab structure for Excel files
  const tabs = file.name.endsWith('.csv') ? [
    {
      name: 'Inventory Data',
      rows: skuCount + 1, // +1 for header
      extractedAmount: totalValue
    }
  ] : [
    {
      name: 'Current Inventory',
      rows: Math.floor(skuCount * 0.6) + 1,
      extractedAmount: Math.floor(totalValue * 0.6)
    },
    {
      name: 'Safety Stock',
      rows: Math.floor(skuCount * 0.3) + 1,
      extractedAmount: Math.floor(totalValue * 0.3)
    },
    {
      name: 'Reorder Points',
      rows: Math.floor(skuCount * 0.1) + 1,
      extractedAmount: Math.floor(totalValue * 0.1)
    }
  ];

  const summary = {
    averageValue: Math.floor(totalValue / skuCount),
    turnoverRate: Math.random() * 6 + 2, // 2-8 turns per year
    daysOnHand: Math.floor(365 / (Math.random() * 6 + 2)),
    fillRate: Math.random() * 15 + 85, // 85-100%
    stockoutRisk: Math.random() * 10 + 5 // 5-15%
  };

  return {
    totalValue,
    skuCount,
    categories,
    locations,
    tabs,
    summary
  };
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'inventory-upload',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /': 'Upload inventory files'
    }
  });
}
