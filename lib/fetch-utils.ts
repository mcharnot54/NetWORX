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
  // Ultimate safety check with completely defensive error handling
  try {
    // Safety check for error object
    if (!error || typeof error !== 'object') {
      return false;
    }

    // Safely extract error information without accessing potentially dangerous properties
    let errorName = '';
    let errorMessage = '';

    try {
      errorName = String(error.name || '');
      errorMessage = String(error.message || '');
    } catch (nameError) {
      // If we can't even safely get name/message, don't retry
      console.debug('Cannot safely access error properties:', nameError);
      return false;
    }

    // Handle AbortErrors specifically with multiple detection methods
    if (errorName === 'AbortError' ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('signal is aborted') ||
        errorMessage.includes('aborted without reason') ||
        errorMessage.includes('The operation was aborted')) {
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

    // If it's a FetchError, check the status safely
    if (error instanceof FetchError) {
      // Don't retry cancelled requests, but retry timeouts and network errors
      if (errorMessage.includes('cancelled')) {
        return false;
      }
      // Retry on network errors, timeouts, or 5xx errors
      try {
        return error.isNetworkError || error.isTimeoutError || Boolean(error.status && error.status >= 500);
      } catch (statusError) {
        // If we can't access status safely, don't retry
        console.debug('Cannot safely access FetchError properties:', statusError);
        return false;
      }
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

  // Combine external signal with timeout signal
  const combinedSignal = options.signal;
  if (combinedSignal) {
    // If external signal is already aborted, abort immediately
    if (combinedSignal.aborted) {
      throw new FetchError('Request was cancelled', undefined, undefined, false, false);
    }

    // Listen for external abort with proper error handling
    const abortHandler = () => {
      try {
        controller.abort();
      } catch (error) {
        // Ignore errors when aborting, as the controller might already be aborted
        console.debug('Error while aborting controller:', error);
      }
    };

    combinedSignal.addEventListener('abort', abortHandler, { once: true });
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

    // Wrap all error handling in try-catch to prevent errors in error handling
    try {
      // Handle all types of abort errors more defensively
      if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
        // Safely check abort status to avoid accessing properties on aborted signals
        let isExternalCancel = false;
        let isTimeoutAbort = false;

        try {
          // More defensive signal checking to prevent "signal is aborted without reason"
          if (options.signal) {
            try {
              isExternalCancel = Boolean(options.signal.aborted);
            } catch (externalSignalError) {
              // If external signal throws when checking aborted, assume it's cancelled
              console.debug('Error checking external signal status:', externalSignalError);
              isExternalCancel = true;
            }
          }

          if (!isExternalCancel) {
            try {
              isTimeoutAbort = Boolean(controller.signal.aborted);
            } catch (timeoutSignalError) {
              // If timeout signal throws when checking aborted, assume it's a timeout
              console.debug('Error checking timeout signal status:', timeoutSignalError);
              isTimeoutAbort = true;
            }
          }
        } catch (signalError) {
          // If we can't determine the abort reason, treat as external cancellation
          console.debug('Error checking signal status:', signalError);
          isExternalCancel = true;
        }

        if (isExternalCancel) {
          // External cancellation (component unmount, user action, etc.)
          throw new FetchError(
            `Request was cancelled for ${url}`,
            undefined,
            undefined,
            false,
            false
          );
        } else if (isTimeoutAbort) {
          // Timeout cancellation
          throw new FetchError(
            `Request timeout after ${timeout}ms for ${url}`,
            undefined,
            undefined,
            false,
            true
          );
        } else {
          // Unknown abort reason - treat as cancellation to avoid propagating raw AbortError
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
        // Safely check if this was an external cancellation
        let isExternalCancel = false;
        try {
          isExternalCancel = lastError.message?.includes('cancelled');
          if (!isExternalCancel && options.signal) {
            try {
              isExternalCancel = Boolean(options.signal.aborted);
            } catch (signalCheckError) {
              // If signal check throws, assume external cancellation
              console.debug('Error checking signal in _robustFetch:', signalCheckError);
              isExternalCancel = true;
            }
          }
        } catch (signalError) {
          // If we can't check signal status, assume external cancellation
          console.debug('Error in abort handling:', signalError);
          isExternalCancel = true;
        }

        if (isExternalCancel) {
          console.debug('Request externally cancelled, not retrying:', lastError.message);
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
