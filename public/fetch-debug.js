// Minimal fetch debug utility - removed fetch wrapping that was causing HMR issues
(function() {
  if (typeof window === 'undefined') return;

  // Only add debug methods to window for manual inspection, no fetch wrapping
  window.__fetchDebug = {
    getStats: () => ({
      note: 'Fetch wrapping disabled to prevent HMR issues'
    }),
    
    showReport: () => {
      console.group('📊 Fetch Debug Report');
      console.log('Fetch monitoring disabled to prevent HMR interference');
      console.groupEnd();
    }
  };

  console.log('🔍 Minimal fetch debug utility loaded (no wrapping)');
})();
