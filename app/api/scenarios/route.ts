import { NextRequest, NextResponse } from 'next/server';
import { ScenarioService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
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
      data: scenarios
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, scenario_type, created_by, metadata } = body;

    if (!name || !scenario_type) {
      return NextResponse.json(
        { success: false, error: 'Name and scenario_type are required' },
        { status: 400 }
      );
    }

    const newScenario = {
      id: nextId++,
      name,
      description: description || "",
      scenario_type,
      status: "draft" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: created_by || "demo_user",
      metadata: metadata || {}
    };

    mockScenarios.unshift(newScenario);

    return NextResponse.json({
      success: true,
      data: newScenario
    });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
