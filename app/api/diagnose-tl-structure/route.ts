import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get TL files and examine their structure in detail
    const tlFiles = await sql`
      SELECT id, file_name, scenario_id, processed_data
      FROM data_files
      WHERE file_name ILIKE '%2024 totals with inbound and outbound tl%'
      ORDER BY id
    `;

    const analysis = [];

    for (const file of tlFiles) {
      const fileAnalysis = {
        file_id: file.id,
        file_name: file.file_name,
        scenario_id: file.scenario_id,
        structure_analysis: {},
        extraction_results: {
          column_h_values: [],
          total_extracted: 0,
          data_paths_tried: []
        }
      };

      if (file.processed_data) {
        // Deep structure analysis
        fileAnalysis.structure_analysis = analyzeStructure(file.processed_data, 'root', 0, 3);
        
        // Try different extraction paths
        const extractionPaths = [
          { path: 'processed_data.data', data: file.processed_data.data },
          { path: 'processed_data.parsedData', data: file.processed_data.parsedData }
        ];

        // If data is object, look for nested arrays
        if (file.processed_data.data && typeof file.processed_data.data === 'object') {
          const nestedArrays = findAllArrays(file.processed_data.data, 'processed_data.data');
          extractionPaths.push(...nestedArrays);
        }

        // Try extracting from each path
        for (const pathInfo of extractionPaths) {
          fileAnalysis.extraction_results.data_paths_tried.push({
            path: pathInfo.path,
            data_type: Array.isArray(pathInfo.data) ? 'array' : typeof pathInfo.data,
            length: Array.isArray(pathInfo.data) ? pathInfo.data.length : 'n/a'
          });

          if (Array.isArray(pathInfo.data) && pathInfo.data.length > 0) {
            const { values, total } = extractColumnH(pathInfo.data);
            if (values.length > 0) {
              fileAnalysis.extraction_results.column_h_values.push({
                data_path: pathInfo.path,
                values_found: values.length,
                sample_values: values.slice(0, 5),
                path_total: total
              });
              fileAnalysis.extraction_results.total_extracted += total;
            }
          }
        }
      }

      analysis.push(fileAnalysis);
    }

    return NextResponse.json({
      success: true,
      files_analyzed: tlFiles.length,
      analysis,
      summary: {
        total_extracted: analysis.reduce((sum, a) => sum + a.extraction_results.total_extracted, 0),
        files_with_data: analysis.filter(a => a.extraction_results.total_extracted > 0).length
      }
    });

  } catch (error) {
    console.error('Error diagnosing TL structure:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Analyze object structure recursively
function analyzeStructure(obj: any, path: string, depth: number, maxDepth: number): any {
  if (depth >= maxDepth || !obj) return { type: typeof obj, depth_limit_reached: true };

  if (Array.isArray(obj)) {
    return {
      type: 'array',
      length: obj.length,
      sample_keys: obj.length > 0 && typeof obj[0] === 'object' ? Object.keys(obj[0]) : []
    };
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    const structure: any = {
      type: 'object',
      keys: keys,
      children: {}
    };

    // Analyze each key
    for (const key of keys.slice(0, 10)) { // Limit to first 10 keys
      const child = obj[key];
      structure.children[key] = {
        type: Array.isArray(child) ? 'array' : typeof child,
        length: Array.isArray(child) ? child.length : 'n/a'
      };

      // Go deeper for arrays and objects
      if ((Array.isArray(child) || typeof child === 'object') && depth < maxDepth - 1) {
        structure.children[key].details = analyzeStructure(child, `${path}.${key}`, depth + 1, maxDepth);
      }
    }

    return structure;
  }

  return { type: typeof obj };
}

// Find all arrays in nested structure
function findAllArrays(obj: any, basePath: string, maxDepth: number = 3): Array<{path: string, data: any}> {
  const arrays: Array<{path: string, data: any}> = [];
  
  function traverse(current: any, currentPath: string, depth: number) {
    if (depth >= maxDepth) return;
    
    if (Array.isArray(current)) {
      arrays.push({ path: currentPath, data: current });
    } else if (current && typeof current === 'object') {
      for (const [key, value] of Object.entries(current)) {
        traverse(value, `${currentPath}.${key}`, depth + 1);
      }
    }
  }
  
  traverse(obj, basePath, 0);
  return arrays;
}

// Extract Column H values
function extractColumnH(data: any[]): { values: any[], total: number } {
  const values = [];
  let total = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (typeof row !== 'object' || !row) continue;

    for (const [key, value] of Object.entries(row)) {
      if (key === 'H' || key === '__EMPTY_7' || 
          key.toLowerCase().includes('total') || 
          key.toLowerCase().includes('cost') ||
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('charge')) {
        
        const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
        if (!isNaN(numValue) && numValue > 1000) {
          values.push({
            row_index: i,
            column_key: key,
            raw_value: value,
            parsed_value: numValue
          });
          total += numValue;
        }
      }
    }
  }

  return { values, total };
}
