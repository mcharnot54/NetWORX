// Robust fetch utility with retry logic and error handling
import { SafeAbortController, handleAbortError } from './abort-error-handler';

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
  baseDelay: 2000,
  maxDelay: 15000,
  exponentialBackoff: true,
};

const DEFAULT_TIMEOUT = 30000; // 30 seconds

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
    const errorName = error && 'name' in error ? String(error.name || '') : '';
    const errorMessage = error && 'message' in error ? String(error.message || '') : '';

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
    console.debug('Error while checking if error is retryable:', e);
    return false;
  }
};

// Enhanced fetch with timeout and abort signal
const fetchWithTimeout = async (
  url: string,
  options: FetchOptions
): Promise<Response> => {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const controller = new SafeAbortController();

  // Handle external signal if provided
  let externalAbortHandler: (() => void) | null = null;
  if (options.signal) {
    // Check if already aborted
    if (options.signal.aborted) {
      throw new FetchError('Request was cancelled', undefined, undefined, false, false);
    }

    // Listen for external abort
    externalAbortHandler = () => {
      try {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        // Ignore errors when aborting - expected behavior
        console.debug('Expected abort error:', error);
      }
    };

    try {
      options.signal.addEventListener('abort', externalAbortHandler, { once: true });
    } catch (error) {
      // Ignore errors adding listener if signal is already aborted
      console.debug('Signal listener error:', error);
    }
  }

  // Set up timeout with proper error handling
  const timeoutId = setTimeout(() => {
    try {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    } catch (error) {
      // Ignore errors when aborting timeout - this is expected behavior
      console.debug('Expected timeout abort error:', error);
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

    // Handle AbortError specifically - check if error exists and has required properties
    if (error && typeof error === 'object') {
      const errorName = 'name' in error ? String(error.name || '') : '';
      const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';

      if (errorName === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('signal is aborted')) {

        // Check if this was a timeout or external cancellation
        const isTimeout = controller.signal.aborted && !options.signal?.aborted;

        if (isTimeout) {
          throw new FetchError(
            `Request timeout after ${timeout}ms`,
            undefined,
            undefined,
            false,
            true
          );
        } else {
          // Handle external cancellation more gracefully
          const reason = errorMessage && errorMessage !== 'signal is aborted without reason'
            ? errorMessage
            : 'Request was cancelled by user or system';

          console.debug(`Request cancelled for ${url}:`, reason);
          throw new FetchError(
            reason,
            undefined,
            undefined,
            false,
            false
          );
        }
      }
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
        const errorName = 'name' in lastError ? String(lastError.name || '') : '';
        const errorMessage = 'message' in lastError && typeof lastError.message === 'string' ? lastError.message : '';

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

      // Convert AbortErrors to FetchErrors with more context
      if (errorName === 'AbortError' || errorMessage.includes('aborted')) {
        const reason = (errorMessage && errorMessage !== 'signal is aborted without reason')
          ? errorMessage
          : 'request was cancelled';
        throw new FetchError(
          `Request aborted in ${context}: ${reason}`,
          undefined,
          undefined,
          false,
          false
        );
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
  return handleAbortError(() =>
    safeWrapper(() => _robustFetch(url, options), 'robustFetch')
  );
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
  return handleAbortError(async () => {
    return safeWrapper(async () => {
      try {
        // Early abort check
        if (signal?.aborted) {
          return false;
        }

        // Try to fetch a simple endpoint with minimal retries for connectivity check
        await robustFetch('/api/health', {
          timeout: 5000, // Shorter timeout for connectivity check
          retries: 0, // No retries for connectivity check to avoid cascading failures
          signal
        });
        return true;
      } catch (error) {
        // Handle abort errors gracefully
        if (error && typeof error === 'object') {
          const errorName = 'name' in error ? String(error.name || '') : '';
          const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';

          if (errorName === 'AbortError' ||
              errorMessage.includes('aborted') ||
              errorMessage.includes('cancelled')) {
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
    }, 'checkConnectivity');
  }, false); // Return false as fallback for aborted connectivity checks
};

// Create a simple health check endpoint
export const createHealthEndpoint = () => ({
  async GET() {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
