/**
 * Comprehensive Error Handling and Recovery System
 * 
 * Provides error classification, recovery strategies, and user-friendly
 * error messages for the Transport Optimizer background processing system.
 */

export interface ErrorContext {
  operation: string;
  scenarioId?: number;
  jobId?: string;
  optimizationRunId?: string;
  userId?: string;
  timestamp: Date;
  additionalData?: any;
}

export interface RecoveryAction {
  action: 'retry' | 'fallback' | 'cancel' | 'manual_intervention';
  description: string;
  automaticRetry?: boolean;
  retryDelay?: number; // milliseconds
  maxRetries?: number;
}

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  recoveryActions: RecoveryAction[];
  context: ErrorContext;
}

export class OptimizationError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly recoverable: boolean;
  public readonly context: ErrorContext;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    recoverable: boolean = true,
    context: ErrorContext
  ) {
    super(message);
    this.name = 'OptimizationError';
    this.code = code;
    this.severity = severity;
    this.recoverable = recoverable;
    this.context = context;
  }
}

export class ErrorHandler {
  /**
   * Classify and handle different types of optimization errors
   */
  static handleError(error: Error, context: ErrorContext): ErrorDetails {
    // Database connection errors
    if (this.isDatabaseError(error)) {
      return this.createErrorDetails(
        'DATABASE_ERROR',
        'Database connection failed',
        'Unable to access data. Please try again in a few moments.',
        'high',
        true,
        [
          {
            action: 'retry',
            description: 'Retry database connection',
            automaticRetry: true,
            retryDelay: 5000,
            maxRetries: 3
          },
          {
            action: 'manual_intervention',
            description: 'Contact support if problem persists'
          }
        ],
        context
      );
    }

    // Network/API errors
    if (this.isNetworkError(error)) {
      return this.createErrorDetails(
        'NETWORK_ERROR',
        'Network request failed',
        'Connection problem. Please check your internet connection and try again.',
        'medium',
        true,
        [
          {
            action: 'retry',
            description: 'Retry network request',
            automaticRetry: true,
            retryDelay: 3000,
            maxRetries: 5
          }
        ],
        context
      );
    }

    // Optimization algorithm errors
    if (this.isOptimizationError(error)) {
      return this.createErrorDetails(
        'OPTIMIZATION_ERROR',
        'Optimization algorithm failed',
        'The optimization process encountered an error. This may be due to invalid data or algorithm limitations.',
        'medium',
        true,
        [
          {
            action: 'fallback',
            description: 'Use simplified optimization algorithm'
          },
          {
            action: 'retry',
            description: 'Retry with different parameters',
            automaticRetry: false
          }
        ],
        context
      );
    }

    // Data validation errors
    if (this.isValidationError(error)) {
      return this.createErrorDetails(
        'VALIDATION_ERROR',
        'Invalid input data',
        'The provided data is invalid or incomplete. Please check your inputs and try again.',
        'low',
        false,
        [
          {
            action: 'manual_intervention',
            description: 'Review and correct input data'
          }
        ],
        context
      );
    }

    // Memory/Resource errors
    if (this.isResourceError(error)) {
      return this.createErrorDetails(
        'RESOURCE_ERROR',
        'Insufficient system resources',
        'The system is currently overloaded. Please try again later.',
        'high',
        true,
        [
          {
            action: 'retry',
            description: 'Retry when system resources are available',
            automaticRetry: true,
            retryDelay: 30000,
            maxRetries: 3
          },
          {
            action: 'fallback',
            description: 'Use reduced complexity optimization'
          }
        ],
        context
      );
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return this.createErrorDetails(
        'TIMEOUT_ERROR',
        'Operation timed out',
        'The optimization is taking longer than expected. You can wait for it to complete or try again.',
        'medium',
        true,
        [
          {
            action: 'retry',
            description: 'Retry optimization with extended timeout',
            automaticRetry: false
          },
          {
            action: 'cancel',
            description: 'Cancel current operation and start fresh'
          }
        ],
        context
      );
    }

    // Generic/Unknown errors
    return this.createErrorDetails(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      'Something went wrong. Our team has been notified. Please try again or contact support.',
      'medium',
      true,
      [
        {
          action: 'retry',
          description: 'Retry the operation',
          automaticRetry: false
        },
        {
          action: 'manual_intervention',
          description: 'Contact support with error details'
        }
      ],
      context
    );
  }

  /**
   * Attempt automatic recovery based on error type
   */
  static async attemptRecovery(
    errorDetails: ErrorDetails,
    originalOperation: () => Promise<any>
  ): Promise<{ success: boolean; result?: any; finalError?: ErrorDetails }> {
    
    const recoverableActions = errorDetails.recoveryActions.filter(
      action => action.automaticRetry === true
    );

    for (const action of recoverableActions) {
      if (action.action === 'retry') {
        console.log(`Attempting automatic recovery: ${action.description}`);
        
        const maxRetries = action.maxRetries || 1;
        const retryDelay = action.retryDelay || 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Wait before retry
            if (retryDelay > 0) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }

            console.log(`Recovery attempt ${attempt}/${maxRetries}`);
            const result = await originalOperation();
            
            console.log('Recovery successful');
            return { success: true, result };

          } catch (retryError) {
            console.log(`Recovery attempt ${attempt} failed:`, retryError);
            
            if (attempt === maxRetries) {
              // If this was the last attempt, return the final error
              const finalErrorDetails = this.handleError(
                retryError instanceof Error ? retryError : new Error(String(retryError)),
                errorDetails.context
              );
              return { success: false, finalError: finalErrorDetails };
            }
          }
        }
      }
    }

    return { success: false, finalError: errorDetails };
  }

  /**
   * Log error for monitoring and debugging
   */
  static logError(errorDetails: ErrorDetails): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      code: errorDetails.code,
      message: errorDetails.message,
      severity: errorDetails.severity,
      context: errorDetails.context,
      recoverable: errorDetails.recoverable
    };

    // In production, this would be sent to a logging service
    console.error('Optimization Error:', logEntry);

    // For critical errors, immediate notification might be needed
    if (errorDetails.severity === 'critical') {
      console.error('CRITICAL ERROR - Immediate attention required:', logEntry);
      // Could trigger alerts, notifications, etc.
    }
  }

  // Error classification helpers
  private static isDatabaseError(error: Error): boolean {
    return error.message.includes('database') || 
           error.message.includes('connection') ||
           error.message.includes('timeout') ||
           error.name === 'DatabaseError';
  }

  private static isNetworkError(error: Error): boolean {
    return error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('ECONNREFUSED') ||
           error.name === 'NetworkError';
  }

  private static isOptimizationError(error: Error): boolean {
    return error.message.includes('optimization') ||
           error.message.includes('algorithm') ||
           error.message.includes('coordinates') ||
           error.name === 'OptimizationError';
  }

  private static isValidationError(error: Error): boolean {
    return error.message.includes('validation') ||
           error.message.includes('invalid') ||
           error.message.includes('required') ||
           error.name === 'ValidationError';
  }

  private static isResourceError(error: Error): boolean {
    return error.message.includes('memory') ||
           error.message.includes('resource') ||
           error.message.includes('overload') ||
           error.name === 'ResourceError';
  }

  private static isTimeoutError(error: Error): boolean {
    return error.message.includes('timeout') ||
           error.message.includes('timed out') ||
           error.name === 'TimeoutError';
  }

  private static createErrorDetails(
    code: string,
    message: string,
    userMessage: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    recoverable: boolean,
    recoveryActions: RecoveryAction[],
    context: ErrorContext
  ): ErrorDetails {
    return {
      code,
      message,
      userMessage,
      severity,
      recoverable,
      recoveryActions,
      context
    };
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, etc.
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}
