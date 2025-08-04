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
