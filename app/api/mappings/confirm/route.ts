import { NextRequest, NextResponse } from "next/server";
import { upsertCustomerMapping, upsertGlobalMapping } from "@/lib/mappings";

export const runtime = "nodejs";

type Confirmation = {
  rawHeader: string;
  canonicalField: string;
  scope?: "customer" | "global" | "both"; // default "customer"
  confidence?: number; // optional override
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, confirmations } = body as {
      customerId: string;
      confirmations: Confirmation[];
    };

    if (!customerId || !Array.isArray(confirmations) || confirmations.length === 0) {
      return NextResponse.json(
        { error: "Missing customerId or confirmations" },
        { status: 400 }
      );
    }

    console.log(`Processing ${confirmations.length} mapping confirmations for customer ${customerId}`);

    const results = {
      processed: 0,
      errors: [] as string[]
    };

    for (const c of confirmations) {
      try {
        const scope = c.scope ?? "customer";
        
        if (scope === "customer" || scope === "both") {
          await upsertCustomerMapping(
            customerId,
            c.rawHeader,
            c.canonicalField as any,
            c.confidence ?? 0.9
          );
        }
        
        if (scope === "global" || scope === "both") {
          await upsertGlobalMapping(
            c.rawHeader,
            c.canonicalField as any,
            c.confidence ?? 0.8
          );
        }
        
        results.processed++;
      } catch (error) {
        const errorMsg = `Failed to save mapping for "${c.rawHeader}": ${error.message}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      ok: true,
      count: results.processed,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error) {
    console.error('Error processing mapping confirmations:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing mappings for a customer
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId parameter" },
        { status: 400 }
      );
    }

    const { sql } = await import('@/lib/database');
    
    const customerMappings = await sql`
      SELECT raw_header_norm, canonical_field, confidence, hits, last_seen_at
      FROM schema_mapping
      WHERE customer_id = ${customerId}
      ORDER BY hits DESC, last_seen_at DESC
    `;

    return NextResponse.json({
      customerId,
      mappings: customerMappings,
      count: customerMappings.length
    });

  } catch (error) {
    console.error('Error retrieving mappings:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
