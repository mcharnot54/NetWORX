import { NextRequest, NextResponse } from 'next/server';

// This would normally import from database, but we'll use a simple approach for now
let mockScenarios = [
  {
    id: 1,
    name: "Chicago Distribution Optimization",
    description: "Optimize warehouse space and transportation costs for Chicago hub",
    scenario_type: "combined",
    status: "draft",
    created_at: new Date("2024-01-15").toISOString(),
    updated_at: new Date("2024-01-15").toISOString(),
    created_by: "demo_user",
    metadata: {}
  }
];

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const index = mockScenarios.findIndex(s => s.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    mockScenarios.splice(index, 1);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    const scenario = mockScenarios.find(s => s.id === id);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scenario
    });
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}
