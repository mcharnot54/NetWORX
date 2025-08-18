import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = {
      rl_debug: null,
      tl_debug: null,
      errors: []
    };

    // Test R&L file
    try {
      const rlResponse = await fetch('http://localhost:3000/api/debug-rl-column-v');
      results.rl_debug = await rlResponse.json();
    } catch (error) {
      results.errors.push(`R&L debug error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Test TL file
    try {
      const tlResponse = await fetch('http://localhost:3000/api/debug-tl-totals');
      results.tl_debug = await tlResponse.json();
    } catch (error) {
      results.errors.push(`TL debug error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error testing extractions:', error);
    return NextResponse.json({
      error: 'Failed to test extractions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
