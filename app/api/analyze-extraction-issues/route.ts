import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    const analysis = {
      rl_analysis: {},
      tl_analysis: {},
      recommendations: []
    };

    // === R&L FILE ANALYSIS ===
    try {
      const rlFiles = await sql`
        SELECT id, file_name, processed_data
        FROM data_files
        WHERE file_name ILIKE '%R&L%' AND file_name ILIKE '%CURRICULUM%'
        ORDER BY id DESC
        LIMIT 1
      `;

      if (rlFiles.length > 0) {
        const rlFile = rlFiles[0];
        const processedData = rlFile.processed_data as any;
        
        analysis.rl_analysis = {
          file_name: rlFile.file_name,
          has_multi_tab: !!processedData?.multi_tab_structure,
          tabs: []
        };

        if (processedData?.multi_tab_structure) {
          const tabs = processedData.multi_tab_structure.tabs || [];
          
          for (const tab of tabs) {
            const tabInfo = {
              name: tab.name,
              rows: tab.rows,
              columns: tab.columns || [],
              has_column_v: (tab.columns || []).includes('V'),
              target_column: tab.target_column,
              extracted_amount: tab.extracted_amount,
              column_analysis: {}
            };

            // Find potential V columns
            const vLikeColumns = (tab.columns || []).filter((col: string) => 
              col === 'V' || 
              col.toLowerCase().includes('v') ||
              /^[A-Z]$/.test(col) // Single letter columns
            );

            tabInfo.column_analysis = {
              v_like_columns: vLikeColumns,
              single_letter_columns: (tab.columns || []).filter((col: string) => /^[A-Z]$/.test(col)),
              potential_cost_columns: (tab.columns || []).filter((col: string) => 
                col.toLowerCase().includes('charge') ||
                col.toLowerCase().includes('cost') ||
                col.toLowerCase().includes('amount') ||
                col.toLowerCase().includes('total') ||
                col.toLowerCase().includes('net')
              )
            };

            // If this is the Detail tab and we have sample data
            if (tab.name.toLowerCase().includes('detail') && tab.sample_data) {
              const sampleRow = tab.sample_data[0] || {};
              
              // Check if column V exists and has data
              if ('V' in sampleRow) {
                const columnVValues = tab.sample_data.map((row: any) => row['V']).filter((v: any) => v != null);
                const numericValues = columnVValues.map((val: any) => {
                  const num = parseFloat(String(val).replace(/[$,\s]/g, ''));
                  return isNaN(num) ? null : num;
                }).filter((num: any) => num !== null && num > 0);

                tabInfo.column_analysis.column_v_data = {
                  exists: true,
                  sample_values: columnVValues.slice(0, 5),
                  numeric_count: numericValues.length,
                  sum: numericValues.reduce((sum: number, val: number) => sum + val, 0),
                  why_not_selected: numericValues.length < 5 ? 'Too few valid values' :
                                   numericValues.reduce((sum: number, val: number) => sum + val, 0) < 1000 ? 'Total too low' :
                                   'Should have been selected'
                };
              } else {
                tabInfo.column_analysis.column_v_data = {
                  exists: false,
                  available_columns: Object.keys(sampleRow)
                };
              }
            }

            (analysis.rl_analysis as any).tabs.push(tabInfo);
          }
        }
      }
    } catch (rlError) {
      (analysis.rl_analysis as any).error = rlError instanceof Error ? rlError.message : 'Unknown error';
    }

    // === TL FILE ANALYSIS ===
    try {
      const tlFiles = await sql`
        SELECT id, file_name, processed_data
        FROM data_files
        WHERE file_name ILIKE '%2024 TOTALS%' AND file_name ILIKE '%TL%'
        ORDER BY id DESC
        LIMIT 1
      `;

      if (tlFiles.length > 0) {
        const tlFile = tlFiles[0];
        const processedData = tlFile.processed_data as any;
        
        analysis.tl_analysis = {
          file_name: tlFile.file_name,
          has_multi_tab: !!processedData?.multi_tab_structure,
          tabs: []
        };

        if (processedData?.multi_tab_structure) {
          const tabs = processedData.multi_tab_structure.tabs || [];
          let totalExtracted = 0;
          
          for (const tab of tabs) {
            const tabInfo = {
              name: tab.name,
              rows: tab.rows,
              target_column: tab.target_column,
              extracted_amount: tab.extracted_amount,
              potential_issues: []
            };

            totalExtracted += tab.extracted_amount || 0;

            // If we have sample data, check for total rows
            if (tab.sample_data && tab.sample_data.length > 0) {
              // Check if any rows contain "total" keywords
              const potentialTotalRows = tab.sample_data.filter((row: any) => {
                const rowValues = Object.values(row).map(val => String(val).toLowerCase());
                return rowValues.some(val => 
                  val.includes('total') ||
                  val.includes('sum') ||
                  val.includes('grand')
                );
              });

              if (potentialTotalRows.length > 0) {
                tabInfo.potential_issues.push(`Found ${potentialTotalRows.length} potential total rows`);
              }

              // Check if target column has unusually large values
              if (tab.target_column) {
                const targetValues = tab.sample_data
                  .map((row: any) => row[tab.target_column])
                  .filter((val: any) => val != null)
                  .map((val: any) => {
                    const num = parseFloat(String(val).replace(/[$,\s]/g, ''));
                    return isNaN(num) ? 0 : num;
                  })
                  .filter((num: number) => num > 0);

                if (targetValues.length > 0) {
                  const maxValue = Math.max(...targetValues);
                  const avgValue = targetValues.reduce((sum, val) => sum + val, 0) / targetValues.length;
                  
                  if (maxValue > avgValue * 5) { // Outlier detection
                    tabInfo.potential_issues.push(`Unusually large value detected: ${maxValue} (avg: ${avgValue.toFixed(2)})`);
                  }
                }
              }
            }

            (analysis.tl_analysis as any).tabs.push(tabInfo);
          }

          (analysis.tl_analysis as any).total_extracted = totalExtracted;
        }
      }
    } catch (tlError) {
      (analysis.tl_analysis as any).error = tlError instanceof Error ? tlError.message : 'Unknown error';
    }

    // === GENERATE RECOMMENDATIONS ===
    
    // R&L Recommendations
    const rlTabs = (analysis.rl_analysis as any).tabs || [];
    const detailTab = rlTabs.find((tab: any) => tab.name.toLowerCase().includes('detail'));
    
    if (detailTab) {
      if (!detailTab.has_column_v) {
        analysis.recommendations.push({
          type: 'R&L',
          issue: 'Column V not found in Detail tab',
          solution: 'Check if column is named differently or missing',
          available_columns: detailTab.columns
        });
      } else if (detailTab.target_column !== 'V') {
        analysis.recommendations.push({
          type: 'R&L',
          issue: `Column V exists but '${detailTab.target_column}' was selected instead`,
          solution: 'Column V validation criteria not met',
          details: detailTab.column_analysis?.column_v_data
        });
      }
    }

    // TL Recommendations
    const tlTabs = (analysis.tl_analysis as any).tabs || [];
    const problematicTabs = tlTabs.filter((tab: any) => tab.potential_issues.length > 0);
    
    if (problematicTabs.length > 0) {
      analysis.recommendations.push({
        type: 'TL',
        issue: 'Potential total rows or outliers detected',
        solution: 'Filter out rows containing total keywords and outlier values',
        affected_tabs: problematicTabs.map((tab: any) => ({
          name: tab.name,
          issues: tab.potential_issues
        }))
      });
    }

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error analyzing extraction issues:', error);
    return NextResponse.json({
      error: 'Failed to analyze extraction issues',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
