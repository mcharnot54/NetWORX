import { NextRequest, NextResponse } from 'next/server';
import { TransportConfigService, AuditLogService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    
    if (isNaN(scenarioId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID' },
        { status: 400 }
      );
    }

    const routes = await TransportConfigService.getTransportConfigs(scenarioId);
    
    return NextResponse.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error fetching transport configurations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transport configurations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(scenarioId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID' },
        { status: 400 }
      );
    }

    const route = await TransportConfigService.createTransportConfig({
      scenario_id: scenarioId,
      ...body
    });

    // Log the action
    await AuditLogService.logAction({
      scenario_id: scenarioId,
      action: 'create_transport_config',
      entity_type: 'transport_configuration',
      entity_id: route.id,
      details: { origin: route.origin, destination: route.destination }
    });

    return NextResponse.json({
      success: true,
      data: route
    });
  } catch (error) {
    console.error('Error creating transport configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transport configuration' },
      { status: 500 }
    );
  }
}
