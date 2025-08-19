import similarity from "string-similarity";

export type CanonicalField =
  | "sku" | "description" | "item_class" | "uom" | "qty" | "location" | "loc_type"
  | "lot" | "serial" | "owner" | "warehouse" | "area" | "transaction_type" | "transaction_ts"
  | "order_id" | "ship_date" | "origin_zip" | "dest_zip" | "service_level" | "mode"
  | "carrier" | "weight_lb" | "cube_cf" | "pkgs" | "freight_cost_usd"
  | "on_hand_qty" | "allocated_qty" | "available_qty" | "reorder_point" | "reorder_qty" | "unit_cost_usd"
  // Transport-specific fields for current data processing
  | "net_charge" | "gross_charge" | "column_v" | "ltl_cost" | "tl_cost" | "parcel_cost";

const SYNONYMS: Record<CanonicalField, string[]> = {
  sku: ["sku", "item", "item_code", "item id", "product", "product_code", "material", "part", "pn"],
  description: ["description", "desc", "item_description", "name", "prod_desc"],
  item_class: ["class", "item_class", "category", "commodity", "abc", "abc_class"],
  uom: ["uom", "unit", "unit_of_measure", "units", "measure", "pack uom"],
  qty: ["qty", "quantity", "qty_ordered", "qty_picked", "qty_shipped", "units"],
  location: ["location", "loc", "bin", "slot", "pick location", "stow"],
  loc_type: ["loc_type", "location_type", "zone", "temp_zone", "rack_type"],
  lot: ["lot", "lot_number", "batch"],
  serial: ["serial", "serial_number", "sn"],
  owner: ["owner", "account", "client", "customer_owner"],
  warehouse: ["warehouse", "whse", "dc", "facility"],
  area: ["area", "aisle", "zone", "section"],
  transaction_type: ["transaction_type", "txn_type", "movement_type", "reason_code"],
  transaction_ts: ["transaction_ts", "timestamp", "txn_time", "datetime", "posting_date"],
  order_id: ["order_id", "order", "so", "shipment id", "load id", "manifest id"],
  ship_date: ["ship_date", "shipdate", "shipped_on", "departure_date", "post_date"],
  origin_zip: ["origin_zip", "orig_zip", "from_zip", "shipper_zip", "origin postal"],
  dest_zip: ["dest_zip", "to_zip", "postal_code", "zip", "consignee_zip"],
  service_level: ["service_level", "svc", "svc_lvl", "ground", "2 day", "next day"],
  mode: ["mode", "parcel", "ltl", "tl", "intermodal", "air", "ocean"],
  carrier: ["carrier", "scac", "carrier_name", "ups", "fedex"],
  weight_lb: ["weight", "weight_lb", "lbs", "weight (lb)", "weight_lbs"],
  cube_cf: ["cube", "cube_cf", "cuft", "cubic_feet", "volume"],
  pkgs: ["pkgs", "pieces", "packages", "pkg_cnt"],
  freight_cost_usd: ["freight", "freight_cost", "cost", "ship cost", "charges", "total_freight"],
  on_hand_qty: ["on_hand", "oh_qty", "stock_qty", "inventory_on_hand"],
  allocated_qty: ["allocated", "alloc_qty", "reserved_qty"],
  available_qty: ["available", "avail_qty", "free_stock"],
  reorder_point: ["reorder_point", "rop", "min"],
  reorder_qty: ["reorder_qty", "roq", "order_qty", "lot_size"],
  unit_cost_usd: ["unit_cost", "standard_cost", "cost_usd", "avg_cost"],
  
  // Transport-specific synonyms
  net_charge: ["net charge", "net_charge", "net", "net amount", "net cost"],
  gross_charge: ["gross charge", "gross_charge", "gross", "gross amount", "gross cost"],
  column_v: ["v", "column v", "net freight", "ltl charge", "customer charge"],
  ltl_cost: ["ltl", "ltl cost", "ltl charge", "less than truckload", "r&l", "curriculum"],
  tl_cost: ["tl", "tl cost", "truckload", "freight rate", "line haul", "total 2024"],
  parcel_cost: ["parcel", "ups", "fedex", "ground", "package cost", "shipping cost"]
};

const CANONICAL: CanonicalField[] = Object.keys(SYNONYMS) as CanonicalField[];

export function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[_\s\-\/\.]+/g, " ").trim();
}

export type MappingResult = {
  rawHeader: string;
  mappedTo?: CanonicalField;
  score: number;
  candidates: { field: CanonicalField; score: number }[];
};

export function suggestMapping(rawHeader: string): MappingResult {
  const norm = normalizeHeader(rawHeader);
  const candidates: { field: CanonicalField; score: number }[] = [];

  for (const field of CANONICAL) {
    const list = [field, ...SYNONYMS[field]];
    const best = similarity.findBestMatch(norm, list).bestMatch.rating;
    
    // Small regex boosts for better matching
    let regexBoost = 0;
    
    // Transport-specific boosts
    if (field === "column_v" && (/\bv\b/.test(norm) || /column.*v/i.test(rawHeader))) regexBoost += 0.2;
    if (field === "net_charge" && /\bnet\b/.test(norm)) regexBoost += 0.1;
    if (field === "ltl_cost" && (/\bltl\b|\br&l\b|\bcurriculum\b/.test(norm))) regexBoost += 0.15;
    if (field === "tl_cost" && (/\btl\b|\btruckload\b|\btotal\b/.test(norm))) regexBoost += 0.15;
    if (field === "parcel_cost" && (/\bups\b|\bfedex\b|\bparcel\b/.test(norm))) regexBoost += 0.1;
    
    // General boosts
    if (field === "sku" && /\b(sku|item|product|material)\b/.test(norm)) regexBoost += 0.05;
    if (field === "origin_zip" && /\b(from|origin|orig)\b/.test(norm)) regexBoost += 0.03;
    if (field === "dest_zip" && /\b(to|dest|consignee)\b/.test(norm)) regexBoost += 0.03;
    if (field === "freight_cost_usd" && /\b(freight|cost|charge|amount)\b/.test(norm)) regexBoost += 0.05;
    
    candidates.push({ field, score: Math.min(1, best + regexBoost) });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  const mappedTo = top.score >= 0.55 ? top.field : undefined; // threshold
  
  return { 
    rawHeader, 
    mappedTo, 
    score: top.score, 
    candidates: candidates.slice(0, 3) 
  };
}

// Enhanced function for transport-specific column detection
export function detectTransportColumn(header: string, columnIndex: number): {
  type: 'exact_match' | 'pattern_match' | 'position_match' | 'unknown';
  confidence: number;
  canonicalField?: CanonicalField;
} {
  const norm = normalizeHeader(header);
  
  // Exact column V detection
  if (header === 'V' || header === 'v') {
    return { type: 'exact_match', confidence: 0.95, canonicalField: 'column_v' };
  }
  
  // Pattern-based detection
  const mapping = suggestMapping(header);
  if (mapping.mappedTo && mapping.score >= 0.7) {
    return { 
      type: 'pattern_match', 
      confidence: mapping.score, 
      canonicalField: mapping.mappedTo 
    };
  }
  
  // Position-based detection (column V is index 21)
  if (columnIndex === 21 && norm.includes('charge') || norm.includes('cost') || norm.includes('amount')) {
    return { type: 'position_match', confidence: 0.6, canonicalField: 'column_v' };
  }
  
  return { type: 'unknown', confidence: 0 };
}
