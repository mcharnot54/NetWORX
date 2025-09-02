const { RealDataTransportOptimizer } = require('../lib/real-data-transport-optimizer');

async function testCityExtraction() {
  try {
    console.log('🔍 Testing city extraction from route data...');
    
    // Get actual route data
    const routeData = await RealDataTransportOptimizer.getActualRouteData();
    console.log(`📊 Found ${routeData.length} routes from transport files`);
    
    // Show first few routes for debugging
    console.log('\n📋 Sample route data:');
    routeData.slice(0, 5).forEach((route, index) => {
      console.log(`Route ${index + 1}:`, {
        origin: route.origin,
        destination: route.destination,
        route_pair: route.route_pair,
        cost: route.total_cost
      });
    });
    
    // Extract cities using the validation logic
    const actualCities = RealDataTransportOptimizer.extractActualCities(routeData);
    console.log(`\n🏙️ Extracted ${actualCities.length} valid cities:`);
    actualCities.forEach((city, index) => {
      console.log(`  ${index + 1}. ${city}`);
    });
    
    if (actualCities.length === 0) {
      console.log('\n❌ No valid cities found - this explains why scenarios are failing!');
      console.log('   The route extraction is likely picking up company names instead of cities.');
    } else {
      console.log('\n✅ City extraction successful');
    }
    
  } catch (error) {
    console.error('❌ Error testing city extraction:', error.message);
  }
}

testCityExtraction();
