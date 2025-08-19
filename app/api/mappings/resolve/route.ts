import { NextRequest, NextResponse } from "next/server";
import { resolveMapping, resolveBulkMappings, getMappingStats } from "@/lib/mappings";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { customerId, headers } = await req.json() as {
      customerId: string;
      headers: string[];
    };

    if (!customerId || !headers?.length) {
      return NextResponse.json(
        { error: "Missing customerId or headers" },
        { status: 400 }
      );
    }

    console.log(`Resolving ${headers.length} headers for customer ${customerId}`);

    // Use bulk resolution for better performance
    const resolved = await resolveBulkMappings(customerId, headers);
    
    // Get mapping statistics
    const stats = await getMappingStats(customerId);

    return NextResponse.json({
      resolved,
      stats,
      resolvedCount: Object.values(resolved).filter(r => r.canonical).length,
      totalHeaders: headers.length
    });

  } catch (error) {
    console.error('Error resolving mappings:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for single header resolution
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const header = searchParams.get('header');
    
    if (!customerId || !header) {
      return NextResponse.json(
        { error: "Missing customerId or header parameter" },
        { status: 400 }
      );
    }

    const mapping = await resolveMapping(customerId, header);

    return NextResponse.json({
      header,
      mapping,
      found: !!mapping.canonical
    });

  } catch (error) {
    console.error('Error resolving single mapping:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
