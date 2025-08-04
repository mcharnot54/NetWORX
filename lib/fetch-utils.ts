// Robust fetch utility with retry logic and error handling

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
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
  // Ultimate safety check
  try {
    // Safety check for error object
    if (!error || typeof error !== 'object') {
      return false;
    }

    // Handle any AbortError immediately to prevent propagation
    const errorName = String(error.name || '');
    const errorMessage = String(error.message || '');

    // Handle AbortErrors specifically with multiple detection methods
    if (errorName === 'AbortError' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('signal is aborted') ||
        errorMessage.includes('aborted without reason')) {
      // Only retry timeout aborts, not user-cancelled requests
      const isTimeout = errorMessage.includes('timeout');
      console.debug('AbortError detected in retry check:', { errorName, errorMessage, isTimeout });
      return isTimeout;
    }

    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return true;
    }

    // Timeout errors are retryable, but not cancelled requests
    if (errorMessage.includes('timeout')) {
      return true;
    }

    // Don't retry requests that were cancelled (not timeout aborts)
    if (errorMessage.includes('cancelled')) {
      return false;
    }

    // If it's a FetchError, check the status
    if (error instanceof FetchError) {
      // Don't retry cancelled requests, but retry timeouts and network errors
      if (errorMessage.includes('cancelled')) {
        return false;
      }
      // Retry on network errors, timeouts, or 5xx errors
      return error.isNetworkError || error.isTimeoutError || Boolean(error.status && error.status >= 500);
    }

    return false;
  } catch (e) {
    // Ultimate fallback - if even this error checking fails, don't retry
    console.debug('Critical error in retry logic evaluation:', e);
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
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Wrap all error handling in try-catch to prevent errors in error handling
    try {
      // Handle all types of abort errors more defensively
      if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
        // Check if this was a timeout abort or an external abort
        const isTimeoutAbort = controller.signal.aborted && controller.signal.reason === undefined;
        const errorMessage = isTimeoutAbort
          ? `Request timeout after ${timeout}ms for ${url}`
          : `Request was cancelled for ${url}`;

        throw new FetchError(
          errorMessage,
          undefined,
          undefined,
          false,
          isTimeoutAbort
        );
      }

      if (error instanceof Error) {
        // Network error
        throw new FetchError(
          `Network error: ${error.message}`,
          undefined,
          undefined,
          true,
          false
        );
      }

      throw error;
    } catch (handlingError) {
      // If error handling itself fails, create a safe fallback error
      if (handlingError instanceof FetchError) {
        throw handlingError;
      }

      // Create a safe fallback error
      throw new FetchError(
        `Request failed for ${url}`,
        undefined,
        undefined,
        true,
        false
      );
    }
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

      // Handle AbortError specifically to prevent propagation
      if (lastError && (lastError.name === 'AbortError' || lastError.message?.includes('aborted'))) {
        // If it's a cancellation, don't retry and throw a more specific error
        if (lastError.message?.includes('cancelled') || lastError.message?.includes('aborted without reason')) {
          console.debug('Request cancelled, not retrying:', lastError.message);
          throw new FetchError('Request was cancelled', undefined, undefined, false, false);
        }
        // If it's a timeout, allow retry logic to proceed
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

      // Comprehensive AbortError detection
      if (errorName === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('signal is aborted') ||
          errorMessage.includes('aborted without reason') ||
          errorMessage.includes('The operation was aborted')) {
        console.debug(`AbortError suppressed in ${context}:`, errorMessage);
        throw new FetchError(
          `Request aborted in ${context}`,
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
  return safeWrapper(async () => {
    try {
      return await _robustFetch(url, options);
    } catch (error) {
      // Final safety net for any AbortErrors that slip through
      if (error instanceof Error) {
        const errorName = String(error.name || '');
        const errorMessage = String(error.message || '');

        // Enhanced AbortError detection
        if (errorName === 'AbortError' ||
            errorMessage.includes('aborted') ||
            errorMessage.includes('signal is aborted') ||
            errorMessage.includes('aborted without reason') ||
            errorMessage.includes('The operation was aborted')) {
          console.debug('Final AbortError catch:', errorMessage);
          throw new FetchError(
            `Request aborted for ${url}`,
            undefined,
            undefined,
            false,
            false
          );
        }
      }
      throw error;
    }
  }, 'robustFetch');
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
export const checkConnectivity = async (): Promise<boolean> => {
  return safeWrapper(async () => {
    try {
      // Try to fetch a simple endpoint
      await robustFetch('/api/health', {
        timeout: 5000,
        retries: 1,
      });
      return true;
    } catch (error) {
      console.warn('Connectivity check failed:', error);
      return false;
    }
  }, 'checkConnectivity');
};

// Create a simple health check endpoint
export const createHealthEndpoint = () => ({
  async GET() {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
