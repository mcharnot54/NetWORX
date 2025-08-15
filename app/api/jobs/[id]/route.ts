import { NextRequest, NextResponse } from 'next/server';
import { getJobQueue } from '@/lib/job-queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Check if it's a job ID or optimization run ID
    let job = getJobQueue().getJob(jobId);
    
    if (!job) {
      // Try to find by optimization run ID
      job = getJobQueue().getJobByOptimizationId(jobId);
    }

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Calculate additional metrics
    const now = new Date();
    let estimatedTimeRemaining: number | undefined;
    
    if (job.status === 'running' && job.started_at && job.estimated_completion_minutes) {
      const elapsedMinutes = (now.getTime() - job.started_at.getTime()) / (1000 * 60);
      estimatedTimeRemaining = Math.max(0, job.estimated_completion_minutes - elapsedMinutes);
    }

    const response = {
      success: true,
      data: {
        ...job,
        estimated_time_remaining_minutes: estimatedTimeRemaining,
        elapsed_time_seconds: job.started_at 
          ? Math.floor((now.getTime() - job.started_at.getTime()) / 1000)
          : 0
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;
    
    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const cancelled = getJobQueue().cancelJob(jobId);
    
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: 'Job not found or cannot be cancelled' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
