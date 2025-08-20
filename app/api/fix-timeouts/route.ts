import { NextRequest, NextResponse } from 'next/server';
import { quickTimeoutHealthCheck, emergencyTimeoutReset, timeoutFixer } from '@/lib/timeout-fixer';

export async function GET(request: NextRequest) {
  try {
    const healthCheck = await quickTimeoutHealthCheck();
    
    return NextResponse.json({
      success: true,
      ...healthCheck,
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
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'detect':
        const issues = await timeoutFixer.detectIssues();
        return NextResponse.json({
          success: true,
          issues,
          summary: timeoutFixer.getHealthSummary(),
          timestamp: new Date().toISOString()
        });
        
      case 'fix':
        const { fixed, errors } = await timeoutFixer.applyAutomaticFixes();
        return NextResponse.json({
          success: true,
          message: `Applied ${fixed} automatic fixes`,
          fixed,
          errors,
          timestamp: new Date().toISOString()
        });
        
      case 'emergency_reset':
        const resetResult = emergencyTimeoutReset();
        return NextResponse.json({
          success: resetResult.success,
          message: resetResult.message || resetResult.error,
          timestamp: new Date().toISOString()
        });
        
      case 'health_check':
        const healthResult = await quickTimeoutHealthCheck();
        return NextResponse.json({
          success: true,
          ...healthResult,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: detect, fix, emergency_reset, or health_check'
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
