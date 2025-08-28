import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get transportation files and extract using correct methods
    const files = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      AND processed_data IS NOT NULL
    `;

    let upsTotal = 0;
    let tlTotal = 0;
    let rlTotal = 0;

    for (const file of files) {
      const fileNameLower = file.file_name.toLowerCase();
      const data = file.processed_data.parsedData;
      
      if (!data || !Array.isArray(data)) continue;

      if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
        // UPS: Extract from "Net Charge"
        for (const row of data) {
          if (row && row['Net Charge']) {
            const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 0.01) {
              upsTotal += numValue;
            }
          }
        }
      } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
        // TL: Extract from "Gross Rate"
        for (const row of data) {
          if (row && row['Gross Rate']) {
            const numValue = parseFloat(String(row['Gross Rate']).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 100) {
              tlTotal += numValue;
            }
          }
        }
      } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
        // R&L: Find best cost column
        const allColumns = new Set<string>();
        for (const row of data.slice(0, 10)) {
          if (typeof row === 'object' && row) {
            Object.keys(row).forEach(key => allColumns.add(String(key)));
          }
        }

        let bestTotal = 0;
        let bestColumn: string | null = null;

        for (const col of Array.from(allColumns)) {
          let testTotal = 0;
          for (const row of data as any[]) {
            if (row && (row as any)[col]) {
              const numValue = parseFloat(String((row as any)[col]).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 50) {
                testTotal += numValue;
              }
            }
          }
          if (testTotal > bestTotal) {
            bestTotal = testTotal;
            bestColumn = col;
          }
        }
        
        rlTotal = bestTotal;
        console.log(`R&L best column: "${bestColumn}" with $${bestTotal}`);
      }
    }

    const grandTotal = upsTotal + tlTotal + rlTotal;

    return NextResponse.json({
      success: true,
      transportation_baseline_2024: {
        ups_parcel_costs: upsTotal,
        tl_freight_costs: tlTotal,
        ltl_freight_costs: rlTotal,
        total_baseline: grandTotal
      },
      formatted: {
        ups: `$${(upsTotal / 1000).toFixed(0)}K`,
        tl: `$${(tlTotal / 1000).toFixed(0)}K`,
        rl: `$${(rlTotal / 1000).toFixed(0)}K`,
        total: grandTotal > 1000000 
          ? `$${(grandTotal / 1000000).toFixed(2)}M`
          : `$${(grandTotal / 1000).toFixed(0)}K`
      },
      status: {
        all_extractions_successful: upsTotal > 0 && tlTotal > 0 && rlTotal > 0,
        baseline_ready_for_2025: grandTotal > 100000
      }
    });

  } catch (error) {
    console.error('Error getting transport total:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
