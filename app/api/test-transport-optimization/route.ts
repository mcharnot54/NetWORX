import { NextRequest, NextResponse } from 'next/server';
import { getJobQueue } from '@/lib/job-queue';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('Testing transport optimization directly...');

    // Get or create test scenario
    let [testScenario] = await sql`
      SELECT id, name, metadata, cities 
      FROM scenarios 
      WHERE name = 'Test Transport Scenario'
      LIMIT 1
    `;

    if (!testScenario) {
      // Create test scenario if it doesn't exist
      const [project] = await sql`SELECT id FROM projects LIMIT 1`;
      if (!project) {
        return NextResponse.json({
          success: false,
          error: 'No projects found. Please run /api/fix-db-schema first.'
        }, { status: 400 });
      }

      [testScenario] = await sql`
        INSERT INTO scenarios (
          project_id, name, description, scenario_type, status, 
          metadata, cities, number_of_nodes
        )
        VALUES (
          ${project.id}, 
          'Test Transport Scenario', 
          'Test scenario for transport optimization', 
          'transport',
          'draft',
          '{"created_for_testing": true}',
          ARRAY['Littleton, MA', 'Chicago, IL', 'Dallas, TX'],
          3
        )
        RETURNING id, name, metadata, cities
      `;
    }

    console.log('Using test scenario:', testScenario);

    // Test transport optimization directly
    const testParams = {
      optimization_type: 'transport',
      scenario_type: 'lowest_cost_city',
      cities: testScenario.cities || ['Littleton, MA', 'Chicago, IL', 'Dallas, TX'],
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

    console.log('Starting optimization with params:', testParams);

    // Add optimization job to queue
    const jobQueue = getJobQueue();
    const optimizationRunId = `test_${Date.now()}`;
    
    const jobId = await jobQueue.addJob(
      testScenario.id,
      optimizationRunId,
      'transport',
      testParams
    );

    console.log(`Test optimization job ${jobId} queued successfully`);

    // Wait a bit and check job status
    await new Promise(resolve => setTimeout(resolve, 3000));
    const job = jobQueue.getJob(jobId);

    return NextResponse.json({
      success: true,
      message: 'Transport optimization test started',
      test_scenario: testScenario,
      job_id: jobId,
      optimization_run_id: optimizationRunId,
      job_status: job ? {
        status: job.status,
        progress: job.progress_percentage,
        current_step: job.current_step,
        error_message: job.error_message
      } : null,
      test_params: testParams
    });
  } catch (error) {
    console.error('Transport optimization test failed:', error);
    return NextResponse.json({
      success: false,
      error: `Transport optimization test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    const jobQueue = getJobQueue();

    // Get recent optimization results
    const recentResults = await sql`
      SELECT * FROM optimization_results 
      WHERE result_type = 'transport'
      ORDER BY started_at DESC 
      LIMIT 5
    `;

    // Get job queue stats
    const queueStats = jobQueue.getStats();

    // Get active jobs
    const activeJobs = Array.from((jobQueue as any).jobs.values())
      .filter((job: any) => job.status === 'running' || job.status === 'queued')
      .map((job: any) => ({
        id: job.id,
        scenario_id: job.scenario_id,
        status: job.status,
        progress: job.progress_percentage,
        current_step: job.current_step,
        created_at: job.created_at,
        error_message: job.error_message
      }));

    return NextResponse.json({
      success: true,
      recent_results: recentResults,
      queue_stats: queueStats,
      active_jobs: activeJobs
    });
  } catch (error) {
    console.error('Failed to get transport optimization status:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
