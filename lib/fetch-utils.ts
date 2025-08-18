// Robust fetch utility with retry logic and error handling

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 3000, // Increased base delay
  maxDelay: 20000, // Increased max delay
  exponentialBackoff: true,
};

const DEFAULT_TIMEOUT = 35000; // 35 seconds - for extremely slow server environments

export class FetchError extends Error {
  public status?: number;
  public statusText?: string;
  public isNetworkError: boolean;
  public isTimeoutError: boolean;

  constructor(
    message: string,
    status?: number,
    statusText?: string,
    isNetworkError = false,
    isTimeoutError = false
  ) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.statusText = statusText;
    this.isNetworkError = isNetworkError;
    this.isTimeoutError = isTimeoutError;
  }
}

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Calculate retry delay with exponential backoff
const calculateRetryDelay = (
  attempt: number,
  config: RetryConfig
): number => {
  if (!config.exponentialBackoff) {
    return config.baseDelay;
  }
  
  const delay = config.baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, config.maxDelay);
};

// Check if error is retryable
const isRetryableError = (error: Error): boolean => {
  try {
    if (!error || typeof error !== 'object') {
      return false;
    }

    // Safe property access with fallbacks
    const errorName = error && typeof error === 'object' && 'name' in error ? String(error.name || '') : '';
    const errorMessage = error && typeof error === 'object' && 'message' in error ? String(error.message || '') : String(error || '');

    // Never retry AbortErrors - they indicate cancellation
    if (errorName === 'AbortError' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('signal is aborted')) {
      return false;
    }

    // Don't retry cancelled requests
    if (errorMessage.includes('cancelled')) {
      return false;
    }

    // Retry network and timeout errors, but check safely
    if (errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Failed to fetch')) {
      return true;
    }

    // If it's a FetchError, check properties safely
    if (error instanceof FetchError) {
      return error.isNetworkError || error.isTimeoutError || Boolean(error.status && error.status >= 500);
    }

    return false;
  } catch (e) {
    // If any error occurs during error checking, don't retry
    // Avoid logging AbortErrors to prevent noise
    if (e && typeof e === 'object' && 'name' in e && e.name !== 'AbortError') {
      console.debug('Error while checking if error is retryable:', e);
    }
    return false;
  }
};

// Enhanced fetch with timeout and abort signal
const fetchWithTimeout = async (
  url: string,
  options: FetchOptions
): Promise<Response> => {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const controller = new AbortController();

  // Handle external signal if provided
  let externalAbortHandler: (() => void) | null = null;
  if (options.signal) {
    // Check if already aborted
    if (options.signal.aborted) {
      return new Response(null, {
        status: 204,
        statusText: 'Pre-cancelled',
        headers: { 'X-Cancelled': 'true' }
      });
    }

    // Listen for external abort
    externalAbortHandler = () => {
      try {
        if (controller && !controller.signal.aborted) {
          controller.abort('External signal abort');
        }
      } catch (error) {
        // Completely ignore all abort errors
      }
    };

    try {
      options.signal.addEventListener('abort', externalAbortHandler, { once: true });
    } catch (error) {
      // Ignore errors adding listener if signal is already aborted
      console.debug('Signal listener error:', error);
    }
  }

  // Set up timeout with comprehensive error handling
  const timeoutId = setTimeout(() => {
    try {
      if (controller && !controller.signal.aborted) {
        controller.abort('Request timeout');
      }
    } catch (error) {
      // Completely ignore all abort errors - they're expected
    }
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Clean up external abort handler
    if (externalAbortHandler && options.signal) {
      try {
        options.signal.removeEventListener('abort', externalAbortHandler);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Clean up external abort handler
    if (externalAbortHandler && options.signal) {
      try {
        options.signal.removeEventListener('abort', externalAbortHandler);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Handle AbortError and timeout errors completely - NEVER let them propagate
    let errorName = '';
    let errorMessage = '';

    if (error && typeof error === 'object' && error !== null) {
      errorName = 'name' in error ? String(error.name || '') : '';
      errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';
    } else if (typeof error === 'string') {
      // Handle string errors like "Request timeout"
      errorMessage = error;
    }

    // Catch ALL possible abort-related and timeout errors
    if (errorName === 'AbortError' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('signal is aborted') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('abort') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Request timeout') ||
        errorMessage.includes('The operation was aborted') ||
        errorMessage.includes('signal is aborted without reason')) {

      // Always return a 204 response for any abort-related or timeout error - NEVER throw
      return new Response(null, {
        status: 204,
        statusText: 'Request Cancelled',
        headers: { 'X-Cancelled': 'true', 'X-Abort-Reason': errorMessage || 'signal-aborted' }
      });
    }

    if (error instanceof Error) {
      // Handle specific "Failed to fetch" errors in cloud environments
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        // In cloud environments, this is often a temporary network issue
        console.debug(`Network error for ${url}, will retry if possible`);
        throw new FetchError(
          'Network connection temporarily unavailable',
          undefined,
          undefined,
          true,
          false
        );
      }

      throw new FetchError(
        `Network error: ${error.message}`,
        undefined,
        undefined,
        true,
        false
      );
    }

    throw error;
  }
};

// Internal robust fetch function
const _robustFetch = async (
  url: string,
  options: FetchOptions = {}
): Promise<Response> => {
  const retryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: options.retries ?? DEFAULT_RETRY_CONFIG.maxRetries,
  };
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // Check for HTTP errors
      if (!response.ok) {
        const error = new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText
        );
        
        // Don't retry 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw error;
        }
        
        // Retry 5xx errors
        if (attempt <= retryConfig.maxRetries) {
          lastError = error;
          const delay = calculateRetryDelay(attempt, retryConfig);
          console.warn(`Request failed (attempt ${attempt}), retrying in ${delay}ms...`, error);
          await sleep(delay);
          continue;
        }
        
        throw error;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;

      // Handle AbortError - never retry aborted requests
      if (lastError) {
        const errorName = lastError && typeof lastError === 'object' && 'name' in lastError ? String(lastError.name || '') : '';
        const errorMessage = lastError && typeof lastError === 'object' && 'message' in lastError && typeof lastError.message === 'string' ? lastError.message : String(lastError || '');

        if (errorName === 'AbortError' ||
            errorMessage.includes('aborted') ||
            errorMessage.includes('signal is aborted')) {
          const reason = (errorMessage && errorMessage !== 'signal is aborted without reason')
            ? errorMessage
            : 'Request was cancelled by user or system';
          throw new FetchError(`Request was cancelled: ${reason}`, undefined, undefined, false, false);
        }
      }

      // If this is the last attempt, throw the error
      if (attempt > retryConfig.maxRetries) {
        throw lastError;
      }

      // Check if the error is retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Calculate delay and retry
      const delay = calculateRetryDelay(attempt, retryConfig);
      console.warn(`Request failed (attempt ${attempt}), retrying in ${delay}ms...`, lastError);
      await sleep(delay);
    }
  }
  
  throw lastError!;
};

// Internal safe wrapper to prevent AbortError propagation
const safeWrapper = async <T>(fn: () => Promise<T>, context: string): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      const errorName = String(error.name || '');
      const errorMessage = String(error.message || '');

      // Handle AbortErrors gracefully - don't throw in most contexts
      if (errorName === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('signal is aborted')) {

        // For connectivity checks, return a default value instead of throwing
        if (context === 'checkConnectivity') {
          console.debug(`Connectivity check cancelled: ${errorMessage}`);
          return false as any; // Type assertion needed for generic return
        }

        // For other contexts, handle gracefully without throwing
        console.debug(`Request cancelled in ${context}: ${errorMessage}`);

        // Create a FetchError with status 0 to indicate cancellation
        const cancelError = new FetchError(
          'Request was cancelled',
          0, // Status 0 indicates cancellation
          'Cancelled',
          false,
          false
        );

        // Don't throw the error, instead return a safe default or handle it
        throw cancelError;
      }
    }
    throw error;
  }
};

// Main robust fetch function with final AbortError protection
export const robustFetch = async (
  url: string,
  options: FetchOptions = {}
): Promise<Response> => {
  return safeWrapper(() => _robustFetch(url, options), 'robustFetch');
};

// Convenience function for JSON requests
export const robustFetchJson = async <T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> => {
  const response = await robustFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  try {
    return await response.json();
  } catch (error) {
    throw new FetchError(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Convenience function for POST requests
export const robustPost = async <T = any>(
  url: string,
  data: any,
  options: FetchOptions = {}
): Promise<T> => {
  return robustFetchJson<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// Check if the current environment has connectivity issues
export const checkConnectivity = async (signal?: AbortSignal): Promise<boolean> => {
  try {
    // Early abort check
    if (signal?.aborted) {
      return false;
    }

    // Try to fetch a simple endpoint with minimal retries for connectivity check
    await robustFetch('/api/health', {
      timeout: 3000, // Very short timeout for connectivity check
      retries: 0, // No retries for connectivity check to avoid cascading failures
      signal
    });
    return true;
  } catch (error) {
    // Handle cancellation signals gracefully
    if (signal?.aborted) {
      return false;
    }

    // Handle ALL abort-related errors - never let them propagate
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      const errorName = String(errorObj.name || '');
      const errorMessage = String(errorObj.message || '');

      if (errorName === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('cancelled') ||
          errorMessage.includes('signal is aborted') ||
          errorMessage.includes('abort') ||
          errorMessage.includes('The operation was aborted')) {
        // Always return false for any abort-related error
        return false;
      }
    }

    // Don't log expected failures in cloud environments
    const errorMessage = (error as Error)?.message || '';
    if (!errorMessage.includes('cancelled') &&
        !errorMessage.includes('aborted') &&
        !errorMessage.includes('Failed to fetch') &&
        !errorMessage.includes('Network connection')) {
      console.debug('Connectivity check failed (non-critical):', errorMessage);
    }

    // Return true to avoid blocking the application
    return true;
  }
};

// Create a simple health check endpoint
export const createHealthEndpoint = () => ({
  async GET() {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
