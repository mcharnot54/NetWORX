import { NextResponse } from 'next/server';
import { 
  emergencyTimeoutFix, 
  quickTimeoutHealthCheck,
  timeoutEmergencyFixer 
} from '@/lib/timeout-emergency-fixer';

// Emergency timeout fix endpoint
export async function POST() {
  try {
    console.log('Emergency timeout fix requested');
    
    const report = await emergencyTimeoutFix();
    
    return NextResponse.json({
      success: true,
      message: 'Emergency timeout fix completed',
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Emergency fix failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Emergency fix failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Quick health check endpoint
export async function GET() {
  try {
    const health = await quickTimeoutHealthCheck();
    const timeSinceLastFix = timeoutEmergencyFixer.timeSinceLastEmergencyFix();
    
    return NextResponse.json({
      success: true,
      health,
      emergencyMode: timeoutEmergencyFixer.isEmergencyMode(),
      timeSinceLastFix: timeSinceLastFix > 0 ? `${Math.round(timeSinceLastFix / 1000)}s ago` : 'Never',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
