import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    console.log('=== RUNNING BASELINE EXTRACTION PROCESS ===');
    
    // Step 1: Find the TL file
    console.log('Step 1: Looking for TL file...');
    const tlFiles = await sql`
      SELECT id, file_name, processing_status, processed_data, metadata, scenario_id
      FROM data_files
      WHERE file_name ILIKE '%2024 TOTALS WITH INBOUND AND OUTBOUND TL%'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (tlFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'TL file not found',
        step: 1,
        details: 'Could not find "2024 TOTALS WITH INBOUND AND OUTBOUND TL" file'
      });
    }

    const tlFile = tlFiles[0];
    console.log('Found TL file:', tlFile.file_name, 'Status:', tlFile.processing_status);

    if (!tlFile.processed_data || !tlFile.processed_data.data) {
      return NextResponse.json({
        success: false,
        error: 'TL file not processed',
        step: 1,
        file_info: {
          id: tlFile.id,
          name: tlFile.file_name,
          status: tlFile.processing_status,
          scenario_id: tlFile.scenario_id
        },
        action_needed: 'Please validate this file in Data Processor first'
      });
    }

    // Step 2: Extract baseline from the data
    console.log('Step 2: Extracting baseline from TL file data...');
    const data = tlFile.processed_data.data;
    console.log(`Processing ${data.length} rows from TL file`);

    let baselineFreightCost = null;
    let totalFreightCost = 0;
    let analysisDetails = [];
    
    // Get sample of data structure
    const sampleRows = data.slice(0, 3);
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    
    console.log('Columns found:', columns);
    console.log('Sample data:', sampleRows);

    // Look for freight costs
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Convert to lowercase for easier matching
      const lowerRow = {};
      Object.keys(row).forEach(key => {
        lowerRow[key.toLowerCase()] = row[key];
      });

      // Look for freight/cost columns
      const freightColumns = Object.keys(lowerRow).filter(key =>
        key.includes('freight') || 
        key.includes('transport') || 
        key.includes('cost') ||
        key.includes('total') ||
        key.includes('spend') ||
        key.includes('amount')
      );

      for (const col of freightColumns) {
        const value = lowerRow[col];
        let numValue = null;
        
        if (typeof value === 'number' && value > 100000) {
          numValue = value;
        } else if (typeof value === 'string') {
          const parsed = parseFloat(value.replace(/[$,]/g, ''));
          if (!isNaN(parsed) && parsed > 100000) {
            numValue = parsed;
          }
        }
        
        if (numValue && numValue > 100000) { // Looking for significant freight costs
          totalFreightCost += numValue;
          analysisDetails.push({
            row_index: i,
            column: col,
            original_value: value,
            parsed_value: numValue,
            row_sample: Object.keys(row).reduce((obj, k) => {
              obj[k] = row[k];
              return obj;
            }, {})
          });
        }
      }
    }

    // Look for summary/total rows
    const summaryRows = data.filter((row, index) => {
      const rowStr = JSON.stringify(row).toLowerCase();
      const hasTotal = rowStr.includes('total') || rowStr.includes('sum') || rowStr.includes('grand');
      if (hasTotal) {
        console.log('Found summary row at index', index, ':', row);
      }
      return hasTotal;
    });

    // Find the largest single value (likely the grand total)
    let grandTotal = 0;
    let grandTotalSource = null;
    
    for (const detail of analysisDetails) {
      if (detail.parsed_value > grandTotal) {
        grandTotal = detail.parsed_value;
        grandTotalSource = detail;
      }
    }

    baselineFreightCost = grandTotal || totalFreightCost;

    console.log('Analysis results:');
    console.log('- Total freight cost (sum):', totalFreightCost);
    console.log('- Grand total (largest value):', grandTotal);
    console.log('- Using as baseline:', baselineFreightCost);

    // Step 3: Update Transport Optimizer if we found a valid baseline
    let updateResult = null;
    if (baselineFreightCost && baselineFreightCost > 1000000) {
      console.log('Step 3: Updating Transport Optimizer with baseline:', baselineFreightCost);
      
      try {
        // Read current transport generation file
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const filePath = path.join(process.cwd(), 'app/api/simple-transport-generation/route.ts');
        let fileContent = await fs.readFile(filePath, 'utf-8');
        
        // Replace baseline values
        const oldPattern = /const baseline2025FreightCost = \d+;.*$/gm;
        const newBaseline = `const baseline2025FreightCost = ${Math.round(baselineFreightCost)}; // Extracted from TL file: ${tlFile.file_name}`;
        
        fileContent = fileContent.replace(oldPattern, newBaseline);
        
        await fs.writeFile(filePath, fileContent);
        
        updateResult = {
          success: true,
          old_baseline: 5500000,
          new_baseline: Math.round(baselineFreightCost),
          baseline_change: Math.round(baselineFreightCost) - 5500000,
          source_file: tlFile.file_name
        };
        
        console.log('✅ Successfully updated Transport Optimizer baseline');
        
      } catch (updateError) {
        console.error('Error updating Transport Optimizer:', updateError);
        updateResult = {
          success: false,
          error: updateError.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      extraction_completed: true,
      source_file: {
        name: tlFile.file_name,
        id: tlFile.id,
        scenario_id: tlFile.scenario_id,
        processing_status: tlFile.processing_status
      },
      data_analysis: {
        total_rows: data.length,
        columns: columns,
        sample_data: sampleRows,
        freight_columns_found: analysisDetails.length,
        summary_rows_found: summaryRows.length
      },
      baseline_extraction: {
        total_freight_cost_sum: Math.round(totalFreightCost),
        grand_total_found: Math.round(grandTotal),
        baseline_used: Math.round(baselineFreightCost),
        source_detail: grandTotalSource,
        formatted_baseline: `$${(baselineFreightCost/1000000).toFixed(1)}M`
      },
      transport_optimizer_update: updateResult,
      analysis_details: analysisDetails.slice(0, 10) // Show first 10 for review
    });

  } catch (error) {
    console.error('Baseline extraction process failed:', error);
    return NextResponse.json({
      success: false,
      error: `Process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
