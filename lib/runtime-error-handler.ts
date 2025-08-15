// Comprehensive runtime error handling and cleanup system

interface CleanupTask {
  id: string;
  cleanup: () => void;
  priority: number; // Higher priority runs first
}

class RuntimeErrorHandler {
  private static instance: RuntimeErrorHandler;
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private errorListeners: Set<(error: Error) => void> = new Set();

  static getInstance(): RuntimeErrorHandler {
    if (!RuntimeErrorHandler.instance) {
      RuntimeErrorHandler.instance = new RuntimeErrorHandler();
    }
    return RuntimeErrorHandler.instance;
  }

  private constructor() {
    // Global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
  }

  // Register cleanup task
  registerCleanup(id: string, cleanup: () => void, priority: number = 0): void {
    this.cleanupTasks.set(id, { id, cleanup, priority });
  }

  // Unregister cleanup task
  unregisterCleanup(id: string): void {
    this.cleanupTasks.delete(id);
  }

  // Execute cleanup for specific task
  executeCleanup(id: string): void {
    const task = this.cleanupTasks.get(id);
    if (task) {
      try {
        task.cleanup();
      } catch (error) {
        console.debug(`Cleanup error for ${id}:`, error);
      } finally {
        this.cleanupTasks.delete(id);
      }
    }
  }

  // Execute all cleanup tasks
  executeAllCleanup(): void {
    const tasks = Array.from(this.cleanupTasks.values())
      .sort((a, b) => b.priority - a.priority);

    for (const task of tasks) {
      try {
        task.cleanup();
      } catch (error) {
        console.debug(`Cleanup error for ${task.id}:`, error);
      }
    }
    this.cleanupTasks.clear();
  }

  // Add error listener
  addErrorListener(listener: (error: Error) => void): void {
    this.errorListeners.add(listener);
  }

  // Remove error listener
  removeErrorListener(listener: (error: Error) => void): void {
    this.errorListeners.delete(listener);
  }

  // Handle global errors
  private handleGlobalError(event: ErrorEvent): void {
    const error = event.error || new Error(event.message);
    this.notifyErrorListeners(error);
  }

  // Handle unhandled promise rejections
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.notifyErrorListeners(error);
  }

  // Notify all error listeners
  private notifyErrorListeners(error: Error): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }
}

// Safe AbortController manager
export class SafeAbortController {
  private controller: AbortController;
  private isAborted: boolean = false;
  private cleanupId: string;

  constructor(cleanupId?: string) {
    this.controller = new AbortController();
    this.cleanupId = cleanupId || `abort-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Register cleanup
    RuntimeErrorHandler.getInstance().registerCleanup(
      this.cleanupId,
      () => this.safeAbort(),
      10 // High priority for abort controllers
    );
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get aborted(): boolean {
    return this.isAborted || this.controller.signal.aborted;
  }

  safeAbort(reason?: string): void {
    if (this.isAborted) return;

    try {
      this.isAborted = true;
      if (!this.controller.signal.aborted) {
        this.controller.abort(reason || 'Controller cleanup - safe operation');
      }
    } catch (error) {
      // Silently ignore abort errors - this is expected behavior
      console.debug('Expected abort error during cleanup:', error);
    } finally {
      // Always cleanup registration, even if abort failed
      try {
        RuntimeErrorHandler.getInstance().unregisterCleanup(this.cleanupId);
      } catch (cleanupError) {
        console.debug('Cleanup registration error:', cleanupError);
      }
    }
  }

  cleanup(): void {
    this.safeAbort('Controller cleanup');
  }
}

// Enhanced useEffect cleanup hook
export function useSafeEffect(
  effect: () => void | Promise<void> | (() => void | Promise<void>),
  deps?: React.DependencyList,
  componentId?: string
): void {
  const React = require('react');
  const effectId = componentId || `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  React.useEffect(() => {
    let cleanup: (() => void | Promise<void>) | undefined;
    let isCleanedUp = false;

    const runEffect = async () => {
      if (isCleanedUp) return;
      
      try {
        const result = effect();
        if (typeof result === 'function') {
          cleanup = result;
        } else if (result && typeof result.then === 'function') {
          // Handle async effect
          await result;
        }
      } catch (error) {
        if (!isCleanedUp) {
          console.error(`Effect error in ${effectId}:`, error);
        }
      }
    };

    runEffect();

    return () => {
      isCleanedUp = true;
      if (cleanup) {
        try {
          const cleanupResult = cleanup();
          if (cleanupResult && typeof cleanupResult.then === 'function') {
            cleanupResult.catch(error => {
              console.debug(`Async cleanup error in ${effectId}:`, error);
            });
          }
        } catch (error) {
          console.debug(`Cleanup error in ${effectId}:`, error);
        }
      }
      RuntimeErrorHandler.getInstance().executeCleanup(effectId);
    };
  }, deps);
}

// Error boundary with better async error handling
export function withErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
): React.ComponentType<T> {
  const React = require('react');

  const ErrorBoundaryWrapper = class extends React.Component<T, { hasError: boolean; error?: Error }> {
    constructor(props: T) {
      super(props);
      this.state = { hasError: false };
      
      // Listen for async errors
      RuntimeErrorHandler.getInstance().addErrorListener(this.handleAsyncError);
    }

    componentWillUnmount() {
      RuntimeErrorHandler.getInstance().removeErrorListener(this.handleAsyncError);
    }

    handleAsyncError = (error: Error) => {
      // Only handle errors that seem related to this component
      if (!this.state.hasError && error.stack?.includes(Component.name)) {
        this.setState({ hasError: true, error });
      }
    };

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    retry = () => {
      this.setState({ hasError: false, error: undefined });
    };

    render() {
      if (this.state.hasError && this.state.error) {
        if (fallback) {
          const Fallback = fallback;
          return React.createElement(Fallback, { error: this.state.error, retry: this.retry });
        }
        
        return React.createElement('div', 
          { 
            style: { 
              padding: '20px', 
              border: '1px solid #f87171', 
              borderRadius: '8px', 
              backgroundColor: '#fef2f2',
              margin: '10px',
              textAlign: 'center'
            } 
          },
          React.createElement('h3', { style: { color: '#dc2626' } }, 'Something went wrong'),
          React.createElement('p', { style: { color: '#7f1d1d' } }, this.state.error.message),
          React.createElement('button', 
            { 
              onClick: this.retry,
              style: {
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }
            }, 
            'Try Again'
          )
        );
      }

      return React.createElement(Component, this.props);
    }
  };

  return ErrorBoundaryWrapper as unknown as React.ComponentType<T>;
}

// Safe async operation wrapper
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string = 'unknown',
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    // Handle abort signals gracefully - these are expected during cleanup
    if (error && typeof error === 'object') {
      const errorObj = error as any;

      // Check for abort-related errors
      if (errorObj.name === 'AbortError' ||
          (errorObj.message && typeof errorObj.message === 'string' &&
           (errorObj.message.includes('aborted') ||
            errorObj.message.includes('cancelled') ||
            errorObj.message.includes('signal is aborted')))) {

        console.debug(`Request cancelled in ${context}:`, errorObj.message || 'Unknown abort');
        return fallback;
      }

      // Check for FetchError cancellation
      if (errorObj.message === 'Request was cancelled') {
        console.debug(`Request cancelled in ${context}`);
        return fallback;
      }
    }

    // Log other errors normally
    console.error(`Safe async error in ${context}:`, error);
    return fallback;
  }
}

// Memory leak detector (development only)
export function enableMemoryLeakDetection(): void {
  if (process.env.NODE_ENV !== 'development') return;

  let intervalCount = 0;
  let timeoutCount = 0;
  let listenerCount = 0;

  // Override setInterval
  const originalSetInterval = window.setInterval;
  (window as any).setInterval = function(...args: any[]) {
    intervalCount++;
    console.debug(`Active intervals: ${intervalCount}`);
    return originalSetInterval.apply(this, args as any);
  };

  // Override clearInterval
  const originalClearInterval = window.clearInterval;
  (window as any).clearInterval = function(...args: any[]) {
    intervalCount = Math.max(0, intervalCount - 1);
    console.debug(`Active intervals: ${intervalCount}`);
    return originalClearInterval.apply(this, args as any);
  };

  // Similar for setTimeout/clearTimeout and addEventListener/removeEventListener
  // ... (implementation would continue for other potential leak sources)
}

// Export singleton instance
export const runtimeErrorHandler = RuntimeErrorHandler.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    runtimeErrorHandler.executeAllCleanup();
  });
}
