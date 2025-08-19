import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simple database connectivity test
    const { sql } = await import('@/lib/database');
    
    // Test with a very simple query and short timeout
    const startTime = Date.now();
    const result = await Promise.race([
      sql`SELECT 1 as test`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      )
    ]);
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      result: result?.[0] || null
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    
    return NextResponse.json({
      status: 'disconnected',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      suggestion: 'Check DATABASE_URL environment variable and network connectivity'
    }, { status: 503 });
  }
}
