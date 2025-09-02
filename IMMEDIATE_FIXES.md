# NetWORX Essentials - Immediate Production Fixes

## **🚨 CRITICAL: Your System WILL FAIL Under Production Load**

These fixes must be implemented **immediately** before handling real client data.

## **Phase 1: Emergency Fixes (Deploy This Week)**

### **1. Fix Volatile Job Storage (CRITICAL)**

**Current Problem:**
```typescript
// app/api/optimize/run-batch/route.ts - Line 24
const jobs: Record<string, JobRecord> = {}; // ❌ LOST ON RESTART!
```

**Immediate Fix:**
```typescript
// lib/production-job-manager.ts
import Redis from 'ioredis';

export class ProductionJobManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailure: attempts => Math.min(attempts * 50, 500),
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }

  async createJob(id: string, data: JobRecord): Promise<void> {
    await this.redis.setex(`job:${id}`, 86400, JSON.stringify(data));
    await this.redis.zadd('job:queue', Date.now(), id);
  }

  async getJob(id: string): Promise<JobRecord | null> {
    const data = await this.redis.get(`job:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async updateJobStatus(id: string, status: string, result?: any): Promise<void> {
    const job = await this.getJob(id);
    if (job) {
      job.status = status as any;
      job.updated_at = new Date().toISOString();
      if (result) job.result = result;
      await this.redis.setex(`job:${id}`, 86400, JSON.stringify(job));
    }
  }

  async getActiveJobs(): Promise<JobRecord[]> {
    const jobIds = await this.redis.zrange('job:queue', 0, -1);
    const jobs = await Promise.all(
      jobIds.map(id => this.getJob(id))
    );
    return jobs.filter(Boolean) as JobRecord[];
  }
}

// Replace in run-batch/route.ts:
const jobManager = new ProductionJobManager();
```

### **2. Stop CPU-Blocking Operations (CRITICAL)**

**Current Problem:**
```typescript
// lib/advanced-solver.ts - Line 23
const result = JSLP.Solve(model); // ❌ BLOCKS MAIN THREAD!
```

**Immediate Fix - Worker Process:**
```typescript
// lib/optimization-worker.ts
import { Worker } from 'worker_threads';
import { join } from 'path';

export class OptimizationWorker {
  private static workerPath = join(__dirname, 'solver-worker.js');
  
  static async solve(model: any, timeoutMs: number = 300000): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(OptimizationWorker.workerPath, {
        workerData: { model }
      });
      
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Optimization timeout - model too complex'));
      }, timeoutMs);
      
      worker.on('message', (result) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(result);
      });
      
      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      });
    });
  }
}

// solver-worker.js (separate file)
const { parentPort, workerData } = require('worker_threads');
const JSLP = require('javascript-lp-solver');

try {
  const result = JSLP.Solve(workerData.model);
  parentPort.postMessage(result);
} catch (error) {
  parentPort.postMessage({ error: error.message });
}
```

### **3. Fix Database Connection Chaos (CRITICAL)**

**Current Problem:**
```typescript
// Multiple files calling neon() directly
const sql = neon(process.env.DATABASE_URL); // ❌ UNMANAGED CONNECTIONS!
```

**Immediate Fix:**
```typescript
// lib/database-manager.ts
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

class DatabaseManager {
  private static instance: DatabaseManager;
  private sql: any;
  private connectionCount = 0;
  private readonly maxConnections = 20;
  
  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL required for production');
    }
    
    this.sql = neon(process.env.DATABASE_URL, {
      connectionTimeoutMillis: 10000, // Fail fast
      queryTimeoutMillis: 30000,      // Shorter timeout
      idleTimeoutMillis: 30000,
      fetchOptions: {
        signal: AbortSignal.timeout(30000)
      }
    });
  }
  
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  
  async query(text: string, params?: any[]): Promise<any> {
    if (this.connectionCount >= this.maxConnections) {
      throw new Error('Database connection limit exceeded');
    }
    
    this.connectionCount++;
    try {
      return await this.sql(text, params || []);
    } finally {
      this.connectionCount--;
    }
  }
  
  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const db = DatabaseManager.getInstance();

// Replace ALL direct neon() calls with:
// import { db } from '@/lib/database-manager';
// const result = await db.query('SELECT * FROM projects');
```

### **4. Add Proper Error Handling (CRITICAL)**

**Current Problem:**
```typescript
// Errors returned to client with stack traces
return NextResponse.json({ error: error.stack }); // ❌ LEAKS INTERNALS!
```

**Immediate Fix:**
```typescript
// lib/error-handler.ts
export class ProductionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ProductionError';
  }
}

export function handleApiError(error: any): {
  message: string;
  code: string;
  statusCode: number;
} {
  // Log full error server-side
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Return sanitized error to client
  if (error instanceof ProductionError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    };
  }
  
  // Unknown errors - don't leak details
  return {
    message: 'An internal error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500
  };
}

// Usage in route handlers:
try {
  // ... route logic
} catch (error) {
  const errorResponse = handleApiError(error);
  return NextResponse.json(
    { success: false, error: errorResponse.message, code: errorResponse.code },
    { status: errorResponse.statusCode }
  );
}
```

### **5. Add Circuit Breakers (CRITICAL)**

```typescript
// lib/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeMs = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime < this.recoveryTimeMs) {
        throw new ProductionError(
          'Service temporarily unavailable',
          'CIRCUIT_OPEN',
          503
        );
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage:
const dbCircuitBreaker = new CircuitBreaker(3, 30000);
const optimizationCircuitBreaker = new CircuitBreaker(2, 60000);
```

## **Phase 2: Resource Management (Next Week)**

### **6. Memory Management for Large Files**

```typescript
// lib/streaming-excel-processor.ts
import * as xlsx from 'xlsx';
import { Readable } from 'stream';

export class StreamingExcelProcessor {
  private static readonly MAX_MEMORY_MB = 100;
  
  static async processFile(
    buffer: Buffer,
    onRow: (row: any, rowIndex: number) => Promise<void>
  ): Promise<void> {
    if (buffer.length > this.MAX_MEMORY_MB * 1024 * 1024) {
      throw new ProductionError(
        `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Maximum ${this.MAX_MEMORY_MB}MB allowed.`,
        'FILE_TOO_LARGE',
        413
      );
    }
    
    // Process in chunks to avoid memory spikes
    const workbook = xlsx.read(buffer, { 
      type: 'buffer',
      sheetStubs: false,  // Don't load empty cells
      cellDates: true,
      cellNF: false       // Don't format cells
    });
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { 
        header: 1,
        defval: null,
        blankrows: false
      });
      
      // Process in batches to control memory
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (let j = 0; j < batch.length; j++) {
          await onRow(batch[j], i + j);
        }
        
        // Force garbage collection between batches
        if (global.gc) global.gc();
      }
    }
  }
}
```

### **7. Queue-Based Job Processing**

```typescript
// lib/job-queue.ts
import Bull from 'bull';

export class JobQueue {
  private optimizationQueue: Bull.Queue;
  private fileProcessingQueue: Bull.Queue;
  
  constructor() {
    const redisConfig = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379')
    };
    
    this.optimizationQueue = new Bull('optimization', { redis: redisConfig });
    this.fileProcessingQueue = new Bull('file-processing', { redis: redisConfig });
    
    this.setupProcessors();
  }
  
  private setupProcessors() {
    // Optimization processor
    this.optimizationQueue.process('mip-solve', 2, async (job) => {
      const { model, jobId } = job.data;
      
      try {
        job.progress(10);
        const result = await OptimizationWorker.solve(model, 300000);
        job.progress(100);
        
        await jobManager.updateJobStatus(jobId, 'completed', result);
        return result;
      } catch (error) {
        await jobManager.updateJobStatus(jobId, 'failed', { error: error.message });
        throw error;
      }
    });
    
    // File processing processor
    this.fileProcessingQueue.process('excel-parse', 3, async (job) => {
      const { fileBuffer, jobId } = job.data;
      
      const results: any[] = [];
      await StreamingExcelProcessor.processFile(fileBuffer, async (row, index) => {
        results.push(row);
        if (index % 100 === 0) {
          job.progress(Math.min(95, (index / 10000) * 100));
        }
      });
      
      await jobManager.updateJobStatus(jobId, 'completed', { rows: results });
      return results;
    });
  }
  
  async submitOptimization(model: any, jobId: string): Promise<string> {
    const job = await this.optimizationQueue.add('mip-solve', 
      { model, jobId },
      {
        attempts: 2,
        backoff: 'exponential',
        delay: 1000,
        removeOnComplete: 5,
        removeOnFail: 10
      }
    );
    
    return job.id as string;
  }
}

export const jobQueue = new JobQueue();
```

## **Updated Route Handler Example**

```typescript
// app/api/optimize/run-batch/route.ts (FIXED VERSION)
import { NextRequest, NextResponse } from 'next/server';
import { ProductionJobManager } from '@/lib/production-job-manager';
import { jobQueue } from '@/lib/job-queue';
import { handleApiError, ProductionError } from '@/lib/error-handler';
import { v4 as uuidv4 } from 'uuid';

const jobManager = new ProductionJobManager();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required data exists (NO FALLBACKS)
    if (!body.scenario_id) {
      throw new ProductionError(
        'REAL DATA REQUIRED: scenario_id is required',
        'MISSING_SCENARIO',
        400
      );
    }
    
    // Create persistent job
    const jobId = uuidv4();
    await jobManager.createJob(jobId, {
      id: jobId,
      scenario_id: body.scenario_id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Submit to worker queue (NO MORE BLOCKING)
    const queueJobId = await jobQueue.submitOptimization(body.model, jobId);
    
    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      data: {
        job_id: jobId,
        queue_id: queueJobId,
        status: 'queued',
        message: 'Optimization submitted to worker queue'
      }
    });
    
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    
    if (jobId) {
      const job = await jobManager.getJob(jobId);
      if (!job) {
        throw new ProductionError(
          'Job not found',
          'JOB_NOT_FOUND',
          404
        );
      }
      
      return NextResponse.json({
        success: true,
        data: job
      });
    } else {
      const jobs = await jobManager.getActiveJobs();
      return NextResponse.json({
        success: true,
        data: jobs
      });
    }
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    );
  }
}
```

## **Environment Variables Required**

```bash
# Add to .env.production
DATABASE_URL=postgresql://user:pass@your-rds-proxy:5432/networx
REDIS_HOST=your-elasticache-cluster.cache.amazonaws.com
REDIS_PORT=6379

# Optional - Node.js optimization for heavy workloads
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
UV_THREADPOOL_SIZE=32

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## **Deployment Steps**

1. **Install Required Dependencies:**
```bash
pnpm add ioredis bull redis pg @types/pg
pnpm add -D @types/ioredis
```

2. **Deploy Redis:**
```bash
# Use AWS ElastiCache or local Redis for testing
docker run -d -p 6379:6379 redis:7-alpine
```

3. **Update All Route Files:**
   - Replace in-memory job storage with `ProductionJobManager`
   - Replace direct database calls with `DatabaseManager`
   - Add error handling with `handleApiError`

4. **Test Under Load:**
```bash
# Load test the optimization endpoint
ab -n 100 -c 10 -T 'application/json' -p test-payload.json \
   http://localhost:3000/api/optimize/run-batch
```

## **Monitoring Commands**

```bash
# Check job queue status
curl http://localhost:3000/api/optimize/run-batch | jq '.data[].status'

# Monitor Redis
redis-cli info stats

# Check database connections
# (Add to your health endpoint)
```

**CRITICAL:** These fixes must be deployed before processing any real client data. The current system will fail under production load.
