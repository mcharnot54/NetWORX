// TypeScript compilation fixes
// This file helps with TypeScript compilation issues

// Add type guards and safe property access patterns

export function safePropertyAccess(obj: unknown, property: string): unknown {
  if (obj && typeof obj === 'object' && property in obj) {
    return (obj as Record<string, unknown>)[property];
  }
  return undefined;
}

export function safeArrayAccess(arr: unknown, index: number): unknown {
  if (Array.isArray(arr) && index >= 0 && index < arr.length) {
    return arr[index];
  }
  return undefined;
}

export function isValidObject(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
