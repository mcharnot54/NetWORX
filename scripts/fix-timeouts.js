#!/usr/bin/env node

/**
 * Quick timeout fix script - runs emergency timeout fixes
 * Usage: node scripts/fix-timeouts.js
 */

const http = require('http');

const runEmergencyFix = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/emergency-fix',
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

const checkHealth = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/emergency-fix',
      method: 'GET',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

const main = async () => {
  console.log('🔧 NetWORX Essentials - Timeout Emergency Fix');
  console.log('================================================');
  console.log('');

  try {
    // First check current health
    console.log('📊 Checking current system health...');
    const healthResponse = await checkHealth();
    
    if (healthResponse.success) {
      const health = healthResponse.health;
      console.log(`Status: ${health.status.toUpperCase()}`);
      console.log(`Memory: ${health.memory}`);
      console.log(`Uptime: ${Math.round(health.uptime / 60)} minutes`);
      
      if (health.issues.length > 0) {
        console.log('\n⚠️  Issues detected:');
        health.issues.forEach(issue => console.log(`   • ${issue}`));
      }
      
      // Run emergency fix if needed
      if (health.status === 'critical' || health.status === 'degraded') {
        console.log('\n🚨 Running emergency timeout fix...');
        const fixResponse = await runEmergencyFix();
        
        if (fixResponse.success) {
          const report = fixResponse.report;
          console.log(`\n✅ Emergency fix completed!`);
          console.log(`System Health: ${report.systemHealth}`);
          
          if (report.fixes.length > 0) {
            console.log('\n🔧 Applied fixes:');
            report.fixes.forEach(fix => console.log(`   ${fix}`));
          }
          
          if (report.criticalIssues.length > 0) {
            console.log('\n🚨 Critical issues found:');
            report.criticalIssues.forEach(issue => console.log(`   • ${issue}`));
          }
          
          if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => console.log(`   • ${rec}`));
          }
        } else {
          console.error('❌ Emergency fix failed:', fixResponse.error || 'Unknown error');
        }
      } else {
        console.log('\n✅ System health is good - no emergency fix needed');
      }
    } else {
      console.error('❌ Health check failed:', healthResponse.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure the development server is running:');
      console.log('   npm run dev');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 The server might be unresponsive. Try restarting it:');
      console.log('   Kill the current dev server and run: npm run dev');
    }
    
    process.exit(1);
  }
  
  console.log('\n✨ Timeout fix script completed');
};

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
