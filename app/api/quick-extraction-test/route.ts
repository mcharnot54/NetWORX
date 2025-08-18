import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get both files and analyze their current extraction vs expected
    const files = await sql`
      SELECT id, file_name, processed_data
      FROM data_files
      WHERE (file_name ILIKE '%R&L%' AND file_name ILIKE '%CURRICULUM%')
         OR (file_name ILIKE '%2024 TOTALS%' AND file_name ILIKE '%TL%')
      ORDER BY file_name
    `;

    const analysis = files.map(file => {
      const processedData = file.processed_data as any;
      
      if (processedData?.multi_tab_structure) {
        const tabs = processedData.multi_tab_structure.tabs || [];
        
        return {
          file_name: file.file_name,
          file_type: file.file_name.includes('R&L') ? 'R&L' : 'TL',
          tabs: tabs.map((tab: any) => ({
            name: tab.name,
            rows: tab.rows,
            columns: tab.columns?.slice(0, 10) || [], // First 10 columns
            target_column: tab.target_column,
            extracted_amount: tab.extracted_amount,
            has_column_v: (tab.columns || []).includes('V'),
            cost_like_columns: (tab.columns || []).filter((col: string) =>
              col.toLowerCase().includes('charge') ||
              col.toLowerCase().includes('cost') ||
              col.toLowerCase().includes('amount') ||
              col.toLowerCase().includes('net') ||
              col === 'V'
            )
          }))
        };
      }
      
      return {
        file_name: file.file_name,
        file_type: 'Unknown',
        error: 'No multi-tab structure found'
      };
    });

    // Summary of current issues
    const issues = [];
    
    const rlFile = analysis.find(f => f.file_type === 'R&L');
    if (rlFile && !rlFile.error) {
      const detailTab = rlFile.tabs?.find((tab: any) => tab.name.toLowerCase().includes('detail'));
      if (detailTab) {
        if (detailTab.has_column_v && detailTab.target_column !== 'V') {
          issues.push(`R&L: Column V exists but '${detailTab.target_column}' was selected instead`);
        } else if (!detailTab.has_column_v) {
          issues.push(`R&L: Column V not found in Detail tab columns`);
        }
        if (detailTab.extracted_amount > 1000000000) { // > 1 billion
          issues.push(`R&L: Extracted amount suspiciously high: ${detailTab.extracted_amount}`);
        }
      }
    }

    const tlFile = analysis.find(f => f.file_type === 'TL');
    if (tlFile && !tlFile.error) {
      const totalExtracted = tlFile.tabs?.reduce((sum: number, tab: any) => sum + (tab.extracted_amount || 0), 0) || 0;
      if (totalExtracted > 2000000) { // > 2 million
        issues.push(`TL: Total extraction suspiciously high: ${totalExtracted} (likely includes total rows)`);
      }
    }

    return NextResponse.json({
      summary: {
        files_analyzed: files.length,
        issues_found: issues.length,
        current_issues: issues
      },
      detailed_analysis: analysis,
      recommendations: [
        'R&L: Prioritize column V extraction with more lenient validation',
        'TL: Filter out rows containing "total", "sum", "grand" keywords',
        'Both: Add better logging to understand column selection logic'
      ]
    });

  } catch (error) {
    console.error('Error in quick extraction test:', error);
    return NextResponse.json({
      error: 'Failed to analyze extractions',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
