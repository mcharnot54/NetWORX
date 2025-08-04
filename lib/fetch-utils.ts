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
  // Network errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return true;
  }
  
  // Timeout errors
  if (error.message.includes('timeout') || error.message.includes('aborted')) {
    return true;
  }
  
  // If it's a FetchError, check the status
  if (error instanceof FetchError) {
    // Retry on network errors, timeouts, or 5xx errors
    return error.isNetworkError || error.isTimeoutError || Boolean(error.status && error.status >= 500);
  }
  
  return false;
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
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new FetchError(
          `Request timeout after ${timeout}ms`,
          undefined,
          undefined,
          false,
          true
        );
      }
      
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
  }
};

// Main robust fetch function
export const robustFetch = async (
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
};

// Create a simple health check endpoint
export const createHealthEndpoint = () => ({
  async GET() {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
