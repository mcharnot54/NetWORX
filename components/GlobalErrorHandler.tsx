'use client';

import { useEffect } from 'react';
import { runtimeErrorHandler } from '@/lib/runtime-error-handler';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export default function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  useEffect(() => {
    const handleError = (error: Error) => {
      // Filter out known safe errors that can be ignored
      const ignorableErrors = [
        'cancelled',
        'aborted',
        'Request was cancelled',
        'signal is aborted without reason',
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded'
      ];

      const shouldIgnore = ignorableErrors.some(ignorable => 
        error.message?.includes(ignorable) || error.name?.includes(ignorable)
      );

      if (shouldIgnore) {
        return; // Silently ignore these errors
      }

      // Log other errors for debugging
      console.error('Global error caught:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // In development, we can be more verbose
      if (process.env.NODE_ENV === 'development') {
        console.group('Error Details');
        console.error('Error object:', error);
        console.error('Stack trace:', error.stack);
        console.groupEnd();
      }
    };

    // Register the error handler
    runtimeErrorHandler.addErrorListener(handleError);

    // Cleanup on unmount
    return () => {
      runtimeErrorHandler.removeErrorListener(handleError);
    };
  }, []);

  return <>{children}</>;
}
