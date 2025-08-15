// Global AbortError handler to prevent uncaught AbortError exceptions

// Track active abort controllers to prevent duplicate aborts
const activeControllers = new WeakSet<AbortController>();

// Enhanced AbortController that handles errors gracefully
export class SafeAbortController extends AbortController {
  private _aborted = false;
  private _reason?: string;

  constructor() {
    super();
    activeControllers.add(this);
  }

  abort(reason?: string): void {
    if (this._aborted) {
      return; // Already aborted, don't abort again
    }

    try {
      this._aborted = true;
      this._reason = reason;
      super.abort();
    } catch (error) {
      // Silently ignore abort errors - this is expected behavior
      console.debug('AbortController.abort() error (expected):', error);
    }
  }

  get aborted(): boolean {
    return this._aborted || super.signal.aborted;
  }

  get reason(): string | undefined {
    return this._reason;
  }
}

// Utility to create a safe abort signal with timeout
export const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  const controller = new SafeAbortController();
  
  const timeoutId = setTimeout(() => {
    try {
      controller.abort('Request timeout');
    } catch (error) {
      // Ignore timeout abort errors
      console.debug('Timeout abort error (expected):', error);
    }
  }, timeoutMs);

  // Clean up timeout if manually aborted
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  }, { once: true });

  return controller.signal;
};

// Utility to combine multiple abort signals
export const combineAbortSignals = (...signals: (AbortSignal | undefined)[]): AbortSignal => {
  const controller = new SafeAbortController();
  const validSignals = signals.filter((signal): signal is AbortSignal => !!signal);

  // If any signal is already aborted, abort immediately
  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort('Combined signal already aborted');
      break;
    }
  }

  // Set up listeners for all signals
  const abortHandlers: (() => void)[] = [];
  
  for (const signal of validSignals) {
    const handler = () => {
      try {
        if (!controller.aborted) {
          controller.abort('Combined signal aborted');
        }
      } catch (error) {
        // Ignore abort errors
        console.debug('Combined signal abort error (expected):', error);
      }
    };
    
    abortHandlers.push(handler);
    signal.addEventListener('abort', handler, { once: true });
  }

  // Clean up listeners when controller is aborted
  controller.signal.addEventListener('abort', () => {
    validSignals.forEach((signal, index) => {
      try {
        signal.removeEventListener('abort', abortHandlers[index]);
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  }, { once: true });

  return controller.signal;
};

// Safe wrapper for operations that might throw AbortError
export const handleAbortError = <T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<T> => {
  return operation().catch((error) => {
    if (error && typeof error === 'object') {
      const errorName = 'name' in error ? String(error.name || '') : '';
      const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';
      
      if (errorName === 'AbortError' || 
          errorMessage.includes('aborted') || 
          errorMessage.includes('signal is aborted')) {
        console.debug('Operation aborted (handled gracefully):', errorMessage);
        
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        
        // Re-throw as a more descriptive error
        const reason = errorMessage && errorMessage !== 'signal is aborted without reason'
          ? errorMessage
          : 'Operation was cancelled';
        throw new Error(`Operation cancelled: ${reason}`);
      }
    }
    
    throw error;
  });
};

// Install global unhandled rejection handler for AbortErrors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error && typeof error === 'object') {
      const errorName = 'name' in error ? String(error.name || '') : '';
      const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';
      
      if (errorName === 'AbortError' || 
          errorMessage.includes('aborted') || 
          errorMessage.includes('signal is aborted')) {
        console.debug('Unhandled AbortError prevented:', errorMessage);
        event.preventDefault(); // Prevent the error from being logged as unhandled
      }
    }
  });
}

// For Node.js environments
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason, promise) => {
    if (reason && typeof reason === 'object') {
      const errorName = 'name' in reason ? String((reason as any).name || '') : '';
      const errorMessage = 'message' in reason && typeof (reason as any).message === 'string' ? (reason as any).message : '';
      
      if (errorName === 'AbortError' || 
          errorMessage.includes('aborted') || 
          errorMessage.includes('signal is aborted')) {
        console.debug('Unhandled AbortError prevented in Node.js:', errorMessage);
        return; // Don't let it crash the process
      }
    }
  });
}
