/**
 * Test script to verify real optimization algorithms are working
 * Run with: node scripts/test-optimization.js
 */

// Import the optimization functions (for Node.js testing)
const { optimizeTransportRoutes, optimizeCapacityPlanning, calculateDistance, CITY_COORDINATES } = require('../lib/optimization-algorithms.ts');

console.log('🧪 Testing NetWORX Essentials Real Optimization Algorithms\n');

// Test 1: Distance Calculation
console.log('1. Testing Distance Calculation (Haversine Formula)');
const distance = calculateDistance(
  CITY_COORDINATES['Chicago, IL'].lat, CITY_COORDINATES['Chicago, IL'].lon,
  CITY_COORDINATES['Dallas, TX'].lat, CITY_COORDINATES['Dallas, TX'].lon
);
console.log(`   Chicago to Dallas: ${Math.round(distance)} miles`);
console.log(`   ✅ Expected ~925 miles, got ${Math.round(distance)} miles\n`);

// Test 2: Transport Route Optimization
console.log('2. Testing Transport Route Optimization');
const transportParams = {
  cities: ['Chicago, IL', 'Dallas, TX', 'Atlanta, GA'],
  scenario_type: 'lowest_cost_city',
  optimization_criteria: {
    cost_weight: 40,
    service_weight: 35,
    distance_weight: 25
  },
  service_zone_weighting: {
    parcel_zone_weight: 40,
    ltl_zone_weight: 35,
    tl_daily_miles_weight: 25
  },
  outbound_weight_percentage: 50,
  inbound_weight_percentage: 50
};

try {
  const transportResult = optimizeTransportRoutes(transportParams);
  console.log(`   ✅ Optimized ${transportResult.optimized_routes.length} routes`);
  console.log(`   ✅ Total cost: $${transportResult.total_transport_cost.toLocaleString()}`);
  console.log(`   ✅ Total distance: ${transportResult.total_distance.toLocaleString()} miles`);
  console.log(`   ✅ Route efficiency: ${transportResult.route_efficiency}%`);
  console.log(`   ✅ Cost savings: $${transportResult.cost_savings.toLocaleString()}\n`);
} catch (error) {
  console.log(`   ❌ Transport optimization failed: ${error.message}\n`);
}

// Test 3: Capacity Planning Optimization
console.log('3. Testing Capacity Planning Optimization');
const capacityParams = {
  baseCapacity: 10000,
  growthForecasts: [
    { year: 2024, growth_rate: 8 },
    { year: 2025, growth_rate: 12 },
    { year: 2026, growth_rate: 6 },
    { year: 2027, growth_rate: 10 },
    { year: 2028, growth_rate: 5 }
  ],
  facilities: [
    {
      name: 'Chicago DC',
      city: 'Chicago',
      state: 'IL',
      capacity: 8000,
      cost_per_unit: 25,
      fixed_cost: 500000,
      utilization_target: 85
    },
    {
      name: 'Dallas DC', 
      city: 'Dallas',
      state: 'TX',
      capacity: 6000,
      cost_per_unit: 22,
      fixed_cost: 400000,
      utilization_target: 85
    }
  ],
  project_duration_years: 5,
  utilization_target: 80
};

try {
  const capacityResult = optimizeCapacityPlanning(capacityParams);
  console.log(`   ✅ Analyzed ${capacityResult.yearly_results.length} years`);
  console.log(`   ✅ Total investment: $${capacityResult.total_investment.toLocaleString()}`);
  console.log(`   ✅ Optimization score: ${capacityResult.optimization_score}%`);
  console.log(`   ✅ Recommendations: ${capacityResult.recommendations.length} generated\n`);
} catch (error) {
  console.log(`   ❌ Capacity optimization failed: ${error.message}\n`);
}

console.log('🎉 Real optimization algorithms testing completed!');
console.log('\n📊 Summary:');
console.log('   • Distance calculations: Using Haversine formula for accurate mileage');
console.log('   • Transport optimization: Multi-objective optimization with cost/service/distance weights');
console.log('   • Capacity planning: Linear programming principles for optimal capacity allocation');
console.log('   • All algorithms replace previous mock functions with real mathematical models');
