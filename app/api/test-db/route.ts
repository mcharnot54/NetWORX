import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL environment variable is not set'
      }, { status: 500 });
    }

    // Try to import and use the database
    const { sql } = await import('@/lib/database');
    
    // Test basic connection
    const result = await sql`SELECT 1 as test`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      test_result: result
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
