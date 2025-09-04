import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get R&L file and analyze in detail
    const rlFile = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE file_name ILIKE '%r&l%curriculum%'
      AND processed_data IS NOT NULL
      LIMIT 1
    `;

    if (rlFile.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'R&L file not found'
      });
    }

    const data = rlFile[0].processed_data.parsedData;
    console.log(`R&L file: ${rlFile[0].file_name}`);
    console.log(`Rows: ${data.length}`);

    // Get complete column analysis
    const columnAnalysis = {};
    const allColumns = new Set();
    
    // Sample first 20 rows to understand structure
    const sampleRows = data.slice(0, 20);
    
    for (const row of sampleRows) {
      if (typeof row === 'object' && row) {
        for (const [key, value] of Object.entries(row)) {
          allColumns.add(key);
          
          if (!columnAnalysis[key]) {
            columnAnalysis[key] = {
              sample_values: [],
              numeric_values: [],
              total_test: 0,
              count_test: 0
            };
          }
          
          // Collect sample values
          if (columnAnalysis[key].sample_values.length < 5 && value) {
            columnAnalysis[key].sample_values.push(String(value));
          }
          
          // Test if numeric and substantial
          const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
          if (!isNaN(numValue) && numValue > 1) {
            columnAnalysis[key].numeric_values.push(numValue);
            if (numValue > 50) { // Potential cost threshold
              columnAnalysis[key].total_test += numValue;
              columnAnalysis[key].count_test++;
            }
          }
        }
      }
    }

    console.log('R&L columns found:', Array.from(allColumns));

    // Now test full extraction for each promising column
    const fullExtractionTests = {};
    
    for (const col of Array.from(allColumns)) {
      if (columnAnalysis[col].count_test > 0) { // Only test columns with potential cost values
        let fullTotal = 0;
        let fullCount = 0;
        
        for (const row of data) {
          if (typeof row === 'object' && row && row[col]) {
            const numValue = parseFloat(String(row[col]).replace(/[$,\s]/g, ''));
            if (!isNaN(numValue) && numValue > 50) {
              fullTotal += numValue;
              fullCount++;
            }
          }
        }
        
        if (fullTotal > 0) {
          fullExtractionTests[col] = {
            total: fullTotal,
            count: fullCount,
            average: fullTotal / fullCount,
            sample_values: columnAnalysis[col].sample_values
          };
          
          console.log(`R&L "${col}": $${fullTotal} from ${fullCount} values (avg: $${fullTotal/fullCount})`);
        }
      }
    }

    // Find the best column
    const bestColumn = Object.entries(fullExtractionTests).reduce((best, [col, stats]) => {
      return (stats.total > (best.stats?.total || 0)) ? {column: col, stats} : best;
    }, {column: null, stats: null});

    // Also check for specific patterns that might be hidden
    const patternTests = {};
    const patterns = ['charge', 'cost', 'amount', 'total', 'net', 'freight', 'rate'];
    
    for (const pattern of patterns) {
      const matchingCols = Array.from(allColumns).filter(col => 
        col.toLowerCase().includes(pattern)
      );
      
      if (matchingCols.length > 0) {
        patternTests[pattern] = matchingCols;
      }
    }

    return NextResponse.json({
      success: true,
      rl_analysis: {
        file_name: rlFile[0].file_name,
        total_rows: data.length,
        total_columns: allColumns.size,
        all_columns: Array.from(allColumns),
        column_analysis: columnAnalysis,
        full_extraction_tests: fullExtractionTests,
        best_column: bestColumn,
        pattern_matches: patternTests,
        sample_row: data[0] || null
      },
      recommendation: bestColumn.column ? 
        `Use column "${bestColumn.column}" which extracts $${bestColumn.stats.total} from ${bestColumn.stats.count} values` :
        'No suitable cost column found - may need different extraction approach'
    });

  } catch (error) {
    console.error('Error debugging R&L specifically:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
