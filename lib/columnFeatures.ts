export function extractFeatures(header: string, sampleValues: unknown[]): {
  normHeader: string;
  tokenBag: Record<string, number>;
  patterns: Record<string, number>;
  stats: { nullRate: number; uniqRatio: number; avgLen: number };
} {
  const normHeader = header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const vals = sampleValues.slice(0, 200).map(v => String(v ?? ""));
  
  // Pattern function to generalize data types
  const patt = (s: string) =>
    s.replace(/[A-Z]/g, "A").replace(/[a-z]/g, "a").replace(/[0-9]/g, "9")
     .replace(/\s+/g, " ").trim(); // e.g., "99999", "aa-9999", "9999-99-99"
  
  const tokenBag: Record<string, number> = {};
  
  // Header tokens
  for (const t of normHeader.split(" ").filter(Boolean)) {
    tokenBag[`h:${t}`] = (tokenBag[`h:${t}`] ?? 0) + 1;
  }
  
  const patterns: Record<string, number> = {};
  let nulls = 0;
  const seen = new Set<string>();
  let charCount = 0;
  
  for (const v of vals) {
    if (!v) { 
      nulls++; 
      continue; 
    }
    
    patterns[patt(v)] = (patterns[patt(v)] ?? 0) + 1;
    seen.add(v);
    charCount += v.length;
    
    // Value tokens
    for (const w of v.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
      tokenBag[`v:${w}`] = (tokenBag[`v:${w}`] ?? 0) + 1;
    }
  }
  
  const stats = {
    nullRate: vals.length ? nulls / vals.length : 1,
    uniqRatio: vals.length ? seen.size / vals.length : 0,
    avgLen: vals.length ? charCount / vals.length : 0,
  };
  
  return { normHeader, tokenBag, patterns, stats };
}

// Enhanced features for transport data
export function extractTransportFeatures(header: string, sampleValues: unknown[]): {
  isCurrency: boolean;
  isColumnLetter: boolean;
  hasNumericPattern: boolean;
  isDate: boolean;
  isZipCode: boolean;
  currencyAmount: number;
  features: ReturnType<typeof extractFeatures>;
} {
  const features = extractFeatures(header, sampleValues);
  const vals = sampleValues.slice(0, 100).map(v => String(v ?? "")).filter(Boolean);
  
  // Check if it's a single column letter (A, B, C, V, etc.)
  const isColumnLetter = /^[A-Z]$/.test(header.trim());
  
  // Check for currency patterns
  const currencyValues = vals.filter(v => /[\$\,\.\d]/.test(v));
  const isCurrency = currencyValues.length > vals.length * 0.5;
  
  // Calculate total currency amount if this looks like a currency column
  let currencyAmount = 0;
  if (isCurrency) {
    for (const val of vals) {
      const cleaned = String(val).replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && isFinite(num)) {
        currencyAmount += num;
      }
    }
  }
  
  // Check for numeric patterns
  const numericValues = vals.filter(v => !isNaN(parseFloat(v)));
  const hasNumericPattern = numericValues.length > vals.length * 0.7;
  
  // Check for date patterns
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{4}-\d{2}-\d{2}/,
    /\d{1,2}-\d{1,2}-\d{4}/
  ];
  const isDate = vals.some(v => datePatterns.some(pattern => pattern.test(v)));
  
  // Check for ZIP code patterns
  const isZipCode = vals.some(v => /^\d{5}(-\d{4})?$/.test(v));
  
  return {
    isCurrency,
    isColumnLetter,
    hasNumericPattern,
    isDate,
    isZipCode,
    currencyAmount,
    features
  };
}
