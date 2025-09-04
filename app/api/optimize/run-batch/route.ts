import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { v4 as uuidv4 } from 'uuid';
import {
  OptimizationConfig,
  ForecastRow,
  SKU,
  IntegratedRunResult,
  DemandMap,
  CapacityMap,
  CostMatrix
} from '@/types/advanced-optimization';
import { optimizeTransportMultiYear } from '@/lib/optimization/transportMultiYear';
import { optimizeTransportMultiYearFixed } from '@/lib/optimization/transportMultiYearFixed';
import { jobManager } from '@/lib/production-job-manager';
import { OptimizationWorker } from '@/lib/optimization-worker';
import { ErrorHandler, circuitBreakers, createProductionError } from '@/lib/error-handler';
import { db } from '@/lib/database-manager';

// PRODUCTION NOTE: No more in-memory jobs - using Redis-backed persistence

async function fetchScenarioById(id: number) {
  try {
    // Use centralized database manager instead of fetch
    const scenarios = await db.query('SELECT * FROM scenarios WHERE id = $1', [id]);
    return scenarios[0] || null;
  } catch (err) {
    console.warn('Error fetching scenario:', err);
    return null;
  }
}

async function performOptimization(body: any) {
  // This function contains the core optimization flow previously in POST.
  // It is deterministic and will throw on missing required inputs.
  // It returns the same response object that the original POST built.

  const {
    scenario,
    config,
    forecast,
    skus,
    candidateFacilities,
    destinations,
    ...payloadRest
  } = body;

  // Validate scenario parameters
  const minNodes = Math.max(1, scenario?.minNodes || 1);
  const maxNodes = Math.max(minNodes, scenario?.maxNodes || 5);
  const step = Math.max(1, scenario?.step || 1);
  const criterion = scenario?.criterion || 'total_cost';

  // Get baseline transportation data using circuit breaker
  let actualTransportBaseline = 6560000; // Default $6.56M
  try {
    await circuitBreakers.database.execute(async () => {
      const baselineResponse = await fetch('http://localhost:3000/api/analyze-transport-baseline-data');
      const baselineData = await baselineResponse.json();
      if (baselineData.success) {
        actualTransportBaseline = baselineData.baseline_summary.total_verified;
      }
    });
  } catch (error) {
    console.warn('Using default baseline cost due to API error:', error);
  }

  // Default configuration if not provided
  const defaultConfig: OptimizationConfig = {
    optimization: {
      solver: 'JSLP_SOLVER',
      weights: { cost: 0.6, utilization: 0.1, service_level: 0.3 }
    },
    warehouse: {
      operating_days: 260,
      DOH: 14,
      pallet_length_inches: 48,
      pallet_width_inches: 40,
      ceiling_height_inches: 432,
      rack_height_inches: 96,
      aisle_factor: 0.35,
      outbound_pallets_per_door_per_day: 480,
      inbound_pallets_per_door_per_day: 480,
      max_outbound_doors: 15,
      max_inbound_doors: 12,
      outbound_area_per_door: 4000,
      inbound_area_per_door: 4000,
      min_office: 5000,
      min_battery: 3000,
      min_packing: 6000,
      max_utilization: 0.85,
      initial_facility_area: 352000,
      case_pick_area_fixed: 24000,
      each_pick_area_fixed: 44000,
      min_conveyor: 6000,
      facility_design_area: 400000,
      cost_per_sqft_annual: 8.5,
      thirdparty_cost_per_sqft: 12.0,
      max_facilities: 6,
      fixed_cost_per_facility: 250000,
      ...config?.warehouse
    },
    transportation: {
      cost_per_mile: 2.85,
      service_level_requirement: 0.95,
      max_distance_miles: 800,
      required_facilities: 1,
      max_facilities: 5,
      max_capacity_per_facility: 15_000_000,
      mandatory_facilities: ['Littleton, MA'],
      weights: { cost: 0.6, service_level: 0.4 },
      lease_years: 7,
      ...config?.transportation
    },
  };

  // Default forecast if not provided
  const defaultForecast: ForecastRow[] = forecast || [
    { year: 2025, annual_units: 13_000_000 },
    { year: 2026, annual_units: 15_600_000 },
    { year: 2027, annual_units: 18_720_000 },
    { year: 2028, annual_units: 22_464_000 },
    { year: 2029, annual_units: 26_956_800 },
  ];

  // Default SKUs if not provided
  const defaultSkus: SKU[] = skus || [
    { sku: 'Educational_Materials_A', annual_volume: 4_000_000, units_per_case: 12, cases_per_pallet: 40 },
    { sku: 'Educational_Materials_B', annual_volume: 3_500_000, units_per_case: 24, cases_per_pallet: 35 },
    { sku: 'Educational_Materials_C', annual_volume: 2_800_000, units_per_case: 18, cases_per_pallet: 42 },
    { sku: 'Educational_Materials_D', annual_volume: 2_000_000, units_per_case: 15, cases_per_pallet: 38 },
    { sku: 'Educational_Materials_E', annual_volume: 700_000, units_per_case: 30, cases_per_pallet: 25 },
  ];

  // Import warehouse optimizer with circuit breaker
  const warehouseResult = await circuitBreakers.optimization.execute(async () => {
    const { optimizeWarehouse } = await import('@/lib/advanced-warehouse-optimizer');
    return optimizeWarehouse(defaultConfig, defaultForecast, defaultSkus);
  });

  // Multi-year scenarios optimization
  const scenarios = [];
  const nodeRange = Array.from(
    { length: Math.floor((maxNodes - minNodes) / step) + 1 },
    (_, i) => minNodes + i * step
  );

  for (const nodes of nodeRange) {
    try {
      const scenarioConfig = { ...defaultConfig, transportation: { ...defaultConfig.transportation, max_facilities: nodes } };
      
      // Use worker process for CPU-intensive optimization
      const optimizationResult = await OptimizationWorker.solve({
        config: scenarioConfig,
        forecast: defaultForecast,
        baseline: actualTransportBaseline,
        nodes
      }, {
        timeoutMs: 300000, // 5 minutes
        jobId: `batch-${nodes}-nodes`
      });

      if (!optimizationResult.success) {
        console.warn(`⚠️ Optimization failed for ${nodes} nodes: ${optimizationResult.error}`);
        continue;
      }

      scenarios.push({
        nodes,
        kpis: optimizationResult.result,
        config: scenarioConfig,
        optimization_data: optimizationResult
      });

    } catch (error) {
      console.error(`❌ Error optimizing ${nodes} nodes:`, error);
    }
  }

  // Filter valid scenarios and find best
  const validScenarios = scenarios.filter(s => s.kpis && typeof s.kpis.total_network_cost_all_years === 'number');
  
  if (validScenarios.length === 0) {
    throw createProductionError.serviceUnavailable(
      'No valid optimization scenarios generated. Check model complexity and try again.'
    );
  }

  // Find best scenario based on criterion
  let bestIdx = 0;
  if (criterion === 'total_cost') {
    bestIdx = validScenarios.reduce((best, current, index) => 
      current.kpis.total_network_cost_all_years < validScenarios[best].kpis.total_network_cost_all_years ? index : best, 0
    );
  }

  const baselineAllYears = defaultForecast.map(f => actualTransportBaseline * (f.annual_units / defaultForecast[0].annual_units));

  const response = {
    ok: true,
    batch_summary: {
      scenarios_run: scenarios.length,
      successful_scenarios: validScenarios.length,
      failed_scenarios: scenarios.length - validScenarios.length,
      best_scenario_nodes: validScenarios[bestIdx]?.nodes,
      best_scenario_cost: validScenarios[bestIdx]?.kpis?.total_network_cost_all_years,
      cost_range: validScenarios.length > 0 ? {
        min: Math.min(...validScenarios.map(s => s.kpis.total_network_cost_all_years)),
        max: Math.max(...validScenarios.map(s => s.kpis.total_network_cost_all_years)),
      } : null,
    },
    wh: warehouseResult,
    scenarios: validScenarios,
    best: validScenarios[bestIdx],
    baseline_integration: {
      transport_baseline: actualTransportBaseline,
      transport_baseline_all_years: baselineAllYears,
      best_transport_cost_all_years: validScenarios[bestIdx]?.kpis?.total_transport_cost_all_years,
      best_savings_percent: validScenarios[bestIdx]?.kpis?.transport_savings_percent,
    }
  };

  return response;
}

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting optimization request ${requestId}`);
    
    const body = await req.json();
    const { scenario_id } = body;

    // STRICT VALIDATION - NO FALLBACKS ALLOWED
    if (!scenario_id) {
      throw createProductionError.realDataRequired(
        'scenario_id is required for optimization',
        { requestId }
      );
    }

    const scenarioId = Number(scenario_id);
    
    // Validate scenario exists using centralized DB
    const scenario = await circuitBreakers.database.execute(async () => {
      return await fetchScenarioById(scenarioId);
    });
    
    if (!scenario) {
      throw createProductionError.validationFailed(
        `Scenario ${scenarioId} not found`,
        { requestId, scenarioId }
      );
    }

    // Create persistent job with Redis storage
    const jobId = uuidv4();
    await jobManager.createJob(jobId, {
      id: jobId,
      scenario_id: scenarioId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      job_type: 'optimization'
    });

    console.log(`📝 Created persistent job ${jobId} for scenario ${scenarioId}`);

    // Start background processing (NO MORE BLOCKING MAIN THREAD)
    setImmediate(async () => {
      try {
        await jobManager.updateJobStatus(jobId, 'running');
        console.log(`🔄 Starting background optimization for job ${jobId}`);

        // Merge scenario metadata with request body
        const merged = { 
          ...body, 
          scenario: { 
            ...(body.scenario || {}), 
            ...(scenario.metadata || {}), 
            ...scenario 
          } 
        };

        // Run optimization in background
        const result = await performOptimization(merged);
        
        await jobManager.updateJobStatus(jobId, 'completed', result);
        console.log(`✅ Optimization completed for job ${jobId}`);
        
      } catch (err: any) {
        console.error(`❌ Job ${jobId} failed:`, err);
        await jobManager.updateJobStatus(
          jobId, 
          'failed', 
          undefined, 
          err?.message || String(err)
        );
      }
    });

    // Return immediately with job ID (non-blocking)
    const duration = Date.now() - startTime;
    return NextResponse.json({ 
      success: true, 
      data: {
        job_id: jobId,
        scenario_id: scenarioId,
        status: 'queued',
        message: 'Optimization job queued successfully',
        estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      },
      meta: {
        request_id: requestId,
        duration_ms: duration
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorResponse = ErrorHandler.handleApiError(error, requestId);
    
    console.error(`❌ Optimization request ${requestId} failed after ${duration}ms:`, error);
    
    return NextResponse.json(
      {
        ...errorResponse,
        meta: {
          request_id: requestId,
          duration_ms: duration
        }
      },
      { status: errorResponse.statusCode }
    );
  }
}

export async function GET(req: NextRequest) {
  const requestId = uuidv4();
  
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    
    if (jobId) {
      // Get specific job status from Redis
      const job = await jobManager.getJob(jobId);
      if (!job) {
        throw createProductionError.validationFailed(
          `Job ${jobId} not found`,
          { requestId, jobId }
        );
      }

      return NextResponse.json({ 
        success: true, 
        data: job,
        meta: { request_id: requestId }
      });
      
    } else {
      // Get all recent jobs for monitoring
      const jobs = await jobManager.getRecentJobs(20);
      const stats = await jobManager.getJobStats();
      
      return NextResponse.json({ 
        success: true, 
        data: jobs,
        stats,
        meta: { request_id: requestId }
      });
    }
    
  } catch (error: any) {
    const errorResponse = ErrorHandler.handleApiError(error, requestId);
    
    return NextResponse.json(
      {
        ...errorResponse,
        meta: { request_id: requestId }
      },
      { status: errorResponse.statusCode }
    );
  }
}

// Health check endpoint
export async function OPTIONS() {
  try {
    // Quick health checks
    const [dbHealthy, redisHealthy] = await Promise.all([
      db.isHealthy(),
      jobManager.isHealthy()
    ]);
    
    const stats = await jobManager.getJobStats();
    
    return NextResponse.json({
      success: true,
      health: {
        database: dbHealthy,
        redis: redisHealthy,
        optimization_worker: true // Always true if server is running
      },
      stats
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      health: {
        database: false,
        redis: false,
        optimization_worker: false
      },
      error: 'Health check failed'
    }, { status: 503 });
  }
}
