import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Triggering baseline analysis...');
    
    // Use the known S3 keys from the uploads
    const networkFootprintKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';

    // Call the analysis endpoint
    const response = await fetch('http://localhost:3000/api/s3/analyze-baseline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        networkFootprintKey,
        historicalSalesKey
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Return formatted results
    return NextResponse.json({
      success: true,
      message: 'Baseline analysis completed successfully',
      summary: result.results.summary,
      files: {
        networkFootprint: 'Network Footprint and Capacity-Active Skus-Upload (2).xlsx',
        historicalSales: 'Historial Sales Data Continuum Datasets 050125 (3).xlsx'
      },
      metrics: {
        totalInventoryValue: result.results.summary.totalInventoryValue,
        totalCOGS: result.results.summary.totalCOGS,
        totalUnits: result.results.summary.totalUnits,
        totalPallets: result.results.summary.totalPallets,
        dso: result.results.summary.dsoCalculation,
        matchedItems: result.results.summary.matchedItems,
        unmatchedItems: result.results.summary.unmatchedItems,
        matchRate: ((result.results.summary.matchedItems / (result.results.summary.matchedItems + result.results.summary.unmatchedItems)) * 100).toFixed(1)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering baseline analysis:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger baseline analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'trigger-baseline',
    status: 'ready',
    description: 'Triggers baseline analysis with uploaded files',
    files: {
      networkFootprint: 'Network Footprint and Capacity-Active Skus-Upload (2).xlsx',
      historicalSales: 'Historial Sales Data Continuum Datasets 050125 (3).xlsx'
    }
  });
}
