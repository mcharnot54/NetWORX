import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get all processed data files with their structure
    const dataFiles = await sql`
      SELECT 
        id,
        file_name,
        data_type,
        scenario_id,
        processing_status,
        processed_data
      FROM data_files
      WHERE processed_data IS NOT NULL
      ORDER BY id DESC
    `;

    const fileAnalysis = [];

    for (const file of dataFiles) {
      if (!file.processed_data?.data) continue;

      let data = file.processed_data.data;
      
      // Handle different data structures
      if (!Array.isArray(data)) {
        if (typeof data === 'object') {
          const keys = Object.keys(data);
          const arrayKey = keys.find(key => Array.isArray(data[key]));
          if (arrayKey) {
            data = data[arrayKey];
          } else {
            data = Object.entries(data).map(([key, value]) => ({ key, value }));
          }
        } else {
          continue;
        }
      }

      if (data.length === 0) continue;

      // Analyze the data structure
      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      
      // Look for cost-related columns
      const costColumns = columns.filter(col => {
        const colLower = col.toLowerCase();
        return colLower.includes('cost') || 
               colLower.includes('expense') || 
               colLower.includes('spend') || 
               colLower.includes('freight') || 
               colLower.includes('transport') || 
               colLower.includes('labor') || 
               colLower.includes('rent') || 
               colLower.includes('lease') || 
               colLower.includes('inventory') || 
               colLower.includes('warehouse') || 
               colLower.includes('operating') || 
               colLower.includes('total') ||
               colLower.includes('amount') ||
               colLower.includes('value') ||
               colLower.includes('price');
      });

      // Sample data from cost columns
      const costSamples = {};
      costColumns.forEach(col => {
        const values = data.slice(0, 5).map(row => row[col]).filter(val => val != null);
        if (values.length > 0) {
          costSamples[col] = values;
        }
      });

      // Look for large numeric values that might be costs
      const largeValues = [];
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        for (const [key, value] of Object.entries(row)) {
          let numVal = 0;
          if (typeof value === 'number') {
            numVal = value;
          } else if (typeof value === 'string') {
            const cleaned = value.replace(/[$,\s]/g, '');
            if (/^\d+\.?\d*$/.test(cleaned)) {
              numVal = parseFloat(cleaned);
            }
          }

          if (numVal > 10000) { // Values over $10K
            largeValues.push({
              row: i,
              column: key,
              value: numVal,
              formatted: numVal > 1000000 ? `$${(numVal/1000000).toFixed(1)}M` : `$${(numVal/1000).toFixed(0)}K`,
              original: value
            });
          }
        }
      }

      // Sort large values by amount
      largeValues.sort((a, b) => b.value - a.value);

      fileAnalysis.push({
        file_id: file.id,
        file_name: file.file_name,
        data_type: file.data_type,
        scenario_id: file.scenario_id,
        processing_status: file.processing_status,
        structure: {
          total_rows: data.length,
          total_columns: columns.length,
          all_columns: columns,
          cost_related_columns: costColumns,
          cost_samples: costSamples
        },
        large_values: largeValues.slice(0, 20), // Top 20 largest values
        sample_rows: data.slice(0, 3) // First 3 rows for context
      });
    }

    return NextResponse.json({
      success: true,
      total_files: dataFiles.length,
      processed_files: fileAnalysis.length,
      file_analysis: fileAnalysis,
      summary: {
        files_with_cost_data: fileAnalysis.filter(f => f.structure.cost_related_columns.length > 0).length,
        total_cost_columns: fileAnalysis.reduce((sum, f) => sum + f.structure.cost_related_columns.length, 0),
        files_with_large_values: fileAnalysis.filter(f => f.large_values.length > 0).length
      }
    });

  } catch (error) {
    console.error('Error examining processed data:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
