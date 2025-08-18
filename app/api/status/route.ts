import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test basic functionality
    const status = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      responseTime: Date.now() - startTime,
      database: {
        url_configured: !!process.env.DATABASE_URL,
        url_prefix: process.env.DATABASE_URL?.substring(0, 20) + '...'
      }
    };

    return NextResponse.json({
      status: 'ok',
      ...status
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 500 });
  }
}
