import { NextRequest, NextResponse } from 'next/server';
import { optimizeTransportRoutes } from '@/lib/optimization-algorithms';

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG TRANSPORT OPTIMIZATION ===');
    
    // Test the optimization algorithm directly without job queue
    const testParams = {
      cities: ['Littleton, MA', 'Chicago, IL', 'Dallas, TX'],
      scenario_type: 'lowest_cost_city',
      optimization_criteria: {
        cost_weight: 40,
        service_weight: 35,
        distance_weight: 25
      },
      service_zone_weighting: {
        parcel_zone_weight: 40,
        ltl_zone_weight: 35,
        tl_daily_miles_weight: 25
      },
      outbound_weight_percentage: 50,
      inbound_weight_percentage: 50
    };

    console.log('Testing optimization algorithm directly with params:', testParams);

    const startTime = Date.now();
    const result = optimizeTransportRoutes(testParams);
    const endTime = Date.now();

    console.log('Optimization completed in', endTime - startTime, 'ms');
    console.log('Result:', result);

    return NextResponse.json({
      success: true,
      message: 'Direct optimization algorithm test completed',
      execution_time_ms: endTime - startTime,
      test_params: testParams,
      optimization_result: result
    });
  } catch (error) {
    console.error('Direct optimization test failed:', error);
    return NextResponse.json({
      success: false,
      error: `Direct optimization test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check database connections and table status
    const dbCheck = await sql`SELECT 1 as connected`;
    
    // Check if required tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('scenarios', 'optimization_results', 'warehouse_configurations', 'transport_configurations')
      ORDER BY table_name
    `;

    // Check if we have test data
    const scenarioCount = await sql`SELECT COUNT(*) as count FROM scenarios`;
    const warehouseCount = await sql`SELECT COUNT(*) as count FROM warehouse_configurations`;
    const transportCount = await sql`SELECT COUNT(*) as count FROM transport_configurations`;

    return NextResponse.json({
      success: true,
      database_connected: dbCheck.length > 0,
      tables_exist: tables.map(t => t.table_name),
      data_counts: {
        scenarios: scenarioCount[0]?.count || 0,
        warehouses: warehouseCount[0]?.count || 0,
        transport_configs: transportCount[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Debug check failed:', error);
    return NextResponse.json({
      success: false,
      error: `Debug check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
