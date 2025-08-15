import { NextRequest, NextResponse } from 'next/server';
import { ScenarioService } from '@/lib/database';

export const dynamic = 'force-dynamic'; // This route needs to be dynamic for database operations

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not configured, returning empty scenarios array');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const projectId = searchParams.get('project_id');

    let scenarios;
    if (projectId) {
      // Get scenarios for a specific project
      scenarios = await ScenarioService.getScenarios();
      scenarios = scenarios.filter(s => s.project_id === parseInt(projectId));
    } else {
      scenarios = await ScenarioService.getScenarios(type || undefined);
    }

    return NextResponse.json({
      success: true,
      data: scenarios || []
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);

    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'Database connection failed, returning empty data'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id,
      name,
      description,
      scenario_number,
      number_of_nodes,
      cities,
      scenario_type = 'combined',
      created_by,
      metadata
    } = body;

    if (!name || !project_id) {
      return NextResponse.json(
        { success: false, error: 'Name and project_id are required' },
        { status: 400 }
      );
    }

    // Check if database needs setup
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    try {
      const newScenario = await ScenarioService.createScenario({
        name,
        description: description || "",
        scenario_type,
        created_by: created_by || "current_user",
        metadata: {
          project_id,
          scenario_number,
          number_of_nodes,
          cities,
          status: 'draft',
          capacity_analysis_completed: false,
          transport_optimization_completed: false,
          warehouse_optimization_completed: false,
          ...metadata
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          ...newScenario,
          project_id,
          scenario_number,
          number_of_nodes,
          cities,
          status: 'draft',
          capacity_analysis_completed: false,
          transport_optimization_completed: false,
          warehouse_optimization_completed: false
        }
      });
    } catch (dbError: any) {
      // Check if the error is related to missing project_id column
      if (dbError.code === '42703' && dbError.message?.includes('project_id')) {
        console.error('Missing project_id column in scenarios table. Running database setup...');

        // Try to run database setup
        try {
          const { sql } = await import('@/lib/database');

          // Check if project_id column exists and add it if missing
          const columnCheck = await sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'scenarios' AND column_name = 'project_id'
          `;

          if (columnCheck.length === 0) {
            await sql`
              ALTER TABLE scenarios
              ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
            `;
            console.log('Added missing project_id column to scenarios table');

            // Retry scenario creation
            const newScenario = await ScenarioService.createScenario({
              name,
              description: description || "",
              scenario_type,
              created_by: created_by || "current_user",
              metadata: {
                project_id,
                scenario_number,
                number_of_nodes,
                cities,
                status: 'draft',
                capacity_analysis_completed: false,
                transport_optimization_completed: false,
                warehouse_optimization_completed: false,
                ...metadata
              }
            });

            return NextResponse.json({
              success: true,
              data: {
                ...newScenario,
                project_id,
                scenario_number,
                number_of_nodes,
                cities,
                status: 'draft',
                capacity_analysis_completed: false,
                transport_optimization_completed: false,
                warehouse_optimization_completed: false
              }
            });
          }
        } catch (setupError) {
          console.error('Failed to setup database:', setupError);
          return NextResponse.json(
            {
              success: false,
              error: 'Database schema issue detected. Please run database setup.',
              details: 'Missing project_id column in scenarios table'
            },
            { status: 500 }
          );
        }
      }

      throw dbError;
    }
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create scenario',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
