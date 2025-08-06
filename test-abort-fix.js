// Test script to verify AbortController fixes
// Run with: node test-abort-fix.js

// Simulate the abort error scenario
function testAbortControllerCleanup() {
  console.log('Testing AbortController cleanup...');
  
  const controller = new AbortController();
  
  // Add an event listener like the fetch-utils does
  const abortHandler = () => {
    console.log('Abort handler called');
  };
  
  controller.signal.addEventListener('abort', abortHandler, { once: true });
  
  // Test cleanup
  try {
    controller.abort();
    console.log('✓ AbortController abort() completed without error');
  } catch (error) {
    console.error('✗ Error during abort:', error);
  }
  
  // Test cleanup of event listener
  try {
    controller.signal.removeEventListener('abort', abortHandler);
    console.log('✓ Event listener cleanup completed without error');
  } catch (error) {
    console.error('✗ Error during event listener cleanup:', error);
  }
}

function testComponentUnmountScenario() {
  console.log('\nTesting component unmount scenario...');
  
  let abortController = null;
  let isCleanedUp = false;
  
  // Simulate useEffect setup
  const setup = () => {
    abortController = new AbortController();
    console.log('✓ AbortController created');
  };
  
  // Simulate useEffect cleanup
  const cleanup = () => {
    isCleanedUp = true;
    
    if (abortController && !abortController.signal.aborted) {
      try {
        abortController.abort();
        console.log('✓ Component cleanup abort() completed without error');
      } catch (error) {
        console.error('✗ Error during component cleanup abort:', error);
      }
    }
  };
  
  setup();
  cleanup();
}

// Run tests
testAbortControllerCleanup();
testComponentUnmountScenario();

console.log('\n✓ All abort controller tests completed');
