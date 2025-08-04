import { NextRequest, NextResponse } from 'next/server';
import { ScenarioService, WarehouseConfigService, TransportConfigService, OptimizationResultService, DataFileService, AuditLogService } from '@/lib/database';

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

    const scenario = await ScenarioService.getScenario(scenarioId);
    
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Get related data
    const [warehouseConfigs, transportConfigs, results, dataFiles] = await Promise.all([
      WarehouseConfigService.getWarehouseConfigs(scenarioId),
      TransportConfigService.getTransportConfigs(scenarioId),
      OptimizationResultService.getOptimizationResults(scenarioId),
      DataFileService.getDataFiles(scenarioId)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        scenario,
        warehouseConfigs,
        transportConfigs,
        results,
        dataFiles
      }
    });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const scenario = await ScenarioService.updateScenario(scenarioId, body);

    // Log the action
    await AuditLogService.logAction({
      scenario_id: scenarioId,
      action: 'update_scenario',
      entity_type: 'scenario',
      entity_id: scenarioId,
      details: { changes: body }
    });

    return NextResponse.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await ScenarioService.deleteScenario(scenarioId);

    // Log the action
    await AuditLogService.logAction({
      action: 'delete_scenario',
      entity_type: 'scenario',
      entity_id: scenarioId,
      details: { deleted_scenario_id: scenarioId }
    });

    return NextResponse.json({
      success: true,
      message: 'Scenario deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}
