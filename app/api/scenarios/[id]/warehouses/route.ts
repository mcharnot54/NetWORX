import { NextRequest, NextResponse } from 'next/server';
import { WarehouseConfigService, AuditLogService } from '@/lib/database';

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

    const warehouses = await WarehouseConfigService.getWarehouseConfigs(scenarioId);
    
    return NextResponse.json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    console.error('Error fetching warehouse configurations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouse configurations' },
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

    const warehouse = await WarehouseConfigService.createWarehouseConfig({
      scenario_id: scenarioId,
      ...body
    });

    // Log the action
    await AuditLogService.logAction({
      scenario_id: scenarioId,
      action: 'create_warehouse_config',
      entity_type: 'warehouse_configuration',
      entity_id: warehouse.id,
      details: { warehouse_name: warehouse.warehouse_name }
    });

    return NextResponse.json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    console.error('Error creating warehouse configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create warehouse configuration' },
      { status: 500 }
    );
  }
}
