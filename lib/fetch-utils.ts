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
  try {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const errorName = String(error.name || '');
    const errorMessage = String(error.message || '');

    // Never retry AbortErrors - they indicate cancellation
    if (errorName === 'AbortError' || errorMessage.includes('aborted')) {
      return false;
    }

    // Don't retry cancelled requests
    if (errorMessage.includes('cancelled')) {
      return false;
    }

    // Retry network and timeout errors
    if (errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('timeout')) {
      return true;
    }

    // If it's a FetchError, check properties safely
    if (error instanceof FetchError) {
      return error.isNetworkError || error.isTimeoutError || Boolean(error.status && error.status >= 500);
    }

    return false;
  } catch {
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
  if (options.signal) {
    // Check if already aborted
    if (options.signal.aborted) {
      throw new FetchError('Request was cancelled', undefined, undefined, false, false);
    }

    // Listen for external abort
    const abortHandler = () => controller.abort();
    options.signal.addEventListener('abort', abortHandler, { once: true });
  }

  // Set up timeout with proper error handling
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (error) {
      // Ignore errors when aborting timeout, the controller might already be aborted
      console.debug('Error while aborting on timeout:', error);
    }
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

    // Handle AbortError specifically
    if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
      // Check if this was a timeout or external cancellation
      const isTimeout = error.message?.includes('timeout') ||
                       (controller.signal.aborted && !options.signal?.aborted);

      if (isTimeout) {
        throw new FetchError(
          `Request timeout after ${timeout}ms for ${url}`,
          undefined,
          undefined,
          false,
          true
        );
      } else {
        throw new FetchError(
          `Request was cancelled for ${url}`,
          undefined,
          undefined,
          false,
          false
        );
      }
    }

    if (error instanceof Error) {
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
      if (lastError && (lastError.name === 'AbortError' || lastError.message?.includes('aborted'))) {
        throw new FetchError('Request was cancelled', undefined, undefined, false, false);
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
    // Safely handle any type of error
    try {
      if (error instanceof Error) {
        const errorName = String(error.name || '');
        const errorMessage = String(error.message || '');

        // Comprehensive AbortError detection
        if (errorName === 'AbortError' ||
            errorMessage.includes('aborted') ||
            errorMessage.includes('signal is aborted') ||
            errorMessage.includes('aborted without reason') ||
            errorMessage.includes('The operation was aborted') ||
            errorMessage.includes('signal.reason')) {
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
    } catch (handlingError) {
      // If error inspection fails, create a safe fallback
      console.debug(`Error handling failed in ${context}, creating fallback:`, handlingError);
      throw new FetchError(
        `Request failed in ${context}`,
        undefined,
        undefined,
        true,
        false
      );
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
export const checkConnectivity = async (signal?: AbortSignal): Promise<boolean> => {
  return safeWrapper(async () => {
    try {
      // Try to fetch a simple endpoint
      await robustFetch('/api/health', {
        timeout: 5000,
        retries: 1,
        signal
      });
      return true;
    } catch (error) {
      // Don't log connectivity failures if request was cancelled
      if (!error || !(error as Error).message?.includes('cancelled')) {
        console.warn('Connectivity check failed:', error);
      }
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
