import { NextRequest, NextResponse } from 'next/server';
import { TIMEOUT_CONFIGS } from '@/lib/api-timeout-utils';

// Diagnostic endpoint to test different timeout scenarios
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testType = searchParams.get('test') || 'quick';
  const delay = parseInt(searchParams.get('delay') || '0');
  
  const startTime = Date.now();
  
  try {
    // Add artificial delay if requested
    if (delay > 0 && delay <= 30000) { // Max 30 second delay for safety
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const responseTime = Date.now() - startTime;
    const config = TIMEOUT_CONFIGS[testType as keyof typeof TIMEOUT_CONFIGS] || TIMEOUT_CONFIGS.fast;
    
    return NextResponse.json({
      success: true,
      testType,
      delay,
      responseTime,
      timeoutConfig: config,
      status: responseTime < config.timeout ? 'within_timeout' : 'exceeded_timeout',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        uptime: process.uptime(),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Test different timeout scenarios
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { tests = ['fast', 'medium', 'slow'] } = body;
    
    const results = [];
    
    for (const testType of tests) {
      const config = TIMEOUT_CONFIGS[testType as keyof typeof TIMEOUT_CONFIGS];
      if (!config) continue;
      
      const testStart = Date.now();
      
      try {
        // Simulate work that takes a reasonable amount of time
        const simulationDelay = Math.min(config.timeout / 10, 5000); // 10% of timeout, max 5s
        await new Promise(resolve => setTimeout(resolve, simulationDelay));
        
        results.push({
          testType,
          success: true,
          responseTime: Date.now() - testStart,
          config,
          status: 'completed'
        });
      } catch (error) {
        results.push({
          testType,
          success: false,
          responseTime: Date.now() - testStart,
          config,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      totalResponseTime: Date.now() - startTime,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
