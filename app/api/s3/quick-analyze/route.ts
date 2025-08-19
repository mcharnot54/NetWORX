import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Use the known S3 keys from your uploads
    const networkFootprintKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';

    console.log('Triggering baseline analysis with known keys...');
    console.log('Network:', networkFootprintKey);
    console.log('Sales:', historicalSalesKey);

    // Call the main analysis endpoint
    const analysisResponse = await fetch('http://localhost:3000/api/s3/analyze-baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        networkFootprintKey,
        historicalSalesKey
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
    }

    const result = await analysisResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Quick analysis completed successfully',
      files: {
        networkFootprint: networkFootprintKey,
        historicalSales: historicalSalesKey
      },
      ...result
    });

  } catch (error) {
    console.error('Error in quick analysis:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to run quick analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 's3-quick-analyze',
    status: 'ok',
    description: 'Quick analysis trigger using known S3 file keys',
    files: {
      networkFootprint: 'Network Footprint and Capacity-Active Skus-Upload (2).xlsx',
      historicalSales: 'Historial Sales Data Continuum Datasets 050125 (3).xlsx'
    },
    timestamp: new Date().toISOString()
  });
}
