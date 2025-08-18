import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the latest uploaded files and their column structure
    const files = await sql`
      SELECT 
        id,
        file_name,
        original_columns,
        processed_data
      FROM data_files 
      WHERE id IN (65, 66, 67)
      AND processed_data ? 'file_content'
      ORDER BY id
    `;

    const columnAnalysis = [];

    for (const file of files) {
      try {
        // Try to get column info from original_columns first
        let columns = file.original_columns || [];
        
        // If no original columns, try to extract from processed_data
        if (columns.length === 0 && file.processed_data) {
          const processedData = file.processed_data as any;
          if (processedData.multiTabData) {
            // Multi-tab structure
            for (const [sheetName, sheetData] of Object.entries(processedData.multiTabData)) {
              const sheetInfo = sheetData as any;
              if (sheetInfo.columnHeaders) {
                columns = sheetInfo.columnHeaders;
                break; // Use first sheet's columns
              }
            }
          } else if (processedData.cleanedData && processedData.cleanedData.columnHeaders) {
            columns = processedData.cleanedData.columnHeaders;
          }
        }

        // Look for cost-related columns
        const costColumns = columns.filter((col: string) => 
          col && (
            col.toLowerCase().includes('charge') ||
            col.toLowerCase().includes('cost') ||
            col.toLowerCase().includes('rate') ||
            col.toLowerCase().includes('amount') ||
            col.toLowerCase().includes('price') ||
            col.toLowerCase().includes('total') ||
            col.toLowerCase().includes('net') ||
            col.toLowerCase().includes('gross')
          )
        );

        columnAnalysis.push({
          id: file.id,
          file_name: file.file_name,
          total_columns: columns.length,
          all_columns: columns.slice(0, 20), // First 20 columns
          cost_related_columns: costColumns,
          has_net_charge: columns.includes('Net Charge'),
          has_gross_rate: columns.includes('Gross Rate'),
          columns_containing_charge: columns.filter((col: string) => col && col.toLowerCase().includes('charge')),
          columns_containing_rate: columns.filter((col: string) => col && col.toLowerCase().includes('rate')),
          columns_containing_cost: columns.filter((col: string) => col && col.toLowerCase().includes('cost'))
        });

      } catch (error) {
        columnAnalysis.push({
          id: file.id,
          file_name: file.file_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Column analysis for transportation cost extraction',
      files: columnAnalysis,
      recommendations: [
        'Check if exact column names match what the extraction logic expects',
        'UPS files should have "Net Charge" column',
        'TL files should have "Gross Rate" column',
        'RL files will use the column with highest numeric values'
      ]
    });

  } catch (error) {
    console.error('Error analyzing columns:', error);
    return NextResponse.json({
      error: 'Failed to analyze columns',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
