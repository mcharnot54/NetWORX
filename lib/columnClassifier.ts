import { suggestMapping, detectTransportColumn, type CanonicalField } from "./headerMap";
import { extractFeatures, extractTransportFeatures } from "./columnFeatures";

type Canon = CanonicalField;

export function classifyColumn(header: string, sample: unknown[], columnIndex?: number): { 
  guess: Canon | null; 
  p: number; 
  alts: { field: Canon; p: number }[]; 
  method: string;
} {
  // 1) Header-based suggestion
  const h = suggestMapping(header);
  
  // 2) Transport-specific detection
  const transportDetection = detectTransportColumn(header, columnIndex ?? -1);
  
  // 3) Value pattern analysis
  const transportFeatures = extractTransportFeatures(header, sample);
  const f = extractFeatures(header, sample);
  
  const boosts: Partial<Record<Canon, number>> = {};
  const pattKeys = Object.keys(f.patterns || {});

  // Pattern-based boosts
  const hasZip = pattKeys.some(k => /^99999(-9999)?$/.test(k));
  const looksDate = pattKeys.some(k => /99.99.9999|9999.99.99|99\/99\/9999|9999-99-99/.test(k));
  const numericHeavy = (f.stats?.uniqRatio ?? 0) > 0.1 && (f.stats?.avgLen ?? 0) <= 8 && Object.keys(f.tokenBag || {}).length < 500;

  function bump(c: Canon, by: number) { 
    boosts[c] = (boosts[c] ?? 0) + by; 
  }

  // Transport-specific pattern boosts
  if (transportFeatures.isCurrency && transportFeatures.currencyAmount > 1000) {
    bump("freight_cost_usd", 0.15);
    bump("net_charge", 0.15);
    bump("gross_charge", 0.1);
    bump("column_v", 0.1);
  }
  
  if (transportFeatures.isColumnLetter) {
    bump("column_v", 0.2); // Boost for single letter columns
  }
  
  if (transportDetection.canonicalField) {
    bump(transportDetection.canonicalField, transportDetection.confidence * 0.3);
  }

  // General pattern boosts
  if (hasZip) { 
    bump("origin_zip", 0.1); 
    bump("dest_zip", 0.1); 
  }
  
  if (looksDate) { 
    bump("ship_date", 0.1); 
    bump("transaction_ts", 0.1); 
  }
  
  if (numericHeavy) { 
    ["qty","pkgs","weight_lb","cube_cf","on_hand_qty","allocated_qty","available_qty","freight_cost_usd"]
      .forEach(c => bump(c as Canon, 0.05)); 
  }

  // Combine scores (bounded)
  const candidates = (h.candidates as any[]).map(c => ({
    field: c.field as Canon,
    p: Math.min(1, c.score + (boosts[c.field as Canon] ?? 0))
  })).sort((a,b) => b.p - a.p);

  const top = candidates[0] ?? { field: null, p: 0 };
  
  // Determine classification method
  let method = 'header_similarity';
  if (transportDetection.type === 'exact_match') method = 'exact_match';
  else if (transportDetection.type === 'position_match') method = 'position_match';
  else if (transportFeatures.isCurrency && top.field?.includes('cost')) method = 'currency_pattern';
  
  return { 
    guess: top.field, 
    p: top.p, 
    alts: candidates.slice(1, 3),
    method
  };
}

// Specialized function for transport column extraction
export function classifyTransportColumn(header: string, sample: unknown[], columnIndex?: number): {
  isTransportColumn: boolean;
  extractedAmount: number;
  confidence: number;
  canonicalField: Canon | null;
  method: string;
} {
  const features = extractTransportFeatures(header, sample);
  const classification = classifyColumn(header, sample, columnIndex);
  
  // Transport column criteria
  const isTransportColumn = 
    features.isCurrency && 
    features.currencyAmount > 100 &&
    (classification.guess?.includes('cost') || 
     classification.guess?.includes('charge') || 
     classification.guess === 'column_v');
  
  return {
    isTransportColumn,
    extractedAmount: features.currencyAmount,
    confidence: classification.p,
    canonicalField: classification.guess,
    method: classification.method
  };
}

// Batch classifier for multiple columns
export function classifyColumns(headers: string[], sampleData: any[]): {
  columns: Array<{
    header: string;
    index: number;
    classification: ReturnType<typeof classifyColumn>;
    transportAnalysis: ReturnType<typeof classifyTransportColumn>;
  }>;
  bestTransportColumn: {
    header: string;
    index: number;
    amount: number;
    confidence: number;
  } | null;
} {
  const columns = headers.map((header, index) => {
    const columnData = sampleData.map(row => row[header]);
    const classification = classifyColumn(header, columnData, index);
    const transportAnalysis = classifyTransportColumn(header, columnData, index);
    
    return {
      header,
      index,
      classification,
      transportAnalysis
    };
  });
  
  // Find the best transport column
  const transportColumns = columns.filter(c => c.transportAnalysis.isTransportColumn);
  const bestTransportColumn = transportColumns.reduce((best, current) => {
    if (!best) return current;
    
    // Prefer higher confidence, then higher amount
    if (current.transportAnalysis.confidence > best.transportAnalysis.confidence) {
      return current;
    }
    if (current.transportAnalysis.confidence === best.transportAnalysis.confidence &&
        current.transportAnalysis.extractedAmount > best.transportAnalysis.extractedAmount) {
      return current;
    }
    
    return best;
  }, null as typeof transportColumns[0] | null);
  
  return {
    columns,
    bestTransportColumn: bestTransportColumn ? {
      header: bestTransportColumn.header,
      index: bestTransportColumn.index,
      amount: bestTransportColumn.transportAnalysis.extractedAmount,
      confidence: bestTransportColumn.transportAnalysis.confidence
    } : null
  };
}
