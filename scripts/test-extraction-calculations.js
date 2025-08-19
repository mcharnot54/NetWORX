#!/usr/bin/env node

// Test script to verify the updated extraction calculations

console.log('🧪 Testing Updated Extraction Calculations...\n');

async function testExtractionAPI() {
  try {
    console.log('📡 Testing correct-multi-tab-extraction API...');
    
    const response = await fetch('http://localhost:3000/api/correct-multi-tab-extraction');
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ API Response successful\n');
      
      // UPS Analysis
      console.log('📦 UPS ANALYSIS:');
      console.log(`Total: ${data.results.ups.formatted} (${data.results.ups.tabs.length} tabs)`);
      data.results.ups.tabs.forEach(tab => {
        console.log(`  • ${tab.sheet_name}: ${tab.formatted} (${tab.cost_values} values)`);
      });
      console.log(`Expected: >$2.9M | Actual: $${(data.results.ups.total / 1000000).toFixed(2)}M\n`);
      
      // TL Analysis 
      console.log('🚛 TL ANALYSIS:');
      console.log(`Total: ${data.results.tl.formatted} (${data.results.tl.tabs.length} tabs)`);
      data.results.tl.tabs.forEach(tab => {
        console.log(`  • ${tab.sheet_name}: ${tab.formatted} (${tab.cost_values} values)`);
      });
      console.log(`Expected: All 3 tabs | Actual: ${data.results.tl.tabs.length} tabs\n`);
      
      // R&L Analysis
      console.log('🚚 R&L ANALYSIS:');
      console.log(`Total: ${data.results.rl.formatted} (${data.results.rl.tabs.length} tabs)`);
      data.results.rl.tabs.forEach(tab => {
        console.log(`  • ${tab.sheet_name}: ${tab.formatted} (${tab.cost_values} values, best column: "${tab.best_column}")`);
      });
      
      console.log('\n📊 SUMMARY:');
      console.log(`• UPS Status: ${data.results.ups.total > 2900000 ? '✅ Meets target' : '⚠️ Below target'}`);
      console.log(`• TL Status: ${data.results.tl.tabs.length >= 3 ? '✅ All tabs' : '⚠️ Missing tabs'}`);
      console.log(`• R&L Status: ${data.results.rl.total > 0 ? '✅ Extracting' : '❌ Not extracting'}`);
      
      console.log(`\n🎯 GRAND TOTAL: ${data.grand_total.formatted}`);
      
    } else {
      console.log('❌ API Error:', data.error);
    }
    
  } catch (error) {
    console.log('❌ Connection Error:', error.message);
  }
}

// Run the test
testExtractionAPI();
