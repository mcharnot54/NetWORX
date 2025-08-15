import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/job-queue';

export const dynamic = 'force-static';

export async function GET() {
  try {
    // Return queue statistics for monitoring
    const stats = jobQueue.getStats();
    return NextResponse.json({
      success: true,
      data: {
        queue_stats: stats,
        message: 'Use ?scenario_id=X to get jobs for a specific scenario'
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
