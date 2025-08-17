/**
 * Error handling utilities for network requests and API calls
 */

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Safe fetch wrapper that handles network errors gracefully
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<Response | null> {
  const {
    timeout = 5000,
    retries = 0,
    retryDelay = 1000,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Create controller only if we need timeout or no external signal
      controller = new AbortController();

      // Combine external signal with timeout signal
      if (externalSignal) {
        if (externalSignal.aborted) {
          throw new Error('Request already cancelled');
        }
        externalSignal.addEventListener('abort', () => {
          if (controller && !controller.signal.aborted) {
            controller.abort(externalSignal.reason || 'External cancellation');
          }
        }, { once: true });
      }

      // Set timeout only if controller exists and not already aborted
      if (timeout > 0 && controller && !controller.signal.aborted) {
        timeoutId = setTimeout(() => {
          if (controller && !controller.signal.aborted) {
            controller.abort('Request timeout');
          }
        }, timeout);
      }

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return response;

    } catch (error) {
      // Clean up timeout if error occurs
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Handle AbortError specifically
      if (error instanceof Error &&
          (error.name === 'AbortError' ||
           error.message.includes('aborted') ||
           error.message.includes('cancelled'))) {
        console.debug(`Request cancelled for ${url}:`, error.message);
        return null;
      }

      lastError = error instanceof Error ? error : new Error('Unknown fetch error');

      // Don't retry on the last attempt
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  // Log errors quietly for debugging, don't throw
  if (lastError && !isNetworkError(lastError)) {
    console.debug(`Fetch failed for ${url}:`, lastError?.message);
  }
  return null;
}

/**
 * Safe JSON fetch that returns null on any error
 */
export async function safeFetchJson<T = any>(
  url: string, 
  options: SafeFetchOptions = {}
): Promise<T | null> {
  try {
    const response = await safeFetch(url, options);
    
    if (!response || !response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.debug(`JSON fetch failed for ${url}:`, error);
    return null;
  }
}

/**
 * Error boundary for handling async operations
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (errorMessage) {
      console.debug(errorMessage, error);
    }
    return fallback;
  }
}

/**
 * Suppress network error reporting for known issues
 */
export function suppressNetworkErrors() {
  // Override window.fetch to catch and suppress network errors
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      try {
        return await originalFetch(input, init);
      } catch (error) {
        // Only suppress specific network errors, not all errors
        if (error instanceof Error && 
            (error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError') ||
             error.message.includes('fetch') ||
             error.name === 'AbortError')) {
          console.debug('Network request failed:', input, error.message);
          throw error; // Still throw, but logged as debug
        }
        throw error;
      }
    };
  }
}

/**
 * Check if an error should be handled quietly
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message || '';
  const name = error.name || '';

  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('fetch') ||
    message.includes('aborted') ||
    message.includes('cancelled') ||
    message.includes('signal is aborted') ||
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    name === 'TypeError' && message.includes('fetch')
  );
}
