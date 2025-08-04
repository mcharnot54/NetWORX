import { NextRequest, NextResponse } from 'next/server';
import { ScenarioService, AuditLogService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    
    const scenarios = await ScenarioService.getScenarios(type || undefined);
    
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
