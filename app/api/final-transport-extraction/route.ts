import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get all transportation files
    const transportFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      AND processed_data IS NOT NULL
    `;

    console.log(`Found ${transportFiles.length} transportation files`);

    const extractions = {
      ups: { total: 0, details: null },
      tl: { total: 0, details: null },
      rl: { total: 0, details: null }
    };

    for (const file of transportFiles) {
      const fileNameLower = file.file_name.toLowerCase();
      
      if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
        // UPS extraction - confirmed working
        extractions.ups = extractUPSCosts(file);
        
      } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
        // TL extraction - find and use best column
        extractions.tl = extractTLCosts(file);
        
      } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
        // R&L extraction - find and use best column
        extractions.rl = extractRLCosts(file);
      }
    }

    const totalTransportationBaseline = extractions.ups.total + extractions.tl.total + extractions.rl.total;

    console.log('\n=== FINAL TRANSPORTATION BASELINE EXTRACTION ===');
    console.log(`UPS (Net Charge): $${extractions.ups.total}`);
    console.log(`TL (Best Column): $${extractions.tl.total}`);
    console.log(`R&L (Best Column): $${extractions.rl.total}`);
    console.log(`TOTAL BASELINE: $${totalTransportationBaseline}`);

    return NextResponse.json({
      success: true,
      transportation_baseline_2024: {
        ups_parcel_costs: extractions.ups.total,
        tl_freight_costs: extractions.tl.total,
        ltl_freight_costs: extractions.rl.total,
        total_transportation_baseline: totalTransportationBaseline
      },
      formatted_totals: {
        ups: formatCurrency(extractions.ups.total),
        tl: formatCurrency(extractions.tl.total),
        rl: formatCurrency(extractions.rl.total),
        total: formatCurrency(totalTransportationBaseline)
      },
      extraction_details: {
        ups: extractions.ups.details,
        tl: extractions.tl.details,
        rl: extractions.rl.details
      },
      ready_for_2025_planning: {
        baseline_complete: totalTransportationBaseline > 100000,
        all_files_processed: extractions.ups.total > 0 && extractions.tl.total > 0 && extractions.rl.total > 0,
        recommendation: totalTransportationBaseline > 100000 ? 
          "Transportation baseline ready for 2025 budget calculations" :
          "Additional validation needed for transportation costs"
      }
    });

  } catch (error) {
    console.error('Error in final transport extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function extractUPSCosts(file: any) {
  console.log('\n=== UPS EXTRACTION (CONFIRMED) ===');
  
  const processedData = file.processed_data;
  let total = 0;
  let count = 0;
  
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    for (const row of processedData.parsedData) {
      if (typeof row === 'object' && row && row['Net Charge']) {
        const numValue = parseFloat(String(row['Net Charge']).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0.01) {
          total += numValue;
          count++;
        }
      }
    }
  }
  
  console.log(`UPS: $${total} from ${count} Net Charge values (all 4 tabs combined)`);
  
  return {
    total,
    details: {
      file_name: file.file_name,
      extraction_method: 'Net Charge column (all tabs combined)',
      values_found: count,
      total_rows: processedData.parsedData?.length || 0
    }
  };
}

function extractTLCosts(file: any) {
  console.log('\n=== TL EXTRACTION ===');
  
  const processedData = file.processed_data;
  let bestTotal = 0;
  let bestColumn = null;
  let bestCount = 0;
  
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    const data = processedData.parsedData;
    
    // Get all column names
    const columns = new Set();
    for (const row of data.slice(0, 20)) {
      if (typeof row === 'object' && row) {
        Object.keys(row).forEach(key => columns.add(key));
      }
    }
    
    console.log(`TL file has ${data.length} rows with columns:`, Array.from(columns).slice(0, 10));
    
    // Test each column that might contain costs
    const potentialColumns = Array.from(columns).filter(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('total') || 
             colLower.includes('cost') || 
             colLower.includes('amount') || 
             colLower.includes('charge') || 
             colLower.includes('freight') ||
             col === 'H' || 
             col.includes('__EMPTY_');
    });
    
    console.log('Testing TL columns:', potentialColumns);
    
    for (const col of potentialColumns) {
      let testTotal = 0;
      let testCount = 0;
      
      for (const row of data) {
        if (typeof row === 'object' && row && row[col]) {
          const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 1000) { // TL costs should be substantial
            testTotal += numValue;
            testCount++;
          }
        }
      }
      
      if (testTotal > bestTotal) {
        bestTotal = testTotal;
        bestColumn = col;
        bestCount = testCount;
      }
      
      if (testTotal > 0) {
        console.log(`TL "${col}": $${testTotal} from ${testCount} values`);
      }
    }
  }
  
  console.log(`TL BEST: "${bestColumn}" with $${bestTotal}`);
  
  return {
    total: bestTotal,
    details: {
      file_name: file.file_name,
      extraction_method: `Best column found: "${bestColumn}"`,
      values_found: bestCount,
      total_rows: processedData.parsedData?.length || 0,
      column_used: bestColumn
    }
  };
}

function extractRLCosts(file: any) {
  console.log('\n=== R&L EXTRACTION ===');
  
  const processedData = file.processed_data;
  let bestTotal = 0;
  let bestColumn = null;
  let bestCount = 0;
  
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    const data = processedData.parsedData;
    
    // Get all column names
    const columns = new Set();
    for (const row of data.slice(0, 20)) {
      if (typeof row === 'object' && row) {
        Object.keys(row).forEach(key => columns.add(key));
      }
    }
    
    console.log(`R&L file has ${data.length} rows with columns:`, Array.from(columns).slice(0, 10));
    
    // Test each column that might contain costs
    const potentialColumns = Array.from(columns).filter(col => {
      const colLower = col.toLowerCase();
      return colLower.includes('net') || 
             colLower.includes('charge') || 
             colLower.includes('amount') || 
             colLower.includes('cost') || 
             colLower.includes('freight') ||
             col === 'V' || 
             col.includes('__EMPTY_');
    });
    
    console.log('Testing R&L columns:', potentialColumns);
    
    for (const col of potentialColumns) {
      let testTotal = 0;
      let testCount = 0;
      
      for (const row of data) {
        if (typeof row === 'object' && row && row[col]) {
          const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 100) { // R&L costs threshold
            testTotal += numValue;
            testCount++;
          }
        }
      }
      
      if (testTotal > bestTotal) {
        bestTotal = testTotal;
        bestColumn = col;
        bestCount = testCount;
      }
      
      if (testTotal > 0) {
        console.log(`R&L "${col}": $${testTotal} from ${testCount} values`);
      }
    }
  }
  
  console.log(`R&L BEST: "${bestColumn}" with $${bestTotal}`);
  
  return {
    total: bestTotal,
    details: {
      file_name: file.file_name,
      extraction_method: `Best column found: "${bestColumn}"`,
      values_found: bestCount,
      total_rows: processedData.parsedData?.length || 0,
      column_used: bestColumn
    }
  };
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
