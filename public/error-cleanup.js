// Client-side error cleanup and prevention
(function() {
  'use strict';

  // Prevent common abort errors from showing in console
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Filter out known safe errors
    const ignorablePatterns = [
      'signal is aborted without reason',
      'AbortError: signal is aborted without reason',
      'Request was cancelled',
      'aborted without reason',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured'
    ];

    const shouldIgnore = ignorablePatterns.some(pattern => 
      message.includes(pattern)
    );

    if (!shouldIgnore) {
      originalConsoleError.apply(console, args);
    }
  };

  // Handle unhandled promise rejections gracefully
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    
    if (reason && typeof reason === 'object') {
      // Check if it's an abort-related error
      if (reason.name === 'AbortError' || 
          (reason.message && reason.message.includes('aborted'))) {
        event.preventDefault(); // Prevent the error from being logged
        return;
      }
    }
    
    // Log other unhandled rejections for debugging
    console.warn('Unhandled promise rejection:', reason);
  });

  // Enhanced error event handler
  window.addEventListener('error', function(event) {
    const error = event.error;
    
    if (error && (error.name === 'AbortError' || 
        (error.message && error.message.includes('aborted')))) {
      event.preventDefault();
      return;
    }

    // Log other errors for debugging (but don't crash the app)
    if (error && error.message && !error.message.includes('Script error')) {
      console.warn('Global error caught:', {
        message: error.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    }
  });

  // Cleanup any remaining listeners on page unload
  window.addEventListener('beforeunload', function() {
    // Cancel any pending AbortControllers
    if (window.__abortControllers) {
      window.__abortControllers.forEach(controller => {
        try {
          if (!controller.signal.aborted) {
            controller.abort('Page unloading');
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      window.__abortControllers.clear();
    }
  });

  console.debug('Error cleanup script loaded');
})();
