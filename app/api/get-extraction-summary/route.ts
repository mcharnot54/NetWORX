import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('http://localhost:3000/api/test-baseline-extraction');
    const data = await response.json();
    
    if (!data.success) {
      return NextResponse.json(data);
    }

    // Create detailed summary
    const summary = {
      overall: {
        total_freight_costs: data.summary.total_freight_costs_extracted,
        files_processed: data.summary.files_processed,
        extraction_ready: data.summary.extraction_ready
      },
      by_file: data.file_details.map((file: any) => ({
        file_name: file.file_name.replace(/\s+/g, ' ').trim(),
        extracted_amount: file.total_extracted,
        formatted_amount: file.total_extracted > 1000000 
          ? `$${(file.total_extracted / 1000000).toFixed(2)}M`
          : file.total_extracted > 1000
            ? `$${(file.total_extracted / 1000).toFixed(0)}K`
            : `$${file.total_extracted.toFixed(2)}`,
        data_arrays: file.data_arrays_found,
        status: file.status,
        file_type: getFileType(file.file_name)
      })),
      extraction_methods: {
        ups_individual_item_cost: "Column G (Net Charges) - All 4 tabs",
        tl_totals: "Column H (Total Costs) - Inbound/Outbound/Transfers",
        rl_ltl: "Column V (Net Charges) - LTL shipping"
      },
      next_steps: [
        "Apply extracted costs to 2025 baseline calculations",
        "Verify cost categorization and allocation",
        "Generate transportation budget projections"
      ]
    };

    return NextResponse.json({
      success: true,
      extraction_summary: summary,
      raw_data: data.file_details
    });

  } catch (error) {
    console.error('Error getting extraction summary:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getFileType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('ups') && lower.includes('individual')) {
    return 'UPS_PARCEL_COSTS';
  } else if (lower.includes('tl') && lower.includes('totals')) {
    return 'TRUCKLOAD_COSTS';
  } else if (lower.includes('r&l') && lower.includes('curriculum')) {
    return 'LTL_COSTS';
  }
  return 'UNKNOWN';
}
