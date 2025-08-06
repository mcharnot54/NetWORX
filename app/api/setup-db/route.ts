import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Create projects table
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
    
    // Create scenarios table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Check if project_id column exists and add it if missing
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios' AND column_name = 'project_id'
    `;

    if (columnCheck.length === 0) {
      // Add project_id column if it doesn't exist
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
      `;
      console.log('Added missing project_id column to scenarios table');
    }

    // Check if file_type column needs to be expanded for longer MIME types
    const fileTypeCheck = await sql`
      SELECT character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'data_files' AND column_name = 'file_type'
    `;

    if (fileTypeCheck.length > 0 && fileTypeCheck[0].character_maximum_length < 100) {
      // Expand file_type column to accommodate longer MIME types
      await sql`
        ALTER TABLE data_files
        ALTER COLUMN file_type TYPE VARCHAR(100)
      `;
      console.log('Expanded file_type column to VARCHAR(100) for longer MIME types');
    }

    // Create additional tables for complete functionality
    await sql`
      CREATE TABLE IF NOT EXISTS data_files (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        data_type VARCHAR(50),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processing_status VARCHAR(50) DEFAULT 'pending',
        validation_result JSONB,
        processed_data JSONB,
        original_columns TEXT[],
        mapped_columns JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS warehouse_configurations (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        warehouse_name VARCHAR(255) NOT NULL,
        max_capacity INTEGER,
        fixed_costs DECIMAL(15,2),
        variable_cost_per_unit DECIMAL(10,4),
        location_latitude DECIMAL(10,8),
        location_longitude DECIMAL(11,8),
        warehouse_type VARCHAR(50),
        automation_level VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        configuration_data JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS transport_configurations (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        route_name VARCHAR(255),
        origin VARCHAR(255),
        destination VARCHAR(255),
        distance DECIMAL(10,2),
        base_freight_cost DECIMAL(10,2),
        fuel_cost_per_km DECIMAL(6,4),
        transit_time INTEGER,
        vehicle_type VARCHAR(50),
        capacity INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        route_data JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS optimization_results (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        result_type VARCHAR(50),
        optimization_run_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        execution_time_seconds INTEGER,
        total_cost DECIMAL(15,2),
        cost_savings DECIMAL(15,2),
        efficiency_score DECIMAL(5,2),
        results_data JSONB,
        performance_metrics JSONB,
        recommendations JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS scenario_iterations (
        id SERIAL PRIMARY KEY,
        parent_scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        iteration_name VARCHAR(255) NOT NULL,
        iteration_number INTEGER,
        changes_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        configuration_changes JSONB,
        results_comparison JSONB
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        user_id VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        details JSONB,
        ip_address INET
      )
    `;

    // Check if tables exist and have data
    const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
    const scenarioCount = await sql`SELECT COUNT(*) as count FROM scenarios`;
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      stats: {
        projects: projectCount[0].count,
        scenarios: scenarioCount[0].count
      }
    });
  } catch (error) {
    console.error('Database setup failed:', error);
    return NextResponse.json({
      success: false,
      error: `Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
