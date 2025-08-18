// Minimal HMR error handler - removed fetch wrapping that was causing issues
(function() {
  if (typeof window === 'undefined') {
    return;
  }

  // Just handle unhandled promise rejections for AbortErrors without interfering with fetch
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error) {
      const errorName = String(error.name || '');
      const errorMessage = String(error.message || '');

      // Only suppress specific AbortErrors that are known to be harmless
      if (errorName === 'AbortError' && 
          (errorMessage.includes('signal is aborted') || 
           errorMessage.includes('aborted without reason'))) {
        console.debug('Suppressed harmless AbortError:', errorMessage);
        event.preventDefault();
        return false;
      }
    }
  });

  console.log('Minimal HMR error handler initialized');
})();
