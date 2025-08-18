// Simple in-memory cache to reduce database calls and prevent timeouts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const apiCache = new SimpleCache();

// Cleanup expired entries every 10 minutes
if (typeof window === 'undefined') { // Only on server side
  setInterval(() => {
    apiCache.cleanup();
  }, 10 * 60 * 1000);
}

// Helper function to cache database results
export async function withCache<T>(
  cacheKey: string,
  dataFetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(cacheKey);
  if (cached !== null) {
    console.debug(`Cache hit for key: ${cacheKey}`);
    return cached;
  }

  // Fetch data and cache it
  console.debug(`Cache miss for key: ${cacheKey}, fetching data...`);
  try {
    const data = await dataFetcher();
    apiCache.set(cacheKey, data, ttl);
    return data;
  } catch (error) {
    console.debug(`Error fetching data for cache key ${cacheKey}:`, error);
    throw error;
  }
}

// Specific cache helpers for common operations
export const CacheKeys = {
  BASELINE_COSTS: 'baseline-costs',
  SCENARIOS: 'active-scenarios',
  DATA_FILES: (scenarioId: number) => `data-files-${scenarioId}`,
  SCENARIO_RESULTS: (scenarioId: number) => `scenario-results-${scenarioId}`,
  HEALTH_CHECK: 'health-check'
} as const;
