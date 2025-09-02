/**
 * Optimization Worker - Moves CPU-intensive MIP solving to separate processes
 * Prevents main thread blocking that currently freezes the API
 */

import { Worker } from 'worker_threads';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface OptimizationResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
  memoryUsed?: number;
  solverUsed: string;
}

export class OptimizationWorker {
  private static readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private static readonly MAX_MEMORY_MB = 2048; // 2GB memory limit
  private static readonly WORKER_SCRIPT_TEMPLATE = `
const { parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

async function runOptimization() {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    // Import solver dynamically to avoid loading in main thread
    let JSLP;
    try {
      JSLP = require('javascript-lp-solver');
    } catch (error) {
      throw new Error('javascript-lp-solver not available in worker');
    }

    const { model, options } = workerData;
    
    // Validate model size to prevent memory issues
    const modelString = JSON.stringify(model);
    const modelSizeMB = Buffer.byteLength(modelString, 'utf8') / 1024 / 1024;
    
    if (modelSizeMB > ${OptimizationWorker.MAX_MEMORY_MB / 4}) {
      throw new Error(\`Model too large: \${modelSizeMB.toFixed(1)}MB. Maximum \${${OptimizationWorker.MAX_MEMORY_MB / 4}}MB allowed.\`);
    }

    console.log(\`Worker: Starting optimization (Model: \${modelSizeMB.toFixed(2)}MB)\`);
    
    // Monitor memory during solve
    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage();
      const heapUsedMB = currentMemory.heapUsed / 1024 / 1024;
      
      if (heapUsedMB > ${OptimizationWorker.MAX_MEMORY_MB}) {
        clearInterval(memoryMonitor);
        throw new Error(\`Memory limit exceeded: \${heapUsedMB.toFixed(1)}MB > ${OptimizationWorker.MAX_MEMORY_MB}MB\`);
      }
    }, 1000);

    // Run the actual optimization
    const result = JSLP.Solve(model);
    clearInterval(memoryMonitor);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;
    const memoryUsed = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
    
    console.log(\`Worker: Optimization completed in \${duration.toFixed(0)}ms, Memory: +\${memoryUsed.toFixed(1)}MB\`);
    
    // Return success result
    parentPort.postMessage({
      success: true,
      result,
      duration,
      memoryUsed,
      solverUsed: 'javascript-lp-solver'
    });
    
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error('Worker: Optimization failed:', error.message);
    
    parentPort.postMessage({
      success: false,
      error: error.message,
      duration,
      solverUsed: 'javascript-lp-solver'
    });
  }
}

runOptimization().catch(error => {
  parentPort.postMessage({
    success: false,
    error: error.message,
    duration: 0,
    solverUsed: 'javascript-lp-solver'
  });
});
`;

  /**
   * Solve optimization model in worker process with timeout and memory limits
   */
  static async solve(
    model: any, 
    options: {
      timeoutMs?: number;
      maxMemoryMB?: number;
      jobId?: string;
    } = {}
  ): Promise<OptimizationResult> {
    const {
      timeoutMs = this.DEFAULT_TIMEOUT,
      maxMemoryMB = this.MAX_MEMORY_MB,
      jobId = uuidv4()
    } = options;

    // Validate input model
    if (!model || typeof model !== 'object') {
      return {
        success: false,
        error: 'Invalid model: must be a valid object',
        duration: 0,
        solverUsed: 'none'
      };
    }

    // Pre-check model complexity
    const complexityCheck = this.checkModelComplexity(model);
    if (!complexityCheck.valid) {
      return {
        success: false,
        error: complexityCheck.error,
        duration: 0,
        solverUsed: 'none'
      };
    }

    console.log(`🔄 Starting optimization worker for job ${jobId}...`);
    
    return new Promise((resolve) => {
      let worker: Worker | null = null;
      let timeout: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        if (worker && !resolved) {
          worker.terminate().catch(console.error);
          worker = null;
        }
      };

      const resolveOnce = (result: OptimizationResult) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };

      try {
        // Create temporary worker script file
        const workerScriptPath = join(__dirname, `worker-${jobId}.js`);
        writeFileSync(workerScriptPath, this.WORKER_SCRIPT_TEMPLATE);

        // Create worker with resource limits
        worker = new Worker(workerScriptPath, {
          workerData: { model, options },
          resourceLimits: {
            maxOldGenerationSizeMb: maxMemoryMB,
            maxYoungGenerationSizeMb: Math.floor(maxMemoryMB / 4),
            codeRangeSizeMb: 16,
            stackSizeMb: 4
          }
        });

        // Set timeout
        timeout = setTimeout(() => {
          console.warn(`⏰ Optimization timeout after ${timeoutMs}ms for job ${jobId}`);
          resolveOnce({
            success: false,
            error: `Optimization timeout after ${timeoutMs / 1000} seconds. Model may be too complex.`,
            duration: timeoutMs,
            solverUsed: 'javascript-lp-solver'
          });
        }, timeoutMs);

        // Handle worker messages
        worker.on('message', (result: OptimizationResult) => {
          console.log(`✅ Worker completed for job ${jobId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
          resolveOnce(result);
        });

        // Handle worker errors
        worker.on('error', (error) => {
          console.error(`❌ Worker error for job ${jobId}:`, error);
          resolveOnce({
            success: false,
            error: `Worker error: ${error.message}`,
            duration: 0,
            solverUsed: 'javascript-lp-solver'
          });
        });

        // Handle worker exit
        worker.on('exit', (code) => {
          if (code !== 0 && !resolved) {
            console.error(`❌ Worker exited with code ${code} for job ${jobId}`);
            resolveOnce({
              success: false,
              error: `Worker process exited with code ${code}`,
              duration: 0,
              solverUsed: 'javascript-lp-solver'
            });
          }
        });

        // Cleanup worker script file after a delay
        setTimeout(() => {
          try {
            unlinkSync(workerScriptPath);
          } catch (error) {
            console.warn(`⚠️ Failed to cleanup worker script: ${error}`);
          }
        }, 30000); // Clean up after 30 seconds

      } catch (error) {
        console.error(`❌ Failed to create worker for job ${jobId}:`, error);
        resolveOnce({
          success: false,
          error: `Failed to create worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: 0,
          solverUsed: 'none'
        });
      }
    });
  }

  /**
   * Check model complexity to prevent resource exhaustion
   */
  private static checkModelComplexity(model: any): { valid: boolean; error?: string } {
    try {
      // Check for basic required fields
      if (!model.optimize || !model.variables || !model.constraints) {
        return {
          valid: false,
          error: 'Invalid model: missing required fields (optimize, variables, constraints)'
        };
      }

      // Count variables and constraints
      const variableCount = Object.keys(model.variables).length;
      const constraintCount = Object.keys(model.constraints).length;

      // Model size limits
      const MAX_VARIABLES = 1000;
      const MAX_CONSTRAINTS = 500;
      const MAX_TOTAL_COEFFICIENTS = 100000;

      if (variableCount > MAX_VARIABLES) {
        return {
          valid: false,
          error: `Too many variables: ${variableCount} > ${MAX_VARIABLES}. Reduce model complexity.`
        };
      }

      if (constraintCount > MAX_CONSTRAINTS) {
        return {
          valid: false,
          error: `Too many constraints: ${constraintCount} > ${MAX_CONSTRAINTS}. Reduce model complexity.`
        };
      }

      // Count total coefficients for memory estimation
      let totalCoefficients = 0;
      Object.values(model.variables).forEach((variable: any) => {
        if (typeof variable === 'object') {
          totalCoefficients += Object.keys(variable).length;
        }
      });

      if (totalCoefficients > MAX_TOTAL_COEFFICIENTS) {
        return {
          valid: false,
          error: `Model too dense: ${totalCoefficients} coefficients > ${MAX_TOTAL_COEFFICIENTS}. Reduce model complexity.`
        };
      }

      // Estimate model size in memory
      const modelString = JSON.stringify(model);
      const modelSizeMB = Buffer.byteLength(modelString, 'utf8') / 1024 / 1024;
      const MAX_MODEL_SIZE_MB = 50; // 50MB JSON size limit

      if (modelSizeMB > MAX_MODEL_SIZE_MB) {
        return {
          valid: false,
          error: `Model too large: ${modelSizeMB.toFixed(1)}MB > ${MAX_MODEL_SIZE_MB}MB. Reduce model size.`
        };
      }

      console.log(`📊 Model complexity check passed: ${variableCount} vars, ${constraintCount} constraints, ${modelSizeMB.toFixed(2)}MB`);
      
      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        error: `Model validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get recommended timeout based on model complexity
   */
  static getRecommendedTimeout(model: any): number {
    try {
      const variableCount = Object.keys(model.variables || {}).length;
      const constraintCount = Object.keys(model.constraints || {}).length;
      
      // Base timeout: 1 minute
      let timeoutMs = 60000;
      
      // Add time based on complexity
      timeoutMs += variableCount * 100; // 100ms per variable
      timeoutMs += constraintCount * 200; // 200ms per constraint
      
      // Minimum 2 minutes, maximum 10 minutes
      return Math.min(Math.max(timeoutMs, 120000), 600000);
      
    } catch (error) {
      return this.DEFAULT_TIMEOUT;
    }
  }

  /**
   * Test worker functionality
   */
  static async testWorker(): Promise<boolean> {
    try {
      console.log('🧪 Testing optimization worker...');
      
      const testModel = {
        optimize: 'profit',
        opType: 'max',
        constraints: {
          sugar: { max: 40 },
          butter: { max: 30 }
        },
        variables: {
          cookies: { sugar: 1, butter: 2, profit: 3 },
          cake: { sugar: 2, butter: 1, profit: 4 }
        }
      };

      const result = await this.solve(testModel, { timeoutMs: 30000 });
      
      if (result.success) {
        console.log('✅ Worker test passed');
        return true;
      } else {
        console.error('❌ Worker test failed:', result.error);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Worker test error:', error);
      return false;
    }
  }
}
