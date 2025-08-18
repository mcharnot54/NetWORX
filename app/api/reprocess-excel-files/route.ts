import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== REPROCESSING EXCEL FILES FOR MULTI-TAB EXTRACTION ===');
    
    // This endpoint will be called when files are re-uploaded to ensure proper tab extraction
    // For now, let's analyze what we have and provide guidance
    
    const { sql } = await import('@/lib/database');
    
    // Check current files and their structures
    const files = await sql`
      SELECT id, file_name, file_size, processing_status,
        CASE 
          WHEN processed_data ? 'excel_preserved' THEN 'has_excel_data'
          WHEN processed_data ? 'file_content' THEN 'has_file_content'
          WHEN processed_data ? 'data' THEN 'has_data_object'
          WHEN processed_data ? 'parsedData' THEN 'has_parsed_data'
          ELSE 'unknown_structure'
        END as data_structure
      FROM data_files
      WHERE (
        file_name ILIKE '%ups%individual%item%cost%' OR
        file_name ILIKE '%2024%totals%tl%' OR
        file_name ILIKE '%r&l%curriculum%'
      )
      ORDER BY file_name
    `;

    console.log(`Found ${files.length} transportation files`);

    const analysis = {
      current_issues: [],
      recommendations: [],
      expected_totals: {
        ups: 'Over $2,900,000 across 4 tabs (Net Charge column)',
        tl: 'Sum of all 3 tabs (Inbound + Outbound + Transfers)',
        rl: 'LTL costs from appropriate column'
      }
    };

    // Analyze each file
    for (const file of files) {
      console.log(`Analyzing ${file.file_name}: ${file.data_structure}`);
      
      const fileNameLower = file.file_name.toLowerCase();
      
      if (fileNameLower.includes('ups') && fileNameLower.includes('individual')) {
        analysis.current_issues.push(
          `UPS file (${file.file_name}) appears to be processed as single array instead of preserving 4 tabs`
        );
        analysis.recommendations.push(
          'UPS file needs to be re-processed to extract Net Charge from each of the 4 tabs separately'
        );
      } else if (fileNameLower.includes('2024') && fileNameLower.includes('tl')) {
        analysis.current_issues.push(
          `TL file (${file.file_name}) needs to extract from all tabs (Inbound, Outbound, Transfers)`
        );
        analysis.recommendations.push(
          'TL file should extract column H costs from each tab: Inbound + Outbound + Transfers'
        );
      } else if (fileNameLower.includes('r&l') && fileNameLower.includes('curriculum')) {
        analysis.current_issues.push(
          `R&L file (${file.file_name}) needs correct column V identification for LTL costs`
        );
        analysis.recommendations.push(
          'R&L file should extract LTL shipping costs from column V (Net Charges)'
        );
      }
    }

    // Create a new extraction strategy
    const extractionStrategy = {
      ups_strategy: {
        file_pattern: 'UPS Individual Item Cost',
        tabs_expected: 4,
        column_to_extract: 'Net Charge',
        extraction_method: 'Sum Net Charge from all 4 tabs',
        expected_total: '>$2,900,000'
      },
      tl_strategy: {
        file_pattern: '2024 TOTALS WITH INBOUND AND OUTBOUND TL',
        tabs_expected: 3,
        tabs: ['Inbound', 'Outbound', 'Transfers'],
        column_to_extract: 'Column H',
        extraction_method: 'Sum column H from all 3 tabs',
        expected_result: 'Much higher than current $690K'
      },
      rl_strategy: {
        file_pattern: 'R&L CURRICULUM ASSOCIATES',
        column_to_extract: 'Column V',
        extraction_method: 'Extract LTL Net Charges',
        expected_result: 'Substantial LTL shipping costs'
      }
    };

    // Provide immediate solution
    console.log('\n=== SOLUTION APPROACH ===');
    console.log('1. Re-upload files with proper multi-sheet preservation');
    console.log('2. Update extraction logic to handle each tab separately');
    console.log('3. Verify totals match user expectations');

    return NextResponse.json({
      success: true,
      analysis: {
        current_files: files,
        issues_identified: analysis.current_issues,
        recommendations: analysis.recommendations,
        expected_totals: analysis.expected_totals
      },
      extraction_strategy: extractionStrategy,
      immediate_action_needed: {
        problem: 'Files processed as single arrays instead of preserving multi-sheet structure',
        solution: 'Need to re-process Excel files to maintain tab separation',
        user_expectation: 'UPS: >$2.9M, TL: All 3 tabs combined, R&L: Column V costs',
        current_shortfall: 'Only extracting $502K from UPS instead of $2.9M+'
      },
      next_steps: [
        'Re-upload files with Excel structure preservation',
        'Update extraction to process each tab individually',
        'Verify extraction totals against user expectations',
        'Implement proper column identification for each file type'
      ]
    });

  } catch (error) {
    console.error('Error in reprocessing analysis:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Provide status of current extraction issues
  return NextResponse.json({
    success: true,
    status: 'Files need reprocessing to extract from all Excel tabs properly',
    current_issue: 'Multi-sheet Excel files being flattened into single arrays',
    user_expectation: 'UPS: >$2.9M from 4 tabs, TL: All 3 tabs combined',
    action_required: 'Re-upload files with proper Excel structure preservation'
  });
}
