// API timeout utilities for improved error handling and performance

interface TimeoutConfig {
  timeout: number;
  retries?: number;
  errorMessage?: string;
}

interface OperationConfig {
  fast: TimeoutConfig;     // Quick operations (health checks, simple queries)
  medium: TimeoutConfig;   // Standard operations (data processing, simple file ops)
  slow: TimeoutConfig;     // Heavy operations (file processing, complex queries)
  background: TimeoutConfig; // Background/async operations
}

// Timeout configurations optimized for cloud environments
export const TIMEOUT_CONFIGS: OperationConfig = {
  fast: {
    timeout: 5000,
    retries: 1,
    errorMessage: 'Quick operation timed out'
  },
  medium: {
    timeout: 15000,
    retries: 2,
    errorMessage: 'Operation timed out'
  },
  slow: {
    timeout: 30000,
    retries: 1,
    errorMessage: 'Heavy operation timed out'
  },
  background: {
    timeout: 60000,
    retries: 0,
    errorMessage: 'Background operation timed out'
  }
};

// Enhanced timeout wrapper with better error handling
export function withApiTimeout<T>(
  operation: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let attempts = 0;
    const maxAttempts = (config.retries || 0) + 1;
    
    const executeWithTimeout = async (): Promise<void> => {
      attempts++;
      
      const timeoutId = setTimeout(() => {
        reject(new Error(config.errorMessage || `Operation timed out after ${config.timeout}ms`));
      }, config.timeout);
      
      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Check if we should retry
        if (attempts < maxAttempts && isRetryableError(error)) {
          console.warn(`Attempt ${attempts} failed, retrying...`, error);
          // Add exponential backoff delay
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
          setTimeout(() => executeWithTimeout(), delay);
        } else {
          reject(error);
        }
      }
    };
    
    executeWithTimeout();
  });
}

// Check if an error is worth retrying
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || '';
  const name = error.name || '';
  
  // Don't retry certain types of errors
  if (name === 'AbortError' || 
      message.includes('cancelled') || 
      message.includes('aborted') ||
      message.includes('Validation error') ||
      message.includes('Invalid input')) {
    return false;
  }
  
  // Retry network and temporary errors
  return message.includes('timeout') ||
         message.includes('network') ||
         message.includes('ECONNRESET') ||
         message.includes('ENOTFOUND') ||
         error.status >= 500;
}

// Convenience functions for common timeout patterns
export const withFastTimeout = <T>(operation: () => Promise<T>) => 
  withApiTimeout(operation, TIMEOUT_CONFIGS.fast);

export const withMediumTimeout = <T>(operation: () => Promise<T>) => 
  withApiTimeout(operation, TIMEOUT_CONFIGS.medium);

export const withSlowTimeout = <T>(operation: () => Promise<T>) => 
  withApiTimeout(operation, TIMEOUT_CONFIGS.slow);

export const withBackgroundTimeout = <T>(operation: () => Promise<T>) => 
  withApiTimeout(operation, TIMEOUT_CONFIGS.background);

// Database operation timeout helper
export const withDbTimeout = <T>(
  operation: () => Promise<T>,
  timeoutSeconds: number = 30
): Promise<T> => {
  return withApiTimeout(operation, {
    timeout: timeoutSeconds * 1000,
    retries: 1,
    errorMessage: `Database operation timed out after ${timeoutSeconds}s`
  });
};

// File processing timeout helper with progress tracking
export const withFileTimeout = <T>(
  operation: () => Promise<T>,
  estimatedSizeKB: number = 1000
): Promise<T> => {
  // Scale timeout based on file size (rough estimate)
  const baseTimeout = 15000; // 15 seconds base
  const additionalTimeout = Math.min(estimatedSizeKB * 10, 45000); // Up to 45s additional
  const totalTimeout = baseTimeout + additionalTimeout;
  
  return withApiTimeout(operation, {
    timeout: totalTimeout,
    retries: 1,
    errorMessage: `File processing timed out after ${Math.round(totalTimeout/1000)}s`
  });
};

// Create timeout-aware Response helpers
export const createTimeoutResponse = (error: any, status: number = 408) => {
  const message = error?.message || 'Request timeout';
  
  return new Response(
    JSON.stringify({ 
      error: message,
      timeout: true,
      timestamp: new Date().toISOString()
    }), 
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

export const createSuccessResponse = <T>(data: T, processingTime?: number) => {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(processingTime && { processingTimeMs: processingTime })
  };
  
  return new Response(
    JSON.stringify(response),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

// Performance monitoring helper
export const trackPerformance = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; duration: number }> => {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (duration > 10000) { // Log slow operations
      console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
    }
    
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Operation failed: ${operationName} after ${duration}ms`, error);
    throw error;
  }
};
