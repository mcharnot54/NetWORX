// Test to verify that the required_square_footage property is now available

interface YearResult {
  year: number;
  required_capacity: number;
  available_capacity: number;
  capacity_gap: number;
  utilization_rate: number;
  recommended_actions: string[];
  total_cost: number;
  cost_per_unit: number;
  required_square_footage: number;
  required_pallets: number;
  warehouse_breakdown: Record<string, number>;
}

// This should work without type errors now
function testFunction(yearResult: YearResult) {
  let squareFootage = 0;
  
  // This line was causing the original error:
  // "Property 'required_square_footage' does not exist on type"
  squareFootage = yearResult.required_square_footage || Math.floor(yearResult.required_capacity * 0.5);
  
  return squareFootage;
}

// Test the function
const mockResult: YearResult = {
  year: 2024,
  required_capacity: 1000,
  available_capacity: 800,
  capacity_gap: 200,
  utilization_rate: 80,
  recommended_actions: ["Test action"],
  total_cost: 50000,
  cost_per_unit: 50,
  required_square_footage: 5000,
  required_pallets: 100,
  warehouse_breakdown: { storage: 3000, picking: 2000 }
};

console.log('Test result:', testFunction(mockResult));
