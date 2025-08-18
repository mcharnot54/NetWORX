// Disable problematic hot reload features that cause fetch failures
(function() {
  if (typeof window === 'undefined') return;

  // Prevent Next.js from attempting hot reload fetches
  if (window.__NEXT_DATA__) {
    // Disable fast refresh
    if (window.__nextFastRefresh) {
      window.__nextFastRefresh = null;
    }
    
    // Disable RSC payload fetching that's causing errors
    if (window.__NEXT_P) {
      const originalFetch = window.__NEXT_P;
      window.__NEXT_P = [];
    }
  }

  // Override problematic fetch calls for development
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    
    // Block RSC payload fetches that are failing
    if (typeof url === 'string' && url.includes('reload=')) {
      console.log('🚫 Blocked problematic RSC payload fetch:', url);
      return Promise.resolve(new Response('{}', { status: 200 }));
    }
    
    // Allow normal API calls to proceed
    return originalFetch.apply(this, args);
  };

  // Disable WebSocket reconnection attempts
  if (window.WebSocket) {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      // Block hot reload WebSocket connections
      if (url && url.includes('_next/webpack-hmr')) {
        console.log('🚫 Blocked problematic HMR WebSocket:', url);
        // Return a dummy WebSocket that doesn't connect
        return {
          readyState: 3, // CLOSED
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {}
        };
      }
      return new originalWebSocket(url, protocols);
    };
  }

  console.log('🛡️ Hot reload blocking active - preventing fetch failures');
})();
