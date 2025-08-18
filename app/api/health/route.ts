import { NextRequest, NextResponse } from 'next/server';
import { withCache, CacheKeys } from '@/lib/cache-utils';

export async function GET(request: NextRequest) {
  try {
    // Simple, fast health check without caching
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      // Simplified memory check to avoid performance issues
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
