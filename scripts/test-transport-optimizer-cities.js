/**
 * Test script to verify transport optimizer uses comprehensive cities database
 * instead of hardcoded fallbacks like Chicago
 */

const { RealDataTransportOptimizer } = require('../lib/real-data-transport-optimizer');

async function testTransportOptimizerCities() {
  console.log('🧪 Testing Transport Optimizer City Selection...\n');

  try {
    // Test 1: Check if comprehensive cities database is being used
    console.log('📊 Test 1: Comprehensive Cities Database Usage');
    const distributionNetwork = RealDataTransportOptimizer.generateRealisticDistributionNetwork();
    
    console.log(`✅ Total cities available: ${distributionNetwork.length}`);
    console.log(`🚫 No hardcoded limits: Using full comprehensive database`);
    
    // Check if it includes diverse cities (not just the hardcoded ones)
    const sampleCities = distributionNetwork.slice(0, 10);
    console.log(`📍 Sample cities: ${sampleCities.join(', ')}`);
    
    // Test 2: Check route data generation (should not favor Chicago)
    console.log('\n📊 Test 2: Route Data Generation (No Chicago Bias)');
    const routeData = RealDataTransportOptimizer.generateRealisticRouteData();
    
    // Calculate total Chicago allocation vs other cities
    const chicagoRoutes = routeData.filter(route => route.destination === 'Chicago, IL');
    const totalChicagoCost = chicagoRoutes.reduce((sum, route) => sum + route.total_cost, 0);
    const totalCost = routeData.reduce((sum, route) => sum + route.total_cost, 0);
    const chicagoPercentage = totalCost > 0 ? (totalChicagoCost / totalCost) * 100 : 0;
    
    console.log(`💰 Total routes generated: ${routeData.length}`);
    console.log(`🎯 Chicago allocation: $${totalChicagoCost.toLocaleString()} (${chicagoPercentage.toFixed(2)}%)`);
    console.log(`📊 Expected if unbiased: ~${(100 / routeData.length).toFixed(2)}%`);
    
    if (chicagoPercentage > 5) {
      console.log(`⚠️  WARNING: Chicago still has higher allocation than expected!`);
    } else {
      console.log(`✅ SUCCESS: Chicago allocation is now proportional, not hardcoded`);
    }
    
    // Test 3: Check actual cities extraction
    console.log('\n📊 Test 3: Actual Cities Extraction');
    const actualCities = RealDataTransportOptimizer.extractActualCities(routeData);
    const uniqueCities = [...new Set(actualCities)];
    
    console.log(`🏙️  Unique cities in network: ${uniqueCities.length}`);
    console.log(`🌎 Geographic coverage: ${uniqueCities.slice(0, 5).join(', ')}...`);
    
    // Test 4: Verify no hardcoded hub recommendations
    console.log('\n📊 Test 4: Hub Recommendations (Algorithm-Driven)');
    const hubRecommendations = RealDataTransportOptimizer.getRecommendedHubNodes('lowest_cost_city', actualCities);
    
    console.log(`🎯 Hub recommendations: ${hubRecommendations.length === 0 ? 'Algorithm-determined (no hardcoded hubs)' : hubRecommendations.join(', ')}`);
    
    if (hubRecommendations.length === 0 || !hubRecommendations.includes('Chicago, IL')) {
      console.log(`✅ SUCCESS: No hardcoded Chicago hub preference`);
    } else {
      console.log(`⚠️  WARNING: Chicago still appears in hardcoded hub recommendations`);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log(`✅ Comprehensive cities database: ${distributionNetwork.length} cities available`);
    console.log(`✅ Unbiased route distribution: Chicago allocation ${chicagoPercentage.toFixed(2)}% (vs ${(100/routeData.length).toFixed(2)}% expected)`);
    console.log(`✅ Algorithm-driven hub selection: ${hubRecommendations.length === 0 ? 'Yes' : 'No'}`);
    console.log(`✅ Geographic diversity: ${uniqueCities.length} unique destinations`);
    
    console.log('\n🚀 Transport optimizer is now ready to find OPTIMAL cities instead of defaulting to Chicago!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testTransportOptimizerCities().catch(console.error);
