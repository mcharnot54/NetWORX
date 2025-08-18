import { NextRequest, NextResponse } from "next/server";
import { classifyColumns } from "@/lib/columnClassifier";
import { extractTransportFeatures } from "@/lib/columnFeatures";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get all transport files
    const files = await sql`
      SELECT 
        id,
        file_name,
        file_type,
        processing_status,
        processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%' OR
        file_name ILIKE '%r&l%' OR
        file_name ILIKE '%curriculum%' OR
        file_name ILIKE '%tl%' OR
        file_name ILIKE '%truckload%' OR
        file_name ILIKE '%totals%'
      )
      AND processed_data IS NOT NULL
      ORDER BY id DESC
    `;

    console.log(`Found ${files.length} potential transport files for enhanced extraction`);

    const results = {
      success: true,
      enhanced_extractions: [],
      transport_totals: {
        ups_parcel: { amount: 0, method: '', confidence: 0 },
        rl_ltl: { amount: 0, method: '', confidence: 0 },
        tl_costs: { amount: 0, method: '', confidence: 0 }
      },
      total_baseline: 0
    };

    for (const file of files) {
      console.log(`\n=== ENHANCED PROCESSING: ${file.file_name} ===`);
      
      let data: any[] = [];
      let dataSource = 'unknown';

      // Smart data extraction using the same logic as enhanced Excel validator
      if (file.processed_data?.parsedData && Array.isArray(file.processed_data.parsedData)) {
        data = file.processed_data.parsedData;
        dataSource = 'parsedData';
      } else if (file.processed_data?.data) {
        if (Array.isArray(file.processed_data.data)) {
          data = file.processed_data.data;
          dataSource = 'data_array';
        } else if (typeof file.processed_data.data === 'object') {
          // Look for multi-tab structure
          const sheets = Object.keys(file.processed_data.data);
          console.log(`Found sheets: ${sheets.join(', ')}`);
          
          // For R&L files, specifically look for Detail tab
          if (file.file_name.toLowerCase().includes('r&l') || file.file_name.toLowerCase().includes('curriculum')) {
            const detailSheet = sheets.find(s => s.toLowerCase().includes('detail'));
            if (detailSheet && Array.isArray(file.processed_data.data[detailSheet])) {
              data = file.processed_data.data[detailSheet];
              dataSource = `${detailSheet}_tab`;
              console.log(`Using Detail tab: ${detailSheet} with ${data.length} rows`);
            }
          }
          
          // For TL files, process all relevant sheets
          if (file.file_name.toLowerCase().includes('tl') || file.file_name.toLowerCase().includes('total')) {
            let combinedData: any[] = [];
            for (const sheet of sheets) {
              if (Array.isArray(file.processed_data.data[sheet])) {
                combinedData = [...combinedData, ...file.processed_data.data[sheet]];
                console.log(`Added ${file.processed_data.data[sheet].length} rows from ${sheet}`);
              }
            }
            if (combinedData.length > 0) {
              data = combinedData;
              dataSource = `multi_sheet_${sheets.length}`;
            }
          }
          
          // Fallback: use first available sheet
          if (data.length === 0) {
            const firstSheet = sheets[0];
            if (firstSheet && Array.isArray(file.processed_data.data[firstSheet])) {
              data = file.processed_data.data[firstSheet];
              dataSource = `${firstSheet}_fallback`;
            }
          }
        }
      }

      if (data.length === 0) {
        console.log(`No usable data found in ${file.file_name}`);
        continue;
      }

      console.log(`Processing ${data.length} rows from ${dataSource}`);

      // Get headers and filter out empty rows
      const validRows = data.filter(row => row && typeof row === 'object' && Object.keys(row).length > 0);
      if (validRows.length === 0) {
        console.log(`No valid rows found`);
        continue;
      }

      const headers = Object.keys(validRows[0]);
      console.log(`Found ${headers.length} columns:`, headers.slice(0, 10));

      // Use the advanced column classification system
      const columnAnalysis = classifyColumns(headers, validRows.slice(0, 100));
      
      console.log(`Column analysis complete:`);
      console.log(`- Transport columns found: ${columnAnalysis.columns.filter(c => c.transportAnalysis.isTransportColumn).length}`);
      if (columnAnalysis.bestTransportColumn) {
        console.log(`- Best transport column: ${columnAnalysis.bestTransportColumn.header} ($${columnAnalysis.bestTransportColumn.amount})`);
      }

      // Extract costs using smart classification
      let extractedAmount = 0;
      let extractionMethod = 'none';
      let confidence = 0;

      if (columnAnalysis.bestTransportColumn) {
        extractedAmount = columnAnalysis.bestTransportColumn.amount;
        extractionMethod = 'smart_classification';
        confidence = columnAnalysis.bestTransportColumn.confidence;
      } else {
        // Fallback: manual pattern matching for specific cases
        for (const column of columnAnalysis.columns) {
          if (column.header === 'V' || column.header.toLowerCase().includes('net') || 
              column.header.toLowerCase().includes('freight') || column.header.toLowerCase().includes('cost')) {
            
            const features = extractTransportFeatures(column.header, validRows.map(r => r[column.header]));
            if (features.isCurrency && features.currencyAmount > extractedAmount) {
              extractedAmount = features.currencyAmount;
              extractionMethod = 'pattern_fallback';
              confidence = 0.5;
            }
          }
        }
      }

      // Categorize by file type and update totals
      const fileName = file.file_name.toLowerCase();
      if (fileName.includes('ups')) {
        if (extractedAmount > results.transport_totals.ups_parcel.amount) {
          results.transport_totals.ups_parcel = {
            amount: extractedAmount,
            method: extractionMethod,
            confidence: confidence
          };
        }
      } else if (fileName.includes('r&l') || fileName.includes('curriculum')) {
        if (extractedAmount > results.transport_totals.rl_ltl.amount) {
          results.transport_totals.rl_ltl = {
            amount: extractedAmount,
            method: extractionMethod,
            confidence: confidence
          };
        }
      } else if (fileName.includes('tl') || fileName.includes('total')) {
        if (extractedAmount > results.transport_totals.tl_costs.amount) {
          results.transport_totals.tl_costs = {
            amount: extractedAmount,
            method: extractionMethod,
            confidence: confidence
          };
        }
      }

      results.enhanced_extractions.push({
        file_id: file.id,
        file_name: file.file_name,
        data_source: dataSource,
        rows_processed: validRows.length,
        extracted_amount: extractedAmount,
        extraction_method: extractionMethod,
        confidence: confidence,
        best_column: columnAnalysis.bestTransportColumn?.header || null,
        transport_columns_found: columnAnalysis.columns.filter(c => c.transportAnalysis.isTransportColumn).length
      });

      console.log(`Extracted $${extractedAmount} using ${extractionMethod} (${confidence.toFixed(2)} confidence)`);
    }

    // Calculate total
    results.total_baseline = 
      results.transport_totals.ups_parcel.amount +
      results.transport_totals.rl_ltl.amount +
      results.transport_totals.tl_costs.amount;

    console.log(`\n=== ENHANCED EXTRACTION COMPLETE ===`);
    console.log(`UPS: $${results.transport_totals.ups_parcel.amount}`);
    console.log(`R&L: $${results.transport_totals.rl_ltl.amount}`);
    console.log(`TL: $${results.transport_totals.tl_costs.amount}`);
    console.log(`TOTAL: $${results.total_baseline}`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('Enhanced transport extraction error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      transport_totals: {
        ups_parcel: { amount: 0, method: 'error', confidence: 0 },
        rl_ltl: { amount: 0, method: 'error', confidence: 0 },
        tl_costs: { amount: 0, method: 'error', confidence: 0 }
      },
      total_baseline: 0
    }, { status: 500 });
  }
}
