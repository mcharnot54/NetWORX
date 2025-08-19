// Minimal client-side error cleanup
(function() {
  'use strict';

  // Handle unhandled promise rejections for AbortErrors only
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    
    if (reason && typeof reason === 'object') {
      // Only suppress specific AbortErrors that are harmless
      if (reason.name === 'AbortError' && 
          reason.message && 
          (reason.message.includes('signal is aborted without reason') ||
           reason.message.includes('aborted without reason'))) {
        event.preventDefault();
        return;
      }
    }
  });

  console.debug('Minimal error cleanup script loaded');
})();
