import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const debug = {
    database_connection: false,
    tables_exist: {},
    error_details: null as any,
    file_count: 0,
    scenario_count: 0,
    project_count: 0
  };

  try {
    const { sql } = await import('@/lib/database');
    
    // Test basic connection
    try {
      await sql`SELECT 1`;
      debug.database_connection = true;
    } catch (connError) {
      debug.error_details = {
        type: 'connection_error',
        message: connError instanceof Error ? connError.message : String(connError)
      };
      return NextResponse.json(debug);
    }

    // Check if each required table exists
    const tables = ['projects', 'scenarios', 'data_files'];
    
    for (const table of tables) {
      try {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table}`);
        debug.tables_exist[table] = true;
        
        // Store counts
        if (table === 'data_files') debug.file_count = result[0]?.count || 0;
        if (table === 'scenarios') debug.scenario_count = result[0]?.count || 0;
        if (table === 'projects') debug.project_count = result[0]?.count || 0;
        
      } catch (tableError) {
        debug.tables_exist[table] = false;
        if (!debug.error_details) {
          debug.error_details = {
            type: 'table_missing',
            table: table,
            message: tableError instanceof Error ? tableError.message : String(tableError)
          };
        }
      }
    }

    // Additional table structure check for data_files
    if (debug.tables_exist['data_files']) {
      try {
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'data_files'
          ORDER BY ordinal_position
        `;
        debug.tables_exist['data_files_columns'] = columns.map((col: any) => ({
          name: col.column_name,
          type: col.data_type
        }));
      } catch (colError) {
        debug.error_details = {
          type: 'column_check_error',
          message: colError instanceof Error ? colError.message : String(colError)
        };
      }
    }

    return NextResponse.json(debug);

  } catch (error) {
    debug.error_details = {
      type: 'general_error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    return NextResponse.json(debug, { status: 500 });
  }
}
