import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/job-queue';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenario_id');

    let jobs;
    if (scenarioId) {
      const scenarioIdInt = parseInt(scenarioId);
      if (isNaN(scenarioIdInt)) {
        return NextResponse.json(
          { success: false, error: 'Invalid scenario ID' },
          { status: 400 }
        );
      }
      jobs = jobQueue.getJobsForScenario(scenarioIdInt);
    } else {
      // Return queue statistics for monitoring
      const stats = jobQueue.getStats();
      return NextResponse.json({
        success: true,
        data: {
          queue_stats: stats,
          message: 'Use ?scenario_id=X to get jobs for a specific scenario'
        }
      });
    }

    // Calculate additional metrics for each job
    const now = new Date();
    const enrichedJobs = jobs.map(job => {
      let estimatedTimeRemaining: number | undefined;
      
      if (job.status === 'running' && job.started_at && job.estimated_completion_minutes) {
        const elapsedMinutes = (now.getTime() - job.started_at.getTime()) / (1000 * 60);
        estimatedTimeRemaining = Math.max(0, job.estimated_completion_minutes - elapsedMinutes);
      }

      return {
        ...job,
        estimated_time_remaining_minutes: estimatedTimeRemaining,
        elapsed_time_seconds: job.started_at 
          ? Math.floor((now.getTime() - job.started_at.getTime()) / 1000)
          : 0
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedJobs,
      count: enrichedJobs.length
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
