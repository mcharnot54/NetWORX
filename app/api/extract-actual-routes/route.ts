import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    console.log('🚛 Extracting actual routes from transportation baseline files...');

    // Get all processed transportation files
    const transportFiles = await sql`
      SELECT * FROM data_files
      WHERE processing_status = 'completed'
      AND (
        file_name ILIKE '%ups%' OR
        file_name ILIKE '%transport%' OR
        file_name ILIKE '%r&l%' OR
        file_name ILIKE '%freight%' OR
        file_name ILIKE '%tl%'
      )
      ORDER BY upload_date DESC
    `;

    console.log(`Found ${transportFiles.length} transportation files to analyze`);

    const extractedRoutes = [];
    let totalRoutes = 0;
    let actualCosts = 0;

    for (const file of transportFiles) {
      try {
        console.log(`Analyzing file: ${file.file_name}`);

        // Parse the stored content to extract route information
        let parsedData = null;

        if (file.processed_data) {
          try {
            if (typeof file.processed_data === 'string') {
              parsedData = JSON.parse(file.processed_data);
            } else {
              parsedData = file.processed_data;
            }
          } catch (parseError) {
            console.warn(`Could not parse content for ${file.file_name}:`, parseError);
            continue;
          }
        }

        if (!parsedData) {
          console.warn(`No parsed data for ${file.file_name}`);
          continue;
        }

        // Extract route data based on file type
        let routes = [];

        if (file.file_name.toLowerCase().includes('ups')) {
          // UPS files - extract state-to-state routes
          routes = extractUPSRoutes(parsedData, file.file_name);
        } else if (file.file_name.toLowerCase().includes('r&l')) {
          // R&L files - extract LTL routes with origin/destination
          routes = extractRLRoutes(parsedData, file.file_name);
        } else if (file.file_name.toLowerCase().includes('tl')) {
          // TL files - extract truckload routes
          routes = extractTLRoutes(parsedData, file.file_name);
        }

        console.log(`Extracted ${routes.length} routes from ${file.file_name}`);
        extractedRoutes.push(...routes);
        totalRoutes += routes.length;

        // Sum up actual costs
        routes.forEach(route => {
          if (route.actual_cost && typeof route.actual_cost === 'number') {
            actualCosts += route.actual_cost;
          }
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.file_name}:`, fileError);
      }
    }

    // Group routes by origin-destination pairs
    const routeGroups = groupRoutesByOriginDestination(extractedRoutes);

    return NextResponse.json({
      success: true,
      message: `Extracted ${totalRoutes} actual routes from transportation baseline files`,
      summary: {
        total_files_processed: transportFiles.length,
        total_routes_extracted: totalRoutes,
        total_actual_costs: actualCosts,
        unique_route_pairs: Object.keys(routeGroups).length,
        files_analyzed: transportFiles.map(f => f.file_name)
      },
      route_groups: routeGroups,
      all_routes: extractedRoutes.slice(0, 100), // Return sample of routes
      analysis_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error extracting actual routes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract actual routes from transportation files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function extractUPSRoutes(parsedData: any, filename: string) {
  const routes = [];

  // Handle nested data structure from data_files.processed_data
  let dataArray = parsedData;
  if (parsedData.parsedData && Array.isArray(parsedData.parsedData)) {
    dataArray = parsedData.parsedData;
  } else if (parsedData.data && Array.isArray(parsedData.data)) {
    dataArray = parsedData.data;
  } else if (Array.isArray(parsedData)) {
    dataArray = parsedData;
  } else {
    console.warn(`No array data found in UPS file: ${filename}`);
    return routes;
  }

  if (Array.isArray(dataArray)) {
    for (const row of dataArray) {
      // Look for state information and costs
      let origin = null;
      let destination = null;
      let cost = 0;
      let shipments = 0;

      // Try to find state columns
      Object.keys(row).forEach(key => {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('state') && row[key]) {
          if (!origin) {
            origin = `${row[key]}, US`; // Assume US states
          } else if (!destination) {
            destination = `${row[key]}, US`;
          }
        }
        
        if (keyLower.includes('net') && keyLower.includes('charge') || 
            keyLower.includes('cost') || keyLower.includes('amount')) {
          const value = parseFloat(row[key]);
          if (!isNaN(value) && value > 0) {
            cost += value;
          }
        }

        if (keyLower.includes('shipment') || keyLower.includes('count')) {
          const value = parseInt(row[key]);
          if (!isNaN(value) && value > 0) {
            shipments += value;
          }
        }
      });

      if (origin && cost > 0) {
        routes.push({
          file_source: filename,
          transport_mode: 'UPS_PARCEL',
          origin: origin,
          destination: destination || 'Various', 
          actual_cost: cost,
          shipment_count: shipments,
          cost_per_shipment: shipments > 0 ? cost / shipments : cost,
          data_quality: destination ? 'Complete' : 'Origin Only'
        });
      }
    }
  }

  return routes;
}

function extractRLRoutes(parsedData: any, filename: string) {
  const routes = [];

  // Handle nested data structure from data_files.processed_data
  let dataArray = parsedData;
  if (parsedData.parsedData && Array.isArray(parsedData.parsedData)) {
    dataArray = parsedData.parsedData;
  } else if (parsedData.data && Array.isArray(parsedData.data)) {
    dataArray = parsedData.data;
  } else if (Array.isArray(parsedData)) {
    dataArray = parsedData;
  } else {
    console.warn(`No array data found in R&L file: ${filename}`);
    return routes;
  }

  if (Array.isArray(dataArray)) {
    for (const row of dataArray) {
      let origin = 'Littleton, MA'; // Default to known primary facility
      let destination = null;
      let cost = 0;
      let weight = 0;
      let distance = 0;

      Object.keys(row).forEach(key => {
        const keyLower = key.toLowerCase();
        const value = row[key];

        // AGGRESSIVE city/state extraction - look in ALL text columns for city patterns
        if (value && typeof value === 'string' && value.length > 1) {
          // Common city patterns: "City, ST", "City ST", "CITY"
          const cityStatePattern = /^([A-Za-z\s]+),?\s*([A-Z]{2})$/;
          const match = value.match(cityStatePattern);

          if (match && !destination) {
            destination = `${match[1].trim()}, ${match[2]}`;
          }

          // Look for specific state abbreviations in any column
          const statePattern = /\b([A-Z]{2})\b/;
          const stateMatch = value.match(statePattern);
          if (stateMatch && !destination) {
            // Extract the full value as potential city
            const cleanValue = value.replace(/[^A-Za-z\s,]/g, '').trim();
            if (cleanValue.length > 2) {
              destination = `${cleanValue}, ${stateMatch[1]}`;
            }
          }
        }

        // Specific column name patterns
        if (keyLower.includes('dest') || keyLower.includes('delivery') ||
            keyLower.includes('consign') || keyLower.includes('ship to') ||
            keyLower.includes('zip') || keyLower.includes('state')) {
          if (value && !destination) {
            destination = extractCityFromValue(value.toString());
          }
        }

        // Look for origin information
        if ((keyLower.includes('origin') || keyLower.includes('pickup') ||
             keyLower.includes('from')) && value) {
          origin = extractCityFromValue(value.toString()) || origin;
        }

        // Look for cost information (Column V and other cost columns)
        if (keyLower.includes('charge') || keyLower.includes('cost') ||
            keyLower.includes('amount') || keyLower.includes('total') ||
            key === 'V' || key === 'W' || key === 'X' || key === 'Y' || key === 'Z') {
          const costValue = parseFloat(value);
          if (!isNaN(costValue) && costValue > 0) {
            cost += costValue;
          }
        }

        // Look for weight
        if (keyLower.includes('weight') && value) {
          const weightValue = parseFloat(value);
          if (!isNaN(weightValue) && weightValue > 0) {
            weight = weightValue;
          }
        }

        // Look for distance/miles
        if (keyLower.includes('mile') || keyLower.includes('distance')) {
          const distValue = parseFloat(value);
          if (!isNaN(distValue) && distValue > 0) {
            distance = distValue;
          }
        }
      });

      // Only add route if we have a cost and at least one location
      if (cost > 0) {
        routes.push({
          file_source: filename,
          transport_mode: 'R&L_LTL',
          origin: origin,
          destination: destination || `Unknown Destination ${routes.length + 1}`,
          actual_cost: cost,
          weight_lbs: weight,
          distance_miles: distance || estimateDistanceForDestination(destination),
          cost_per_pound: weight > 0 ? cost / weight : 0,
          cost_per_mile: distance > 0 ? cost / distance : 0,
          data_quality: destination ? 'Good' : 'Partial'
        });
      }
    }
  }

  return routes;
}

// Helper function to extract city from any text value
function extractCityFromValue(value: string): string | null {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed.length < 2) return null;

  // Remove numbers and special characters except commas and spaces
  const cleaned = trimmed.replace(/[0-9\-_()[\]{}]/g, '').trim();

  // Common patterns for cities
  const patterns = [
    /^([A-Za-z\s]+),\s*([A-Z]{2})$/, // "City, ST"
    /^([A-Za-z\s]+)\s+([A-Z]{2})$/, // "City ST"
    /^([A-Za-z\s]{3,})/            // "CITYNAME" (at least 3 chars)
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (match[2]) {
        return `${match[1].trim()}, ${match[2]}`;
      } else if (match[1] && match[1].length >= 3) {
        return match[1].trim();
      }
    }
  }

  return null;
}

// Helper function to estimate distance based on destination
function estimateDistanceForDestination(destination: string | null): number {
  if (!destination) return 500; // Default distance

  const dest = destination.toLowerCase();

  // Distance estimates from Littleton, MA to major destinations
  if (dest.includes('chicago') || dest.includes('il')) return 980;
  if (dest.includes('atlanta') || dest.includes('ga')) return 1100;
  if (dest.includes('dallas') || dest.includes('tx')) return 1780;
  if (dest.includes('los angeles') || dest.includes('ca')) return 3100;
  if (dest.includes('seattle') || dest.includes('wa')) return 3100;
  if (dest.includes('denver') || dest.includes('co')) return 1900;
  if (dest.includes('miami') || dest.includes('fl')) return 1300;
  if (dest.includes('new york') || dest.includes('ny')) return 200;

  // Default reasonable distance for unknown destinations
  return 750;
}

function extractTLRoutes(parsedData: any, filename: string) {
  const routes = [];

  // Handle nested data structure from data_files.processed_data
  let dataArray = parsedData;
  if (parsedData.parsedData && Array.isArray(parsedData.parsedData)) {
    dataArray = parsedData.parsedData;
  } else if (parsedData.data && Array.isArray(parsedData.data)) {
    dataArray = parsedData.data;
  } else if (Array.isArray(parsedData)) {
    dataArray = parsedData;
  } else {
    console.warn(`No array data found in TL file: ${filename}`);
    return routes;
  }

  if (Array.isArray(dataArray)) {
    for (const row of dataArray) {
      let origin = null;
      let destination = null;
      let cost = 0;
      let loadType = null;

      Object.keys(row).forEach(key => {
        const keyLower = key.toLowerCase();
        
        // Look for route information
        if (keyLower.includes('origin') || keyLower.includes('pickup') || 
            keyLower.includes('from')) {
          origin = row[key]?.toString().trim();
        }
        
        if (keyLower.includes('dest') || keyLower.includes('delivery') || 
            keyLower.includes('to')) {
          destination = row[key]?.toString().trim();
        }

        // Look for cost (Column H was mentioned)
        if (keyLower.includes('gross') || keyLower.includes('rate') || 
            keyLower.includes('cost') || key === 'H') {
          const value = parseFloat(row[key]);
          if (!isNaN(value) && value > 0) {
            cost += value;
          }
        }

        // Look for load type
        if (keyLower.includes('inbound') || keyLower.includes('outbound') ||
            keyLower.includes('type') || keyLower.includes('direction')) {
          loadType = row[key]?.toString().trim();
        }
      });

      if (cost > 0) {
        routes.push({
          file_source: filename,
          transport_mode: 'TL_FREIGHT',
          origin: origin || 'Unknown',
          destination: destination || 'Unknown',
          actual_cost: cost,
          load_type: loadType,
          data_quality: (origin && destination) ? 'Complete' : 'Cost Only'
        });
      }
    }
  }

  return routes;
}

function groupRoutesByOriginDestination(routes: any[]) {
  const groups: Record<string, any> = {};

  routes.forEach(route => {
    const key = `${route.origin} → ${route.destination}`;
    
    if (!groups[key]) {
      groups[key] = {
        route_pair: key,
        origin: route.origin,
        destination: route.destination,
        transport_modes: [],
        total_cost: 0,
        total_shipments: 0,
        routes: []
      };
    }

    groups[key].total_cost += route.actual_cost || 0;
    groups[key].total_shipments += route.shipment_count || 1;
    groups[key].routes.push(route);
    
    if (!groups[key].transport_modes.includes(route.transport_mode)) {
      groups[key].transport_modes.push(route.transport_mode);
    }
  });

  // Sort by total cost descending
  return Object.fromEntries(
    Object.entries(groups).sort(([,a], [,b]) => b.total_cost - a.total_cost)
  );
}
