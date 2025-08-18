import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { sql } = await import('@/lib/database');
    
    // Get the UPS file and analyze its structure
    const upsFile = await sql`
      SELECT 
        id,
        file_name,
        processed_data
      FROM data_files 
      WHERE file_name LIKE '%UPS Individual Item Cost%'
      AND processed_data ? 'file_content'
      ORDER BY id DESC
      LIMIT 1
    `;

    if (upsFile.length === 0) {
      return NextResponse.json({ error: 'UPS file not found' });
    }

    const file = upsFile[0];
    const processedData = file.processed_data as any;

    // Parse the file to analyze columns
    const XLSX = await import('xlsx');
    const fileContent = Buffer.from(processedData.file_content, 'base64');
    const workbook = XLSX.read(fileContent, { type: 'buffer' });

    const tabAnalysis = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length > 0) {
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1).filter((row: any) => row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''));
        
        // Find all charge-related columns
        const chargeColumns = headers.filter(header => 
          header && (
            header.toLowerCase().includes('charge') ||
            header.toLowerCase().includes('cost') ||
            header.toLowerCase().includes('net') ||
            header.toLowerCase().includes('gross')
          )
        );

        // Analyze each charge column
        const columnAnalysis = [];
        for (const col of chargeColumns) {
          const colIndex = headers.indexOf(col);
          let totalValue = 0;
          let validValues = 0;
          let sampleValues = [];

          for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
            const row = dataRows[i];
            if (row && row[colIndex] !== null && row[colIndex] !== undefined) {
              const value = row[colIndex];
              const numValue = parseFloat(String(value).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue)) {
                totalValue += numValue;
                validValues++;
                sampleValues.push({ row: i + 2, value: value, parsed: numValue });
              }
            }
          }

          // Calculate total for entire column
          let fullTotal = 0;
          let fullValidCount = 0;
          for (const row of dataRows) {
            if (row && row[colIndex] !== null && row[colIndex] !== undefined) {
              const numValue = parseFloat(String(row[colIndex]).replace(/[$,\s]/g, ''));
              if (!isNaN(numValue) && numValue > 0) {
                fullTotal += numValue;
                fullValidCount++;
              }
            }
          }

          columnAnalysis.push({
            column_name: col,
            column_index: colIndex,
            sample_total: totalValue,
            sample_valid_count: validValues,
            full_total: fullTotal,
            full_valid_count: fullValidCount,
            sample_values: sampleValues.slice(0, 5)
          });
        }

        tabAnalysis.push({
          sheet_name: sheetName,
          total_rows: dataRows.length,
          total_columns: headers.length,
          all_headers: headers,
          charge_columns: chargeColumns,
          column_analysis: columnAnalysis,
          recommended_column: columnAnalysis.length > 0 ? 
            columnAnalysis.reduce((best, current) => 
              current.full_total > best.full_total ? current : best
            ).column_name : null
        });
      }
    }

    return NextResponse.json({
      file_info: {
        id: file.id,
        file_name: file.file_name
      },
      tab_analysis: tabAnalysis,
      summary: {
        total_tabs: tabAnalysis.length,
        expected_total: tabAnalysis.reduce((sum, tab) => {
          const bestColumn = tab.column_analysis.reduce((best, current) => 
            current.full_total > best.full_total ? current : best, 
            { full_total: 0 }
          );
          return sum + bestColumn.full_total;
        }, 0)
      }
    });

  } catch (error) {
    console.error('Error analyzing UPS columns:', error);
    return NextResponse.json({
      error: 'Failed to analyze UPS columns',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
