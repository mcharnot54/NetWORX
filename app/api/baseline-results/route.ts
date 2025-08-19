import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Call the quick summary endpoint
    const response = await fetch('http://localhost:3000/api/quick-baseline-summary');
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get baseline data');
    }

    const summary = data.summary;
    const details = data.details;

    // Format the results for display
    const formattedResults = {
      "🎯 BASELINE ANALYSIS COMPLETE": "✅",
      "": "",
      "📊 KEY METRICS": "",
      "Total Inventory Value": `$${(summary.totalInventoryValue / 1000000).toFixed(1)}M`,
      "Total Units": `${(summary.totalUnits / 1000000).toFixed(1)}M units`,
      "Average Cost per Unit": `$${summary.avgCostPerUnit}`,
      "Estimated Pallets": `${summary.totalPallets.toLocaleString()} pallets`,
      " ": "",
      "📋 FILE PROCESSING": "",
      "Network Footprint Items": `${details.networkFootprint.totalItems.toLocaleString()} items processed`,
      "Network Footprint Value": `$${(details.networkFootprint.totalInventory / 1000000).toFixed(1)}M`,
      "Historical Sales Records": `${details.historicalSales.totalRecords.toLocaleString()} records`,
      "Historical Sales Units": `${(details.historicalSales.totalUnits / 1000000).toFixed(1)}M units`,
      "Unique Items in Sales": `${details.historicalSales.uniqueItems.toLocaleString()} unique SKUs`,
      "  ": "",
      "📁 SHEETS USED": "",
      "Network Footprint Sheets": details.networkFootprint.sheetsFound.join(', '),
      "Historical Sales Sheets": details.historicalSales.sheetsFound.join(', '),
      "   ": "",
      "⏰ STATUS": `Analysis completed at ${new Date().toLocaleTimeString()}`,
      "🔍 NOTES": "This is a quick analysis of first 1000 rows from each file"
    };

    return NextResponse.json(formattedResults, { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error) {
    return NextResponse.json(
      { 
        "❌ ERROR": error instanceof Error ? error.message : 'Analysis failed',
        "🔧 SOLUTION": "Try refreshing or check file uploads"
      },
      { status: 500 }
    );
  }
}
