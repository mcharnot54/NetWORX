/**
 * Seeded Random Number Generator utilities
 * Provides deterministic random number generation for optimization algorithms
 */

/**
 * Create a stable seed from an object by converting it to a deterministic string
 */
export function stableSeedFromObject(obj: any): number {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create a seeded random number generator using a simple LCG algorithm
 */
export function createSeededRng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  
  return function() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}
