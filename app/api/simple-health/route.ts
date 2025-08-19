import { NextResponse } from 'next/server';

// Ultra-simple health check without any dependencies
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: Date.now() 
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
