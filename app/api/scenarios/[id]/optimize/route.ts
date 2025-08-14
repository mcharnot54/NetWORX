import { NextRequest, NextResponse } from 'next/server';
import { OptimizationResultService, AuditLogService } from '@/lib/database';
import { jobQueue } from '@/lib/job-queue';
import { v4 as uuidv4 } from 'uuid';

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

    const { result_type, optimization_params } = body;

    // Create optimization result record with 'queued' status
    const optimizationRunId = uuidv4();
    const optimizationResult = await OptimizationResultService.createOptimizationResult({
      scenario_id: scenarioId,
      result_type: result_type || 'combined',
      optimization_run_id: optimizationRunId,
      status: 'queued', // Changed from 'running' to 'queued'
      results_data: {},
      performance_metrics: {},
      recommendations: {}
    });

    // Log the action
    await AuditLogService.logAction({
      scenario_id: scenarioId,
      action: 'queue_optimization',
      entity_type: 'optimization_result',
      entity_id: optimizationResult.id,
      details: { result_type, optimization_run_id: optimizationRunId }
    });

    // Add job to background processing queue
    const jobId = await jobQueue.addJob(
      scenarioId,
      optimizationRunId,
      result_type || 'combined',
      optimization_params
    );

    console.log(`Optimization job ${jobId} queued for scenario ${scenarioId}`);

    return NextResponse.json({
      success: true,
      data: {
        optimization_run_id: optimizationRunId,
        result_id: optimizationResult.id,
        job_id: jobId,
        status: 'queued',
        message: 'Optimization queued successfully - processing will begin shortly'
      }
    });
  } catch (error) {
    console.error('Error starting optimization:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start optimization' },
      { status: 500 }
    );
  }
}


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

    // Get optimization results from database
    const results = await OptimizationResultService.getOptimizationResults(scenarioId);

    // Get current job status from job queue
    const jobs = jobQueue.getJobsForScenario(scenarioId);

    // Transform results to include job information and the optimization data in the expected format
    const transformedResults = results.map((result: any) => {
      // Find corresponding job
      const job = jobs.find(j => j.optimization_run_id === result.optimization_run_id);

      return {
        ...result,
        optimization_results: result.results_data || {},
        success: result.status === 'completed',
        job_status: job ? {
          id: job.id,
          status: job.status,
          progress_percentage: job.progress_percentage,
          current_step: job.current_step,
          estimated_completion_minutes: job.estimated_completion_minutes,
          error_message: job.error_message
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedResults,
      results: transformedResults, // Also provide in results key for backward compatibility
      active_jobs: jobs.filter(j => j.status === 'running' || j.status === 'queued').length
    });
  } catch (error) {
    console.error('Error fetching optimization results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch optimization results' },
      { status: 500 }
    );
  }
}
