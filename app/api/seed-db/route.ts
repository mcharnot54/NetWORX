import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check if we already have data
    const existingProjects = await sql`SELECT COUNT(*) as count FROM projects`;
    if (parseInt(existingProjects[0].count) > 0) {
      return NextResponse.json({
        success: true,
        message: 'Database already has data, skipping seed'
      });
    }
    
    // Insert sample projects
    const projects = await sql`
      INSERT INTO projects (name, description, status, owner_id, project_duration_years, base_year)
      VALUES 
        ('NetWORX Optimization 2024', 'Comprehensive network optimization project for improved efficiency and cost reduction', 'active', 'user_001', 5, 2024),
        ('East Coast Expansion Strategy', 'Strategic expansion analysis for east coast operations', 'active', 'user_001', 3, 2024)
      RETURNING *
    `;
    
    // Insert sample scenarios
    const scenarios = await sql`
      INSERT INTO scenarios (project_id, name, description, scenario_type, status, created_by, metadata)
      VALUES 
        (${projects[0].id}, 'NetWORX Optimization 2024 - Scenario 1 - 3 Nodes - Chicago, Atlanta, Phoenix', 'Baseline scenario with current hub configuration', 'combined', 'completed', 'demo_user', ${JSON.stringify({
          project_id: projects[0].id,
          scenario_number: 1,
          number_of_nodes: 3,
          cities: ['Chicago, IL', 'Atlanta, GA', 'Phoenix, AZ'],
          status: 'completed',
          capacity_analysis_completed: true,
          transport_optimization_completed: true,
          warehouse_optimization_completed: true
        })}),
        (${projects[0].id}, 'NetWORX Optimization 2024 - Scenario 2 - 4 Nodes - Chicago, Atlanta, Phoenix, Dallas', 'Expanded network with additional Dallas hub', 'combined', 'in_progress', 'demo_user', ${JSON.stringify({
          project_id: projects[0].id,
          scenario_number: 2,
          number_of_nodes: 4,
          cities: ['Chicago, IL', 'Atlanta, GA', 'Phoenix, AZ', 'Dallas, TX'],
          status: 'in_progress',
          capacity_analysis_completed: true,
          transport_optimization_completed: true,
          warehouse_optimization_completed: false
        })}),
        (${projects[1].id}, 'East Coast Expansion Strategy - Scenario 1 - 3 Nodes - New York, Boston, Miami', 'Primary east coast expansion scenario', 'combined', 'completed', 'demo_user', ${JSON.stringify({
          project_id: projects[1].id,
          scenario_number: 1,
          number_of_nodes: 3,
          cities: ['New York, NY', 'Boston, MA', 'Miami, FL'],
          status: 'completed',
          capacity_analysis_completed: true,
          transport_optimization_completed: true,
          warehouse_optimization_completed: true
        })})
      RETURNING *
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        projects: projects,
        scenarios: scenarios
      }
    });
  } catch (error) {
    console.error('Database seeding failed:', error);
    return NextResponse.json({
      success: false,
      error: `Database seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
