import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Ultra-minimal health check with zero imports and immediate response
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
