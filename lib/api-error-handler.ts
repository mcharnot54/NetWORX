import { NextRequest, NextResponse } from 'next/server';
import { emergencyTimeoutFix } from './timeout-emergency-fixer';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export function createApiError(message: string, status: number = 500, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  return error;
}

export function withErrorHandler<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      // Add request timeout of 60 seconds with emergency fix capability
      const timeoutPromise = new Promise<NextResponse>((_, reject) => {
        setTimeout(async () => {
          // Trigger emergency timeout fix for critical timeouts
          console.warn(`Critical timeout detected for ${req.url} - triggering emergency fix`);
          try {
            await emergencyTimeoutFix();
          } catch (fixError) {
            console.error('Emergency timeout fix failed:', fixError);
          }

          reject(createApiError('API request timeout after 60 seconds', 408, 'TIMEOUT'));
        }, 60000);
      });

      const result = await Promise.race([
        handler(req, ...args),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      if (duration > 10000) {
        console.warn(`Slow API request: ${req.url} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`API Error (${responseTime}ms):`, error);

      // Handle timeout errors with emergency fix
      if (error instanceof Error && error.message.includes('timeout')) {
        // Trigger emergency fix for persistent timeout errors
        if (responseTime > 30000) { // If request took more than 30 seconds
          emergencyTimeoutFix().catch(fixError => {
            console.error('Background emergency fix failed:', fixError);
          });
        }

        return NextResponse.json({
          success: false,
          error: {
            message: 'Request timeout - emergency recovery triggered',
            code: 'TIMEOUT',
            timestamp: new Date().toISOString(),
            responseTime,
            emergencyFixTriggered: responseTime > 30000
          }
        }, { status: 408 });
      }

      // Handle different types of errors
      if (error instanceof Error) {
        const apiError = error as ApiError;
        const status = apiError.status || 500;
        const code = apiError.code || 'INTERNAL_ERROR';

        return NextResponse.json({
          success: false,
          error: {
            message: error.message,
            code,
            timestamp: new Date().toISOString(),
            responseTime
          }
        }, { status });
      }

      // Fallback for unknown errors
      return NextResponse.json({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
          responseTime
        }
      }, { status: 500 });
    }
  };
}

export function withDatabaseErrorHandler<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return withErrorHandler(async (req: NextRequest, ...args: T) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      // Handle database-specific errors
      if (error instanceof Error) {
        if (error.message.includes('database') || 
            error.message.includes('connection') ||
            error.message.includes('timeout')) {
          throw createApiError(
            'Database connection issue - please try again later',
            503,
            'DATABASE_ERROR'
          );
        }
      }
      throw error;
    }
  });
}
