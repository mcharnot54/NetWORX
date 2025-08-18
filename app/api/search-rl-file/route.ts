import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { sql } = await import('@/lib/database');
    
    // Search for R&L file with various name patterns
    const allFiles = await sql`
      SELECT file_name, id, processing_status, data_type
      FROM data_files
      WHERE file_name IS NOT NULL
      ORDER BY file_name
    `;

    const rlFiles = allFiles.filter((file: any) => {
      const fileName = file.file_name.toLowerCase();
      return fileName.includes('r&l') || 
             fileName.includes('curriculum') ||
             fileName.includes('associates') ||
             fileName.includes('ltl') ||
             (fileName.includes('2024') && (fileName.includes('1.1') || fileName.includes('12.31')));
    });

    // Also search broader patterns
    const transportFiles = allFiles.filter((file: any) => {
      const fileName = file.file_name.toLowerCase();
      return fileName.includes('transport') ||
             fileName.includes('freight') ||
             fileName.includes('shipping') ||
             fileName.includes('carrier');
    });

    return NextResponse.json({
      success: true,
      total_files: allFiles.length,
      all_files: allFiles.map((f: any) => f.file_name),
      rl_files_found: rlFiles,
      transport_files_found: transportFiles,
      search_patterns_used: [
        'r&l',
        'curriculum',
        'associates', 
        'ltl',
        '2024 + 1.1',
        '2024 + 12.31'
      ]
    });

  } catch (error) {
    console.error('Error searching for R&L file:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
