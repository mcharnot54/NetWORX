import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check if scenarios table columns exist and add them if missing
    const scenarioColumnsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scenarios' 
      AND column_name IN ('capacity_analysis_completed', 'transport_optimization_completed', 'warehouse_optimization_completed')
    `;

    const existingColumns = scenarioColumnsCheck.map(row => row.column_name);
    const addedColumns = [];
    
    if (!existingColumns.includes('capacity_analysis_completed')) {
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN capacity_analysis_completed BOOLEAN DEFAULT false
      `;
      addedColumns.push('capacity_analysis_completed');
    }

    if (!existingColumns.includes('transport_optimization_completed')) {
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN transport_optimization_completed BOOLEAN DEFAULT false
      `;
      addedColumns.push('transport_optimization_completed');
    }

    if (!existingColumns.includes('warehouse_optimization_completed')) {
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN warehouse_optimization_completed BOOLEAN DEFAULT false
      `;
      addedColumns.push('warehouse_optimization_completed');
    }

    return NextResponse.json({
      success: true,
      message: addedColumns.length > 0 
        ? `Added columns: ${addedColumns.join(', ')}`
        : 'All required columns already exist'
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
