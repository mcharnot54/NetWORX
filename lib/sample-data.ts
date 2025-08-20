// Sample data for testing the visualizer
export const sampleVisualizerData = {
  "scenarios": [
    {
      "nodes": 3,
      "kpis": {
        "weighted_service_level": 0.97,
        "total_transport_cost_all_years": 1234567,
        "total_network_cost_all_years": 2345678
      },
      "transport": {
        "perYear": [
          {
            "year": 2025,
            "open_facilities": ["Dallas, TX", "Chicago, IL"],
            "assignments": [
              { "Facility": "Dallas, TX", "Destination": "Austin, TX", "Demand": 1000, "Cost": 2.5, "Distance": 200 },
              { "Facility": "Dallas, TX", "Destination": "Houston, TX", "Demand": 1500, "Cost": 2.8, "Distance": 240 },
              { "Facility": "Chicago, IL", "Destination": "Milwaukee, WI", "Demand": 800, "Cost": 2.2, "Distance": 90 },
              { "Facility": "Chicago, IL", "Destination": "Detroit, MI", "Demand": 1200, "Cost": 2.6, "Distance": 280 }
            ],
            "facility_metrics": [
              { "Facility": "Dallas, TX", "Capacity": 1500000 },
              { "Facility": "Chicago, IL", "Capacity": 1200000 }
            ]
          },
          {
            "year": 2026,
            "open_facilities": ["Dallas, TX", "Chicago, IL", "Reno, NV"],
            "assignments": [
              { "Facility": "Dallas, TX", "Destination": "Austin, TX", "Demand": 1100, "Cost": 2.5, "Distance": 200 },
              { "Facility": "Dallas, TX", "Destination": "Houston, TX", "Demand": 1600, "Cost": 2.8, "Distance": 240 },
              { "Facility": "Chicago, IL", "Destination": "Milwaukee, WI", "Demand": 900, "Cost": 2.2, "Distance": 90 },
              { "Facility": "Reno, NV", "Destination": "San Francisco, CA", "Demand": 1000, "Cost": 3.2, "Distance": 220 },
              { "Facility": "Reno, NV", "Destination": "Los Angeles, CA", "Demand": 800, "Cost": 4.1, "Distance": 450 }
            ],
            "facility_metrics": [
              { "Facility": "Dallas, TX", "Capacity": 1500000 },
              { "Facility": "Chicago, IL", "Capacity": 1200000 },
              { "Facility": "Reno, NV", "Capacity": 1000000 }
            ]
          }
        ]
      }
    },
    {
      "nodes": 4,
      "kpis": {
        "weighted_service_level": 0.98,
        "total_transport_cost_all_years": 1156789,
        "total_network_cost_all_years": 2567890
      },
      "transport": {
        "perYear": [
          {
            "year": 2025,
            "open_facilities": ["Dallas, TX", "Chicago, IL", "Atlanta, GA"],
            "assignments": [
              { "Facility": "Dallas, TX", "Destination": "Austin, TX", "Demand": 800, "Cost": 2.5, "Distance": 200 },
              { "Facility": "Dallas, TX", "Destination": "Houston, TX", "Demand": 1200, "Cost": 2.8, "Distance": 240 },
              { "Facility": "Chicago, IL", "Destination": "Milwaukee, WI", "Demand": 700, "Cost": 2.2, "Distance": 90 },
              { "Facility": "Atlanta, GA", "Destination": "Miami, FL", "Demand": 900, "Cost": 3.5, "Distance": 660 }
            ],
            "facility_metrics": [
              { "Facility": "Dallas, TX", "Capacity": 1500000 },
              { "Facility": "Chicago, IL", "Capacity": 1200000 },
              { "Facility": "Atlanta, GA", "Capacity": 1100000 }
            ]
          },
          {
            "year": 2026,
            "open_facilities": ["Dallas, TX", "Chicago, IL", "Atlanta, GA", "Reno, NV"],
            "assignments": [
              { "Facility": "Dallas, TX", "Destination": "Austin, TX", "Demand": 900, "Cost": 2.5, "Distance": 200 },
              { "Facility": "Chicago, IL", "Destination": "Milwaukee, WI", "Demand": 800, "Cost": 2.2, "Distance": 90 },
              { "Facility": "Atlanta, GA", "Destination": "Miami, FL", "Demand": 1000, "Cost": 3.5, "Distance": 660 },
              { "Facility": "Reno, NV", "Destination": "San Francisco, CA", "Demand": 1100, "Cost": 3.2, "Distance": 220 }
            ],
            "facility_metrics": [
              { "Facility": "Dallas, TX", "Capacity": 1500000 },
              { "Facility": "Chicago, IL", "Capacity": 1200000 },
              { "Facility": "Atlanta, GA", "Capacity": 1100000 },
              { "Facility": "Reno, NV", "Capacity": 1000000 }
            ]
          }
        ]
      }
    }
  ],
  "locations": {
    "Dallas, TX": { "lat": 32.7767, "lng": -96.7970 },
    "Chicago, IL": { "lat": 41.8781, "lng": -87.6298 },
    "Reno, NV": { "lat": 39.5296, "lng": -119.8138 },
    "Atlanta, GA": { "lat": 33.7490, "lng": -84.3880 },
    "Austin, TX": { "lat": 30.2672, "lng": -97.7431 },
    "Houston, TX": { "lat": 29.7604, "lng": -95.3698 },
    "Milwaukee, WI": { "lat": 43.0389, "lng": -87.9065 },
    "Detroit, MI": { "lat": 42.3314, "lng": -83.0458 },
    "San Francisco, CA": { "lat": 37.7749, "lng": -122.4194 },
    "Los Angeles, CA": { "lat": 34.0522, "lng": -118.2437 },
    "Miami, FL": { "lat": 25.7617, "lng": -80.1918 }
  },
  "config": {
    "transportation": {
      "cost_per_mile": 2.5
    }
  }
};

// Function to load sample data into localStorage
export function loadSampleData() {
  localStorage.setItem('lastRun', JSON.stringify(sampleVisualizerData));
  console.log('Sample data loaded into localStorage.lastRun');
}
