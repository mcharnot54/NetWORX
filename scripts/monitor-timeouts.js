#!/usr/bin/env node

const http = require('http');

const endpoints = [
  { path: '/', name: 'Main Page', timeout: 5000 },
  { path: '/api/health', name: 'Health Check', timeout: 3000 },
  { path: '/api/simple-health', name: 'Simple Health', timeout: 2000 },
  { path: '/api/status', name: 'Status Check', timeout: 3000 },
  { path: '/api/current-baseline-costs', name: 'Baseline Costs', timeout: 10000 },
  { path: '/api/db-status', name: 'Database Status', timeout: 5000 }
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get({
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      timeout: endpoint.timeout
    }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint: endpoint.name,
          status: res.statusCode,
          responseTime,
          success: res.statusCode === 200,
          error: null
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: endpoint.name,
        status: 'TIMEOUT',
        responseTime: endpoint.timeout,
        success: false,
        error: `Timeout after ${endpoint.timeout}ms`
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint: endpoint.name,
        status: 'ERROR',
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });
  });
}

async function runTests() {
  console.log('🔍 Testing NetWORX Essentials endpoints...\n');
  
  const results = [];
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const time = result.responseTime + 'ms';
    console.log(`${status} ${result.endpoint}: ${result.status} (${time})`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const avgResponseTime = Math.round(
    results.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / 
    Math.max(1, successful)
  );
  
  console.log(`   Successful: ${successful}/${results.length}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Average Response Time: ${avgResponseTime}ms`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some endpoints are experiencing issues!');
    process.exit(1);
  } else {
    console.log('\n✅ All endpoints are responding normally!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('❌ Monitoring script failed:', error.message);
  process.exit(1);
});
