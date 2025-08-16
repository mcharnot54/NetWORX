// Debug utility for monitoring fetch requests and errors
(function() {
  if (typeof window === 'undefined') return;

  // Only enable in development
  const isDev = window.location.hostname === 'localhost' || 
               window.location.hostname.includes('fly.dev') ||
               window.location.search.includes('debug=true');

  if (!isDev) return;

  let fetchCount = 0;
  let errorCount = 0;
  const requestLog = [];

  const originalFetch = window.fetch;
  
  window.fetch = function(resource, options) {
    const url = typeof resource === 'string' ? resource : resource?.url;
    const requestId = ++fetchCount;
    
    const logEntry = {
      id: requestId,
      url: url,
      method: options?.method || 'GET',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    requestLog.push(logEntry);
    
    // Keep only last 50 requests
    if (requestLog.length > 50) {
      requestLog.shift();
    }

    console.debug(`🌐 Fetch #${requestId}: ${logEntry.method} ${url}`);

    return originalFetch.apply(this, arguments)
      .then(response => {
        logEntry.status = `${response.status} ${response.statusText}`;
        logEntry.ok = response.ok;
        console.debug(`✅ Fetch #${requestId}: ${response.status} ${response.statusText}`);
        return response;
      })
      .catch(error => {
        errorCount++;
        logEntry.status = `ERROR: ${error.name} - ${error.message}`;
        logEntry.error = error;
        
        // Only log actual errors, not suppressed ones
        if (!(error.name === 'AbortError' || error.message.includes('aborted'))) {
          console.debug(`❌ Fetch #${requestId}: ${error.name} - ${error.message}`);
        } else {
          console.debug(`⏹️ Fetch #${requestId}: Request aborted (expected)`);
        }
        
        throw error;
      });
  };

  // Add debug methods to window for manual inspection
  window.__fetchDebug = {
    getStats: () => ({
      totalRequests: fetchCount,
      totalErrors: errorCount,
      errorRate: fetchCount > 0 ? ((errorCount / fetchCount) * 100).toFixed(2) + '%' : '0%'
    }),
    
    getRecentRequests: (count = 10) => {
      return requestLog.slice(-count);
    },
    
    getErrors: () => {
      return requestLog.filter(req => req.error);
    },
    
    clearLog: () => {
      requestLog.length = 0;
      fetchCount = 0;
      errorCount = 0;
      console.log('🧹 Fetch debug log cleared');
    },
    
    showReport: () => {
      const stats = window.__fetchDebug.getStats();
      const errors = window.__fetchDebug.getErrors();
      
      console.group('📊 Fetch Debug Report');
      console.log('Statistics:', stats);
      
      if (errors.length > 0) {
        console.group('Recent Errors:');
        errors.forEach(req => {
          console.log(`${req.timestamp}: ${req.method} ${req.url} - ${req.status}`);
        });
        console.groupEnd();
      } else {
        console.log('✅ No recent errors');
      }
      
      console.groupEnd();
    }
  };

  console.log('🔍 Fetch debug monitoring enabled. Use window.__fetchDebug for inspection.');
})();
