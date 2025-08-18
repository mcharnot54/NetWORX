import { NextRequest, NextResponse } from 'next/server';
import { withCache, CacheKeys } from '@/lib/cache-utils';

export async function GET(request: NextRequest) {
  try {
    // Cache health check for 30 seconds to reduce load
    const healthData = await withCache(
      CacheKeys.HEALTH_CHECK,
      async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage(),
      }),
      30 * 1000 // 30 seconds cache
    );

    return NextResponse.json(healthData);
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
