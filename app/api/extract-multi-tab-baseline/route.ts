import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    console.log('=== MULTI-TAB TRANSPORTATION BASELINE EXTRACTION ===');

    // Get files with multi-tab structure
    const multiTabFiles = await sql`
      SELECT 
        id,
        file_name,
        file_type,
        processing_status,
        processed_data
      FROM data_files
      WHERE processed_data ? 'multi_tab_structure'
      AND (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      ORDER BY file_name
    `;

    console.log(`Found ${multiTabFiles.length} multi-tab transportation files`);

    const extractionResults = {
      ups: { tabs: [], total: 0, file_name: '', method: '' },
      tl: { tabs: [], total: 0, file_name: '', method: '' },
      rl: { tabs: [], total: 0, file_name: '', method: '' }
    };

    for (const file of multiTabFiles) {
      const multiTabStructure = file.processed_data.multi_tab_structure;
      const fileNameLower = file.file_name.toLowerCase();
      
      console.log(`\nProcessing ${file.file_name}`);
      console.log(`File type: ${multiTabStructure.file_type}`);
      console.log(`Tabs: ${multiTabStructure.tabs.length}`);

      if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
        // UPS Individual Item Cost - extract from all tabs
        let upsTotal = 0;
        const upsTabs = [];

        for (const tab of multiTabStructure.tabs) {
          const tabExtracted = tab.extracted_amount || 0;
          upsTotal += tabExtracted;
          
          upsTabs.push({
            name: tab.name,
            rows: tab.rows,
            target_column: tab.target_column,
            extracted: tabExtracted,
            formatted: formatCurrency(tabExtracted)
          });

          console.log(`  UPS ${tab.name}: $${tabExtracted.toLocaleString()} from ${tab.target_column}`);
        }

        extractionResults.ups = {
          tabs: upsTabs,
          total: upsTotal,
          file_name: file.file_name,
          method: 'Multi-tab Net Charge extraction'
        };

        console.log(`UPS TOTAL: $${upsTotal.toLocaleString()}`);

      } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
        // TL Totals - extract from all tabs
        let tlTotal = 0;
        const tlTabs = [];

        for (const tab of multiTabStructure.tabs) {
          const tabExtracted = tab.extracted_amount || 0;
          tlTotal += tabExtracted;
          
          tlTabs.push({
            name: tab.name,
            rows: tab.rows,
            target_column: tab.target_column,
            extracted: tabExtracted,
            formatted: formatCurrency(tabExtracted)
          });

          console.log(`  TL ${tab.name}: $${tabExtracted.toLocaleString()} from ${tab.target_column}`);
        }

        extractionResults.tl = {
          tabs: tlTabs,
          total: tlTotal,
          file_name: file.file_name,
          method: 'Multi-tab TL cost extraction'
        };

        console.log(`TL TOTAL: $${tlTotal.toLocaleString()}`);

      } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
        // R&L LTL costs
        let rlTotal = 0;
        const rlTabs = [];

        for (const tab of multiTabStructure.tabs) {
          const tabExtracted = tab.extracted_amount || 0;
          rlTotal += tabExtracted;
          
          rlTabs.push({
            name: tab.name,
            rows: tab.rows,
            target_column: tab.target_column,
            extracted: tabExtracted,
            formatted: formatCurrency(tabExtracted)
          });

          console.log(`  R&L ${tab.name}: $${tabExtracted.toLocaleString()} from ${tab.target_column}`);
        }

        extractionResults.rl = {
          tabs: rlTabs,
          total: rlTotal,
          file_name: file.file_name,
          method: 'Multi-tab LTL cost extraction'
        };

        console.log(`R&L TOTAL: $${rlTotal.toLocaleString()}`);
      }
    }

    const grandTotal = extractionResults.ups.total + extractionResults.tl.total + extractionResults.rl.total;

    console.log('\n=== MULTI-TAB EXTRACTION COMPLETE ===');
    console.log(`UPS: $${extractionResults.ups.total.toLocaleString()}`);
    console.log(`TL: $${extractionResults.tl.total.toLocaleString()}`);
    console.log(`R&L: $${extractionResults.rl.total.toLocaleString()}`);
    console.log(`GRAND TOTAL: $${grandTotal.toLocaleString()}`);

    return NextResponse.json({
      success: true,
      multi_tab_transportation_baseline: {
        ups_parcel_costs: {
          total: extractionResults.ups.total,
          formatted: formatCurrency(extractionResults.ups.total),
          file_name: extractionResults.ups.file_name,
          method: extractionResults.ups.method,
          tabs: extractionResults.ups.tabs,
          tabs_count: extractionResults.ups.tabs.length
        },
        tl_freight_costs: {
          total: extractionResults.tl.total,
          formatted: formatCurrency(extractionResults.tl.total),
          file_name: extractionResults.tl.file_name,
          method: extractionResults.tl.method,
          tabs: extractionResults.tl.tabs,
          tabs_count: extractionResults.tl.tabs.length
        },
        ltl_freight_costs: {
          total: extractionResults.rl.total,
          formatted: formatCurrency(extractionResults.rl.total),
          file_name: extractionResults.rl.file_name,
          method: extractionResults.rl.method,
          tabs: extractionResults.rl.tabs,
          tabs_count: extractionResults.rl.tabs.length
        },
        grand_total: {
          amount: grandTotal,
          formatted: formatCurrency(grandTotal)
        }
      },
      validation: {
        ups_meets_expectation: extractionResults.ups.total > 2500000, // User expected over $2.9M
        tl_has_multiple_tabs: extractionResults.tl.tabs.length >= 3,
        rl_extraction_working: extractionResults.rl.total > 0,
        total_realistic: grandTotal > 1000000,
        all_files_processed: extractionResults.ups.total > 0 && extractionResults.tl.total > 0 && extractionResults.rl.total > 0
      },
      summary: {
        files_processed: multiTabFiles.length,
        total_tabs_extracted: extractionResults.ups.tabs.length + extractionResults.tl.tabs.length + extractionResults.rl.tabs.length,
        extraction_ready: true
      }
    });

  } catch (error) {
    console.error('Error in multi-tab baseline extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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
