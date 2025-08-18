import { NextResponse } from 'next/server';

// Test summary of the improved extraction logic implemented in MultiTabExcelUploader

export async function GET() {
  try {
    console.log('🧪 Testing Improved Extraction Logic Summary...');

    const results: any = {
      ups: { total: 0, tabs: [], formatted: '$0' },
      tl: { total: 0, tabs: [], formatted: '$0' },
      rl: { total: 0, tabs: [], formatted: '$0' }
    };

    for (const file of files) {
      const fileName = file.file_name.toLowerCase();
      
      if (!file.file_content) {
        console.log(`⚠️ No file content for ${file.file_name}`);
        continue;
      }

      try {
        // Decode file content
        const buffer = Buffer.from(file.file_content, 'base64');
        const workbook = XLSX.read(buffer);
        console.log(`📁 Processing ${file.file_name} - ${workbook.SheetNames.length} sheets`);

        // Apply improved extraction logic based on file type
        if (fileName.includes('ups') && fileName.includes('individual')) {
          console.log('📦 TESTING UPS EXTRACTION - Column G (Net Charge)');
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet);
            console.log(`  Processing ${sheetName}: ${sheetData.length} rows`);

            let extractedAmount = 0;
            let count = 0;

            // Look for Net Charge column (Column G)
            const columnHeaders = sheetData.length > 0 ? Object.keys(sheetData[0] || {}) : [];
            const netChargeColumn = columnHeaders.find(col =>
              col === 'Net Charge' || col === 'G' || 
              (col.toLowerCase().includes('net') && col.toLowerCase().includes('charge'))
            );

            if (netChargeColumn) {
              for (const row of sheetData) {
                if (row && row[netChargeColumn]) {
                  const numValue = parseFloat(String(row[netChargeColumn]).replace(/[$,\s]/g, ''));
                  if (!isNaN(numValue) && numValue > 0) {
                    extractedAmount += numValue;
                    count++;
                  }
                }
              }
              console.log(`    ✅ UPS ${sheetName}: $${extractedAmount.toLocaleString()} from '${netChargeColumn}' (${count} rows)`);
            } else {
              console.log(`    ❌ UPS ${sheetName}: Net Charge column not found! Available: ${columnHeaders.join(', ')}`);
            }

            results.ups.tabs.push({
              name: sheetName,
              total: extractedAmount,
              count: count,
              formatted: `$${(extractedAmount / 1000).toFixed(0)}K`
            });
            results.ups.total += extractedAmount;
          }

        } else if (fileName.includes('2024') && fileName.includes('tl')) {
          console.log('🚛 TESTING TL EXTRACTION - Column H (Gross Rate) All Tabs');
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet);
            console.log(`  Processing ${sheetName}: ${sheetData.length} rows`);

            let extractedAmount = 0;
            let count = 0;
            let skippedCount = 0;

            // Look for Gross Rate column (Column H)
            const columnHeaders = sheetData.length > 0 ? Object.keys(sheetData[0] || {}) : [];
            const grossRateColumn = columnHeaders.find(col =>
              col === 'Gross Rate' || col === 'H' || 
              (col.toLowerCase().includes('gross') && col.toLowerCase().includes('rate'))
            );

            if (grossRateColumn) {
              for (const row of sheetData) {
                if (row && row[grossRateColumn]) {
                  const numValue = parseFloat(String(row[grossRateColumn]).replace(/[$,\s]/g, ''));
                  
                  if (!isNaN(numValue) && numValue > 0) {
                    // Check for supporting data to avoid totals-only rows
                    const supportingDataColumns = Object.keys(row).filter(key => 
                      key.toLowerCase().includes('origin') ||
                      key.toLowerCase().includes('destination') ||
                      key.toLowerCase().includes('from') ||
                      key.toLowerCase().includes('to') ||
                      key.toLowerCase().includes('route') ||
                      key.toLowerCase().includes('lane') ||
                      key.toLowerCase().includes('city') ||
                      key.toLowerCase().includes('state') ||
                      key.toLowerCase().includes('zip') ||
                      key.toLowerCase().includes('location') ||
                      key.toLowerCase().includes('service') ||
                      key.toLowerCase().includes('mode') ||
                      key.toLowerCase().includes('carrier')
                    );
                    
                    const supportingDataCount = supportingDataColumns.filter(col => {
                      const value = row[col];
                      return value && String(value).trim() !== '' && 
                             String(value).toLowerCase() !== 'null' &&
                             String(value).toLowerCase() !== 'n/a';
                    }).length;
                    
                    // Skip rows with large numbers but no supporting data (total rows)
                    if (supportingDataCount === 0 && numValue > 10000) {
                      console.log(`    ⏭️ Skipping large value $${numValue.toLocaleString()} - no supporting data (likely total row)`);
                      skippedCount++;
                    } else {
                      extractedAmount += numValue;
                      count++;
                    }
                  }
                }
              }
              console.log(`    ✅ TL ${sheetName}: $${extractedAmount.toLocaleString()} from '${grossRateColumn}' (${count} rows, ${skippedCount} skipped)`);
            } else {
              console.log(`    ❌ TL ${sheetName}: Gross Rate column not found! Available: ${columnHeaders.join(', ')}`);
            }

            results.tl.tabs.push({
              name: sheetName,
              total: extractedAmount,
              count: count,
              skipped: skippedCount,
              formatted: `$${(extractedAmount / 1000).toFixed(0)}K`
            });
            results.tl.total += extractedAmount;
          }

        } else if (fileName.includes('r&l') && fileName.includes('curriculum')) {
          console.log('🚚 TESTING R&L EXTRACTION - Column V (Detail tab)');
          
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const sheetData = XLSX.utils.sheet_to_json(worksheet);
            console.log(`  Processing ${sheetName}: ${sheetData.length} rows`);

            let extractedAmount = 0;
            let count = 0;

            // For R&L, focus on Detail tab with Column V
            if (sheetName.toLowerCase().includes('detail')) {
              const columnHeaders = sheetData.length > 0 ? Object.keys(sheetData[0] || {}) : [];
              const columnV = columnHeaders.find(col =>
                col === 'V' || col.toLowerCase().includes('total') || col.toLowerCase().includes('cost')
              ) || (columnHeaders.length > 21 ? columnHeaders[21] : null); // Column V is 22nd column (index 21)

              if (columnV) {
                for (const row of sheetData) {
                  if (row && row[columnV]) {
                    const numValue = parseFloat(String(row[columnV]).replace(/[$,\s]/g, ''));
                    if (!isNaN(numValue) && numValue > 0) {
                      extractedAmount += numValue;
                      count++;
                    }
                  }
                }
                console.log(`    ✅ R&L ${sheetName}: $${extractedAmount.toLocaleString()} from '${columnV}' (${count} rows)`);
              } else {
                console.log(`    ❌ R&L ${sheetName}: Column V not found! Available: ${columnHeaders.join(', ')}`);
              }
            } else {
              console.log(`    ⏭️ R&L ${sheetName}: Skipping non-Detail tab`);
            }

            if (extractedAmount > 0) {
              results.rl.tabs.push({
                name: sheetName,
                total: extractedAmount,
                count: count,
                formatted: `$${(extractedAmount / 1000).toFixed(0)}K`
              });
              results.rl.total += extractedAmount;
            }
          }
        }

      } catch (fileError) {
        console.log(`❌ Error processing ${file.file_name}:`, fileError);
      }
    }

    // Format results
    results.ups.formatted = `$${(results.ups.total / 1000000).toFixed(2)}M`;
    results.tl.formatted = `$${(results.tl.total / 1000).toFixed(0)}K`;
    results.rl.formatted = `$${(results.rl.total / 1000).toFixed(0)}K`;

    const grandTotal = results.ups.total + results.tl.total + results.rl.total;

    console.log('\n🎯 IMPROVED EXTRACTION RESULTS:');
    console.log(`📦 UPS: ${results.ups.formatted} (${results.ups.tabs.length} tabs)`);
    console.log(`🚛 TL: ${results.tl.formatted} (${results.tl.tabs.length} tabs)`);  
    console.log(`🚚 R&L: ${results.rl.formatted} (${results.rl.tabs.length} tabs)`);
    console.log(`💰 TOTAL: $${(grandTotal / 1000000).toFixed(2)}M`);

    return NextResponse.json({
      success: true,
      improved_extraction: {
        ups_parcel_costs: {
          total: results.ups.total,
          formatted: results.ups.formatted,
          tabs: results.ups.tabs,
          tabs_count: results.ups.tabs.length
        },
        tl_freight_costs: {
          total: results.tl.total,
          formatted: results.tl.formatted,
          tabs: results.tl.tabs,
          tabs_count: results.tl.tabs.length
        },
        ltl_freight_costs: {
          total: results.rl.total,
          formatted: results.rl.formatted,
          tabs: results.rl.tabs,
          tabs_count: results.rl.tabs.length
        },
        grand_total: {
          amount: grandTotal,
          formatted: `$${(grandTotal / 1000000).toFixed(2)}M`
        }
      },
      validation: {
        ups_meets_target: results.ups.total > 2900000,
        tl_has_all_tabs: results.tl.tabs.length >= 3,
        rl_extracting: results.rl.total > 0,
        baseline_ready: grandTotal > 1000000
      }
    });

  } catch (error) {
    console.error('Test extraction error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
