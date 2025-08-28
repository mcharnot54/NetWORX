// Simple deterministic seeded PRNG utility
// Produces a function that returns a pseudo-random number in [0,1)
export function createSeededRng(seedInput: string | number) {
  // Convert seedInput to a 32-bit integer seed using a simple hash (djb2)
  let seedStr = typeof seedInput === 'number' ? String(seedInput) : seedInput || '';
  let hash = 5381;
  for (let i = 0; i < seedStr.length; i++) {
    // djb2
    hash = ((hash << 5) + hash) + seedStr.charCodeAt(i);
    hash = hash & 0xffffffff; // keep 32-bit
  }
  let state = (hash >>> 0) || 1;

  // Linear congruential generator parameters (recommended values)
  const a = 1664525;
  const c = 1013904223;
  const m = 0x100000000; // 2^32

  return function rng() {
    state = (a * state + c) % m;
    return state / m;
  };
}

// Helper to derive a stable seed string from arbitrary data
export function stableSeedFromObject(obj: any) {
  try {
    return JSON.stringify(obj, Object.keys(obj).sort());
  } catch (e) {
    return String(obj);
  }
}
