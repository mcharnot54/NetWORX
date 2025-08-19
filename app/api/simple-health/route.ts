import { NextResponse } from 'next/server';

// Ultra-simple health check that never times out
export async function GET() {
  try {
    // Immediate response with minimal processing
    return NextResponse.json(
      { 
        status: 'healthy',
        timestamp: Date.now(),
        server: 'running'
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    // Even in error, return immediately
    return NextResponse.json(
      { 
        status: 'error',
        timestamp: Date.now(),
        message: 'Health check failed'
      },
      { status: 500 }
    );
  }
}

// Support all HTTP methods for debugging
export const POST = GET;
export const PUT = GET;
export const DELETE = GET;
export const HEAD = GET;
export const OPTIONS = GET;
