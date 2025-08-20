import { NextResponse } from 'next/server';
import { emergencyTimeoutFix, quickTimeoutHealthCheck } from '@/lib/timeout-emergency-fixer';

// Quick endpoint to trigger timeout fix with minimal processing
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Run quick health check
    const health = await quickTimeoutHealthCheck();
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      health,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      message: health.status === 'healthy' ? 'All systems normal' : `System ${health.status} - issues detected`
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST to trigger emergency fix
export async function POST() {
  const startTime = Date.now();
  
  try {
    console.log('Emergency timeout fix triggered via ping endpoint');
    
    const report = await emergencyTimeoutFix();
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'Emergency timeout fix completed successfully',
      report,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Emergency fix failed',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
