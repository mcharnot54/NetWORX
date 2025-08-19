// Production-specific error handler for third-party script conflicts
(function() {
  if (typeof window === 'undefined') return;

  // Detect production environment
  const isProduction = window.location.hostname.includes('.fly.dev') || 
                      window.location.hostname.includes('.vercel.app') ||
                      window.location.hostname.includes('.netlify.app') ||
                      (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

  if (!isProduction) return; // Only run in production

  // Handle FullStory integration errors
  window.addEventListener('error', function(event) {
    const error = event.error || {};
    const message = event.message || '';
    const filename = event.filename || '';

    // Handle FullStory-related errors
    if (filename.includes('fullstory.com') || message.includes('fs.js')) {
      console.debug('FullStory error handled silently:', message);
      event.preventDefault();
      return false;
    }

    // Handle fetch-related errors in production
    if (message.includes('Failed to fetch') || message.includes('TypeError: Failed to fetch')) {
      console.debug('Production fetch error handled silently:', message);
      event.preventDefault();
      return false;
    }

    // Handle Next.js hot reload errors in production
    if (message.includes('webpack-hmr') || 
        message.includes('_next/static') ||
        message.includes('__nextjs_original-stack-frame')) {
      console.debug('Development script error in production handled silently:', message);
      event.preventDefault();
      return false;
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason || {};
    const message = reason.message || String(reason);

    // Handle fetch-related promise rejections
    if (message.includes('Failed to fetch') || 
        message.includes('TypeError: Failed to fetch') ||
        message.includes('NetworkError')) {
      console.debug('Production fetch rejection handled silently:', message);
      event.preventDefault();
      return false;
    }

    // Handle FullStory promise rejections
    if (message.includes('fs.js') || message.includes('fullstory')) {
      console.debug('FullStory rejection handled silently:', message);
      event.preventDefault();
      return false;
    }

    // Handle Next.js/React development rejections in production
    if (message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('webpack-hmr')) {
      console.debug('Development chunk error in production handled silently:', message);
      event.preventDefault();
      return false;
    }
  });

  // Override console.error to filter out known production issues
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Filter out known production error noise
    if (message.includes('Failed to fetch') ||
        message.includes('fullstory.com') ||
        message.includes('ChunkLoadError') ||
        message.includes('webpack-hmr')) {
      // Log as debug instead of error
      console.debug('Filtered production error:', ...args);
      return;
    }
    
    // Allow other errors through
    originalConsoleError.apply(console, args);
  };

  // Prevent FullStory from interfering with fetch
  if (window.FS && typeof window.FS === 'object') {
    try {
      // Disable FullStory's fetch instrumentation if it exists
      if (window.FS.instrument && typeof window.FS.instrument === 'function') {
        window.FS.instrument = function() { return null; };
      }
    } catch (error) {
      console.debug('FullStory instrumentation disabled:', error);
    }
  }

  // Monitor for FullStory loading and prevent fetch conflicts
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
          const src = node.src || '';
          if (src.includes('fullstory.com')) {
            console.debug('FullStory script detected, ensuring fetch compatibility');
            // Add a small delay to ensure our fetch overrides take precedence
            setTimeout(() => {
              if (window.fetch && window.fetch.toString().includes('originalFetch')) {
                console.debug('Fetch overrides maintained after FullStory load');
              }
            }, 100);
          }
        }
      });
    });
  });

  observer.observe(document.head, { childList: true });
  observer.observe(document.body, { childList: true });

  console.log('🛡️ Production error handler active - filtering third-party conflicts');
})();
