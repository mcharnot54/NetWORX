// HMR Error Handler for Cloud Environments
(function() {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if we're in development mode and likely in a cloud environment
  const isDevelopment = window.location.hostname.includes('fly.dev') ||
                       window.location.hostname.includes('vercel.app') ||
                       window.location.hostname.includes('netlify.app') ||
                       window.location.search.includes('reload=');

  if (!isDevelopment) {
    return;
  }

  // Override the original fetch for HMR requests
  const originalFetch = window.fetch;
  let hmrErrorCount = 0;
  const MAX_HMR_ERRORS = 2; // Reduced threshold

  window.fetch = function(resource, options) {
    // Check if this is an HMR-related request
    const url = typeof resource === 'string' ? resource : resource?.url;
    if (!url) {
      return originalFetch.apply(this, arguments);
    }

    const isHMRRequest = url.includes('_next/static') ||
                        url.includes('webpack') ||
                        url.includes('hot-update') ||
                        url.includes('reload=') ||
                        url.includes('hmrM');

    if (isHMRRequest) {
      return originalFetch.apply(this, arguments)
        .catch(error => {
          // Only count TypeError: Failed to fetch errors
          if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            hmrErrorCount++;
            console.warn(`HMR fetch failed (${hmrErrorCount}/${MAX_HMR_ERRORS}):`, error.message);
          } else {
            console.warn('HMR error (not counted):', error.message);
            // Return original error for other types
            return Promise.reject(error);
          }

          // If we've had too many HMR errors, suggest a refresh
          if (hmrErrorCount >= MAX_HMR_ERRORS) {
            console.warn('Multiple HMR failures detected. Consider refreshing the page.');
            
            // Show a subtle notification
            if (!document.getElementById('hmr-error-notice')) {
              const notice = document.createElement('div');
              notice.id = 'hmr-error-notice';
              notice.innerHTML = `
                <div style="
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #fef3c7;
                  border: 2px solid #f59e0b;
                  border-radius: 8px;
                  padding: 12px 16px;
                  z-index: 10000;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  font-size: 14px;
                  color: #92400e;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                  max-width: 300px;
                ">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-weight: 600;">⚠️ Hot Reload Issues</span>
                  </div>
                  <div style="font-size: 12px; margin-bottom: 8px;">
                    Code changes may not update automatically.
                  </div>
                  <button onclick="window.location.reload()" style="
                    background: #f59e0b;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    margin-right: 8px;
                  ">
                    Refresh Page
                  </button>
                  <button onclick="this.parentElement.parentElement.remove()" style="
                    background: transparent;
                    color: #92400e;
                    border: 1px solid #d97706;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-size: 12px;
                    cursor: pointer;
                  ">
                    Dismiss
                  </button>
                </div>
              `;
              document.body.appendChild(notice);

              // Auto-dismiss after 10 seconds
              setTimeout(() => {
                if (document.getElementById('hmr-error-notice')) {
                  document.getElementById('hmr-error-notice').remove();
                }
              }, 10000);
            }
            
            // Reset counter after showing notice
            hmrErrorCount = 0;
          }

          // Return a resolved promise to prevent further errors
          return Promise.resolve(new Response('', { status: 200 }));
        });
    }

    // For non-HMR requests, use original behavior
    return originalFetch.apply(this, arguments);
  };

  // Reset error count on successful page loads
  window.addEventListener('load', () => {
    hmrErrorCount = 0;
    const notice = document.getElementById('hmr-error-notice');
    if (notice) {
      notice.remove();
    }
  });

  // Handle WebSocket connection errors for HMR
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new originalWebSocket(url, protocols);
    
    ws.addEventListener('error', (event) => {
      if (url.includes('_next/webpack-hmr')) {
        console.warn('HMR WebSocket connection failed. Hot reloading may not work properly.');
      }
    });

    return ws;
  };

  // Global error handler to suppress AbortErrors from cancelled requests
  window.addEventListener('error', (event) => {
    const error = event.error;
    if (error && error.name === 'AbortError' &&
        (error.message?.includes('cancelled') || error.message?.includes('aborted without reason'))) {
      console.debug('Suppressed AbortError from cancelled request:', error.message);
      event.preventDefault();
      return false;
    }
  });

  // Handle unhandled promise rejections for AbortErrors
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    if (error && error.name === 'AbortError' &&
        (error.message?.includes('cancelled') || error.message?.includes('aborted without reason'))) {
      console.debug('Suppressed unhandled AbortError rejection:', error.message);
      event.preventDefault();
      return false;
    }
  });

  console.log('HMR error handler and AbortError suppression initialized for cloud environment');
})();
