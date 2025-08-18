import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test the current-baseline-costs API with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 9000); // 9 second timeout (less than the 10s in main page)

    const startTime = Date.now();
    
    const response = await fetch('http://localhost:3000/api/current-baseline-costs', {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });

    clearTimeout(timeoutId);
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        message: 'Baseline costs API working properly',
        duration_ms: duration,
        response_size: JSON.stringify(data).length,
        scenarios_analyzed: data.metadata?.scenarios_analyzed || 0
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}: ${response.statusText}`,
        duration_ms: duration
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      is_timeout: errorMessage.includes('abort') || errorMessage.includes('timeout'),
      fixed: errorMessage.includes('abort') ? 'Timeout handled gracefully' : 'Other error'
    });
  }
}
