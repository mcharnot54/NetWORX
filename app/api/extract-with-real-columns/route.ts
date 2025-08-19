import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    const results = {
      ups: { total: 0, method: '', count: 0 },
      tl: { total: 0, method: '', count: 0 },
      rl: { total: 0, method: '', count: 0 }
    };

    // 1. UPS extraction (confirmed working)
    console.log('=== UPS EXTRACTION ===');
    const upsFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%ups%individual%item%cost%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (upsFile.length > 0) {
      const data = upsFile[0].processed_data.parsedData;
      let total = 0;
      let count = 0;
      
      for (const row of data) {
        if (typeof row === 'object' && row && row['Net Charge']) {
          const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 0.01) {
            total += numValue;
            count++;
          }
        }
      }
      
      results.ups = { total, method: 'Net Charge column (all 4 tabs)', count };
      console.log(`UPS: $${total} from ${count} values`);
    }

    // 2. TL extraction using "Gross Rate" column
    console.log('\n=== TL EXTRACTION ===');
    const tlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024%totals%tl%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (tlFile.length > 0) {
      const data = tlFile[0].processed_data.parsedData;
      let total = 0;
      let count = 0;
      
      console.log(`TL file has ${data.length} rows`);
      console.log('Sample TL row:', data[0]);
      
      // Test "Gross Rate" column specifically
      for (const row of data) {
        if (typeof row === 'object' && row && row['Gross Rate']) {
          const numValue = parseFloat(String(row['Gross Rate']).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 100) { // TL costs should be substantial
            total += numValue;
            count++;
            if (count <= 5) {
              console.log(`TL sample: Gross Rate = ${row['Gross Rate']} -> $${numValue}`);
            }
          }
        }
      }
      
      results.tl = { total, method: 'Gross Rate column (TL costs)', count };
      console.log(`TL: $${total} from ${count} values`);
    }

    // 3. R&L extraction - need to find the correct column
    console.log('\n=== R&L EXTRACTION ===');
    const rlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%r&l%curriculum%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (rlFile.length > 0) {
      const data = rlFile[0].processed_data.parsedData;
      
      console.log(`R&L file has ${data.length} rows`);
      console.log('Sample R&L row:', data[0]);
      
      // Get all columns to identify the correct one
      const allColumns = new Set();
      for (const row of data.slice(0, 10)) {
        if (typeof row === 'object' && row) {
          Object.keys(row).forEach(key => allColumns.add(key));
        }
      }
      
      console.log('R&L columns:', Array.from(allColumns));
      
      // Test each column to find the one with costs
      let bestTotal = 0;
      let bestMethod = '';
      let bestCount = 0;
      
      for (const col of Array.from(allColumns)) {
        let testTotal = 0;
        let testCount = 0;
        
        for (const row of data) {
          if (typeof row === 'object' && row && row[col]) {
            const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 50) { // R&L threshold
              testTotal += numValue;
              testCount++;
            }
          }
        }
        
        if (testTotal > bestTotal) {
          bestTotal = testTotal;
          bestMethod = col;
          bestCount = testCount;
        }
        
        if (testTotal > 0) {
          console.log(`R&L "${col}": $${testTotal} from ${testCount} values`);
        }
      }
      
      results.rl = { total: bestTotal, method: `${bestMethod} column (LTL costs)`, count: bestCount };
      console.log(`R&L BEST: $${bestTotal} from "${bestMethod}"`);
    }

    const grandTotal = results.ups.total + results.tl.total + results.rl.total;

    console.log('\n=== FINAL TRANSPORTATION BASELINE ===');
    console.log(`UPS Parcel: $${results.ups.total} (${results.ups.method})`);
    console.log(`TL Freight: $${results.tl.total} (${results.tl.method})`);
    console.log(`LTL Freight: $${results.rl.total} (${results.rl.method})`);
    console.log(`TOTAL: $${grandTotal}`);

    return NextResponse.json({
      success: true,
      transportation_baseline_2024: {
        ups_parcel_costs: {
          amount: results.ups.total,
          extraction_method: results.ups.method,
          values_found: results.ups.count,
          formatted: formatCurrency(results.ups.total)
        },
        tl_freight_costs: {
          amount: results.tl.total,
          extraction_method: results.tl.method,
          values_found: results.tl.count,
          formatted: formatCurrency(results.tl.total)
        },
        ltl_freight_costs: {
          amount: results.rl.total,
          extraction_method: results.rl.method,
          values_found: results.rl.count,
          formatted: formatCurrency(results.rl.total)
        },
        total_transportation_baseline: {
          amount: grandTotal,
          formatted: formatCurrency(grandTotal)
        }
      },
      summary: {
        all_files_extracted: results.ups.total > 0 && results.tl.total > 0 && results.rl.total > 0,
        baseline_ready: grandTotal > 100000,
        total_amount: grandTotal,
        formatted_total: formatCurrency(grandTotal)
      },
      extraction_status: {
        ups_status: results.ups.total > 0 ? 'SUCCESS' : 'FAILED',
        tl_status: results.tl.total > 0 ? 'SUCCESS' : 'FAILED',
        rl_status: results.rl.total > 0 ? 'SUCCESS' : 'FAILED'
      }
    });

  } catch (error) {
    console.error('Error extracting with real columns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatCurrency(amount: number): string {
  if (amount > 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount > 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toLocaleString()}`;
  }
}
