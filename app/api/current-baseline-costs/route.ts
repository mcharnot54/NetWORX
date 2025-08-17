import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Initialize baseline costs structure
    const baselineCosts = {
      warehouse_costs: {
        operating_costs_other: 0,
        total_labor_costs: 0,
        rent_and_overhead: 0
      },
      transport_costs: {
        freight_costs: 0
      },
      inventory_costs: {
        total_inventory_costs: 0
      },
      total_baseline: 0,
      data_sources: [],
      scenarios_analyzed: 0
    };

    let scenarios = [];

    try {
      // Get the most recent scenario ID for active projects
      scenarios = await sql`
        SELECT s.id, s.name, p.name as project_name
        FROM scenarios s
        JOIN projects p ON s.project_id = p.id
        WHERE p.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 5
      `;
      baselineCosts.scenarios_analyzed = scenarios.length;
    } catch (dbError) {
      console.log('Database tables not ready yet, returning empty baseline data');
      scenarios = [];
    }

    // If no scenarios found, return early with empty but valid data
    if (scenarios.length === 0) {
      return NextResponse.json({
        success: true,
        baseline_costs: formatBaselineCosts(baselineCosts),
        metadata: {
          scenarios_analyzed: 0,
          data_sources: [],
          last_updated: new Date().toISOString(),
          data_quality: 'No data available - database not initialized'
        }
      });
    }

    // Analyze each scenario for cost data
    for (const scenario of scenarios) {
      try {
        // Check scenario results first - handle missing table gracefully
        let scenarioResults = [];
        try {
          scenarioResults = await sql`
            SELECT
              transportation_costs,
              warehouse_operating_costs,
              variable_labor_costs,
              facility_rent_costs,
              total_costs
            FROM scenario_results
            WHERE scenario_id = ${scenario.id}
            ORDER BY created_at DESC
            LIMIT 1
          `;
        } catch (tableError) {
          console.debug(`scenario_results table not found for scenario ${scenario.id}`);
          scenarioResults = [];
        }

        if (scenarioResults.length > 0) {
          const result = scenarioResults[0];
          
          baselineCosts.transport_costs.freight_costs += result.transportation_costs || 0;
          baselineCosts.warehouse_costs.operating_costs_other += result.warehouse_operating_costs || 0;
          baselineCosts.warehouse_costs.total_labor_costs += result.variable_labor_costs || 0;
          baselineCosts.warehouse_costs.rent_and_overhead += result.facility_rent_costs || 0;
          
          baselineCosts.data_sources.push({
            type: 'scenario_results',
            scenario: scenario.name,
            project: scenario.project_name,
            costs: {
              transportation: result.transportation_costs || 0,
              warehouse_operating: result.warehouse_operating_costs || 0,
              labor: result.variable_labor_costs || 0,
              rent: result.facility_rent_costs || 0
            }
          });
        }

        // Check processed data files for financial data
        const dataFiles = await sql`
          SELECT file_name, processed_data, data_type
          FROM data_files
          WHERE scenario_id = ${scenario.id}
          AND processing_status = 'completed'
          AND processed_data IS NOT NULL
        `;

        for (const file of dataFiles) {
          if (!file.processed_data?.data) continue;

          const data = Array.isArray(file.processed_data.data) 
            ? file.processed_data.data 
            : (file.processed_data.data.data || []);

          // Look for cost data in the processed data
          for (const row of data) {
            if (typeof row !== 'object' || !row) continue;

            // Extract various cost fields from the data
            for (const [key, value] of Object.entries(row)) {
              const keyLower = key.toLowerCase();
              let numValue = 0;

              // Parse numeric values
              if (typeof value === 'number') {
                numValue = value;
              } else if (typeof value === 'string') {
                const cleaned = value.replace(/[$,\s]/g, '');
                if (/^\d+\.?\d*$/.test(cleaned)) {
                  numValue = parseFloat(cleaned);
                }
              }

              if (numValue > 1000) { // Only consider significant amounts
                // Categorize costs based on column names
                if (keyLower.includes('freight') || keyLower.includes('transport') || keyLower.includes('shipping')) {
                  baselineCosts.transport_costs.freight_costs += numValue;
                } else if (keyLower.includes('labor') || keyLower.includes('wage') || keyLower.includes('payroll')) {
                  baselineCosts.warehouse_costs.total_labor_costs += numValue;
                } else if (keyLower.includes('rent') || keyLower.includes('lease') || keyLower.includes('overhead')) {
                  baselineCosts.warehouse_costs.rent_and_overhead += numValue;
                } else if (keyLower.includes('inventory') || keyLower.includes('stock') || keyLower.includes('carrying')) {
                  baselineCosts.inventory_costs.total_inventory_costs += numValue;
                } else if (keyLower.includes('operating') || keyLower.includes('operational')) {
                  baselineCosts.warehouse_costs.operating_costs_other += numValue;
                }
              }
            }
          }

          if (data.length > 0) {
            baselineCosts.data_sources.push({
              type: 'data_file',
              scenario: scenario.name,
              project: scenario.project_name,
              file_name: file.file_name,
              data_type: file.data_type,
              rows_analyzed: data.length
            });
          }
        }

        // Also check the TL files specifically for freight costs
        const tlFiles = await sql`
          SELECT file_name, processed_data
          FROM data_files
          WHERE scenario_id = ${scenario.id}
          AND (file_name ILIKE '%TL%' OR file_name ILIKE '%freight%' OR file_name ILIKE '%transport%')
          AND processed_data IS NOT NULL
        `;

        for (const tlFile of tlFiles) {
          if (!tlFile.processed_data?.data) continue;

          let data = tlFile.processed_data.data;
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
              data = [];
            }
          }

          // Find the largest freight-related value as baseline
          let maxFreightCost = 0;
          for (const row of data) {
            if (typeof row !== 'object') continue;
            
            for (const [key, value] of Object.entries(row)) {
              const keyLower = key.toLowerCase();
              let numValue = 0;

              if (typeof value === 'number') {
                numValue = value;
              } else if (typeof value === 'string') {
                const cleaned = value.replace(/[$,\s]/g, '');
                if (/^\d+\.?\d*$/.test(cleaned)) {
                  numValue = parseFloat(cleaned);
                }
              }

              if (numValue > maxFreightCost && numValue > 100000 && 
                  (keyLower.includes('freight') || keyLower.includes('transport') || 
                   keyLower.includes('cost') || keyLower.includes('total') || 
                   keyLower.includes('spend'))) {
                maxFreightCost = numValue;
              }
            }
          }

          if (maxFreightCost > 0) {
            // Use the max value, don't add it to existing (to avoid double counting)
            if (maxFreightCost > baselineCosts.transport_costs.freight_costs) {
              baselineCosts.transport_costs.freight_costs = maxFreightCost;
              
              baselineCosts.data_sources.push({
                type: 'tl_baseline',
                scenario: scenario.name,
                project: scenario.project_name,
                file_name: tlFile.file_name,
                baseline_freight_cost: maxFreightCost
              });
            }
          }
        }

      } catch (scenarioError) {
        console.error(`Error processing scenario ${scenario.id}:`, scenarioError);
      }
    }

    // Calculate total baseline
    baselineCosts.total_baseline = 
      baselineCosts.warehouse_costs.operating_costs_other +
      baselineCosts.warehouse_costs.total_labor_costs +
      baselineCosts.warehouse_costs.rent_and_overhead +
      baselineCosts.transport_costs.freight_costs +
      baselineCosts.inventory_costs.total_inventory_costs;

    // Format the costs for display
    const formatCost = (cost: number) => ({
      raw: cost,
      formatted: cost > 1000000 
        ? `$${(cost / 1000000).toFixed(1)}M` 
        : cost > 1000 
          ? `$${(cost / 1000).toFixed(0)}K` 
          : `$${cost.toFixed(0)}`,
      percentage: baselineCosts.total_baseline > 0 
        ? ((cost / baselineCosts.total_baseline) * 100).toFixed(1) 
        : '0.0'
    });

    return NextResponse.json({
      success: true,
      baseline_costs: {
        warehouse_costs: {
          operating_costs_other: formatCost(baselineCosts.warehouse_costs.operating_costs_other),
          total_labor_costs: formatCost(baselineCosts.warehouse_costs.total_labor_costs),
          rent_and_overhead: formatCost(baselineCosts.warehouse_costs.rent_and_overhead),
          subtotal: formatCost(
            baselineCosts.warehouse_costs.operating_costs_other +
            baselineCosts.warehouse_costs.total_labor_costs +
            baselineCosts.warehouse_costs.rent_and_overhead
          )
        },
        transport_costs: {
          freight_costs: formatCost(baselineCosts.transport_costs.freight_costs)
        },
        inventory_costs: {
          total_inventory_costs: formatCost(baselineCosts.inventory_costs.total_inventory_costs)
        },
        total_baseline: formatCost(baselineCosts.total_baseline)
      },
      metadata: {
        scenarios_analyzed: baselineCosts.scenarios_analyzed,
        data_sources: baselineCosts.data_sources,
        last_updated: new Date().toISOString(),
        data_quality: baselineCosts.total_baseline > 0 ? 'Good' : 'No data found'
      }
    });

  } catch (error) {
    console.error('Error extracting baseline costs:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
