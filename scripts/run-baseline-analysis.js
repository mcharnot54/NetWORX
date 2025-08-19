#!/usr/bin/env node

const http = require('http');

const postData = JSON.stringify({
  networkFootprintKey: 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx',
  historicalSalesKey: 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/s3/analyze-baseline',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 60000 // 60 second timeout
};

console.log('Starting baseline analysis...');
console.log('Network Footprint: Network Footprint and Capacity-Active Skus-Upload (2).xlsx');
console.log('Historical Sales: Historial Sales Data Continuum Datasets 050125 (3).xlsx');
console.log('---');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n=== BASELINE ANALYSIS RESULTS ===');
      
      if (result.success) {
        const summary = result.results.summary;
        const calcs = result.results.calculations;
        
        console.log('\n📊 SUMMARY METRICS:');
        console.log(`• Total Inventory Value: $${summary.totalInventoryValue.toLocaleString()}`);
        console.log(`• Total Units: ${summary.totalUnits.toLocaleString()}`);
        console.log(`• Total COGS: $${summary.totalCOGS.toLocaleString()}`);
        console.log(`• Total Pallets: ${summary.totalPallets.toLocaleString()}`);
        console.log(`• DSO (Days Sales Outstanding): ${summary.dsoCalculation.toFixed(1)} days`);
        console.log(`• Matched Items: ${summary.matchedItems.toLocaleString()}`);
        console.log(`• Unmatched Items: ${summary.unmatchedItems.toLocaleString()}`);
        
        console.log('\n📋 DETAILED BREAKDOWN:');
        console.log(`Network Footprint: ${calcs.networkFootprint.totalItems.toLocaleString()} items`);
        console.log(`Historical Sales: ${calcs.historicalSales.totalItems.toLocaleString()} records`);
        console.log(`Matched Calculations: ${calcs.matched.items.length.toLocaleString()} items`);
        
        console.log('\n✅ Analysis completed successfully!');
        
        // Show some sample matched items
        if (calcs.matched.items.length > 0) {
          console.log('\n📝 Sample Matched Items (first 5):');
          calcs.matched.items.slice(0, 5).forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.itemCode}: ${item.networkUnits.toLocaleString()} units, $${item.inventoryValue.toLocaleString()} inventory, ${item.pallets} pallets`);
          });
        }
        
      } else {
        console.error('❌ Analysis failed:', result.error);
        if (result.details) {
          console.error('Details:', result.details);
        }
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

req.on('timeout', () => {
  console.error('Request timed out after 60 seconds');
  req.destroy();
});

req.write(postData);
req.end();
