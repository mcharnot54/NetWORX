import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { baseline_cost } = await request.json();
    
    if (!baseline_cost || baseline_cost < 1000000) {
      return NextResponse.json({
        success: false,
        error: 'Valid baseline cost is required (should be > $1M)'
      }, { status: 400 });
    }

    // Extract the baseline from the TL file first
    const extractResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/extract-baseline-from-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    let actualBaseline = baseline_cost;
    
    if (extractResponse.ok) {
      const extractData = await extractResponse.json();
      if (extractData.success && extractData.baseline_freight_cost_2025) {
        actualBaseline = extractData.baseline_freight_cost_2025;
        console.log('Using extracted baseline from TL file:', actualBaseline);
      }
    } else {
      console.log('Could not extract from TL file, using provided baseline:', actualBaseline);
    }

    // Update the simple-transport-generation route with the new baseline
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), 'app/api/simple-transport-generation/route.ts');
    let fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Replace the hardcoded baseline values
    const oldBaseline = 'const baseline2025FreightCost = 5500000;';
    const newBaseline = `const baseline2025FreightCost = ${actualBaseline}; // Extracted from TL file`;
    
    fileContent = fileContent.replace(oldBaseline, newBaseline);
    
    // Also update the fallback function
    const oldFallbackBaseline = 'const baseline2025FreightCost = 5500000;';
    const newFallbackBaseline = `const baseline2025FreightCost = ${actualBaseline}; // Extracted from TL file`;
    
    // Replace all instances
    fileContent = fileContent.replace(/const baseline2025FreightCost = \d+;/g, 
      `const baseline2025FreightCost = ${actualBaseline}; // Extracted from TL file`);
    
    await fs.writeFile(filePath, fileContent);
    
    console.log(`Updated Transport Optimizer baseline from $5.5M to $${(actualBaseline/1000000).toFixed(1)}M`);

    return NextResponse.json({
      success: true,
      message: 'Transport Optimizer updated with actual baseline cost',
      old_baseline: 5500000,
      new_baseline: actualBaseline,
      baseline_change: actualBaseline - 5500000,
      source: 'TL file extraction',
      formatted_baseline: `$${(actualBaseline/1000000).toFixed(1)}M`
    });

  } catch (error) {
    console.error('Error updating transport baseline:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to update baseline: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check current baseline in the file
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const filePath = path.join(process.cwd(), 'app/api/simple-transport-generation/route.ts');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Extract current baseline value
    const baselineMatch = fileContent.match(/const baseline2025FreightCost = (\d+);/);
    const currentBaseline = baselineMatch ? parseInt(baselineMatch[1]) : null;
    
    return NextResponse.json({
      success: true,
      current_baseline: currentBaseline,
      current_baseline_formatted: currentBaseline ? `$${(currentBaseline/1000000).toFixed(1)}M` : 'Not found',
      is_estimated: currentBaseline === 5500000,
      next_steps: [
        'Extract actual baseline from TL file',
        'Update Transport Optimizer with real data',
        'Regenerate scenarios with correct baseline'
      ]
    });

  } catch (error) {
    console.error('Error checking current baseline:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to check baseline: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
