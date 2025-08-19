// Database timeout and connection management utilities
import { sql } from './database';

interface DatabaseTimeoutConfig {
  queryTimeout: number;
  connectionTimeout: number;
  retries: number;
  backoffMs: number;
}

// Timeout configurations for different operation types
export const DB_TIMEOUT_CONFIGS = {
  fast: { queryTimeout: 5000, connectionTimeout: 3000, retries: 1, backoffMs: 1000 },
  medium: { queryTimeout: 15000, connectionTimeout: 5000, retries: 2, backoffMs: 2000 },
  slow: { queryTimeout: 30000, connectionTimeout: 10000, retries: 1, backoffMs: 3000 },
  heavy: { queryTimeout: 60000, connectionTimeout: 15000, retries: 0, backoffMs: 5000 }
};

// Enhanced database operation wrapper with timeout and retry logic
export async function withDatabaseTimeout<T>(
  operation: () => Promise<T>,
  config: DatabaseTimeoutConfig = DB_TIMEOUT_CONFIGS.medium
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      // Set statement timeout for this operation
      if (attempt === 0) {
        await sql`SET statement_timeout = ${config.queryTimeout}`;
      }
      
      // Execute with connection timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Database connection timeout after ${config.connectionTimeout}ms`));
          }, config.connectionTimeout);
        })
      ]);
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is worth retrying
      if (attempt < config.retries && isDatabaseRetryableError(error)) {
        console.warn(`Database operation failed (attempt ${attempt + 1}/${config.retries + 1}), retrying in ${config.backoffMs}ms...`);
        await sleep(config.backoffMs);
        continue;
      }
      
      break; // Don't retry on non-retryable errors or last attempt
    }
  }
  
  // Reset statement timeout to default
  try {
    await sql`SET statement_timeout = DEFAULT`;
  } catch (e) {
    // Ignore reset errors
  }
  
  throw lastError || new Error('Database operation failed');
}

// Check if a database error is worth retrying
function isDatabaseRetryableError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';
  
  // Don't retry these errors
  if (message.includes('cancelled') || 
      message.includes('aborted') ||
      message.includes('constraint') ||
      message.includes('duplicate') ||
      message.includes('invalid') ||
      message.includes('syntax error') ||
      code === '23505' || // Unique violation
      code === '23503' || // Foreign key violation
      code === '42P01') {  // Undefined table
    return false;
  }
  
  // Retry these errors
  return message.includes('timeout') ||
         message.includes('connection') ||
         message.includes('network') ||
         message.includes('server') ||
         code === '08006' || // Connection failure
         code === '08000' || // Connection exception
         code === '57014';   // Query timeout
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convenience functions for common database timeout patterns
export const withFastQuery = <T>(operation: () => Promise<T>) => 
  withDatabaseTimeout(operation, DB_TIMEOUT_CONFIGS.fast);

export const withMediumQuery = <T>(operation: () => Promise<T>) => 
  withDatabaseTimeout(operation, DB_TIMEOUT_CONFIGS.medium);

export const withSlowQuery = <T>(operation: () => Promise<T>) => 
  withDatabaseTimeout(operation, DB_TIMEOUT_CONFIGS.slow);

export const withHeavyQuery = <T>(operation: () => Promise<T>) => 
  withDatabaseTimeout(operation, DB_TIMEOUT_CONFIGS.heavy);

// Database health check with timeout
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await withFastQuery(async () => {
      const result = await sql`SELECT 1 as health_check`;
      return result[0];
    });
    
    return {
      connected: true,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

// Initialize database with optimized settings for cloud environments
export async function initializeDatabaseSettings(): Promise<void> {
  try {
    await withMediumQuery(async () => {
      // Set optimal timeout settings for cloud environment
      await sql`SET statement_timeout = '45s'`; // 45 second default
      await sql`SET lock_timeout = '30s'`;      // 30 second lock timeout
      await sql`SET idle_in_transaction_session_timeout = '60s'`; // 1 minute idle timeout
      
      // Connection pool optimization
      await sql`SET tcp_keepalives_idle = 300`; // 5 minutes
      await sql`SET tcp_keepalives_interval = 30`; // 30 seconds
      await sql`SET tcp_keepalives_count = 3`; // 3 probes
    });
    
    console.log('Database timeout settings optimized for cloud environment');
  } catch (error) {
    console.warn('Failed to set database timeout settings:', error);
    // Don't fail initialization if this fails
  }
}

// Query execution with automatic timeout and optimization
export async function executeOptimizedQuery<T>(
  queryFunction: () => Promise<T>,
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'heavy' = 'moderate'
): Promise<T> {
  const configs = {
    simple: DB_TIMEOUT_CONFIGS.fast,
    moderate: DB_TIMEOUT_CONFIGS.medium,
    complex: DB_TIMEOUT_CONFIGS.slow,
    heavy: DB_TIMEOUT_CONFIGS.heavy
  };
  
  return withDatabaseTimeout(queryFunction, configs[estimatedComplexity]);
}

// Batch operation with timeout management
export async function executeBatchWithTimeout<T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 5,
  timeoutConfig: DatabaseTimeoutConfig = DB_TIMEOUT_CONFIGS.medium
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(operation => withDatabaseTimeout(operation, timeoutConfig))
    );
    
    results.push(...batchResults);
    
    // Add small delay between batches to prevent overwhelming the database
    if (i + batchSize < operations.length) {
      await sleep(100);
    }
  }
  
  return results;
}

// Transaction with timeout support
export async function executeTransaction<T>(
  operations: (() => Promise<any>)[],
  timeoutConfig: DatabaseTimeoutConfig = DB_TIMEOUT_CONFIGS.slow
): Promise<T[]> {
  return await withDatabaseTimeout(async () => {
    const results: any[] = [];
    
    await sql`BEGIN`;
    
    try {
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
      
      await sql`COMMIT`;
      return results;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  }, timeoutConfig);
}

// Table existence check with timeout
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await withFastQuery(async () => {
      return await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as table_exists
      `;
    });
    
    return result[0]?.table_exists || false;
  } catch (error) {
    console.warn(`Failed to check if table '${tableName}' exists:`, error);
    return false;
  }
}

// Get database connection info with timeout
export async function getDatabaseConnectionInfo(): Promise<{
  version: string;
  connectionCount: number;
  uptime: string;
  settings: Record<string, string>;
}> {
  return await withMediumQuery(async () => {
    const [versionResult, connectionResult, uptimeResult, settingsResult] = await Promise.all([
      sql`SELECT version()`,
      sql`SELECT count(*) as connection_count FROM pg_stat_activity WHERE state = 'active'`,
      sql`SELECT now() - pg_postmaster_start_time() as uptime`,
      sql`SELECT name, setting FROM pg_settings WHERE name IN ('statement_timeout', 'lock_timeout', 'max_connections')`
    ]);
    
    const settings: Record<string, string> = {};
    settingsResult.forEach((row: any) => {
      settings[row.name] = row.setting;
    });
    
    return {
      version: versionResult[0]?.version || 'Unknown',
      connectionCount: connectionResult[0]?.connection_count || 0,
      uptime: uptimeResult[0]?.uptime || 'Unknown',
      settings
    };
  });
}
