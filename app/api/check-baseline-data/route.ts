import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Check what data files are available
    const dataFiles = await sql`
      SELECT 
        df.id,
        df.scenario_id,
        df.file_name,
        df.data_type,
        df.processed_data,
        df.metadata,
        s.name as scenario_name
      FROM data_files df
      JOIN scenarios s ON df.scenario_id = s.id
      WHERE df.processing_status = 'completed'
      ORDER BY s.id, df.data_type
    `;

    // Check capacity analysis results
    const capacityResults = await sql`
      SELECT 
        car.scenario_id,
        car.analysis_data,
        s.name as scenario_name
      FROM capacity_analysis_results car
      JOIN scenarios s ON car.scenario_id = s.id
      ORDER BY car.scenario_id
    `;

    // Look for 2025 baseline data in capacity analysis
    const baselineDataFound = [];
    
    for (const result of capacityResults) {
      const analysisData = result.analysis_data;
      if (analysisData && analysisData.yearly_results) {
        const year2025 = analysisData.yearly_results.find((yr: any) => yr.year === 2025);
        if (year2025) {
          baselineDataFound.push({
            scenario_id: result.scenario_id,
            scenario_name: result.scenario_name,
            year_2025_data: year2025,
            total_investment: analysisData.total_investment_required,
            base_year: analysisData.base_year
          });
        }
      }
    }

    // Look for freight cost data in processed files
    const freightDataFiles = [];
    for (const file of dataFiles) {
      if (file.processed_data && file.processed_data.data) {
        const data = file.processed_data.data;
        if (Array.isArray(data) && data.length > 0) {
          // Check if this looks like freight/cost data
          const firstRow = data[0];
          const hasFreightData = Object.keys(firstRow).some(key => 
            key.toLowerCase().includes('freight') || 
            key.toLowerCase().includes('transport') ||
            key.toLowerCase().includes('cost') ||
            key.toLowerCase().includes('spend')
          );
          
          if (hasFreightData) {
            freightDataFiles.push({
              scenario_id: file.scenario_id,
              scenario_name: file.scenario_name,
              file_name: file.file_name,
              data_type: file.data_type,
              sample_data: data.slice(0, 3), // First 3 rows as sample
              total_rows: data.length,
              columns: Object.keys(firstRow)
            });
          }
        }
      }
    }

    // Check for any existing 2025 baseline calculations
    const existingBaselines = [];
    for (const file of dataFiles) {
      if (file.metadata && typeof file.metadata === 'object') {
        const metadata = file.metadata;
        if (metadata.baseline_year === 2025 || metadata.year === 2025) {
          existingBaselines.push({
            scenario_id: file.scenario_id,
            scenario_name: file.scenario_name,
            file_name: file.file_name,
            metadata: metadata
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_data_files: dataFiles.length,
        capacity_analyses: capacityResults.length,
        scenarios_with_2025_data: baselineDataFound.length,
        freight_data_files: freightDataFiles.length,
        existing_baselines: existingBaselines.length
      },
      capacity_2025_data: baselineDataFound,
      freight_data_files: freightDataFiles,
      existing_baselines: existingBaselines,
      recommendations: [
        'If you have actual 2025 freight spend data, please provide it',
        'We can extract baseline from capacity analysis if available',
        'Current $5.5M is an estimate - should be replaced with actual data',
        'Consider adding 2025 freight data to one of your data files'
      ]
    });
  } catch (error) {
    console.error('Error checking baseline data:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to check baseline data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
