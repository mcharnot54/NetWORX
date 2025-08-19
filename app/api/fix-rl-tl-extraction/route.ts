import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    const results = {
      success: true,
      rl_extraction: { amount: 0, rows_processed: 0, values_found: 0, file_id: null, issue: 'not_started' },
      tl_extraction: { amount: 0, rows_processed: 0, values_found: 0, file_id: null, issue: 'not_started' },
      debug_info: []
    };

    // Get the specific problematic files
    const problemFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name IN (
        'R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx',
        '2024 TOTALS WITH INBOUND AND OUTBOUND TL (2).xlsx'
      )
      AND processed_data IS NOT NULL
      ORDER BY file_name, id DESC
    `;

    for (const file of problemFiles) {
      console.log(`\n=== FIXING: ${file.file_name} ===`);
      
      // Deep extract ALL possible data arrays
      const allDataArrays = extractAllPossibleArrays(file.processed_data);
      
      results.debug_info.push({
        file_id: file.id,
        file_name: file.file_name,
        arrays_found: allDataArrays.length,
        array_details: allDataArrays.map(arr => ({
          path: arr.path,
          length: arr.data.length,
          sample_keys: arr.data.length > 0 && typeof arr.data[0] === 'object' ? Object.keys(arr.data[0]) : []
        }))
      });

      // Process R&L file
      if (file.file_name === 'R&L - CURRICULUM ASSOCIATES 1.1.2024-12.31.2024 .xlsx') {
        let bestResult = { amount: 0, rows_processed: 0, values_found: 0 };
        
        for (const arrayInfo of allDataArrays) {
          const rlResult = extractRLFromAllColumns(arrayInfo.data, arrayInfo.path);
          if (rlResult.amount > bestResult.amount) {
            bestResult = rlResult;
            results.rl_extraction = {
              ...bestResult,
              file_id: file.id,
              issue: bestResult.amount > 0 ? 'resolved' : 'no_data_found'
            };
          }
        }
        
        if (bestResult.amount === 0) {
          results.rl_extraction.issue = `Only found ${allDataArrays.length} arrays with max ${Math.max(...allDataArrays.map(a => a.data.length))} rows`;
        }
      }

      // Process TL file  
      if (file.file_name === '2024 TOTALS WITH INBOUND AND OUTBOUND TL (2).xlsx') {
        let bestResult = { amount: 0, rows_processed: 0, values_found: 0 };
        
        for (const arrayInfo of allDataArrays) {
          const tlResult = extractTLFromAllColumns(arrayInfo.data, arrayInfo.path);
          if (tlResult.amount > bestResult.amount) {
            bestResult = tlResult;
            results.tl_extraction = {
              ...bestResult,
              file_id: file.id,
              issue: bestResult.amount > 0 ? 'resolved' : 'no_data_found'
            };
          }
        }
        
        if (bestResult.amount === 0) {
          results.tl_extraction.issue = `Found ${allDataArrays.length} arrays, max ${Math.max(...allDataArrays.map(a => a.data.length))} rows, but no column H matches`;
        }
      }
    }

    // Calculate total if both found
    results.total_rl_tl = results.rl_extraction.amount + results.tl_extraction.amount;

    return NextResponse.json(results);

  } catch (error) {
    console.error('Error fixing R&L/TL extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Extract ALL possible arrays from any nested structure
function extractAllPossibleArrays(data: any, basePath = 'root', maxDepth = 5): Array<{path: string, data: any[]}> {
  const arrays: Array<{path: string, data: any[]}> = [];
  
  function findArrays(obj: any, currentPath: string, depth: number) {
    if (depth >= maxDepth || !obj) return;
    
    if (Array.isArray(obj) && obj.length > 0) {
      arrays.push({ path: currentPath, data: obj });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        findArrays(value, `${currentPath}.${key}`, depth + 1);
      }
    }
  }
  
  findArrays(data, basePath, 0);
  return arrays;
}

// Extract R&L data from any column that might contain the values
function extractRLFromAllColumns(data: any[], path: string): { amount: number, rows_processed: number, values_found: number } {
  let total = 0;
  let valuesFound = 0;
  
  console.log(`Trying R&L extraction from ${path} with ${data.length} rows`);
  
  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      // Try ANY column that might have monetary values for R&L
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(String(value).replace(/[$,\s%]/g, ''));
        
        // R&L LTL values are typically $50-$5000 range
        if (!isNaN(numValue) && numValue >= 10 && numValue <= 50000) {
          // Additional validation - likely R&L columns
          const keyLower = key.toLowerCase();
          if (keyLower.includes('charge') || keyLower.includes('cost') || 
              keyLower.includes('amount') || keyLower.includes('total') ||
              keyLower.includes('net') || keyLower.includes('freight') ||
              keyLower.includes('revenue') || key === 'V' || key.includes('EMPTY')) {
            total += numValue;
            valuesFound++;
          }
        }
      }
    }
  }
  
  console.log(`R&L extraction result: $${total} from ${valuesFound} values`);
  return { amount: total, rows_processed: data.length, values_found: valuesFound };
}

// Extract TL data from any column that might contain the values  
function extractTLFromAllColumns(data: any[], path: string): { amount: number, rows_processed: number, values_found: number } {
  let total = 0;
  let valuesFound = 0;
  
  console.log(`Trying TL extraction from ${path} with ${data.length} rows`);
  
  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;
    
    for (const [key, value] of Object.entries(row)) {
      // Try ANY column that might have monetary values for TL
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(String(value).replace(/[$,\s%]/g, ''));
        
        // TL values are typically $500-$50000 range  
        if (!isNaN(numValue) && numValue >= 100 && numValue <= 100000) {
          // Additional validation - likely TL columns
          const keyLower = key.toLowerCase();
          if (keyLower.includes('charge') || keyLower.includes('cost') || 
              keyLower.includes('amount') || keyLower.includes('total') ||
              keyLower.includes('freight') || keyLower.includes('rate') ||
              keyLower.includes('price') || key === 'H' || key.includes('EMPTY')) {
            total += numValue;
            valuesFound++;
          }
        }
      }
    }
  }
  
  console.log(`TL extraction result: $${total} from ${valuesFound} values`);
  return { amount: total, rows_processed: data.length, values_found: valuesFound };
}
