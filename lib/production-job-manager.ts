/**
 * Production Job Manager - Redis-backed persistence
 * Replaces volatile in-memory job storage that loses data on restart
 */

import Redis from 'ioredis';

export interface JobRecord {
  id: string;
  scenario_id?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  result?: any;
  error?: string;
  job_type?: string;
  progress?: number;
  estimated_completion?: string;
}

export class ProductionJobManager {
  private static instance: ProductionJobManager;
  private redis: Redis;
  private readonly keyPrefix = 'networx:jobs:';
  private readonly queueKey = 'networx:job:queue';
  private readonly ttl = 86400; // 24 hours

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 500),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 10000,
      family: 4,
      db: 0
    });

    // Handle connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected for job management');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis ready for job operations');
    });
  }

  static getInstance(): ProductionJobManager {
    if (!ProductionJobManager.instance) {
      ProductionJobManager.instance = new ProductionJobManager();
    }
    return ProductionJobManager.instance;
  }

  /**
   * Create a new job with persistent storage
   */
  async createJob(id: string, data: JobRecord): Promise<void> {
    try {
      const jobData = {
        ...data,
        id,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store job data with TTL
      await this.redis.setex(
        `${this.keyPrefix}${id}`, 
        this.ttl, 
        JSON.stringify(jobData)
      );

      // Add to sorted set for querying (sorted by creation time)
      await this.redis.zadd(
        this.queueKey, 
        Date.now(), 
        id
      );

      console.log(`📝 Created persistent job: ${id}`);
    } catch (error) {
      console.error(`❌ Failed to create job ${id}:`, error);
      throw new Error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(id: string): Promise<JobRecord | null> {
    try {
      const data = await this.redis.get(`${this.keyPrefix}${id}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Failed to get job ${id}:`, error);
      return null;
    }
  }

  /**
   * Update job status and metadata
   */
  async updateJobStatus(
    id: string, 
    status: JobRecord['status'], 
    result?: any, 
    error?: string,
    progress?: number
  ): Promise<void> {
    try {
      const job = await this.getJob(id);
      if (!job) {
        console.warn(`⚠️ Attempted to update non-existent job: ${id}`);
        return;
      }

      job.status = status;
      job.updated_at = new Date().toISOString();
      
      if (result !== undefined) job.result = result;
      if (error !== undefined) job.error = error;
      if (progress !== undefined) job.progress = progress;

      // Set estimated completion for running jobs
      if (status === 'running' && !job.estimated_completion) {
        const estimatedMs = this.estimateCompletionTime(job.job_type);
        job.estimated_completion = new Date(Date.now() + estimatedMs).toISOString();
      }

      await this.redis.setex(
        `${this.keyPrefix}${id}`, 
        this.ttl, 
        JSON.stringify(job)
      );

      console.log(`🔄 Updated job ${id}: ${status}${progress ? ` (${progress}%)` : ''}`);
    } catch (error) {
      console.error(`❌ Failed to update job ${id}:`, error);
      throw new Error(`Failed to update job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all active jobs (pending, running)
   */
  async getActiveJobs(): Promise<JobRecord[]> {
    try {
      // Get job IDs from sorted set (most recent first)
      const jobIds = await this.redis.zrevrange(this.queueKey, 0, -1);
      
      if (jobIds.length === 0) {
        return [];
      }

      // Fetch job data in batch
      const pipeline = this.redis.pipeline();
      jobIds.forEach(id => {
        pipeline.get(`${this.keyPrefix}${id}`);
      });

      const results = await pipeline.exec();
      const jobs: JobRecord[] = [];

      results?.forEach((result, index) => {
        if (result && result[1]) {
          try {
            const job = JSON.parse(result[1] as string);
            // Only return active jobs
            if (job.status === 'pending' || job.status === 'running') {
              jobs.push(job);
            }
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse job ${jobIds[index]}:`, parseError);
          }
        }
      });

      return jobs;
    } catch (error) {
      console.error('❌ Failed to get active jobs:', error);
      return [];
    }
  }

  /**
   * Get recent jobs (all statuses) for monitoring
   */
  async getRecentJobs(limit: number = 50): Promise<JobRecord[]> {
    try {
      const jobIds = await this.redis.zrevrange(this.queueKey, 0, limit - 1);
      
      if (jobIds.length === 0) {
        return [];
      }

      const pipeline = this.redis.pipeline();
      jobIds.forEach(id => {
        pipeline.get(`${this.keyPrefix}${id}`);
      });

      const results = await pipeline.exec();
      const jobs: JobRecord[] = [];

      results?.forEach((result, index) => {
        if (result && result[1]) {
          try {
            jobs.push(JSON.parse(result[1] as string));
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse job ${jobIds[index]}:`, parseError);
          }
        }
      });

      return jobs;
    } catch (error) {
      console.error('❌ Failed to get recent jobs:', error);
      return [];
    }
  }

  /**
   * Delete completed or failed jobs older than specified time
   */
  async cleanupOldJobs(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      const jobIds = await this.redis.zrangebyscore(this.queueKey, 0, cutoffTime);
      
      if (jobIds.length === 0) {
        return 0;
      }

      // Check each job's status before deletion
      const pipeline = this.redis.pipeline();
      const jobsToDelete: string[] = [];

      for (const id of jobIds) {
        const job = await this.getJob(id);
        if (job && (job.status === 'completed' || job.status === 'failed')) {
          jobsToDelete.push(id);
          pipeline.del(`${this.keyPrefix}${id}`);
          pipeline.zrem(this.queueKey, id);
        }
      }

      if (jobsToDelete.length > 0) {
        await pipeline.exec();
        console.log(`🧹 Cleaned up ${jobsToDelete.length} old jobs`);
      }

      return jobsToDelete.length;
    } catch (error) {
      console.error('❌ Failed to cleanup old jobs:', error);
      return 0;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats(): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    try {
      const jobs = await this.getRecentJobs(1000); // Get last 1000 jobs
      
      const stats = {
        total: jobs.length,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0
      };

      jobs.forEach(job => {
        switch (job.status) {
          case 'pending': stats.pending++; break;
          case 'running': stats.running++; break;
          case 'completed': stats.completed++; break;
          case 'failed': stats.failed++; break;
        }
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get job stats:', error);
      return { total: 0, pending: 0, running: 0, completed: 0, failed: 0 };
    }
  }

  /**
   * Health check for Redis connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('❌ Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Estimate completion time based on job type
   */
  private estimateCompletionTime(jobType?: string): number {
    const estimates = {
      'optimization': 5 * 60 * 1000,     // 5 minutes
      'file-processing': 2 * 60 * 1000,  // 2 minutes
      'capacity-analysis': 3 * 60 * 1000, // 3 minutes
      'transport-analysis': 4 * 60 * 1000 // 4 minutes
    };

    return estimates[jobType as keyof typeof estimates] || 5 * 60 * 1000;
  }

  /**
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
    }
  }
}

// Export singleton instance
export const jobManager = ProductionJobManager.getInstance();

// Cleanup process on app shutdown
process.on('SIGTERM', async () => {
  console.log('📝 Gracefully shutting down job manager...');
  await jobManager.close();
});

process.on('SIGINT', async () => {
  console.log('📝 Gracefully shutting down job manager...');
  await jobManager.close();
});
