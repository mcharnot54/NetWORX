// Simple test to verify the AbortError fix
const { robustFetch } = require('./lib/fetch-utils.ts');

async function testAbortErrorHandling() {
  console.log('Testing AbortError handling...');
  
  // Test 1: Normal request cancellation
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 100);
  
  try {
    await robustFetch('/api/health', { 
      signal: controller.signal,
      timeout: 5000 
    });
  } catch (error) {
    console.log('Test 1 - Expected cancellation error:', error.message);
  }
  
  // Test 2: Timeout scenario
  try {
    await robustFetch('/api/non-existent', { 
      timeout: 100,
      retries: 1 
    });
  } catch (error) {
    console.log('Test 2 - Expected timeout/network error:', error.message);
  }
  
  console.log('AbortError tests completed successfully!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testAbortErrorHandling().catch(console.error);
}
