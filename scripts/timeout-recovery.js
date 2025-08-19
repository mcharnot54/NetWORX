#!/usr/bin/env node

// Quick timeout recovery and server responsiveness test
const http = require('http');

async function testEndpoint(path, timeout = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get({
      hostname: 'localhost',
      port: 3000,
      path: path,
      timeout: timeout
    }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          responseTime,
          success: res.statusCode === 200,
          data: data.substring(0, 100) // First 100 chars
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        path,
        status: 'TIMEOUT',
        responseTime: timeout,
        success: false,
        error: `Timeout after ${timeout}ms`
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        status: 'ERROR',
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });
  });
}

async function main() {
  console.log('🔍 Testing NetWORX Essentials timeout recovery...\n');
  
  const endpoints = [
    '/api/emergency-health',
    '/api/fast-ping',
    '/api/simple-health',
    '/api/health'
  ];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, 5000);
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint}: ${result.status} (${result.responseTime}ms)`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.data) {
      console.log(`   Response: ${result.data}...`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Timeout recovery test completed');
}

main().catch(console.error);
