#!/usr/bin/env node

const http = require('http');

const testData = JSON.stringify({
  scenario_id: 1,
  optimization_type: 'multi_modal_optimization',
  cities: ['Littleton, MA', 'Chicago, IL', 'Dallas, TX', 'Atlanta, GA', 'Los Angeles, CA']
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/enhanced-transport-optimizer',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🚛 Testing Enhanced Transport Optimizer with Actual Baseline Data');
console.log('Using your verified transportation baseline:');
console.log('- UPS Parcel: $2.93M');
console.log('- TL Freight: $1.19M'); 
console.log('- R&L LTL: $2.44M');
console.log('- Total: $6.56M');
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
        console.log('✅ ENHANCED TRANSPORT OPTIMIZATION RESULTS');
        console.log('');
        console.log('📊 BASELINE DATA USED:');
        console.log(`- UPS Parcel: ${result.baseline_used.ups_parcel}`);
        console.log(`- TL Freight: ${result.baseline_used.tl_freight}`);
        console.log(`- R&L LTL: ${result.baseline_used.rl_ltl}`);
        console.log(`- Total Baseline: ${result.baseline_used.total_baseline}`);
        console.log('');
        
        const optResults = result.optimization_results;
        console.log('🎯 OPTIMIZATION RESULTS:');
        console.log(`- Total Baseline Cost: $${optResults.total_baseline_cost.toLocaleString()}`);
        console.log(`- Total Optimized Cost: $${optResults.total_optimized_cost.toLocaleString()}`);
        console.log(`- Total Savings: $${optResults.total_savings.toLocaleString()}`);
        console.log(`- Overall Savings %: ${optResults.overall_savings_percentage}%`);
        console.log('');
        
        console.log('🚀 OPTIMIZATION SCENARIOS:');
        optResults.optimization_scenarios.forEach((scenario, index) => {
          console.log(`${index + 1}. ${scenario.scenario_name}`);
          console.log(`   - Baseline: $${scenario.baseline_cost.toLocaleString()}`);
          console.log(`   - Optimized: $${scenario.optimized_cost.toLocaleString()}`);
          console.log(`   - Savings: $${scenario.savings.toLocaleString()} (${scenario.savings_percentage}%)`);
          console.log('');
        });
        
        console.log('📋 RECOMMENDED NEXT STEPS:');
        optResults.recommended_next_steps.forEach((step, index) => {
          console.log(`${index + 1}. ${step}`);
        });
        
        console.log('');
        console.log('📁 DATA SOURCES USED:');
        result.actual_data_sources.forEach((source, index) => {
          console.log(`${index + 1}. ${source}`);
        });
        
      } else {
        console.error('❌ Optimization failed:', result.error);
      }
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(testData);
req.end();
