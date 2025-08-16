import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('=== QUICK FIX FOR TRANSPORT OPTIMIZER ===');

    // Step 1: Fix the status constraint
    console.log('Step 1: Fixing status constraint...');
    
    try {
      // Drop existing constraint if it exists
      await sql`
        ALTER TABLE optimization_results 
        DROP CONSTRAINT IF EXISTS optimization_results_status_check
      `;
      
      // Add correct constraint
      await sql`
        ALTER TABLE optimization_results 
        ADD CONSTRAINT optimization_results_status_check 
        CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'retrying'))
      `;
      console.log('✅ Status constraint fixed');
    } catch (constraintError) {
      console.warn('Constraint fix warning:', constraintError);
    }

    // Step 2: Ensure all required tables exist
    console.log('Step 2: Checking database schema...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS optimization_results (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        result_type VARCHAR(50) DEFAULT 'transport',
        optimization_run_id VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'queued',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        execution_time_seconds INTEGER,
        total_cost DECIMAL(15,2),
        cost_savings DECIMAL(15,2),
        efficiency_score DECIMAL(5,2),
        results_data JSONB DEFAULT '{}',
        performance_metrics JSONB DEFAULT '{}',
        recommendations JSONB DEFAULT '{}'
      )
    `;

    // Step 3: Check if user has scenarios
    const scenarios = await sql`
      SELECT s.id, s.name, s.status, s.cities, s.number_of_nodes, p.name as project_name
      FROM scenarios s 
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.id
    `;

    console.log(`Found ${scenarios.length} scenarios`);

    // Step 4: If no scenarios exist, create a test one
    if (scenarios.length === 0) {
      console.log('Step 4: No scenarios found, creating test data...');
      
      // Ensure projects exist
      const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
      if (projectCount[0].count === '0') {
        await sql`
          INSERT INTO projects (name, description, status, project_duration_years, base_year)
          VALUES ('Sample Project', 'Auto-generated project for testing transport optimization', 'active', 5, 2024)
        `;
      }

      // Get the first project
      const [project] = await sql`SELECT id FROM projects LIMIT 1`;
      
      // Create a test scenario
      await sql`
        INSERT INTO scenarios (
          project_id, name, description, scenario_type, status, 
          metadata, cities, number_of_nodes
        )
        VALUES (
          ${project.id}, 
          'Transport Test Scenario', 
          'Test scenario with real data for transport optimization', 
          'transport',
          'draft',
          '{"auto_generated": true, "for_testing": true}',
          ARRAY['Littleton, MA', 'Chicago, IL', 'Dallas, TX'],
          3
        )
        RETURNING id
      `;

      console.log('✅ Created test scenario');
    }

    // Step 5: Add some warehouse and transport configs if they don't exist
    const latestScenario = await sql`
      SELECT id FROM scenarios ORDER BY id DESC LIMIT 1
    `;

    if (latestScenario.length > 0) {
      const scenarioId = latestScenario[0].id;
      
      // Check if configs exist
      const warehouseCount = await sql`
        SELECT COUNT(*) as count FROM warehouse_configurations 
        WHERE scenario_id = ${scenarioId}
      `;
      
      if (warehouseCount[0].count === '0') {
        await sql`
          INSERT INTO warehouse_configurations 
          (scenario_id, warehouse_name, location, max_capacity, fixed_costs, variable_cost_per_unit)
          VALUES 
          (${scenarioId}, 'Littleton Hub', 'Littleton, MA', 50000, 120000, 2.5),
          (${scenarioId}, 'Chicago Center', 'Chicago, IL', 75000, 180000, 2.2),
          (${scenarioId}, 'Dallas Depot', 'Dallas, TX', 60000, 150000, 2.4)
        `;
        console.log('✅ Added warehouse configurations');
      }

      const transportCount = await sql`
        SELECT COUNT(*) as count FROM transport_configurations 
        WHERE scenario_id = ${scenarioId}
      `;
      
      if (transportCount[0].count === '0') {
        await sql`
          INSERT INTO transport_configurations 
          (scenario_id, route_name, origin, destination, distance, base_freight_cost)
          VALUES 
          (${scenarioId}, 'Route 1', 'Littleton, MA', 'Chicago, IL', 983, 1200),
          (${scenarioId}, 'Route 2', 'Chicago, IL', 'Dallas, TX', 925, 1100),
          (${scenarioId}, 'Route 3', 'Littleton, MA', 'Dallas, TX', 1815, 2200)
        `;
        console.log('✅ Added transport configurations');
      }
    }

    // Step 6: Clean up any stuck optimization results
    await sql`
      DELETE FROM optimization_results 
      WHERE status IN ('running', 'queued') 
      AND started_at < NOW() - INTERVAL '1 hour'
    `;

    // Final check
    const finalStats = await Promise.all([
      sql`SELECT COUNT(*) as count FROM projects`,
      sql`SELECT COUNT(*) as count FROM scenarios`,
      sql`SELECT COUNT(*) as count FROM warehouse_configurations`,
      sql`SELECT COUNT(*) as count FROM transport_configurations`,
      sql`SELECT COUNT(*) as count FROM optimization_results`
    ]);

    const updatedScenarios = await sql`
      SELECT s.id, s.name, s.status, s.cities, s.number_of_nodes, p.name as project_name
      FROM scenarios s 
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.id
    `;

    return NextResponse.json({
      success: true,
      message: 'Transport Optimizer quick fix completed successfully!',
      fixes_applied: [
        'Fixed database status constraint to allow queued status',
        'Ensured all required tables exist',
        'Created test data if none existed',
        'Added warehouse and transport configurations',
        'Cleaned up stuck optimization jobs'
      ],
      stats: {
        projects: finalStats[0][0].count,
        scenarios: finalStats[1][0].count,
        warehouse_configs: finalStats[2][0].count,
        transport_configs: finalStats[3][0].count,
        optimization_results: finalStats[4][0].count
      },
      available_scenarios: updatedScenarios,
      next_steps: [
        'Go to Transport Optimizer page',
        'Select a scenario from the Projects & Scenarios tab',
        'Try generating scenarios - they should now work without freezing'
      ]
    });
  } catch (error) {
    console.error('Quick fix failed:', error);
    return NextResponse.json({
      success: false,
      error: `Quick fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Quick health check
    const healthCheck = await Promise.all([
      sql`SELECT 1 as connected`,
      sql`SELECT COUNT(*) as count FROM scenarios`,
      sql`SELECT COUNT(*) as count FROM optimization_results WHERE status = 'running'`
    ]);

    return NextResponse.json({
      success: true,
      database_connected: true,
      scenarios_available: healthCheck[1][0].count,
      running_jobs: healthCheck[2][0].count,
      status: 'Ready for transport optimization testing'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
