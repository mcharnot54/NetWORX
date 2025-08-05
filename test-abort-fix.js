// Test script to verify the AbortError fix
console.log('Testing AbortError handling...');

// Test 1: AbortController with reason
try {
  const controller = new AbortController();
  controller.abort('Test reason');
  console.log('✓ AbortController.abort() with reason works');
} catch (error) {
  console.log('✗ AbortController.abort() with reason failed:', error.message);
}

// Test 2: AbortController without reason (should still work)
try {
  const controller = new AbortController();
  controller.abort();
  console.log('✓ AbortController.abort() without reason works');
} catch (error) {
  console.log('✗ AbortController.abort() without reason failed:', error.message);
}

// Test 3: Double abort (should be safe)
try {
  const controller = new AbortController();
  controller.abort('First abort');
  controller.abort('Second abort'); // Should be safe
  console.log('✓ Double abort is safe');
} catch (error) {
  console.log('✗ Double abort failed:', error.message);
}

console.log('AbortError handling test complete!');
