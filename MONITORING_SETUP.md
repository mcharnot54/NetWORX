# NetWORX Essentials - Production Monitoring & Alerting

## **Critical Monitoring Requirements**

Your optimization platform processes real client data and **cannot fail silently**. This monitoring setup ensures 24/7 visibility and immediate alerts for any issues.

## **1. Application Metrics (Performance)**

### **Custom Metrics Collection**
```typescript
// lib/metrics-collector.ts
import { CloudWatch } from 'aws-sdk';

export class MetricsCollector {
  private cloudwatch: CloudWatch;
  private namespace = 'NetWORX/Production';
  
  constructor() {
    this.cloudwatch = new CloudWatch({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }
  
  async recordOptimizationTime(durationMs: number, scenarioType: string): Promise<void> {
    await this.putMetric('OptimizationDuration', durationMs, 'Milliseconds', {
      ScenarioType: scenarioType
    });
  }
  
  async recordJobQueueDepth(queueName: string, depth: number): Promise<void> {
    await this.putMetric('JobQueueDepth', depth, 'Count', {
      QueueName: queueName
    });
  }
  
  async recordDatabaseConnectionCount(count: number): Promise<void> {
    await this.putMetric('DatabaseConnections', count, 'Count');
  }
  
  async recordMemoryUsage(usageMB: number): Promise<void> {
    await this.putMetric('MemoryUsage', usageMB, 'Megabytes');
  }
  
  async recordApiLatency(endpoint: string, latencyMs: number): Promise<void> {
    await this.putMetric('ApiLatency', latencyMs, 'Milliseconds', {
      Endpoint: endpoint
    });
  }
  
  async recordJobFailure(jobType: string, errorCode: string): Promise<void> {
    await this.putMetric('JobFailures', 1, 'Count', {
      JobType: jobType,
      ErrorCode: errorCode
    });
  }
  
  private async putMetric(
    metricName: string, 
    value: number, 
    unit: string, 
    dimensions?: Record<string, string>
  ): Promise<void> {
    const params = {
      Namespace: this.namespace,
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: dimensions ? Object.entries(dimensions).map(([key, value]) => ({
          Name: key,
          Value: value
        })) : undefined
      }]
    };
    
    try {
      await this.cloudwatch.putMetricData(params).promise();
    } catch (error) {
      console.error('Failed to send metric:', error);
      // Don't throw - metrics shouldn't break the app
    }
  }
}

export const metrics = new MetricsCollector();
```

### **Request Monitoring Middleware**
```typescript
// lib/monitoring-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { metrics } from './metrics-collector';

export function withMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  endpointName: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();
    
    try {
      const response = await handler(req);
      
      // Record success metrics
      const duration = Date.now() - startTime;
      await metrics.recordApiLatency(endpointName, duration);
      
      const memoryAfter = process.memoryUsage();
      const memoryDelta = (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024;
      await metrics.recordMemoryUsage(memoryAfter.heapUsed / 1024 / 1024);
      
      console.log(`API ${endpointName}: ${duration}ms, Memory: +${memoryDelta.toFixed(1)}MB`);
      
      return response;
    } catch (error) {
      // Record failure metrics
      const errorCode = error instanceof Error ? error.constructor.name : 'UnknownError';
      await metrics.recordJobFailure('API', errorCode);
      
      console.error(`API ${endpointName} failed:`, error);
      throw error;
    }
  };
}

// Usage in route handlers:
export const POST = withMonitoring(async (req: NextRequest) => {
  // Your route logic here
}, 'optimize-run-batch');
```

## **2. Database Monitoring**

### **Connection Pool Monitoring**
```typescript
// lib/database-monitor.ts
import { db } from './database-manager';
import { metrics } from './metrics-collector';

export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }
  
  start(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectDatabaseMetrics();
    }, 30000);
    
    console.log('Database monitoring started');
  }
  
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      // Check database health
      const healthCheck = await this.checkDatabaseHealth();
      
      // Get connection stats
      const connectionStats = await this.getConnectionStats();
      
      // Record metrics
      await metrics.recordDatabaseConnectionCount(connectionStats.active);
      
      if (connectionStats.active > 15) {
        console.warn(`High DB connection count: ${connectionStats.active}/20`);
      }
      
    } catch (error) {
      console.error('Database monitoring failed:', error);
      await metrics.recordJobFailure('Database', 'MonitoringFailure');
    }
  }
  
  private async checkDatabaseHealth(): Promise<boolean> {
    const start = Date.now();
    try {
      await db.query('SELECT 1');
      const duration = Date.now() - start;
      await metrics.recordApiLatency('database-health', duration);
      return true;
    } catch (error) {
      await metrics.recordJobFailure('Database', 'HealthCheckFailure');
      return false;
    }
  }
  
  private async getConnectionStats(): Promise<{
    active: number;
    idle: number;
    total: number;
  }> {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE state = 'active') as active,
          COUNT(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      return result[0] || { active: 0, idle: 0, total: 0 };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      return { active: 0, idle: 0, total: 0 };
    }
  }
}

// Start monitoring
export const dbMonitor = DatabaseMonitor.getInstance();
```

## **3. Job Queue Monitoring**

### **Queue Health Monitoring**
```typescript
// lib/queue-monitor.ts
import { jobQueue } from './job-queue';
import { metrics } from './metrics-collector';

export class QueueMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  start(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.collectQueueMetrics();
    }, 15000); // Every 15 seconds
    
    console.log('Queue monitoring started');
  }
  
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
  
  private async collectQueueMetrics(): Promise<void> {
    try {
      // Monitor optimization queue
      const optQueueStats = await jobQueue.optimizationQueue.getJobCounts();
      await metrics.recordJobQueueDepth('optimization', optQueueStats.waiting);
      
      // Monitor file processing queue  
      const fileQueueStats = await jobQueue.fileProcessingQueue.getJobCounts();
      await metrics.recordJobQueueDepth('file-processing', fileQueueStats.waiting);
      
      // Alert on high queue depth
      if (optQueueStats.waiting > 10) {
        console.warn(`High optimization queue depth: ${optQueueStats.waiting}`);
      }
      
      if (fileQueueStats.waiting > 20) {
        console.warn(`High file processing queue depth: ${fileQueueStats.waiting}`);
      }
      
      // Log queue status
      console.log(`Queues - Opt: ${optQueueStats.waiting}W/${optQueueStats.active}A, File: ${fileQueueStats.waiting}W/${fileQueueStats.active}A`);
      
    } catch (error) {
      console.error('Queue monitoring failed:', error);
      await metrics.recordJobFailure('Queue', 'MonitoringFailure');
    }
  }
}

export const queueMonitor = new QueueMonitor();
```

## **4. Health Check Endpoints**

### **Comprehensive Health Check**
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/database-manager';
import { jobManager } from '@/lib/production-job-manager';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    jobQueue: ServiceHealth;
    memory: ServiceHealth;
  };
  version: string;
  uptime: number;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
  details?: any;
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      jobQueue: await checkJobQueue(),
      memory: checkMemory()
    },
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  };
  
  // Determine overall status
  const serviceStatuses = Object.values(health.services).map(s => s.status);
  if (serviceStatuses.includes('unhealthy')) {
    health.status = 'unhealthy';
  } else if (serviceStatuses.includes('degraded')) {
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}

async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    const latency = Date.now() - start;
    
    return {
      status: latency > 1000 ? 'degraded' : 'healthy',
      latency,
      details: { connectionCount: await getDatabaseConnections() }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Test Redis connectivity through job manager
    await jobManager.getActiveJobs();
    const latency = Date.now() - start;
    
    return {
      status: latency > 500 ? 'degraded' : 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Redis unavailable'
    };
  }
}

async function checkJobQueue(): Promise<ServiceHealth> {
  try {
    const activeJobs = await jobManager.getActiveJobs();
    const queuedJobs = activeJobs.filter(job => job.status === 'pending').length;
    
    return {
      status: queuedJobs > 50 ? 'degraded' : 'healthy',
      details: { 
        totalJobs: activeJobs.length,
        queuedJobs,
        runningJobs: activeJobs.filter(job => job.status === 'running').length
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Queue check failed'
    };
  }
}

function checkMemory(): ServiceHealth {
  const usage = process.memoryUsage();
  const usedMB = usage.heapUsed / 1024 / 1024;
  const totalMB = usage.heapTotal / 1024 / 1024;
  const usagePercent = (usedMB / totalMB) * 100;
  
  return {
    status: usagePercent > 90 ? 'unhealthy' : 
            usagePercent > 75 ? 'degraded' : 'healthy',
    details: {
      heapUsedMB: Math.round(usedMB),
      heapTotalMB: Math.round(totalMB),
      usagePercent: Math.round(usagePercent),
      rss: Math.round(usage.rss / 1024 / 1024)
    }
  };
}

async function getDatabaseConnections(): Promise<number> {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    return parseInt(result[0]?.count || '0');
  } catch {
    return 0;
  }
}
```

## **5. CloudWatch Dashboards**

### **Dashboard Configuration (JSON)**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["NetWORX/Production", "ApiLatency", "Endpoint", "optimize-run-batch"],
          [".", "OptimizationDuration", "ScenarioType", "transport"],
          [".", "JobQueueDepth", "QueueName", "optimization"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Performance Metrics"
      }
    },
    {
      "type": "metric", 
      "properties": {
        "metrics": [
          ["NetWORX/Production", "DatabaseConnections"],
          [".", "MemoryUsage"],
          [".", "JobFailures", "JobType", "API"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1", 
        "title": "Resource Usage"
      }
    }
  ]
}
```

## **6. Alerting Configuration**

### **CloudWatch Alarms**
```typescript
// scripts/setup-alerts.ts
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

export async function setupProductionAlerts(): Promise<void> {
  const alerts = [
    {
      AlarmName: 'NetWORX-HighApiLatency',
      MetricName: 'ApiLatency',
      Threshold: 30000, // 30 seconds
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'API response time too high',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!]
    },
    {
      AlarmName: 'NetWORX-HighQueueDepth',
      MetricName: 'JobQueueDepth',
      Threshold: 20,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'Job queue backed up',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!]
    },
    {
      AlarmName: 'NetWORX-DatabaseConnectionExhaustion',
      MetricName: 'DatabaseConnections',
      Threshold: 18,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'Database connections near limit',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!]
    },
    {
      AlarmName: 'NetWORX-MemoryExhaustion',
      MetricName: 'MemoryUsage',
      Threshold: 3584, // 3.5GB
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'Memory usage critical',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!]
    },
    {
      AlarmName: 'NetWORX-HighJobFailureRate',
      MetricName: 'JobFailures',
      Threshold: 5,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmDescription: 'Too many job failures',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!]
    }
  ];
  
  for (const alarm of alerts) {
    await cloudwatch.putMetricAlarm({
      ...alarm,
      Namespace: 'NetWORX/Production',
      Statistic: 'Average',
      Period: 300,
      EvaluationPeriods: 2,
      DatapointsToAlarm: 2,
      TreatMissingData: 'notBreaching'
    }).promise();
    
    console.log(`Created alarm: ${alarm.AlarmName}`);
  }
}
```

## **7. Structured Logging**

### **Production Logger**
```typescript
// lib/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'production' && {
    // Production logging configuration
    redact: ['req.headers.authorization', 'password', 'token'],
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err
    }
  })
});

export interface LogContext {
  jobId?: string;
  scenarioId?: number;
  userId?: string;
  requestId?: string;
  duration?: number;
}

export class ProductionLogger {
  static info(message: string, context?: LogContext): void {
    logger.info(context, message);
  }
  
  static warn(message: string, context?: LogContext): void {
    logger.warn(context, message);
  }
  
  static error(message: string, error?: Error, context?: LogContext): void {
    logger.error({ ...context, err: error }, message);
  }
  
  static debug(message: string, context?: LogContext): void {
    logger.debug(context, message);
  }
  
  static audit(action: string, context: LogContext): void {
    logger.info({ ...context, audit: true }, `AUDIT: ${action}`);
  }
}

// Usage:
ProductionLogger.info('Optimization started', { 
  jobId: 'job-123', 
  scenarioId: 456 
});

ProductionLogger.error('Optimization failed', error, { 
  jobId: 'job-123', 
  duration: 30000 
});
```

## **8. Monitoring Integration in Application**

### **App Initialization with Monitoring**
```typescript
// lib/app-monitoring.ts
import { dbMonitor } from './database-monitor';
import { queueMonitor } from './queue-monitor';
import { ProductionLogger } from './logger';

export function startMonitoring(): void {
  try {
    // Start all monitoring services
    dbMonitor.start();
    queueMonitor.start();
    
    // Log application start
    ProductionLogger.info('NetWORX monitoring started', {
      version: process.env.npm_package_version,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      ProductionLogger.info('Received SIGTERM, shutting down gracefully');
      stopMonitoring();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      ProductionLogger.info('Received SIGINT, shutting down gracefully');
      stopMonitoring();
      process.exit(0);
    });
    
  } catch (error) {
    ProductionLogger.error('Failed to start monitoring', error);
    throw error;
  }
}

export function stopMonitoring(): void {
  try {
    dbMonitor.stop();
    queueMonitor.stop();
    ProductionLogger.info('Monitoring stopped');
  } catch (error) {
    ProductionLogger.error('Error stopping monitoring', error);
  }
}
```

### **Integration in Next.js App**
```typescript
// app/layout.tsx (or server startup)
import { startMonitoring } from '@/lib/app-monitoring';

// Start monitoring when the app starts
if (typeof window === 'undefined') { // Server-side only
  startMonitoring();
}
```

## **9. Performance Testing & Monitoring**

### **Load Testing Script**
```typescript
// scripts/load-test.ts
import { performance } from 'perf_hooks';

interface LoadTestConfig {
  url: string;
  concurrency: number;
  requests: number;
  payload: any;
}

export async function runLoadTest(config: LoadTestConfig): Promise<void> {
  console.log(`Starting load test: ${config.requests} requests with ${config.concurrency} concurrent users`);
  
  const startTime = performance.now();
  const results: number[] = [];
  const errors: string[] = [];
  
  // Run concurrent requests
  const batches = Math.ceil(config.requests / config.concurrency);
  
  for (let batch = 0; batch < batches; batch++) {
    const promises: Promise<number>[] = [];
    
    for (let i = 0; i < config.concurrency && (batch * config.concurrency + i) < config.requests; i++) {
      promises.push(
        fetch(config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config.payload)
        })
        .then(async (response) => {
          const responseTime = performance.now() - startTime;
          if (!response.ok) {
            errors.push(`${response.status}: ${await response.text()}`);
          }
          return responseTime;
        })
        .catch((error) => {
          errors.push(error.message);
          return -1;
        })
      );
    }
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults.filter(r => r > 0));
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate statistics
  const successful = results.length;
  const failed = errors.length;
  const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
  const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];
  
  console.log(`Load Test Results:
  Total Requests: ${config.requests}
  Successful: ${successful}
  Failed: ${failed}
  Success Rate: ${((successful / config.requests) * 100).toFixed(1)}%
  Avg Response Time: ${avgResponseTime.toFixed(0)}ms
  95th Percentile: ${p95?.toFixed(0)}ms
  Total Duration: ${((performance.now() - startTime) / 1000).toFixed(1)}s`);
  
  if (errors.length > 0) {
    console.log('Errors:', errors.slice(0, 5));
  }
}

// Usage:
// runLoadTest({
//   url: 'http://localhost:3000/api/optimize/run-batch',
//   concurrency: 10,
//   requests: 100,
//   payload: { scenario_id: 1, model: {...} }
// });
```

This monitoring setup ensures you have complete visibility into your production system's health and performance, with immediate alerts when issues occur.
