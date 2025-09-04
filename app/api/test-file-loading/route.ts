import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scenarioId = searchParams.get('scenarioId') || '1'; // Default to scenario 1

    console.log('Testing file loading for scenario:', scenarioId);

    // Test the same logic as the data processor
    const response = await fetch(`${request.nextUrl.origin}/api/files?scenarioId=${scenarioId}`);
    
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    };

    let bodyData;
    try {
      bodyData = await response.json();
    } catch (parseError) {
      bodyData = { 
        error: 'Failed to parse JSON response',
        raw: await response.text()
      };
    }

    return NextResponse.json({
      success: response.ok,
      test_scenario_id: scenarioId,
      response_data: responseData,
      body: bodyData,
      message: response.ok 
        ? `Successfully loaded files for scenario ${scenarioId}`
        : `Failed to load files for scenario ${scenarioId}`,
      files_count: bodyData?.files?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('File loading test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
