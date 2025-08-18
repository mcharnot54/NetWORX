import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Ultra-simple ping endpoint with minimal processing
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    message: 'Server is responsive'
  });
}
