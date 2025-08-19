import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const testType = searchParams.get('type') || 'success';

  try {
    // Simulate the same fetch pattern as loadSavedFiles
    const targetUrl = `${request.nextUrl.origin}/api/files?scenarioId=1`;
    
    console.log('Testing response body handling for:', targetUrl);
    const response = await fetch(targetUrl);
    
    // Test the FIXED logic (read response body only once)
    let responseData;
    let success = true;
    let error = null;
    
    try {
      responseData = await response.json();
    } catch (parseError) {
      success = false;
      error = `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`;
      return NextResponse.json({
        test_type: 'response_body_handling',
        success: false,
        error: error,
        response_status: response.status
      });
    }
    
    if (!response.ok) {
      success = false;
      const errorMessage = responseData?.error || responseData?.details || 'Unknown error';
      error = `HTTP ${response.status} - ${errorMessage}`;
    }
    
    return NextResponse.json({
      test_type: 'response_body_handling',
      success: success,
      error: error,
      response_status: response.status,
      response_ok: response.ok,
      data_received: !!responseData,
      files_count: responseData?.files?.length || 0,
      message: success 
        ? 'Response body handled correctly - no stream read errors'
        : `Failed with proper error handling: ${error}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Response body test error:', error);
    return NextResponse.json({
      test_type: 'response_body_handling',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Test failed due to unexpected error'
    }, { status: 500 });
  }
}
