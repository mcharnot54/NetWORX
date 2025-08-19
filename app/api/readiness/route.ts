import { NextRequest, NextResponse } from 'next/server';
import { ReadinessTracker } from '@/lib/readiness-tracker';

export const dynamic = 'force-dynamic'; // This route needs to be dynamic for database operations

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json(
        { success: false, error: 'Scenario ID is required' },
        { status: 400 }
      );
    }

    const scenarioIdNum = parseInt(scenarioId);
    if (isNaN(scenarioIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scenario ID' },
        { status: 400 }
      );
    }

    // Get all readiness status information
    const [fileStatus, validationStatus, configStatus] = await Promise.all([
      ReadinessTracker.checkFileUploadStatus(scenarioIdNum),
      ReadinessTracker.checkValidationStatus(scenarioIdNum),
      ReadinessTracker.checkConfigurationStatus(scenarioIdNum)
    ]);

    const systemStatus = await ReadinessTracker.checkSystemStatus();

    // Calculate overall readiness scores
    const dataReadiness = {
      forecast: fileStatus.forecast,
      sku: fileStatus.sku,
      network: fileStatus.network,
      validation: validationStatus.allValidated,
      score: Object.values(fileStatus).filter(Boolean).length + (validationStatus.allValidated ? 1 : 0)
    };

    const configurationReadiness = {
      warehouse: configStatus.warehouseConfig && configStatus.warehouseCosts && configStatus.warehouseConstraints,
      transport: configStatus.transportLanes && configStatus.transportRates && configStatus.transportModes && configStatus.transportConstraints,
      inventory: configStatus.inventoryStratification && configStatus.inventoryServiceLevels && configStatus.inventoryLeadTimes,
      score: [
        configStatus.warehouseConfig && configStatus.warehouseCosts && configStatus.warehouseConstraints,
        configStatus.transportLanes && configStatus.transportRates && configStatus.transportModes && configStatus.transportConstraints,
        configStatus.inventoryStratification && configStatus.inventoryServiceLevels && configStatus.inventoryLeadTimes
      ].filter(Boolean).length
    };

    const overallReadiness = {
      data: dataReadiness.score / 4, // 4 data requirements
      configuration: configurationReadiness.score / 3, // 3 config categories
      system: systemStatus.databaseConnected && systemStatus.projectSelected && systemStatus.scenarioSelected ? 1 : 0,
      total: (dataReadiness.score + configurationReadiness.score + (systemStatus.databaseConnected && systemStatus.projectSelected && systemStatus.scenarioSelected ? 1 : 0)) / 8
    };

    return NextResponse.json({
      success: true,
      data: {
        scenarioId: scenarioIdNum,
        fileStatus,
        validationStatus,
        configStatus,
        systemStatus,
        readiness: {
          data: dataReadiness,
          configuration: configurationReadiness,
          overall: overallReadiness
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking readiness status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check readiness status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checklist } = body;

    if (!checklist || !Array.isArray(checklist)) {
      return NextResponse.json(
        { success: false, error: 'Valid checklist array is required' },
        { status: 400 }
      );
    }

    // Update checklist with automatic status checking
    const updatedChecklist = await ReadinessTracker.updateChecklistItems(checklist);
    
    // Save to storage (in a real app, this might be saved to database)
    ReadinessTracker.saveChecklistToStorage(updatedChecklist);

    return NextResponse.json({
      success: true,
      data: {
        checklist: updatedChecklist,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating readiness checklist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update readiness checklist' },
      { status: 500 }
    );
  }
}
