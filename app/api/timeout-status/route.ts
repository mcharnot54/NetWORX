import { NextRequest, NextResponse } from 'next/server';
import { timeoutPrevention } from '@/lib/timeout-prevention';

export async function GET(request: NextRequest) {
  try {
    const stats = timeoutPrevention.getTimeoutStats();
    const slowRequests = timeoutPrevention.getSlowRequests(3000); // Requests slower than 3s
    
    // Determine health status
    let healthStatus = 'healthy';
    if (stats.timeoutRate > 10) {
      healthStatus = 'critical';
    } else if (stats.timeoutRate > 5 || stats.avgDuration > 10000) {
      healthStatus = 'warning';
    }
    
    return NextResponse.json({
      success: true,
      status: healthStatus,
      stats,
      slowRequests,
      recommendations: generateRecommendations(stats),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'cleanup':
        timeoutPrevention.cleanup();
        return NextResponse.json({
          success: true,
          message: 'Timeout monitoring cleaned up',
          timestamp: new Date().toISOString()
        });
        
      case 'reset':
        timeoutPrevention.cleanup();
        return NextResponse.json({
          success: true,
          message: 'Timeout monitoring reset',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.timeoutRate > 10) {
    recommendations.push('High timeout rate detected. Consider increasing timeout values or optimizing slow operations.');
  }
  
  if (stats.avgDuration > 10000) {
    recommendations.push('Average request duration is high. Consider optimizing database queries and API responses.');
  }
  
  if (stats.activeRequests > 10) {
    recommendations.push('Many active requests detected. Consider implementing request queuing or rate limiting.');
  }
  
  if (stats.successRate < 90) {
    recommendations.push('Low success rate detected. Check for network issues or server problems.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All timeout metrics look healthy.');
  }
  
  return recommendations;
}
