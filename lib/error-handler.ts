/**
 * Production Error Handler and Circuit Breakers
 * Prevents cascade failures and provides proper error handling
 */

export class OptimizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public recoverable: boolean = true,
    public context?: any
  ) {
    super(message);
    this.name = 'OptimizationError';
  }
}

export interface ErrorContext {
  operation: string;
  scenarioId?: number;
  jobId?: string;
  optimizationRunId?: string;
  timestamp: Date;
  additionalData?: any;
}

export interface ErrorDetails {
  userMessage: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context: ErrorContext;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export class ProductionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProductionError';
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProductionError);
    }
  }
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
}

export class ErrorHandler {
  private static readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /database_url/i
  ];

  /**
   * Handle optimization errors specifically
   */
  static handleError(error: Error, context: ErrorContext): ErrorDetails {
    const errorDetails: ErrorDetails = {
      userMessage: error.message,
      code: 'UNKNOWN_ERROR',
      severity: 'medium',
      recoverable: true,
      context
    };

    // Handle different error types
    if (error instanceof OptimizationError) {
      errorDetails.code = error.code;
      errorDetails.severity = error.severity;
      errorDetails.recoverable = error.recoverable;
    } else if (this.isTimeoutError(error)) {
      errorDetails.code = 'TIMEOUT_ERROR';
      errorDetails.severity = 'medium';
      errorDetails.recoverable = true;
    } else if (this.isDatabaseError(error)) {
      errorDetails.code = 'DATABASE_ERROR';
      errorDetails.severity = 'high';
      errorDetails.recoverable = true;
    }

    return errorDetails;
  }

  /**
   * Log sanitized ErrorDetails (public helper)
   */
  static logErrorDetails(errorDetails: ErrorDetails): void {
    console.error('Error occurred:', {
      message: errorDetails.userMessage,
      code: errorDetails.code,
      severity: errorDetails.severity,
      recoverable: errorDetails.recoverable,
      context: errorDetails.context
    });
  }

  /**
   * Handle and sanitize errors for API responses
   */
  static handleApiError(error: any, requestId?: string): ErrorResponse {
    const timestamp = new Date().toISOString();
    
    // Log full error server-side with context
    this.logFullError(error, { requestId, timestamp });
    
    // Return sanitized error to client
    if (error instanceof ProductionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        timestamp,
        requestId
      };
    }
    
    // Handle known error types
    if (this.isTimeoutError(error)) {
      return {
        success: false,
        error: 'Request timeout - operation took too long to complete',
        code: 'TIMEOUT_ERROR',
        statusCode: 408,
        timestamp,
        requestId
      };
    }
    
    if (this.isDatabaseError(error)) {
      return {
        success: false,
        error: 'Database operation failed - please try again',
        code: 'DATABASE_ERROR',
        statusCode: 503,
        timestamp,
        requestId
      };
    }
    
    if (this.isValidationError(error)) {
      return {
        success: false,
        error: this.sanitizeMessage(error.message),
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        timestamp,
        requestId
      };
    }
    
    // Unknown errors - don't leak details
    return {
      success: false,
      error: 'An internal error occurred - please try again or contact support',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp,
      requestId
    };
  }
  
  /**
   * Log error with full context for debugging
   */
  private static logFullError(error: any, context: Record<string, any> = {}): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context,
      ...context,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    // Remove sensitive information from logs
    const sanitizedInfo = this.sanitizeLogData(errorInfo);
    
    // Log based on severity
    if (error instanceof ProductionError && error.isOperational) {
      console.warn('⚠️ Operational Error:', JSON.stringify(sanitizedInfo, null, 2));
    } else {
      console.error('❌ System Error:', JSON.stringify(sanitizedInfo, null, 2));
    }
    
    // TODO: Send to external logging service (Sentry, CloudWatch, etc.)
    // await this.sendToExternalLogger(sanitizedInfo);
  }
  
  /**
   * Sanitize message to remove sensitive information
   */
  private static sanitizeMessage(message: string): string {
    let sanitized = message;
    
    // Remove sensitive patterns
    this.SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    // Remove file paths that might leak system info
    sanitized = sanitized.replace(/\/[a-zA-Z0-9_\-/.]+\.(js|ts|json)/g, '[FILE_PATH]');
    
    // Remove database URLs and connection strings
    sanitized = sanitized.replace(/postgresql:\/\/[^\s]+/g, '[DATABASE_URL]');
    sanitized = sanitized.replace(/redis:\/\/[^\s]+/g, '[REDIS_URL]');
    
    return sanitized;
  }
  
  /**
   * Sanitize log data to remove sensitive information
   */
  private static sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = { ...data };
    
    // Remove sensitive environment variables
    if (sanitized.env) {
      Object.keys(sanitized.env).forEach(key => {
        if (this.SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
          sanitized.env[key] = '[REDACTED]';
        }
      });
    }
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      } else if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.sanitizeMessage(sanitized[key]);
      }
    });
    
    return sanitized;
  }
  
  /**
   * Check if error is a timeout error
   */
  private static isTimeoutError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('timeout') || 
           message.includes('aborted') ||
           error.code === 'TIMEOUT_ERROR' ||
           error.name === 'TimeoutError';
  }
  
  /**
   * Check if error is a database error
   */
  private static isDatabaseError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('database') ||
           message.includes('connection') ||
           message.includes('postgres') ||
           error.code?.startsWith('23') || // PostgreSQL constraint violations
           error.code?.startsWith('42'); // PostgreSQL syntax errors
  }
  
  /**
   * Check if error is a validation error
   */
  private static isValidationError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return message.includes('validation') ||
           message.includes('invalid') ||
           message.includes('required') ||
           error.name === 'ValidationError' ||
           error.code === 'VALIDATION_ERROR';
  }
}

/**
 * Circuit Breaker Pattern Implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;
  
  constructor(
    private name: string,
    private failureThreshold = 5,
    private recoveryTimeMs = 60000,
    private successThreshold = 2
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new ProductionError(
          `Service temporarily unavailable: ${this.name} circuit is open`,
          'CIRCUIT_OPEN',
          503,
          true,
          { 
            circuitName: this.name,
            nextAttempt: new Date(this.nextAttempt).toISOString(),
            failures: this.failures
          }
        );
      }
      
      // Try to recover
      this.state = 'HALF_OPEN';
      console.log(`🔄 Circuit ${this.name}: Attempting recovery (HALF_OPEN)`);
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    console.log(`✅ Circuit ${this.name}: Operation successful (CLOSED)`);
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeMs;
      console.warn(`⚠️ Circuit ${this.name}: Opened due to ${this.failures} failures`);
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeMs;
      console.warn(`⚠️ Circuit ${this.name}: Recovery failed, reopening`);
    }
  }
  
  getState(): { state: string; failures: number; nextAttempt?: string } {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt > 0 ? new Date(this.nextAttempt).toISOString() : undefined
    };
  }
  
  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = 0;
    console.log(`🔄 Circuit ${this.name}: Manually reset`);
  }
}

/**
 * Global circuit breakers for critical services
 */
export const circuitBreakers = {
  database: new CircuitBreaker('database', 3, 30000),
  optimization: new CircuitBreaker('optimization', 2, 60000),
  fileProcessing: new CircuitBreaker('file-processing', 5, 45000),
  redis: new CircuitBreaker('redis', 3, 30000)
};

/**
 * Rate Limiter for API endpoints
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 100
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const userRequests = this.requests.get(identifier) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
  
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > cutoff);
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

/**
 * Global rate limiters
 */
export const rateLimiters = {
  api: new RateLimiter(60000, 100),      // 100 requests per minute
  optimization: new RateLimiter(300000, 10), // 10 optimizations per 5 minutes
  upload: new RateLimiter(60000, 20)     // 20 uploads per minute
};

/**
 * Cleanup rate limiters periodically
 */
setInterval(() => {
  Object.values(rateLimiters).forEach(limiter => limiter.cleanup());
}, 300000); // Cleanup every 5 minutes

/**
 * Utility functions for error handling in routes
 */
export function createErrorMiddleware(requestId: string) {
  return (error: any): ErrorResponse => {
    return ErrorHandler.handleApiError(error, requestId);
  };
}

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  circuitBreaker?: CircuitBreaker
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const operation = () => fn(...args);
    
    if (circuitBreaker) {
      return await circuitBreaker.execute(operation);
    }
    
    return await operation();
  };
}

/**
 * Create common production errors
 */
export const createProductionError = {
  realDataRequired: (message: string, context?: Record<string, any>) =>
    new ProductionError(`REAL DATA REQUIRED: ${message}`, 'REAL_DATA_REQUIRED', 400, true, context),
    
  resourceExhausted: (resource: string, context?: Record<string, any>) =>
    new ProductionError(`${resource} resource exhausted`, 'RESOURCE_EXHAUSTED', 503, true, context),
    
  validationFailed: (message: string, context?: Record<string, any>) =>
    new ProductionError(`Validation failed: ${message}`, 'VALIDATION_FAILED', 400, true, context),
    
  serviceUnavailable: (service: string, context?: Record<string, any>) =>
    new ProductionError(`${service} service unavailable`, 'SERVICE_UNAVAILABLE', 503, true, context),
    
  timeout: (operation: string, timeoutMs: number, context?: Record<string, any>) =>
    new ProductionError(`${operation} timeout after ${timeoutMs}ms`, 'TIMEOUT', 408, true, context)
};

console.log('🛡️ Production error handling and circuit breakers initialized');
