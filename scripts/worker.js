/**
 * Worker Process for NetWORX Essentials
 * Handles CPU-intensive optimization tasks in separate process
 */

const { parentPort, workerData } = require('worker_threads');
const Redis = require('ioredis');

// Initialize Redis connection for job management
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailure: (attempts) => Math.min(attempts * 50, 500),
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

const WORKER_TYPE = process.env.WORKER_TYPE || 'optimization';
const POLL_INTERVAL = 5000; // Poll every 5 seconds
const MAX_RETRIES = 3;

console.log(`🔄 Starting ${WORKER_TYPE} worker process...`);

class WorkerProcessor {
  constructor() {
    this.isRunning = true;
    this.currentJob = null;
    this.processed = 0;
    this.failed = 0;
  }

  async start() {
    console.log(`✅ ${WORKER_TYPE} worker ready`);
    
    // Main processing loop
    while (this.isRunning) {
      try {
        await this.processNextJob();
        await this.sleep(POLL_INTERVAL);
      } catch (error) {
        console.error(`❌ Worker error:`, error);
        await this.sleep(POLL_INTERVAL * 2); // Back off on error
      }
    }
  }

  async processNextJob() {
    try {
      // Get next job from queue based on worker type
      const queueKey = `networx:queue:${WORKER_TYPE}`;
      const jobId = await redis.lpop(queueKey);
      
      if (!jobId) {
        return; // No jobs available
      }

      this.currentJob = jobId;
      console.log(`🔄 Processing job ${jobId}`);

      // Get job data
      const jobData = await redis.get(`networx:jobs:${jobId}`);
      if (!jobData) {
        console.warn(`⚠️ Job ${jobId} data not found`);
        return;
      }

      const job = JSON.parse(jobData);
      
      // Update job status to running
      job.status = 'running';
      job.updated_at = new Date().toISOString();
      await redis.setex(`networx:jobs:${jobId}`, 86400, JSON.stringify(job));

      // Process the job based on type
      let result;
      if (WORKER_TYPE === 'optimization') {
        result = await this.processOptimizationJob(job);
      } else if (WORKER_TYPE === 'file-processing') {
        result = await this.processFileJob(job);
      } else {
        throw new Error(`Unknown worker type: ${WORKER_TYPE}`);
      }

      // Update job with results
      job.status = 'completed';
      job.result = result;
      job.updated_at = new Date().toISOString();
      await redis.setex(`networx:jobs:${jobId}`, 86400, JSON.stringify(job));

      this.processed++;
      console.log(`✅ Job ${jobId} completed`);

    } catch (error) {
      this.failed++;
      console.error(`❌ Job ${this.currentJob} failed:`, error);

      // Update job status to failed
      if (this.currentJob) {
        try {
          const jobData = await redis.get(`networx:jobs:${this.currentJob}`);
          if (jobData) {
            const job = JSON.parse(jobData);
            job.status = 'failed';
            job.error = error.message;
            job.updated_at = new Date().toISOString();
            await redis.setex(`networx:jobs:${this.currentJob}`, 86400, JSON.stringify(job));
          }
        } catch (updateError) {
          console.error('Failed to update job status:', updateError);
        }
      }
    } finally {
      this.currentJob = null;
    }
  }

  async processOptimizationJob(job) {
    console.log(`🧮 Processing optimization job ${job.id}`);
    
    // Import optimization worker
    const { OptimizationWorker } = require('../lib/optimization-worker');
    
    // Extract model from job data
    const model = job.result?.model || job.optimization_params?.model;
    if (!model) {
      throw new Error('No optimization model found in job data');
    }

    // Run optimization with timeout
    const result = await OptimizationWorker.solve(model, {
      timeoutMs: 300000, // 5 minutes
      jobId: job.id
    });

    if (!result.success) {
      throw new Error(result.error || 'Optimization failed');
    }

    return {
      optimization_result: result.result,
      duration: result.duration,
      memory_used: result.memoryUsed,
      solver_used: result.solverUsed
    };
  }

  async processFileJob(job) {
    console.log(`📁 Processing file job ${job.id}`);
    
    // Import file processing utilities
    const { StreamingExcelProcessor } = require('../lib/streaming-excel-processor');
    
    // Extract file data from job
    const fileBuffer = Buffer.from(job.file_data, 'base64');
    
    const results = [];
    await StreamingExcelProcessor.processFile(fileBuffer, async (row, index) => {
      results.push(row);
    });

    return {
      rows_processed: results.length,
      data: results.slice(0, 1000) // Limit data size
    };
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    console.log(`🛑 Stopping ${WORKER_TYPE} worker...`);
    this.isRunning = false;
    await redis.quit();
  }

  getStats() {
    return {
      type: WORKER_TYPE,
      processed: this.processed,
      failed: this.failed,
      current_job: this.currentJob,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

// Create and start worker
const worker = new WorkerProcessor();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT');
  await worker.stop();
  process.exit(0);
});

// Start processing
worker.start().catch(error => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});

// Log stats periodically
setInterval(() => {
  const stats = worker.getStats();
  console.log(`📊 Worker stats: ${stats.processed} processed, ${stats.failed} failed, memory: ${Math.round(stats.memory.heapUsed / 1024 / 1024)}MB`);
}, 60000); // Every minute
