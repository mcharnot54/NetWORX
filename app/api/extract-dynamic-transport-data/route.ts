import { NextRequest, NextResponse } from 'next/server';

interface ExtractedTransportData {
  origins: string[];
  destinations: string[];
  routes: ExtractedRoute[];
  baseline_totals: {
    ups_parcel: number;
    tl_freight: number;
    rl_ltl: number;
    total: number;
  };
  unique_cities: string[];
  primary_facilities: string[];
  transportation_modes: string[];
}

interface ExtractedRoute {
  origin: string;
  destination: string;
  transport_mode: string;
  cost: number;
  distance?: number;
  weight?: number;
  volume?: number;
  frequency?: number;
  data_quality: 'complete' | 'partial' | 'origin_only' | 'cost_only';
}

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');

    // Get all transportation files
    const transportFiles = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%' OR
        file_name ILIKE '%tl%' OR
        file_name ILIKE '%r&l%' OR
        file_name ILIKE '%transport%' OR
        file_name ILIKE '%freight%' OR
        file_name ILIKE '%ltl%'
      )
      AND processed_data IS NOT NULL
      AND processing_status = 'completed'
    `;

    console.log(`Found ${transportFiles.length} transport files for dynamic extraction`);

    const extractedData: ExtractedTransportData = {
      origins: [],
      destinations: [],
      routes: [],
      baseline_totals: {
        ups_parcel: 0,
        tl_freight: 0,
        rl_ltl: 0,
        total: 0
      },
      unique_cities: [],
      primary_facilities: [],
      transportation_modes: []
    };

    // Extract data from each file
    for (const file of transportFiles) {
      const fileNameLower = file.file_name.toLowerCase();
      
      if (fileNameLower.includes('ups')) {
        extractUPSData(file, extractedData);
      } else if (fileNameLower.includes('tl') || fileNameLower.includes('truckload')) {
        extractTLData(file, extractedData);
      } else if (fileNameLower.includes('r&l') || fileNameLower.includes('ltl')) {
        extractRLData(file, extractedData);
      }
    }

    // Post-process to create unique lists and identify patterns
    extractedData.unique_cities = [...new Set([...extractedData.origins, ...extractedData.destinations])]
      .filter(city => city && city !== 'Unknown' && city !== 'Various')
      .sort();

    // Identify primary facilities (origins that appear most frequently)
    const originCounts = extractedData.routes.reduce((acc, route) => {
      acc[route.origin] = (acc[route.origin] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    extractedData.primary_facilities = Object.entries(originCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([city]) => city);

    extractedData.transportation_modes = [...new Set(extractedData.routes.map(r => r.transport_mode))];

    // Calculate totals
    extractedData.baseline_totals.total = 
      extractedData.baseline_totals.ups_parcel + 
      extractedData.baseline_totals.tl_freight + 
      extractedData.baseline_totals.rl_ltl;

    console.log('\n=== DYNAMIC TRANSPORT EXTRACTION COMPLETE ===');
    console.log(`Unique cities found: ${extractedData.unique_cities.length}`);
    console.log(`Routes extracted: ${extractedData.routes.length}`);
    console.log(`Primary facilities: ${extractedData.primary_facilities.join(', ')}`);
    console.log(`Total baseline: $${extractedData.baseline_totals.total.toLocaleString()}`);

    return NextResponse.json({
      success: true,
      extracted_data: extractedData,
      summary: {
        files_processed: transportFiles.length,
        unique_cities_count: extractedData.unique_cities.length,
        routes_count: extractedData.routes.length,
        primary_facilities_count: extractedData.primary_facilities.length,
        baseline_complete: extractedData.baseline_totals.total > 0,
        data_quality: extractedData.routes.length > 0 ? 'good' : 'insufficient'
      }
    });

  } catch (error) {
    console.error('Error in dynamic transport extraction:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function extractUPSData(file: any, extractedData: ExtractedTransportData) {
  console.log(`\n=== Extracting UPS Data from ${file.file_name} ===`);
  
  const processedData = file.processed_data;
  if (!processedData.parsedData || !Array.isArray(processedData.parsedData)) {
    return;
  }

  for (const row of processedData.parsedData) {
    if (typeof row !== 'object' || !row) continue;

    let origin = '';
    let destination = '';
    let cost = 0;
    let shipmentCount = 0;

    // Extract location data - prioritize zip codes, then cities, then states
    const locationFields = Object.entries(row);
    const zipFields = locationFields.filter(([key]) => 
      key.toLowerCase().includes('zip') || /\d{5}/.test(String(row[key as keyof typeof row]))
    );
    const cityFields = locationFields.filter(([key]) => 
      key.toLowerCase().includes('city')
    );
    const stateFields = locationFields.filter(([key]) => 
      key.toLowerCase().includes('state')
    );

    // Try zip codes first (most specific)
    if (zipFields.length > 0) {
      const originZip = zipFields.find(([key]) => 
        key.toLowerCase().includes('origin') || key.toLowerCase().includes('from')
      );
      const destZip = zipFields.find(([key]) => 
        key.toLowerCase().includes('dest') || key.toLowerCase().includes('to')
      );
      
      if (originZip) origin = String(originZip[1]);
      if (destZip) destination = String(destZip[1]);
    }

    // Fallback to cities
    if (!origin && cityFields.length > 0) {
      const originCity = cityFields.find(([key]) => 
        key.toLowerCase().includes('origin') || key.toLowerCase().includes('from')
      );
      if (originCity) origin = String(originCity[1]);
    }

    // Fallback to states (existing logic)
    if (!origin && stateFields.length > 0) {
      for (const [key, value] of stateFields) {
        if (value && String(value).trim()) {
          origin = `${String(value).trim()}, US`;
          break;
        }
      }
    }

    // Extract cost data
    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      
      if ((keyLower.includes('net') && keyLower.includes('charge')) || 
          key === 'Net Charge' || 
          (keyLower.includes('cost') && !keyLower.includes('total'))) {
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          cost += numValue;
        }
      }
      
      if (keyLower.includes('shipment') || keyLower.includes('count')) {
        const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          shipmentCount += numValue;
        }
      }
    }

    // Create route if we have meaningful data
    if (origin && cost > 0) {
      if (!destination) destination = 'Various Destinations';
      
      const route: ExtractedRoute = {
        origin,
        destination,
        transport_mode: 'UPS_PARCEL',
        cost,
        frequency: shipmentCount || 1,
        data_quality: destination === 'Various Destinations' ? 'origin_only' : 'complete'
      };

      extractedData.routes.push(route);
      extractedData.origins.push(origin);
      if (destination !== 'Various Destinations') {
        extractedData.destinations.push(destination);
      }
      extractedData.baseline_totals.ups_parcel += cost;
    }
  }

  console.log(`UPS: Extracted ${extractedData.routes.filter(r => r.transport_mode === 'UPS_PARCEL').length} routes, $${extractedData.baseline_totals.ups_parcel.toLocaleString()}`);
}

function extractTLData(file: any, extractedData: ExtractedTransportData) {
  console.log(`\n=== Extracting TL Data from ${file.file_name} ===`);
  
  const processedData = file.processed_data;
  if (!processedData.parsedData || !Array.isArray(processedData.parsedData)) {
    return;
  }

  for (const row of processedData.parsedData) {
    if (typeof row !== 'object' || !row) continue;

    let origin = '';
    let destination = '';
    let cost = 0;
    let distance = 0;
    let weight = 0;

    // Extract origin/destination with priority: city/state combinations > cities > states
    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const valueStr = String(value).trim();
      
      if (!valueStr) continue;

      // Origin detection
      if ((keyLower.includes('origin') || keyLower.includes('from') || keyLower.includes('pickup')) && !origin) {
        origin = valueStr;
      }
      
      // Destination detection
      if ((keyLower.includes('dest') || keyLower.includes('to') || keyLower.includes('delivery')) && !destination) {
        destination = valueStr;
      }

      // Fallback to lane description parsing
      if ((keyLower.includes('lane') || keyLower.includes('route')) && valueStr.includes('-')) {
        const parts = valueStr.split('-').map(p => p.trim());
        if (parts.length >= 2 && !origin) {
          origin = parts[0];
          destination = parts[1];
        }
      }

      // Cost extraction - prioritize NET rates over gross
      if (keyLower.includes('net') && (keyLower.includes('rate') || keyLower.includes('charge'))) {
        const numValue = parseFloat(valueStr.replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          cost = numValue; // Prefer net rates
        }
      } else if (!cost && (keyLower.includes('gross') || keyLower.includes('rate') || key === 'H')) {
        const numValue = parseFloat(valueStr.replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 100) { // TL should be substantial
          cost = numValue;
        }
      }

      // Distance and weight
      if (keyLower.includes('mile') || keyLower.includes('distance')) {
        const numValue = parseFloat(valueStr.replace(/[,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          distance = numValue;
        }
      }
      
      if (keyLower.includes('weight')) {
        const numValue = parseFloat(valueStr.replace(/[,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          weight = numValue;
        }
      }
    }

    // Create route if we have meaningful data
    if (cost > 0 && (origin || destination)) {
      if (!origin) origin = 'Unknown Origin';
      if (!destination) destination = 'Unknown Destination';
      
      const route: ExtractedRoute = {
        origin,
        destination,
        transport_mode: 'TL_FREIGHT',
        cost,
        distance: distance || undefined,
        weight: weight || undefined,
        data_quality: (origin !== 'Unknown Origin' && destination !== 'Unknown Destination') ? 'complete' : 'partial'
      };

      extractedData.routes.push(route);
      if (origin !== 'Unknown Origin') extractedData.origins.push(origin);
      if (destination !== 'Unknown Destination') extractedData.destinations.push(destination);
      extractedData.baseline_totals.tl_freight += cost;
    }
  }

  console.log(`TL: Extracted ${extractedData.routes.filter(r => r.transport_mode === 'TL_FREIGHT').length} routes, $${extractedData.baseline_totals.tl_freight.toLocaleString()}`);
}

function extractRLData(file: any, extractedData: ExtractedTransportData) {
  console.log(`\n=== Extracting R&L Data from ${file.file_name} ===`);
  
  const processedData = file.processed_data;
  if (!processedData.parsedData || !Array.isArray(processedData.parsedData)) {
    return;
  }

  for (const row of processedData.parsedData) {
    if (typeof row !== 'object' || !row) continue;

    let origin = '';
    let destination = '';
    let cost = 0;
    let weight = 0;
    let distance = 0;

    // Extract origin/destination
    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();
      const valueStr = String(value).trim();
      
      if (!valueStr) continue;

      // Origin detection
      if ((keyLower.includes('origin') || keyLower.includes('pickup') || keyLower.includes('ship from')) && !origin) {
        origin = valueStr;
      }
      
      // Destination detection  
      if ((keyLower.includes('dest') || keyLower.includes('delivery') || keyLower.includes('ship to')) && !destination) {
        destination = valueStr;
      }

      // Fallback to city for origin
      if (keyLower.includes('city') && !origin && !keyLower.includes('dest')) {
        origin = valueStr;
      }

      // Cost extraction - look for charges in column V or charge fields
      if (key === 'V' || keyLower.includes('charge') || keyLower.includes('cost') || keyLower.includes('amount')) {
        const numValue = parseFloat(valueStr.replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 10) { // LTL threshold
          cost = Math.max(cost, numValue); // Take highest value found
        }
      }

      // Weight and distance
      if (keyLower.includes('weight')) {
        const numValue = parseFloat(valueStr.replace(/[,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          weight = numValue;
        }
      }
      
      if (keyLower.includes('mile') || keyLower.includes('distance')) {
        const numValue = parseFloat(valueStr.replace(/[,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 0) {
          distance = numValue;
        }
      }
    }

    // Create route if we have meaningful data
    if (cost > 0 && (origin || destination)) {
      if (!origin) origin = 'Unknown Origin';
      if (!destination) destination = 'Unknown Destination';
      
      const route: ExtractedRoute = {
        origin,
        destination,
        transport_mode: 'R&L_LTL',
        cost,
        weight: weight || undefined,
        distance: distance || undefined,
        data_quality: (origin !== 'Unknown Origin' && destination !== 'Unknown Destination') ? 'complete' : 'partial'
      };

      extractedData.routes.push(route);
      if (origin !== 'Unknown Origin') extractedData.origins.push(origin);
      if (destination !== 'Unknown Destination') extractedData.destinations.push(destination);
      extractedData.baseline_totals.rl_ltl += cost;
    }
  }

  console.log(`R&L: Extracted ${extractedData.routes.filter(r => r.transport_mode === 'R&L_LTL').length} routes, $${extractedData.baseline_totals.rl_ltl.toLocaleString()}`);
}
