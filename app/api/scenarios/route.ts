import { NextRequest, NextResponse } from 'next/server';

// Mock data for development - replace with actual database when ready
const mockScenarios = [
  {
    id: 1,
    name: "Chicago Distribution Optimization",
    description: "Optimize warehouse space and transportation costs for Chicago hub",
    scenario_type: "combined",
    status: "draft",
    created_at: new Date("2024-01-15").toISOString(),
    updated_at: new Date("2024-01-15").toISOString(),
    created_by: "demo_user",
    metadata: {
      created_via: "web_interface",
      initial_configuration: {}
    }
  },
  {
    id: 2,
    name: "West Coast Transport Routes",
    description: "Transportation network optimization for west coast operations",
    scenario_type: "transport",
    status: "completed",
    created_at: new Date("2024-01-10").toISOString(),
    updated_at: new Date("2024-01-12").toISOString(),
    created_by: "demo_user",
    metadata: {
      created_via: "web_interface",
      initial_configuration: {}
    }
  },
  {
    id: 3,
    name: "Northeast Warehouse Capacity",
    description: "Warehouse space optimization for northeast facilities",
    scenario_type: "warehouse",
    status: "running",
    created_at: new Date("2024-01-08").toISOString(),
    updated_at: new Date("2024-01-14").toISOString(),
    created_by: "demo_user",
    metadata: {
      created_via: "web_interface",
      initial_configuration: {}
    }
  }
];

let nextId = 4;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    let scenarios = mockScenarios;
    if (type) {
      scenarios = mockScenarios.filter(s => s.scenario_type === type);
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

    const scenario = await ScenarioService.createScenario({
      name,
      description,
      scenario_type,
      created_by,
      metadata
    });

    // Log the action
    await AuditLogService.logAction({
      scenario_id: scenario.id,
      action: 'create_scenario',
      entity_type: 'scenario',
      entity_id: scenario.id,
      user_id: created_by,
      details: { scenario_type, name }
    });

    return NextResponse.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
