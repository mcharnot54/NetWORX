import { NextResponse } from 'next/server';

// Monitor endpoint responsiveness and provide timeout diagnostics
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test multiple internal endpoints with different timeout expectations
    const endpoints = [
      { name: 'fast-ping', path: '/api/fast-ping', expected: 100 },
      { name: 'simple-health', path: '/api/simple-health', expected: 500 },
      { name: 'health', path: '/api/health', expected: 1000 },
      { name: 'status', path: '/api/status', expected: 2000 }
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      const testStart = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`http://localhost:3000${endpoint.path}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - testStart;
        
        results.push({
          name: endpoint.name,
          path: endpoint.path,
          responseTime,
          status: response.status,
          healthy: response.ok && responseTime < endpoint.expected * 5, // 5x tolerance
          expected: endpoint.expected
        });
      } catch (error) {
        results.push({
          name: endpoint.name,
          path: endpoint.path,
          responseTime: Date.now() - testStart,
          status: 'ERROR',
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          expected: endpoint.expected
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    const healthyCount = results.filter(r => r.healthy).length;
    
    return NextResponse.json({
      success: true,
      totalResponseTime: totalTime,
      endpoints: results,
      summary: {
        healthy: healthyCount,
        total: results.length,
        healthyPercentage: Math.round((healthyCount / results.length) * 100)
      },
      serverInfo: {
        uptime: process.uptime(),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        nodeEnv: process.env.NODE_ENV
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
