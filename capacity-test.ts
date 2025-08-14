// Test to confirm the capacity analysis type fix

import { CapacityOptimizationResult } from './lib/optimization-algorithms';

// This should work now without type errors
function testCapacityAnalysis() {
  const mockResult: CapacityOptimizationResult = {
    yearly_results: [{
      year: 2024,
      required_capacity: 1000,
      available_capacity: 800,
      capacity_gap: 200,
      utilization_rate: 80,
      recommended_actions: ["Test action"],
      total_cost: 50000,
      cost_per_unit: 50,
      // These properties should now be available:
      required_square_footage: 5000,
      required_pallets: 100,
      warehouse_breakdown: { storage: 3000, picking: 2000 }
    }],
    total_investment: 100000,
    optimization_score: 85,
    recommendations: ["Test recommendation"]
  };

  // Test the line that was originally failing:
  const yearResult = mockResult.yearly_results[0];
  let squareFootage = 0;
  
  // This line caused the original error but should work now:
  squareFootage = yearResult.required_square_footage || Math.floor(yearResult.required_capacity * 0.5);
  
  console.log('Test passed! Square footage:', squareFootage);
  return squareFootage;
}

testCapacityAnalysis();
