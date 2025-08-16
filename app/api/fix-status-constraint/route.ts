import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('Fixing optimization_results status constraint...');

    // First, check what constraints exist
    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'optimization_results'::regclass
      AND contype = 'c'
    `;

    console.log('Current constraints:', constraints);

    // Drop the existing status check constraint if it exists
    const statusConstraints = constraints.filter(c => c.conname.includes('status'));
    
    for (const constraint of statusConstraints) {
      try {
        await sql`ALTER TABLE optimization_results DROP CONSTRAINT ${sql(constraint.conname)}`;
        console.log(`Dropped constraint: ${constraint.conname}`);
      } catch (error) {
        console.warn(`Could not drop constraint ${constraint.conname}:`, error);
      }
    }

    // Add the correct status constraint that includes 'queued'
    await sql`
      ALTER TABLE optimization_results 
      ADD CONSTRAINT optimization_results_status_check 
      CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'retrying'))
    `;

    console.log('Added new status constraint with all valid statuses');

    // Check current data
    const counts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM projects`,
      sql`SELECT COUNT(*) as count FROM scenarios`,
      sql`SELECT COUNT(*) as count FROM optimization_results`
    ]);

    // Get available scenarios
    const scenarios = await sql`
      SELECT s.id, s.name, s.status, s.cities, s.number_of_nodes, p.name as project_name
      FROM scenarios s 
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.id
    `;

    return NextResponse.json({
      success: true,
      message: 'Status constraint fixed successfully',
      old_constraints: constraints,
      stats: {
        projects: counts[0][0].count,
        scenarios: counts[1][0].count,
        optimization_results: counts[2][0].count
      },
      available_scenarios: scenarios
    });
  } catch (error) {
    console.error('Failed to fix status constraint:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to fix constraint: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Check constraints
    const constraints = await sql`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'optimization_results'::regclass
    `;

    // Check available data
    const scenarios = await sql`
      SELECT s.id, s.name, s.status, s.cities, s.number_of_nodes, p.name as project_name
      FROM scenarios s 
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.id
    `;

    const projects = await sql`SELECT id, name, status FROM projects ORDER BY id`;

    return NextResponse.json({
      success: true,
      constraints,
      available_scenarios: scenarios,
      available_projects: projects
    });
  } catch (error) {
    console.error('Failed to check database state:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to check database: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
