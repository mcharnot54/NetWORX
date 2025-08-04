import { NextRequest, NextResponse } from 'next/server';
import { perplexityAPI, MarketDataResponse } from '@/lib/perplexity-api';

interface MarketDataRequest {
  locations: { city: string; state: string }[];
  force_refresh?: boolean;
}

// In-memory cache for market data (in production, use Redis or database)
const marketDataCache = new Map<string, { data: MarketDataResponse; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCacheKey(city: string, state: string): string {
  return `${city.toLowerCase().trim()}_${state.toLowerCase().trim()}`;
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

export async function POST(request: NextRequest) {
  try {
    const body: MarketDataRequest = await request.json();
    
    if (!body.locations || !Array.isArray(body.locations)) {
      return NextResponse.json(
        { error: 'Invalid request: locations array is required' },
        { status: 400 }
      );
    }

    const results: MarketDataResponse[] = [];
    const locationsToFetch: { city: string; state: string }[] = [];

    // Check cache first (unless force refresh is requested)
    for (const location of body.locations) {
      const cacheKey = getCacheKey(location.city, location.state);
      const cached = marketDataCache.get(cacheKey);
      
      if (!body.force_refresh && cached && isCacheValid(cached.timestamp)) {
        console.log(`Cache hit for ${location.city}, ${location.state}`);
        results.push(cached.data);
      } else {
        locationsToFetch.push(location);
      }
    }

    // Fetch data for locations not in cache or expired
    if (locationsToFetch.length > 0) {
      console.log(`Fetching market data for ${locationsToFetch.length} locations`);
      
      try {
        const freshData = await perplexityAPI.batchGetMarketData(locationsToFetch);
        
        // Validate and cache the fresh data
        for (const data of freshData) {
          const validatedData = perplexityAPI.validateMarketData(data);
          const cacheKey = getCacheKey(data.city, data.state);
          
          marketDataCache.set(cacheKey, {
            data: validatedData,
            timestamp: Date.now()
          });
          
          results.push(validatedData);
        }
        
        console.log(`Successfully fetched and cached data for ${freshData.length} locations`);
      } catch (error) {
        console.error('Error fetching market data from Perplexity API:', error);
        
        // Return partial results with fallback data for failed locations
        for (const location of locationsToFetch) {
          const fallbackData: MarketDataResponse = {
            city: location.city,
            state: location.state,
            warehouse_lease_rate_per_sqft: 6.0,
            hourly_wage_rate: 17.0,
            fully_burdened_rate: 22.95,
            confidence_score: 25,
            data_source: 'fallback_error',
            last_updated: new Date().toISOString().split('T')[0],
            raw_response: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          
          results.push(fallbackData);
        }
      }
    }

    // Sort results to match original request order
    const sortedResults = body.locations.map(location => {
      return results.find(result => 
        result.city.toLowerCase() === location.city.toLowerCase() &&
        result.state.toLowerCase() === location.state.toLowerCase()
      );
    }).filter(Boolean) as MarketDataResponse[];

    return NextResponse.json({
      success: true,
      data: sortedResults,
      cache_info: {
        total_locations: body.locations.length,
        from_cache: results.length - locationsToFetch.length,
        from_api: locationsToFetch.length,
        cache_duration_hours: CACHE_DURATION / (60 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('Market data API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  
  if (!city || !state) {
    return NextResponse.json(
      { error: 'Both city and state parameters are required' },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cacheKey = getCacheKey(city, state);
    const cached = marketDataCache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        from_cache: true
      });
    }

    // Fetch fresh data
    const marketData = await perplexityAPI.getComprehensiveMarketData(city, state);
    const validatedData = perplexityAPI.validateMarketData(marketData);
    
    // Cache the result
    marketDataCache.set(cacheKey, {
      data: validatedData,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      data: validatedData,
      from_cache: false
    });

  } catch (error) {
    console.error(`Error fetching market data for ${city}, ${state}:`, error);
    
    // Return fallback data
    const fallbackData: MarketDataResponse = {
      city,
      state,
      warehouse_lease_rate_per_sqft: 6.0,
      hourly_wage_rate: 17.0,
      fully_burdened_rate: 22.95,
      confidence_score: 25,
      data_source: 'fallback_error',
      last_updated: new Date().toISOString().split('T')[0],
      raw_response: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };

    return NextResponse.json({
      success: false,
      data: fallbackData,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get cache statistics
export async function HEAD(request: NextRequest) {
  const cacheStats = {
    total_cached_locations: marketDataCache.size,
    cache_duration_hours: CACHE_DURATION / (60 * 60 * 1000),
    cache_entries: Array.from(marketDataCache.entries()).map(([key, value]) => ({
      location: key,
      age_hours: (Date.now() - value.timestamp) / (60 * 60 * 1000),
      confidence: value.data.confidence_score
    }))
  };

  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Cache-Stats': JSON.stringify(cacheStats)
    }
  });
}
