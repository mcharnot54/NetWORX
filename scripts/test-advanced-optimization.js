#!/usr/bin/env node

const http = require('http');

const testData = JSON.stringify({
  scenario_id: 1,
  optimization_type: 'network_optimization'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/advanced-optimization',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  },
  timeout: 60000
};

console.log('🚀 Testing Advanced MIP Optimization System');
console.log('Using Mixed Integer Programming for MUCH HIGHER savings...');
console.log('Expected savings target: 35-50% of transportation costs');
console.log('---');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ ADVANCED MIP OPTIMIZATION RESULTS');
        console.log('');
        
        const summary = result.optimization_summary;
        console.log('🎯 BASELINE VS OPTIMIZED:');
        console.log(`- Current Transport Baseline: ${summary.baseline_transport_cost}`);
        console.log(`- Optimized Transport Cost: ${summary.optimized_transport_cost}`);
        console.log(`- Projected Annual Savings: ${summary.projected_annual_savings}`);
        console.log(`- Savings Percentage: ${summary.savings_percentage} 🔥`);
        console.log('');
        
        console.log('🏭 NETWORK OPTIMIZATION:');
        console.log(`- Facilities Opened: ${summary.facilities_opened}`);
        console.log(`- Service Level Achieved: ${summary.service_level_achieved}`);
        console.log(`- Warehouse Utilization: ${summary.warehouse_utilization}`);
        console.log(`- Solver: ${summary.solver_used}`);
        console.log(`- Total Solve Time: ${summary.total_solve_time}`);
        console.log('');
        
        const baseline = result.result.baseline_integration;
        console.log('💰 BASELINE INTEGRATION:');
        console.log(`- Current Baseline: $${baseline.current_transport_baseline.toLocaleString()}`);
        console.log(`- Optimized Cost: $${baseline.optimized_transport_cost.toLocaleString()}`);
        console.log(`- Savings: $${baseline.projected_savings.toLocaleString()}`);
        console.log(`- Percentage: ${baseline.savings_percentage.toFixed(1)}%`);
        console.log('');
        
        if (baseline.savings_percentage > 30) {
          console.log('🎉 SUCCESS: Achieved target of 30%+ savings!');
        } else {
          console.log('⚠️  Lower than expected savings - may need parameter tuning');
        }
        
        console.log('');
        console.log('🚛 TRANSPORT FACILITIES:');
        result.result.transportation.open_facilities.forEach((facility, index) => {
          console.log(`${index + 1}. ${facility}`);
        });
        
      } else {
        console.error('❌ Optimization failed:', result.error);
        if (result.details) {
          console.error('Details:', result.details);
        }
      }
      
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.log('Raw response (first 1000 chars):', data.substring(0, 1000));
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.on('timeout', () => {
  console.error('Request timed out after 60 seconds');
  req.destroy();
});

req.write(testData);
req.end();
