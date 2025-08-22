#!/usr/bin/env node

// Script to trigger baseline extraction for Curriculum Associates data
const http = require('http');

async function triggerBaselineExtraction() {
  console.log('🎯 Starting Curriculum Associates baseline extraction...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/correct-multi-tab-extraction',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Baseline extraction completed!');
          console.log('Results:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
}

// Alternative: trigger run-baseline-extraction
async function triggerRunBaseline() {
  console.log('🎯 Triggering run-baseline-extraction...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/run-baseline-extraction',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ Run baseline extraction completed!');
          console.log('Results:', JSON.stringify(result, null, 2));
          resolve(result);
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });

    req.end();
  });
}

async function main() {
  try {
    console.log('Starting baseline extraction process...');
    
    // Try the multi-tab extraction first
    try {
      const result1 = await triggerBaselineExtraction();
      if (result1.success) {
        console.log('✅ Multi-tab extraction successful!');
        return;
      }
    } catch (error) {
      console.log('Multi-tab extraction failed, trying run-baseline...');
    }
    
    // If that fails, try the run-baseline-extraction
    const result2 = await triggerRunBaseline();
    if (result2.success) {
      console.log('✅ Run baseline extraction successful!');
    } else {
      console.log('❌ Both extraction methods failed');
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { triggerBaselineExtraction, triggerRunBaseline };
