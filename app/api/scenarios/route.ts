import { NextRequest, NextResponse } from 'next/server';
import { ScenarioService } from '@/lib/database';

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
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
