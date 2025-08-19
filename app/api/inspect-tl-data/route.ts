import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('=== INSPECTING TL FILE DATA ===');
    
    // Find the TL file
    const tlFiles = await sql`
      SELECT id, file_name, processing_status, processed_data, metadata, scenario_id, created_at
      FROM data_files
      WHERE file_name ILIKE '%2024 TOTALS%TL%' OR file_name ILIKE '%TL%2024%'
      ORDER BY created_at DESC
    `;

    if (tlFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No TL files found',
        suggestion: 'Check if the file name contains "TL" and "2024"'
      });
    }

    const inspectionResults = [];

    for (const file of tlFiles) {
      console.log(`Inspecting file: ${file.file_name}`);
      
      let fileInspection = {
        file_id: file.id,
        file_name: file.file_name,
        scenario_id: file.scenario_id,
        processing_status: file.processing_status,
        created_at: file.created_at,
        has_processed_data: !!file.processed_data,
        baseline_found: null,
        data_structure: null,
        freight_costs_found: [],
        total_analysis: null
      };

      if (file.processed_data && file.processed_data.data) {
        const data = file.processed_data.data;
        console.log(`File has ${data.length} rows of data`);
        
        fileInspection.data_structure = {
          total_rows: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : [],
          sample_first_row: data.length > 0 ? data[0] : null,
          sample_last_row: data.length > 1 ? data[data.length - 1] : null
        };

        // Look for freight costs
        let totalFound = 0;
        let largestValue = 0;
        let largestValueInfo = null;

        for (let i = 0; i < Math.min(data.length, 50); i++) { // Check first 50 rows
          const row = data[i];
          
          Object.keys(row).forEach(key => {
            const value = row[key];
            let numValue = null;
            
            if (typeof value === 'number' && value > 50000) {
              numValue = value;
            } else if (typeof value === 'string') {
              const cleaned = value.replace(/[$,\s]/g, '');
              const parsed = parseFloat(cleaned);
              if (!isNaN(parsed) && parsed > 50000) {
                numValue = parsed;
              }
            }
            
            if (numValue && numValue > 50000) {
              const keyLower = key.toLowerCase();
              const isFreightRelated = keyLower.includes('freight') || 
                                     keyLower.includes('transport') || 
                                     keyLower.includes('cost') ||
                                     keyLower.includes('total') ||
                                     keyLower.includes('spend') ||
                                     keyLower.includes('amount');
              
              if (isFreightRelated || numValue > 1000000) {
                totalFound += numValue;
                
                fileInspection.freight_costs_found.push({
                  row_index: i,
                  column: key,
                  original_value: value,
                  parsed_value: numValue,
                  is_freight_related: isFreightRelated,
                  formatted_value: `$${(numValue/1000000).toFixed(1)}M`
                });

                if (numValue > largestValue) {
                  largestValue = numValue;
                  largestValueInfo = {
                    row_index: i,
                    column: key,
                    value: numValue,
                    original_value: value,
                    row_context: row
                  };
                }
              }
            }
          });
        }

        fileInspection.total_analysis = {
          sum_of_all_costs: totalFound,
          largest_single_value: largestValue,
          largest_value_info: largestValueInfo,
          recommended_baseline: largestValue > 0 ? largestValue : totalFound,
          formatted_recommended: largestValue > 0 
            ? `$${(largestValue/1000000).toFixed(1)}M` 
            : `$${(totalFound/1000000).toFixed(1)}M`
        };

        fileInspection.baseline_found = largestValue > 0 ? largestValue : totalFound;
        
        console.log(`Analysis for ${file.file_name}:`);
        console.log(`- Found ${fileInspection.freight_costs_found.length} freight-related values`);
        console.log(`- Sum of costs: $${(totalFound/1000000).toFixed(1)}M`);
        console.log(`- Largest value: $${(largestValue/1000000).toFixed(1)}M`);
        console.log(`- Recommended baseline: $${(fileInspection.baseline_found/1000000).toFixed(1)}M`);
      }

      inspectionResults.push(fileInspection);
    }

    // Find the best file with the most complete data
    const bestFile = inspectionResults.find(f => f.baseline_found && f.baseline_found > 1000000) ||
                     inspectionResults[0];

    return NextResponse.json({
      success: true,
      tl_files_found: tlFiles.length,
      files_inspected: inspectionResults,
      recommended_file: bestFile,
      recommended_baseline: bestFile?.baseline_found 
        ? {
            value: Math.round(bestFile.baseline_found),
            formatted: `$${(bestFile.baseline_found/1000000).toFixed(1)}M`,
            source_file: bestFile.file_name,
            confidence: bestFile.freight_costs_found?.length > 5 ? 'High' : 'Medium'
          }
        : null,
      next_steps: bestFile?.baseline_found 
        ? ['Use this baseline to update Transport Optimizer', 'Regenerate transport scenarios']
        : ['Process the TL file in Data Processor first', 'Ensure freight cost data is properly extracted']
    });

  } catch (error) {
    console.error('TL data inspection failed:', error);
    return NextResponse.json({
      success: false,
      error: `Inspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
