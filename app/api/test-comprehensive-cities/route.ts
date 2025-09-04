import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { 
  COMPREHENSIVE_CITIES, 
  getCitiesByStateProvince,
  getCitiesByCountry,
  getAllUSCities,
  getAllCanadianCities,
  getCityCoordinates,
  searchCitiesByName,
  getTopCitiesByPopulation,
  CITY_COORDINATES_LOOKUP 
} from '@/lib/comprehensive-cities-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const test_type = searchParams.get('test');

    console.log('🌍 Testing Comprehensive North American Cities Database...');

    // Summary statistics
    const totalCities = COMPREHENSIVE_CITIES.length;
    const usCities = getAllUSCities();
    const canadianCities = getAllCanadianCities();

    // States/Provinces coverage
    const usStates = [...new Set(usCities.map(c => c.state_province))].sort();
    const canadianProvinces = [...new Set(canadianCities.map(c => c.state_province))].sort();

    // Population analysis
    const topUSCities = usCities.sort((a, b) => b.population - a.population).slice(0, 10);
    const topCanadianCities = canadianCities.sort((a, b) => b.population - a.population).slice(0, 10);

    console.log(`✅ Database loaded: ${totalCities} cities total`);
    console.log(`📍 US Coverage: ${usCities.length} cities across ${usStates.length} states`);
    console.log(`📍 Canada Coverage: ${canadianCities.length} cities across ${canadianProvinces.length} provinces/territories`);

    // Test specific functionality
    let testResults: any = {};

    switch (test_type) {
      case 'coordinates':
        // Test coordinate lookup functionality
        const testLookups = [
          'Littleton, MA',
          'St. Louis, MO', 
          'Chicago, IL',
          'Toronto, ON',
          'Vancouver, BC'
        ];
        
        testResults.coordinate_tests = testLookups.map(city => ({
          city,
          coordinates: getCityCoordinates(city.split(', ')[0]),
          lookup_result: CITY_COORDINATES_LOOKUP[city]
        }));
        break;

      case 'search':
        // Test search functionality
        const searchTests = ['New York', 'Los Angeles', 'Toronto', 'Montreal'];
        testResults.search_tests = searchTests.map(term => ({
          search_term: term,
          results: searchCitiesByName(term).slice(0, 5)
        }));
        break;

      case 'state_coverage':
        // Test state/province coverage
        const sampleStates = ['CA', 'TX', 'NY', 'ON', 'QC', 'BC'];
        testResults.state_coverage = sampleStates.map(state => ({
          state_province: state,
          city_count: getCitiesByStateProvince(state).length,
          top_cities: getCitiesByStateProvince(state)
            .sort((a, b) => b.population - a.population)
            .slice(0, 3)
            .map(c => ({ name: c.name, population: c.population }))
        }));
        break;

      case 'optimization_ready':
        // Test readiness for optimization algorithms
        const majorHubs = [
          'Littleton, MA', 'Chicago, IL', 'St. Louis, MO', 'Dallas, TX', 
          'Los Angeles, CA', 'Atlanta, GA', 'Toronto, ON', 'Vancouver, BC'
        ];
        
        testResults.optimization_readiness = {
          candidate_facilities: majorHubs.map(hub => ({
            facility: hub,
            coordinates_available: !!CITY_COORDINATES_LOOKUP[hub],
            coordinates: CITY_COORDINATES_LOOKUP[hub]
          })),
          sample_destinations: getTopCitiesByPopulation(20).map(city => ({
            city: `${city.name}, ${city.state_province}`,
            population: city.population,
            coordinates: { lat: city.lat, lon: city.lon }
          }))
        };
        break;

      default:
        // Default summary view
        testResults = {
          summary_only: true
        };
    }

    const response = {
      success: true,
      database_summary: {
        total_cities: totalCities,
        us_cities: usCities.length,
        canadian_cities: canadianCities.length,
        us_states_covered: usStates.length,
        canadian_provinces_covered: canadianProvinces.length,
        coordinate_entries: Object.keys(CITY_COORDINATES_LOOKUP).length
      },
      coverage_analysis: {
        us_states: usStates,
        canadian_provinces: canadianProvinces,
        largest_us_cities: topUSCities.slice(0, 5).map(c => ({ 
          name: `${c.name}, ${c.state_province}`, 
          population: c.population 
        })),
        largest_canadian_cities: topCanadianCities.slice(0, 5).map(c => ({ 
          name: `${c.name}, ${c.state_province}`, 
          population: c.population 
        }))
      },
      optimization_impact: {
        before_database_size: 13, // Original hardcoded cities
        after_database_size: totalCities,
        improvement_factor: Math.round(totalCities / 13),
        geographic_coverage: 'All 50 US states + all Canadian provinces/territories',
        modeling_capability: 'Full North American transportation network optimization'
      },
      test_results: testResults,
      sample_queries: {
        get_coordinates: '/api/test-comprehensive-cities?test=coordinates',
        search_cities: '/api/test-comprehensive-cities?test=search', 
        state_coverage: '/api/test-comprehensive-cities?test=state_coverage',
        optimization_ready: '/api/test-comprehensive-cities?test=optimization_ready'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database test failed'
      }, 
      { status: 500 }
    );
  }
}
