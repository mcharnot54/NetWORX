import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check if DATABASE_URL is set first
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is missing. Please connect to a database service.',
        suggestion: 'Connect to Neon database to get a DATABASE_URL'
      }, { status: 503 });
    }

    const { sql } = await import('@/lib/database');

    console.log('Initializing database schema...');

    // Set a shorter statement timeout for quicker feedback
    await sql`SET statement_timeout = '30s'`;

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

    // Check if project_id column exists in scenarios table
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios' AND column_name = 'project_id'
    `;

    if (columnCheck.length === 0) {
      console.log('Adding project_id column to scenarios table...');
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
      `;
    }

    // Check and add missing columns for optimization tracking
    const optimizationColumnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'scenarios'
      AND column_name IN ('capacity_analysis_completed', 'transport_optimization_completed', 'warehouse_optimization_completed')
    `;

    const existingColumns = optimizationColumnCheck.map((row: any) => row.column_name);

    if (!existingColumns.includes('capacity_analysis_completed')) {
      console.log('Adding capacity_analysis_completed column to scenarios table...');
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN capacity_analysis_completed BOOLEAN DEFAULT false
      `;
    }

    if (!existingColumns.includes('transport_optimization_completed')) {
      console.log('Adding transport_optimization_completed column to scenarios table...');
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN transport_optimization_completed BOOLEAN DEFAULT false
      `;
    }

    if (!existingColumns.includes('warehouse_optimization_completed')) {
      console.log('Adding warehouse_optimization_completed column to scenarios table...');
      await sql`
        ALTER TABLE scenarios
        ADD COLUMN warehouse_optimization_completed BOOLEAN DEFAULT false
      `;
    }

    // Verify tables exist
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('projects', 'scenarios')
    `;

    const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
    const scenarioCount = await sql`SELECT COUNT(*) as count FROM scenarios`;

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      tables_created: tableCheck.map(t => t.table_name),
      stats: {
        projects: projectCount[0].count,
        scenarios: scenarioCount[0].count
      }
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json({
      success: false,
      error: `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is set first
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
        message: 'DATABASE_URL environment variable is missing. Please connect to a database service.',
        database_url: null,
        suggestion: 'Connect to Neon database to get a DATABASE_URL'
      }, { status: 503 });
    }

    const { sql } = await import('@/lib/database');

    // Set a shorter statement timeout for quicker feedback
    await sql`SET statement_timeout = '30s'`;

    // Check current database schema
    const tables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN ('projects', 'scenarios')
      ORDER BY table_name, ordinal_position
    `;

    const tableStructure: { [key: string]: any[] } = {};
    tables.forEach(row => {
      if (!tableStructure[row.table_name]) {
        tableStructure[row.table_name] = [];
      }
      tableStructure[row.table_name].push({
        column: row.column_name,
        type: row.data_type
      });
    });

    return NextResponse.json({
      success: true,
      database_schema: tableStructure
    });
  } catch (error) {
    console.error('Failed to check database schema:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to check database schema: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
