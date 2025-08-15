import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { sql } = await import('@/lib/database');
  
  try {
    console.log('🔍 Direct TL file inspection starting...');
    
    // Find TL files
    const files = await sql`
      SELECT id, file_name, processing_status, processed_data, scenario_id
      FROM data_files
      WHERE file_name ILIKE '%TL%' OR file_name ILIKE '%freight%' OR file_name ILIKE '%transport%'
      ORDER BY id DESC
    `;

    let results = {
      search_performed: true,
      files_found: files.length,
      files_details: [],
      baseline_extracted: null,
      transport_optimizer_updated: false
    };

    console.log(`Found ${files.length} potential TL files`);

    for (const file of files) {
      console.log(`\n📁 Examining: ${file.file_name}`);
      
      let fileDetail = {
        id: file.id,
        name: file.file_name,
        scenario_id: file.scenario_id,
        status: file.processing_status,
        has_data: !!file.processed_data?.data,
        data_summary: null,
        baseline_candidates: []
      };

      if (file.processed_data?.data) {
        const data = file.processed_data.data;
        console.log(`  📊 Data rows: ${data.length}`);
        
        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`  📋 Columns: ${columns.join(', ')}`);
          
          fileDetail.data_summary = {
            rows: data.length,
            columns: columns,
            first_row: data[0],
            last_row: data[data.length - 1]
          };

          // Look for freight costs - check all rows for totals
          let candidateValues = [];
          
          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            for (const [key, value] of Object.entries(row)) {
              let numValue = null;
              
              // Try to parse as number
              if (typeof value === 'number' && value > 100000) {
                numValue = value;
              } else if (typeof value === 'string') {
                const cleaned = value.replace(/[$,\s]/g, '');
                if (/^\d+\.?\d*$/.test(cleaned)) {
                  numValue = parseFloat(cleaned);
                }
              }
              
              if (numValue && numValue > 100000) {
                const keyLower = key.toLowerCase();
                const isLikelyFreight = keyLower.includes('freight') || 
                                      keyLower.includes('transport') || 
                                      keyLower.includes('cost') ||
                                      keyLower.includes('total') ||
                                      keyLower.includes('spend');
                
                candidateValues.push({
                  row: i,
                  column: key,
                  value: numValue,
                  original: value,
                  likely_freight: isLikelyFreight,
                  row_context: Object.keys(row).slice(0, 5).map(k => `${k}: ${row[k]}`).join(', ')
                });
              }
            }
          }

          // Sort by value descending to find the largest (likely total)
          candidateValues.sort((a, b) => b.value - a.value);
          fileDetail.baseline_candidates = candidateValues.slice(0, 10); // Top 10

          console.log(`  💰 Found ${candidateValues.length} candidate values`);
          if (candidateValues.length > 0) {
            const top = candidateValues[0];
            console.log(`  🎯 Largest value: $${(top.value/1000000).toFixed(1)}M in column "${top.column}"`);
          }
        }
      } else {
        console.log(`  ❌ No processed data available`);
      }

      results.files_details.push(fileDetail);
    }

    // Find the best baseline candidate
    let bestBaseline = null;
    let bestFile = null;

    for (const file of results.files_details) {
      if (file.baseline_candidates && file.baseline_candidates.length > 0) {
        const topCandidate = file.baseline_candidates[0];
        if (!bestBaseline || topCandidate.value > bestBaseline.value) {
          bestBaseline = topCandidate;
          bestFile = file;
        }
      }
    }

    if (bestBaseline && bestBaseline.value > 1000000) {
      console.log(`\n✅ BEST BASELINE FOUND: $${(bestBaseline.value/1000000).toFixed(1)}M`);
      console.log(`   From file: ${bestFile.name}`);
      console.log(`   Column: ${bestBaseline.column}`);
      console.log(`   Row context: ${bestBaseline.row_context}`);

      results.baseline_extracted = {
        value: Math.round(bestBaseline.value),
        formatted: `$${(bestBaseline.value/1000000).toFixed(1)}M`,
        source_file: bestFile.name,
        source_column: bestBaseline.column,
        source_row: bestBaseline.row,
        confidence: bestBaseline.likely_freight ? 'High' : 'Medium',
        vs_estimated: {
          old_estimate: 5500000,
          new_actual: Math.round(bestBaseline.value),
          difference: Math.round(bestBaseline.value) - 5500000,
          difference_formatted: `${Math.round(bestBaseline.value) > 5500000 ? '+' : ''}$${((Math.round(bestBaseline.value) - 5500000)/1000000).toFixed(1)}M`
        }
      };

      // Try to update the Transport Optimizer
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const filePath = path.join(process.cwd(), 'app/api/simple-transport-generation/route.ts');
        let fileContent = await fs.readFile(filePath, 'utf-8');
        
        const newValue = Math.round(bestBaseline.value);
        const replacement = `const baseline2025FreightCost = ${newValue}; // Extracted from ${bestFile.name}`;
        
        fileContent = fileContent.replace(
          /const baseline2025FreightCost = \d+;[^\n]*/g,
          replacement
        );
        
        await fs.writeFile(filePath, fileContent);
        
        results.transport_optimizer_updated = true;
        console.log(`🔧 Updated Transport Optimizer with baseline: $${(newValue/1000000).toFixed(1)}M`);
        
      } catch (updateError) {
        console.error('❌ Failed to update Transport Optimizer:', updateError);
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Direct TL check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
