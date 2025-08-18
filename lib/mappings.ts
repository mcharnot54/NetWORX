import { normalizeHeader } from "./normalize";
import type { CanonicalField } from "./headerMap";

type Canon = CanonicalField;

/**
 * Resolve a header mapping by checking customer-specific first, then global
 */
export async function resolveMapping(
  customerId: string, 
  rawHeader: string
): Promise<{
  canonical?: Canon;
  source?: "customer" | "global";
  confidence?: number;
  hits?: number;
}> {
  const { sql } = await import('@/lib/database');
  const h = normalizeHeader(rawHeader);
  
  try {
    // Check customer-specific mapping first
    const customerMappings = await sql`
      SELECT canonical_field, confidence, hits 
      FROM schema_mapping 
      WHERE customer_id = ${customerId} AND raw_header_norm = ${h}
    `;
    
    if (customerMappings.length > 0) {
      const mapping = customerMappings[0];
      return {
        canonical: mapping.canonical_field as Canon,
        source: "customer",
        confidence: mapping.confidence,
        hits: mapping.hits
      };
    }
    
    // Fallback to global mapping
    const globalMappings = await sql`
      SELECT canonical_field, confidence, hits
      FROM global_mapping 
      WHERE raw_header_norm = ${h}
    `;
    
    if (globalMappings.length > 0) {
      const mapping = globalMappings[0];
      return {
        canonical: mapping.canonical_field as Canon,
        source: "global",
        confidence: mapping.confidence,
        hits: mapping.hits
      };
    }
    
    return {};
  } catch (error) {
    console.error('Error resolving mapping:', error);
    return {};
  }
}

/**
 * Save or update a customer-specific mapping
 */
export async function upsertCustomerMapping(
  customerId: string,
  rawHeader: string,
  canonicalField: Canon,
  confidence = 0.9
): Promise<void> {
  const { sql } = await import('@/lib/database');
  const h = normalizeHeader(rawHeader);
  
  try {
    await sql`
      INSERT INTO schema_mapping (customer_id, raw_header_norm, canonical_field, confidence, hits)
      VALUES (${customerId}, ${h}, ${canonicalField}, ${confidence}, 1)
      ON CONFLICT (customer_id, raw_header_norm) 
      DO UPDATE SET 
        canonical_field = EXCLUDED.canonical_field,
        confidence = GREATEST(schema_mapping.confidence, EXCLUDED.confidence),
        hits = schema_mapping.hits + 1,
        last_seen_at = NOW()
    `;
    
    console.log(`Updated customer mapping: ${rawHeader} -> ${canonicalField} (${confidence})`);
  } catch (error) {
    console.error('Error upserting customer mapping:', error);
    throw error;
  }
}

/**
 * Save or update a global mapping
 */
export async function upsertGlobalMapping(
  rawHeader: string,
  canonicalField: Canon,
  confidence = 0.8
): Promise<void> {
  const { sql } = await import('@/lib/database');
  const h = normalizeHeader(rawHeader);
  
  try {
    await sql`
      INSERT INTO global_mapping (raw_header_norm, canonical_field, confidence, hits)
      VALUES (${h}, ${canonicalField}, ${confidence}, 1)
      ON CONFLICT (raw_header_norm)
      DO UPDATE SET 
        canonical_field = EXCLUDED.canonical_field,
        confidence = GREATEST(global_mapping.confidence, EXCLUDED.confidence),
        hits = global_mapping.hits + 1,
        last_seen_at = NOW()
    `;
    
    console.log(`Updated global mapping: ${rawHeader} -> ${canonicalField} (${confidence})`);
  } catch (error) {
    console.error('Error upserting global mapping:', error);
    throw error;
  }
}

/**
 * Bulk resolve multiple headers for a customer
 */
export async function resolveBulkMappings(
  customerId: string,
  headers: string[]
): Promise<Record<string, {
  canonical?: Canon;
  source?: "customer" | "global";
  confidence?: number;
}>> {
  const results: Record<string, any> = {};
  
  // Process in parallel for better performance
  await Promise.all(
    headers.map(async (header) => {
      const mapping = await resolveMapping(customerId, header);
      results[header] = mapping;
    })
  );
  
  return results;
}

/**
 * Get mapping statistics for a customer
 */
export async function getMappingStats(customerId: string): Promise<{
  customerMappings: number;
  globalMappings: number;
  totalHits: number;
  averageConfidence: number;
}> {
  const { sql } = await import('@/lib/database');
  
  try {
    const [customerStats] = await sql`
      SELECT 
        COUNT(*) as count,
        SUM(hits) as total_hits,
        AVG(confidence) as avg_confidence
      FROM schema_mapping 
      WHERE customer_id = ${customerId}
    `;
    
    const [globalStats] = await sql`
      SELECT COUNT(*) as count FROM global_mapping
    `;
    
    return {
      customerMappings: parseInt(customerStats.count),
      globalMappings: parseInt(globalStats.count),
      totalHits: parseInt(customerStats.total_hits) || 0,
      averageConfidence: parseFloat(customerStats.avg_confidence) || 0
    };
  } catch (error) {
    console.error('Error getting mapping stats:', error);
    return {
      customerMappings: 0,
      globalMappings: 0,
      totalHits: 0,
      averageConfidence: 0
    };
  }
}
