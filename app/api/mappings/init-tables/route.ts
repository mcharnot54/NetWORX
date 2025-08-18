import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('Creating learning system tables...');

    // Create customers table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create schema_mapping table (per-customer mappings)
    await sql`
      CREATE TABLE IF NOT EXISTS schema_mapping (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        customer_id TEXT NOT NULL,
        raw_header_norm TEXT NOT NULL,
        canonical_field TEXT NOT NULL,
        confidence FLOAT NOT NULL,
        hits INTEGER DEFAULT 1,
        last_seen_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, raw_header_norm)
      )
    `;

    // Create global_mapping table (cross-customer mappings)
    await sql`
      CREATE TABLE IF NOT EXISTS global_mapping (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        raw_header_norm TEXT UNIQUE NOT NULL,
        canonical_field TEXT NOT NULL,
        confidence FLOAT NOT NULL,
        hits INTEGER DEFAULT 1,
        last_seen_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_schema_mapping_customer ON schema_mapping(customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schema_mapping_header ON schema_mapping(raw_header_norm)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_global_mapping_header ON global_mapping(raw_header_norm)`;

    // Create uploads table for tracking file uploads
    await sql`
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        customer_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        status TEXT DEFAULT 'PARSING',
        domain TEXT,
        report_json JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('Learning system tables created successfully');

    return NextResponse.json({
      success: true,
      message: "Learning system tables created successfully",
      tables: ["customers", "schema_mapping", "global_mapping", "uploads"]
    });

  } catch (error) {
    console.error('Error creating tables:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customers', 'schema_mapping', 'global_mapping', 'uploads')
      ORDER BY table_name
    `;

    const tableNames = tables.map(t => t.table_name);
    const allTablesExist = ['customers', 'schema_mapping', 'global_mapping', 'uploads']
      .every(t => tableNames.includes(t));

    return NextResponse.json({
      tablesExist: allTablesExist,
      existingTables: tableNames,
      requiredTables: ['customers', 'schema_mapping', 'global_mapping', 'uploads']
    });

  } catch (error) {
    console.error('Error checking tables:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
