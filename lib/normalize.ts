/**
 * Normalizes header strings for consistent matching
 * Converts to lowercase, removes special characters, trims whitespace
 */
export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Additional normalization for transport-specific headers
 */
export function normalizeTransportHeader(s: string): string {
  const normalized = normalizeHeader(s);
  
  // Handle common transport abbreviations
  return normalized
    .replace(/\bnet chg\b/g, "net charge")
    .replace(/\bgross chg\b/g, "gross charge")
    .replace(/\bfreight\b/g, "freight cost")
    .replace(/\br l\b/g, "r&l")
    .replace(/\bcol v\b/g, "column v")
    .replace(/\bcol\s+v\b/g, "column v")
    .trim();
}

/**
 * Create variations of a header for fuzzy matching
 */
export function generateHeaderVariations(header: string): string[] {
  const base = normalizeHeader(header);
  const variations = new Set([base]);
  
  // Add transport-specific variation
  variations.add(normalizeTransportHeader(header));
  
  // Add common abbreviation expansions
  const abbrevMap: Record<string, string> = {
    "qty": "quantity",
    "desc": "description",
    "loc": "location",
    "whse": "warehouse",
    "dc": "distribution center",
    "uom": "unit of measure",
    "sku": "stock keeping unit",
    "tl": "truckload",
    "ltl": "less than truckload",
    "ups": "united parcel service"
  };
  
  for (const [abbrev, expanded] of Object.entries(abbrevMap)) {
    if (base.includes(abbrev)) {
      variations.add(base.replace(abbrev, expanded));
    }
    if (base.includes(expanded)) {
      variations.add(base.replace(expanded, abbrev));
    }
  }
  
  return Array.from(variations);
}
