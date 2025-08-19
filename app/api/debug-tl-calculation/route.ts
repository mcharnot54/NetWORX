import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🐛 Debugging TL TOTAL 2024 calculation...');
    
    // Simulate the exact logic from MultiTabExcelUploader for TL processing
    const debug = {
      expected_total_2024: 376965,
      actual_extracted: 690712,
      difference: 690712 - 376965,
      ratio: (690712 / 376965).toFixed(2),
      possible_causes: [
        "Double counting rows (processing same data twice)",
        "Including total/summary rows that should be filtered out", 
        "Wrong column being processed",
        "Cached data from previous calculation",
        "Accumulating across multiple processing runs"
      ],
      investigation_steps: [
        "1. Check if extractedAmount is reset to 0 for each tab",
        "2. Verify the 'total' keyword filtering is working", 
        "3. Confirm we're processing the right Gross Rate column",
        "4. Check if there are duplicate rows in the data",
        "5. Verify no cached values are being added"
      ],
      suspected_issue: "The ratio of 1.83 suggests we might be including summary/total rows that should be filtered out, or there's some double-counting happening.",
      fix_needed: "Add more aggressive filtering for TOTAL 2024 tab specifically, or check for data duplication"
    };

    return NextResponse.json({
      success: true,
      debug_info: debug,
      recommendation: "The discrepancy suggests either rows containing 'total' keywords aren't being filtered out properly, or there's duplicate data processing. Need to add debug logging to see exact rows being processed."
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
