import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('Checking and fixing scenarios table columns...');
    
    // Check if required columns exist in scenarios table
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios'
      AND column_name IN ('capacity_analysis_completed', 'transport_optimization_completed', 'warehouse_optimization_completed')
    `;

    const existingColumns = columnCheck.map((row: any) => row.column_name);
    console.log('Existing columns:', existingColumns);

    const missingColumns = [];

    // Add capacity_analysis_completed column if missing
    if (!existingColumns.includes('capacity_analysis_completed')) {
      try {
        await sql`
          ALTER TABLE scenarios
          ADD COLUMN capacity_analysis_completed BOOLEAN DEFAULT false
        `;
        console.log('Added capacity_analysis_completed column');
        missingColumns.push('capacity_analysis_completed');
      } catch (error) {
        console.error('Error adding capacity_analysis_completed column:', error);
      }
    }

    // Add transport_optimization_completed column if missing
    if (!existingColumns.includes('transport_optimization_completed')) {
      try {
        await sql`
          ALTER TABLE scenarios
          ADD COLUMN transport_optimization_completed BOOLEAN DEFAULT false
        `;
        console.log('Added transport_optimization_completed column');
        missingColumns.push('transport_optimization_completed');
      } catch (error) {
        console.error('Error adding transport_optimization_completed column:', error);
      }
    }

    // Add warehouse_optimization_completed column if missing
    if (!existingColumns.includes('warehouse_optimization_completed')) {
      try {
        await sql`
          ALTER TABLE scenarios
          ADD COLUMN warehouse_optimization_completed BOOLEAN DEFAULT false
        `;
        console.log('Added warehouse_optimization_completed column');
        missingColumns.push('warehouse_optimization_completed');
      } catch (error) {
        console.error('Error adding warehouse_optimization_completed column:', error);
      }
    }

    // Verify the changes
    const finalColumnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios'
      AND column_name IN ('capacity_analysis_completed', 'transport_optimization_completed', 'warehouse_optimization_completed')
    `;

    const finalColumns = finalColumnCheck.map((row: any) => row.column_name);

    return NextResponse.json({
      success: true,
      message: 'Scenarios table columns fixed successfully',
      existingColumns,
      addedColumns: missingColumns,
      finalColumns
    });

  } catch (error) {
    console.error('Database fix error:', error);
    return NextResponse.json({
      success: false,
      error: `Database fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Just check current columns status
    const columnCheck = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'scenarios'
      ORDER BY ordinal_position
    `;

    return NextResponse.json({
      success: true,
      columns: columnCheck
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({
      success: false,
      error: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
