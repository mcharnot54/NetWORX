import { NextRequest, NextResponse } from 'next/server';

// Helper function to add timeout to database operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timeout')), timeoutMs)
    )
  ]);
}

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
      scenarios = await withTimeout(sql`
        SELECT s.id, s.name, p.name as project_name
        FROM scenarios s
        JOIN projects p ON s.project_id = p.id
        WHERE p.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 5
      `, 1500); // 1.5 second timeout for this query
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
        // Get the specific transportation files directly (not filtered by scenario)
        let dataFiles = [];
        try {
          dataFiles = await withTimeout(sql`
            SELECT file_name, processed_data, data_type, file_type, processing_status, id
            FROM data_files
            WHERE (
              file_name ILIKE '%2024 totals with inbound and outbound tl%' OR
              file_name ILIKE '%r&l curriculum associates%' OR
              file_name ILIKE '%ups invoice by state summary 2024%'
            )
            AND processing_status = 'completed'
            AND processed_data IS NOT NULL
          `, 1500); // 1.5 second timeout for data files

          console.log(`Found ${dataFiles.length} transportation files for baseline extraction`);
        } catch (dataFileError) {
          console.debug(`data_files table not accessible for scenario ${scenario.id}`);
          dataFiles = [];
        }

        // Process each uploaded file to extract baseline costs
        for (const file of dataFiles) {
          // Extract all possible data arrays from complex nested structures
          let allDataArrays = extractAllDataArrays(file.processed_data);

          if (allDataArrays.length === 0) continue;

          // Extract costs from all data arrays found in the file
          const fileNameLower = file.file_name.toLowerCase();
          let totalRowsProcessed = 0;

          for (const dataArray of allDataArrays) {
            totalRowsProcessed += dataArray.data.length;
            console.log(`Processing ${dataArray.source} from ${file.file_name} with ${dataArray.data.length} rows`);

            // Target specific transportation files first
            if (fileNameLower.includes('2024 totals with inbound and outbound tl') ||
                fileNameLower.includes('r&l curriculum associates') ||
                fileNameLower.includes('ups invoice by state summary') ||
                fileNameLower.includes('tl') ||
                fileNameLower.includes('transport') ||
                fileNameLower.includes('freight') ||
                fileNameLower.includes('shipping')) {
              // Extract transportation costs using specific column logic
              extractTransportationCosts(dataArray.data, baselineCosts, file.file_name);
            } else if (fileNameLower.includes('warehouse budget') ||
                       fileNameLower.includes('operating expenses') ||
                       fileNameLower.includes('general operating')) {
              // Extract warehouse costs
              extractWarehouseCosts(dataArray.data, baselineCosts, file.file_name);
            } else if (fileNameLower.includes('network') ||
                       fileNameLower.includes('capacity')) {
              // Extract operational costs from network files
              extractOperationalCosts(dataArray.data, baselineCosts, file.file_name);
            } else if (fileNameLower.includes('growth') ||
                       fileNameLower.includes('forecast') ||
                       fileNameLower.includes('5 year')) {
              // Extract growth-related costs
              extractGrowthCosts(dataArray.data, baselineCosts, file.file_name);
            } else {
              // General cost extraction for any file
              extractGeneralCosts(dataArray.data, baselineCosts, file.file_name);
            }
          }

          console.log(`Total rows processed for ${file.file_name}: ${totalRowsProcessed}`);
        }

        // Check scenario results as fallback - handle missing table gracefully
        let scenarioResults = [];
        try {
          scenarioResults = await withTimeout(sql`
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
          `, 1000); // 1 second timeout for scenario results
        } catch (tableError) {
          console.debug(`scenario_results table not found for scenario ${scenario.id}`);
          scenarioResults = [];
        }

        // Add scenario results as fallback if available
        if (scenarioResults.length > 0) {
          const result = scenarioResults[0];

          // Only add if we don't already have better data from files
          if (baselineCosts.transport_costs.freight_costs === 0) {
            baselineCosts.transport_costs.freight_costs += result.transportation_costs || 0;
          }
          if (baselineCosts.warehouse_costs.operating_costs_other === 0) {
            baselineCosts.warehouse_costs.operating_costs_other += result.warehouse_operating_costs || 0;
          }
          if (baselineCosts.warehouse_costs.total_labor_costs === 0) {
            baselineCosts.warehouse_costs.total_labor_costs += result.variable_labor_costs || 0;
          }
          if (baselineCosts.warehouse_costs.rent_and_overhead === 0) {
            baselineCosts.warehouse_costs.rent_and_overhead += result.facility_rent_costs || 0;
          }

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

    return NextResponse.json({
      success: true,
      baseline_costs: formatBaselineCosts(baselineCosts),
      metadata: {
        scenarios_analyzed: baselineCosts.scenarios_analyzed,
        data_sources: baselineCosts.data_sources,
        last_updated: new Date().toISOString(),
        data_quality: baselineCosts.total_baseline > 0 ? 'Good' : 'No data found'
      }
    });

  } catch (error) {
    console.error('Error extracting baseline costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to format baseline costs for display
function formatBaselineCosts(baselineCosts: any) {
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

  return {
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
  };
}

// Extract warehouse operating costs from budget files
function extractWarehouseCosts(data: any[], baselineCosts: any, fileName: string) {
  console.log(`Extracting warehouse costs from ${fileName}`);

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const numValue = parseNumericValue(value);

      if (numValue > 1000) { // Only consider significant amounts
        if (keyLower.includes('labor') || keyLower.includes('wage') || keyLower.includes('payroll') ||
            keyLower.includes('employee') || keyLower.includes('staff')) {
          baselineCosts.warehouse_costs.total_labor_costs += numValue;
        } else if (keyLower.includes('rent') || keyLower.includes('lease') || keyLower.includes('facility') ||
                   keyLower.includes('overhead') || keyLower.includes('space')) {
          baselineCosts.warehouse_costs.rent_and_overhead += numValue;
        } else if (keyLower.includes('operating') || keyLower.includes('utility') || keyLower.includes('maintenance') ||
                   keyLower.includes('equipment') || keyLower.includes('supplies')) {
          baselineCosts.warehouse_costs.operating_costs_other += numValue;
        }
      }
    }
  }

  baselineCosts.data_sources.push({
    type: 'warehouse_budget',
    file_name: fileName,
    rows_processed: data.length
  });
}

// Extract transportation costs from specific files and columns as specified
function extractTransportationCosts(data: any[], baselineCosts: any, fileName: string) {
  console.log(`Extracting transportation costs from ${fileName}`);

  let totalFreightCost = 0;
  const fileNameLower = fileName.toLowerCase();

  // Handle specific files with targeted column extraction
  if (fileNameLower.includes('2024 totals with inbound and outbound tl')) {
    // Extract from column H across all tabs (Inbound, Outbound, Transfers)
    totalFreightCost = extractFromColumnH(data, fileName);
  } else if (fileNameLower.includes('r&l curriculum associates') && fileNameLower.includes('2024')) {
    // Extract LTL costs from column V
    totalFreightCost = extractFromColumnV(data, fileName);
  } else if (fileNameLower.includes('ups invoice by state summary 2024')) {
    // Extract parcel costs from column F
    totalFreightCost = extractFromColumnF(data, fileName);
  } else {
    // Fallback: general freight cost extraction
    totalFreightCost = extractGeneralFreightCosts(data, fileName);
  }

  // Add to baseline costs (accumulate from all transportation sources)
  baselineCosts.transport_costs.freight_costs += totalFreightCost;

  baselineCosts.data_sources.push({
    type: 'transportation_data',
    file_name: fileName,
    freight_cost_extracted: totalFreightCost,
    rows_processed: data.length,
    extraction_method: getExtractionMethod(fileName)
  });
}

// Extract from column H (TL costs - Inbound, Outbound, Transfers) - Using validation logic
function extractFromColumnH(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    // Look for column H (exact same logic as validation)
    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' ||
          key.toLowerCase().includes('total') ||
          key.toLowerCase().includes('cost')) {

        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`Extracted $${total} from column H in ${fileName} (${valuesFound} values from ${data.length} rows)`);
  return total;
}

// Extract from column V (LTL R&L costs) - Using validation logic
function extractFromColumnV(data: any[], fileName: string): number {
  let total = 0;
  let valuesFound = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    // Look for column V (exact same logic as validation)
    for (const [key, value] of Object.entries(row)) {
      if (key === 'V' || key === '__EMPTY_21' ||
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge')) {

        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) {
          total += numValue;
          valuesFound++;
        }
      }
    }
  }

  console.log(`Extracted $${total} from column V (LTL) in ${fileName} (${valuesFound} values from ${data.length} rows)`);
  return total;
}

// Extract from column F (UPS Parcel costs)
function extractFromColumnF(data: any[], fileName: string): number {
  let total = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    // Look for column F (could be named various ways)
    for (const [key, value] of Object.entries(row)) {
      // Column F could be identified by position or header name
      if (key === 'F' || key === '__EMPTY_5' || // Excel column F is index 5
          key.toLowerCase().includes('net') ||
          key.toLowerCase().includes('charge') ||
          key.toLowerCase().includes('total') ||
          key.toLowerCase().includes('amount')) {

        const numValue = parseNumericValue(value);
        if (numValue > 10) { // Parcel costs can be small amounts
          total += numValue;
        }
      }
    }
  }

  console.log(`Extracted ${total} from column F (UPS Parcel) in ${fileName}`);
  return total;
}

// Fallback general freight cost extraction
function extractGeneralFreightCosts(data: any[], fileName: string): number {
  let total = 0;

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const numValue = parseNumericValue(value);

      if (numValue > 1000 && ( // Looking for substantial freight costs
          keyLower.includes('freight') || keyLower.includes('transport') || keyLower.includes('shipping') ||
          keyLower.includes('cost') || keyLower.includes('total') || keyLower.includes('spend') ||
          keyLower.includes('charge') || keyLower.includes('net'))) {
        total += numValue;
      }
    }
  }

  return total;
}

// Get extraction method for logging
function getExtractionMethod(fileName: string): string {
  const fileNameLower = fileName.toLowerCase();
  if (fileNameLower.includes('2024 totals with inbound and outbound tl')) {
    return 'column_H_TL_totals';
  } else if (fileNameLower.includes('r&l curriculum associates')) {
    return 'column_V_LTL_costs';
  } else if (fileNameLower.includes('ups invoice by state summary')) {
    return 'column_F_parcel_costs';
  }
  return 'general_freight_extraction';
}

// Extract operational costs from network/capacity files
function extractOperationalCosts(data: any[], baselineCosts: any, fileName: string) {
  console.log(`Extracting operational costs from ${fileName}`);

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const numValue = parseNumericValue(value);

      if (numValue > 1000) {
        if (keyLower.includes('operational') || keyLower.includes('operating') || keyLower.includes('overhead')) {
          baselineCosts.warehouse_costs.operating_costs_other += numValue;
        } else if (keyLower.includes('capacity') && keyLower.includes('cost')) {
          baselineCosts.warehouse_costs.operating_costs_other += numValue;
        }
      }
    }
  }

  baselineCosts.data_sources.push({
    type: 'network_operations',
    file_name: fileName,
    rows_processed: data.length
  });
}

// Extract growth-related costs from forecast files
function extractGrowthCosts(data: any[], baselineCosts: any, fileName: string) {
  console.log(`Extracting growth costs from ${fileName}`);

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const numValue = parseNumericValue(value);

      if (numValue > 1000) {
        if (keyLower.includes('expansion') || keyLower.includes('growth') || keyLower.includes('investment')) {
          baselineCosts.warehouse_costs.operating_costs_other += numValue;
        }
      }
    }
  }

  baselineCosts.data_sources.push({
    type: 'growth_forecast',
    file_name: fileName,
    rows_processed: data.length
  });
}

// General cost extraction for any file type
function extractGeneralCosts(data: any[], baselineCosts: any, fileName: string) {
  console.log(`Extracting general costs from ${fileName}`);

  for (const row of data) {
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const numValue = parseNumericValue(value);

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

  baselineCosts.data_sources.push({
    type: 'general_data',
    file_name: fileName,
    rows_processed: data.length
  });
}

// Helper function to parse numeric values from various formats
function parseNumericValue(value: any): number {
  if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[$,\s%]/g, '');
    const numValue = parseFloat(cleaned);
    return isNaN(numValue) ? 0 : numValue;
  }
  return 0;
}

// Helper function to extract all data arrays from complex nested structures
function extractAllDataArrays(processedData: any): Array<{data: any[], source: string}> {
  const dataArrays: Array<{data: any[], source: string}> = [];

  if (!processedData || typeof processedData !== 'object') {
    return dataArrays;
  }

  // Check direct array in parsedData
  if (processedData.parsedData && Array.isArray(processedData.parsedData)) {
    dataArrays.push({
      data: processedData.parsedData,
      source: 'parsedData'
    });
  }

  // Check direct array in data
  if (processedData.data && Array.isArray(processedData.data)) {
    dataArrays.push({
      data: processedData.data,
      source: 'data'
    });
  }

  // Check nested structures in data (like TL files with multiple sheets)
  if (processedData.data && typeof processedData.data === 'object' && !Array.isArray(processedData.data)) {
    extractNestedArrays(processedData.data, 'data', dataArrays);
  }

  // Check nested structures in parsedData
  if (processedData.parsedData && typeof processedData.parsedData === 'object' && !Array.isArray(processedData.parsedData)) {
    extractNestedArrays(processedData.parsedData, 'parsedData', dataArrays);
  }

  // Check for direct array in root
  if (Array.isArray(processedData)) {
    dataArrays.push({
      data: processedData,
      source: 'root'
    });
  }

  return dataArrays;
}

// Recursive function to find arrays in nested objects
function extractNestedArrays(obj: any, parentPath: string, dataArrays: Array<{data: any[], source: string}>, maxDepth: number = 3): void {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return;

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = `${parentPath}.${key}`;

    if (Array.isArray(value) && value.length > 0) {
      dataArrays.push({
        data: value,
        source: currentPath
      });
    } else if (typeof value === 'object' && value !== null) {
      extractNestedArrays(value, currentPath, dataArrays, maxDepth - 1);
    }
  }
}
