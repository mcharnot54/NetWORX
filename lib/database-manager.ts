/**
 * Centralized Database Manager - Prevents connection chaos
 * Replaces multiple unmanaged neon() calls that can exhaust DB limits
 */

import { neon } from '@neondatabase/serverless';

export interface DatabaseConfig {
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface ConnectionStats {
  activeConnections: number;
  totalQueries: number;
  failedQueries: number;
  avgLatency: number;
  lastError?: string;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private sql: any;
  private connectionCount = 0;
  private readonly maxConnections = 20;
  private queryStats = {
    total: 0,
    failed: 0,
    totalLatency: 0
  };
  private lastError?: string;
  private _isHealthyState = true;
  
  private readonly config: DatabaseConfig = {
    connectionTimeoutMs: 10000,  // Fail fast - 10 seconds
    queryTimeoutMs: 30000,       // 30 seconds for queries
    maxRetries: 3,
    retryDelayMs: 1000
  };

  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('PRODUCTION ERROR: DATABASE_URL environment variable is required');
    }
    
    console.log('🔗 Initializing centralized database manager...');
    
    this.sql = neon(process.env.DATABASE_URL, {
      // Connection optimization
      arrayMode: false,
      fullResults: false,
      fetchOptions: {
        cache: 'no-store'
      }
    });

    // Test connection on startup
    this.testConnection();
    
    console.log('✅ Database manager initialized');
  }
  
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }
  
  /**
   * Execute query with connection management and retry logic
   */
  async query(
    text: string, 
    params: any[] = [], 
    options: QueryOptions = {}
  ): Promise<any> {
    const { timeout = this.config.queryTimeoutMs, retries = this.config.maxRetries } = options;
    
    // Check connection limits
    if (this.connectionCount >= this.maxConnections) {
      throw new Error(`Database connection limit exceeded: ${this.connectionCount}/${this.maxConnections} active connections`);
    }
    
    // Health check
    if (!this._isHealthyState) {
      throw new Error('Database manager is unhealthy. Check connection and try again.');
    }
    
    const startTime = Date.now();
    this.connectionCount++;
    
    try {
      const result = await this.executeWithRetry(text, params, retries, timeout);
      
      // Update stats
      const latency = Date.now() - startTime;
      this.queryStats.total++;
      this.queryStats.totalLatency += latency;
      
      console.log(`📊 Query completed: ${latency}ms`);
      return result;
      
    } catch (error) {
      this.queryStats.failed++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark as unhealthy if too many failures
      const failureRate = this.queryStats.failed / Math.max(1, this.queryStats.total);
      if (failureRate > 0.1) { // > 10% failure rate
        this._isHealthyState = false;
        console.warn('⚠️ Database marked as unhealthy due to high failure rate');
      }
      
      console.error(`❌ Query failed after ${Date.now() - startTime}ms:`, error);
      throw error;
      
    } finally {
      this.connectionCount--;
    }
  }
  
  /**
   * Execute query with retry logic
   */
  private async executeWithRetry(
    text: string, 
    params: any[], 
    retries: number, 
    timeout: number
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
        });
        
        // Race query against timeout
        const result = await Promise.race([
          this.sql(text, params),
          timeoutPromise
        ]);
        
        // Success - reset health status
        this._isHealthyState = true;
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown database error');
        
        // Don't retry for certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
        
        // Don't retry on last attempt
        if (attempt === retries) {
          throw lastError;
        }
        
        // Wait before retry
        const delay = this.config.retryDelayMs * Math.pow(2, attempt);
        console.warn(`⚠️ Query attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'syntax error',
      'permission denied',
      'relation does not exist',
      'column does not exist',
      'duplicate key value',
      'foreign key constraint',
      'check constraint'
    ];
    
    const message = error.message.toLowerCase();
    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }
  
  /**
   * Transaction support
   */
  async transaction<T>(
    callback: (sql: any) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    console.log('🔄 Starting database transaction...');
    
    try {
      await this.query('BEGIN', [], options);
      
      const result = await callback(this.sql);
      
      await this.query('COMMIT', [], options);
      console.log('✅ Transaction committed');
      
      return result;
      
    } catch (error) {
      console.error('❌ Transaction failed, rolling back:', error);
      
      try {
        await this.query('ROLLBACK', [], options);
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      throw error;
    }
  }
  
  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const start = Date.now();
      await this.query('SELECT 1 as health_check', [], { timeout: 5000 });
      const latency = Date.now() - start;
      
      // Consider healthy if responds within 2 seconds
      const healthy = latency < 2000;
      this._isHealthyState = healthy;

      return healthy;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      this._isHealthyState = false;
      return false;
    }
  }
  
  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return {
      activeConnections: this.connectionCount,
      totalQueries: this.queryStats.total,
      failedQueries: this.queryStats.failed,
      avgLatency: this.queryStats.total > 0 
        ? Math.round(this.queryStats.totalLatency / this.queryStats.total)
        : 0,
      lastError: this.lastError
    };
  }
  
  /**
   * Test connection on startup
   */
  private async testConnection(): Promise<void> {
    try {
      console.log('🧪 Testing database connection...');
      const result = await this.query('SELECT version() as version, current_database() as database');
      console.log(`✅ Connected to database: ${result[0]?.database} (${result[0]?.version?.substring(0, 20)}...)`);
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      this._isHealthyState = false;
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Prepare common queries for better performance
   */
  async prepareCommonQueries(): Promise<void> {
    const commonQueries = [
      'SELECT * FROM projects WHERE status = $1',
      'SELECT * FROM scenarios WHERE project_id = $1',
      'SELECT * FROM data_files WHERE scenario_id = $1 AND processing_status = $2',
      'UPDATE scenarios SET status = $1, updated_at = NOW() WHERE id = $2'
    ];
    
    console.log('🔧 Preparing common queries for performance...');
    
    // Note: Neon doesn't support PREPARE statements, but we can warm the cache
    for (const query of commonQueries) {
      try {
        // Execute with dummy params to warm query planner cache
        await this.query(query.replace(/\$\d+/g, 'NULL'));
      } catch (error) {
        // Expected to fail with NULL params, just warming the cache
      }
    }
    
    console.log('✅ Query cache warmed');
  }
  
  /**
   * Get current database connections
   */
  async getCurrentConnections(): Promise<any[]> {
    try {
      return await this.query(`
        SELECT 
          datname,
          usename,
          application_name,
          client_addr,
          state,
          query_start,
          state_change,
          query
        FROM pg_stat_activity 
        WHERE datname = current_database()
        ORDER BY query_start DESC
      `);
    } catch (error) {
      console.error('❌ Failed to get current connections:', error);
      return [];
    }
  }
  
  /**
   * Kill long-running queries (emergency use)
   */
  async killLongRunningQueries(maxAgeMinutes: number = 10): Promise<number> {
    try {
      const result = await this.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity 
        WHERE datname = current_database()
        AND state = 'active'
        AND query_start < NOW() - INTERVAL '${maxAgeMinutes} minutes'
        AND query NOT LIKE '%pg_stat_activity%'
      `);
      
      const killedCount = result.length;
      if (killedCount > 0) {
        console.warn(`⚠️ Killed ${killedCount} long-running queries`);
      }
      
      return killedCount;
    } catch (error) {
      console.error('❌ Failed to kill long-running queries:', error);
      return 0;
    }
  }
  
  /**
   * Reset stats (useful for monitoring)
   */
  resetStats(): void {
    this.queryStats = {
      total: 0,
      failed: 0,
      totalLatency: 0
    };
    this.lastError = undefined;
    console.log('📊 Database stats reset');
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Service classes that use the centralized database
export class ProjectService {
  static async findById(id: number) {
    return await db.query('SELECT * FROM projects WHERE id = $1', [id]);
  }
  
  static async findByStatus(status: string) {
    return await db.query('SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC', [status]);
  }
  
  static async create(projectData: any) {
    return await db.query(`
      INSERT INTO projects (name, description, status, owner_id, project_duration_years, base_year)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      projectData.name,
      projectData.description,
      projectData.status || 'active',
      projectData.owner_id,
      projectData.project_duration_years || 8,
      projectData.base_year || new Date().getFullYear()
    ]);
  }
  
  static async update(id: number, updates: any) {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    return await db.query(`
      UPDATE projects 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, values);
  }
}

export class ScenarioService {
  static async findByProjectId(projectId: number) {
    return await db.query('SELECT * FROM scenarios WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
  }
  
  static async findById(id: number) {
    return await db.query('SELECT * FROM scenarios WHERE id = $1', [id]);
  }
  
  static async create(scenarioData: any) {
    return await db.query(`
      INSERT INTO scenarios (project_id, name, description, scenario_type, status, created_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      scenarioData.project_id,
      scenarioData.name,
      scenarioData.description,
      scenarioData.scenario_type,
      scenarioData.status || 'draft',
      scenarioData.created_by,
      JSON.stringify(scenarioData.metadata || {})
    ]);
  }
  
  static async updateStatus(id: number, status: string) {
    return await db.query(`
      UPDATE scenarios 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id]);
  }
}

// Initialize common queries on startup
db.prepareCommonQueries().catch(console.error);

console.log('🎯 Centralized database manager ready');
