import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('Fixing database schema for transport optimization...');

    // Ensure optimization_results table exists with correct schema
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

    // Create projects table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        owner_id VARCHAR(255),
        project_duration_years INTEGER DEFAULT 5,
        base_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create scenarios table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS scenarios (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        scenario_type VARCHAR(50) DEFAULT 'combined',
        status VARCHAR(50) DEFAULT 'draft',
        created_by VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        cities TEXT[],
        number_of_nodes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create warehouse_configurations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS warehouse_configurations (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        warehouse_name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        max_capacity INTEGER DEFAULT 50000,
        fixed_costs DECIMAL(15,2) DEFAULT 100000,
        variable_cost_per_unit DECIMAL(10,4) DEFAULT 2.5,
        location_latitude DECIMAL(10,8),
        location_longitude DECIMAL(11,8),
        warehouse_type VARCHAR(50) DEFAULT 'distribution',
        automation_level VARCHAR(50) DEFAULT 'semi-automated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        configuration_data JSONB DEFAULT '{}'
      )
    `;

    // Create transport_configurations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS transport_configurations (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        route_name VARCHAR(255),
        origin VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        distance DECIMAL(10,2),
        base_freight_cost DECIMAL(10,2) DEFAULT 500,
        fuel_cost_per_km DECIMAL(6,4) DEFAULT 1.2,
        transit_time INTEGER DEFAULT 24,
        vehicle_type VARCHAR(50) DEFAULT 'truck',
        capacity INTEGER DEFAULT 40000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        route_data JSONB DEFAULT '{}'
      )
    `;

    // Insert a default project if none exists
    const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
    if (projectCount[0].count === '0') {
      await sql`
        INSERT INTO projects (name, description, status, project_duration_years, base_year)
        VALUES ('Default Project', 'Default project for transport optimization testing', 'active', 5, 2024)
      `;
      console.log('Created default project');
    }

    // Insert a default scenario if none exists
    const scenarioCount = await sql`SELECT COUNT(*) as count FROM scenarios`;
    if (scenarioCount[0].count === '0') {
      const [project] = await sql`SELECT id FROM projects LIMIT 1`;
      await sql`
        INSERT INTO scenarios (
          project_id, name, description, scenario_type, status, 
          metadata, cities, number_of_nodes
        )
        VALUES (
          ${project.id}, 
          'Test Transport Scenario', 
          'Test scenario for transport optimization', 
          'transport',
          'draft',
          '{"created_for_testing": true}',
          ARRAY['Littleton, MA', 'Chicago, IL', 'Dallas, TX'],
          3
        )
      `;
      console.log('Created default test scenario');
    }

    // Get the test scenario and add some warehouse and transport configs
    const [testScenario] = await sql`
      SELECT id FROM scenarios 
      WHERE name = 'Test Transport Scenario' 
      LIMIT 1
    `;

    if (testScenario) {
      // Add warehouse configurations for the test scenario
      const warehouseCount = await sql`
        SELECT COUNT(*) as count FROM warehouse_configurations 
        WHERE scenario_id = ${testScenario.id}
      `;
      
      if (warehouseCount[0].count === '0') {
        await sql`
          INSERT INTO warehouse_configurations 
          (scenario_id, warehouse_name, location, max_capacity, fixed_costs, variable_cost_per_unit)
          VALUES 
          (${testScenario.id}, 'Littleton Distribution Center', 'Littleton, MA', 75000, 150000, 3.0),
          (${testScenario.id}, 'Chicago Hub', 'Chicago, IL', 100000, 200000, 2.8),
          (${testScenario.id}, 'Dallas Fulfillment Center', 'Dallas, TX', 80000, 175000, 2.9)
        `;
        console.log('Added warehouse configurations for test scenario');
      }

      // Add transport configurations for the test scenario
      const transportCount = await sql`
        SELECT COUNT(*) as count FROM transport_configurations 
        WHERE scenario_id = ${testScenario.id}
      `;
      
      if (transportCount[0].count === '0') {
        await sql`
          INSERT INTO transport_configurations 
          (scenario_id, route_name, origin, destination, distance, base_freight_cost, fuel_cost_per_km)
          VALUES 
          (${testScenario.id}, 'Littleton to Chicago', 'Littleton, MA', 'Chicago, IL', 983, 1200, 1.25),
          (${testScenario.id}, 'Chicago to Dallas', 'Chicago, IL', 'Dallas, TX', 925, 1100, 1.20),
          (${testScenario.id}, 'Littleton to Dallas', 'Littleton, MA', 'Dallas, TX', 1815, 2200, 1.30)
        `;
        console.log('Added transport configurations for test scenario');
      }
    }

    // Check final counts
    const finalCounts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM projects`,
      sql`SELECT COUNT(*) as count FROM scenarios`,
      sql`SELECT COUNT(*) as count FROM warehouse_configurations`,
      sql`SELECT COUNT(*) as count FROM transport_configurations`,
      sql`SELECT COUNT(*) as count FROM optimization_results`
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database schema fixed and test data created successfully',
      stats: {
        projects: finalCounts[0][0].count,
        scenarios: finalCounts[1][0].count,
        warehouse_configs: finalCounts[2][0].count,
        transport_configs: finalCounts[3][0].count,
        optimization_results: finalCounts[4][0].count
      }
    });
  } catch (error) {
    console.error('Database schema fix failed:', error);
    return NextResponse.json({
      success: false,
      error: `Database schema fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Check current database state
    const stats = await Promise.all([
      sql`SELECT COUNT(*) as count FROM projects`,
      sql`SELECT COUNT(*) as count FROM scenarios`,
      sql`SELECT COUNT(*) as count FROM warehouse_configurations`,
      sql`SELECT COUNT(*) as count FROM transport_configurations`,
      sql`SELECT COUNT(*) as count FROM optimization_results`
    ]);

    // Get test scenario details
    const [testScenario] = await sql`
      SELECT s.*, p.name as project_name
      FROM scenarios s 
      JOIN projects p ON s.project_id = p.id
      WHERE s.name = 'Test Transport Scenario'
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      stats: {
        projects: stats[0][0].count,
        scenarios: stats[1][0].count,
        warehouse_configs: stats[2][0].count,
        transport_configs: stats[3][0].count,
        optimization_results: stats[4][0].count
      },
      test_scenario: testScenario || null
    });
  } catch (error) {
    console.error('Database check failed:', error);
    return NextResponse.json({
      success: false,
      error: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
