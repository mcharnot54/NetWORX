import { NextRequest, NextResponse } from 'next/server';
import { DataFileService } from '@/lib/database';

export const dynamic = 'force-dynamic';

interface TabAnalysis {
  tabName: string;
  columnCount: number;
  rowCount: number;
  headers: string[];
  sampleData: any[];
  costColumns: Array<{
    column: string;
    index: number;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
    sampleValues: any[];
  }>;
  totalValues: Array<{
    column: string;
    total: number;
    validValues: number;
  }>;
}

async function identifyCostColumns(headers: string[], data: any[]): Promise<TabAnalysis['costColumns']> {
  const XLSX = await import('xlsx');
  const costColumns: TabAnalysis['costColumns'] = [];

  headers.forEach((header, index) => {
    if (!header) return;

    const headerLower = header.toLowerCase();
    const columnLetter = XLSX.utils.encode_col(index);
    
    // Get sample values for this column
    const columnValues = data.slice(0, 10).map(row => row[header]).filter(val => val != null);
    
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let reason = '';
    
    // High confidence indicators
    if (headerLower.includes('cost') || 
        headerLower.includes('price') || 
        headerLower.includes('amount') ||
        headerLower.includes('total') ||
        headerLower.includes('charge') ||
        headerLower.includes('fee') ||
        headerLower.includes('billing') ||
        headerLower.includes('invoice')) {
      confidence = 'high';
      reason = `Header contains cost-related keyword: "${header}"`;
    }
    // Medium confidence - column position or numeric data
    else if (columnLetter === 'F' || columnLetter === 'V' || columnLetter === 'H') {
      confidence = 'medium';
      reason = `Column ${columnLetter} - previously used for cost extraction`;
    }
    // Check if column contains mostly numeric currency-like values
    else if (columnValues.length > 0) {
      const numericValues = columnValues.filter(val => {
        const num = parseFloat(String(val).replace(/[\$,]/g, ''));
        return !isNaN(num) && num > 0;
      });
      
      if (numericValues.length / columnValues.length > 0.7 && numericValues.length > 0) {
        confidence = 'medium';
        reason = `Contains mostly numeric values that could be costs (${numericValues.length}/${columnValues.length} values)`;
      }
    }
    
    // Only include columns with at least medium confidence or if they're in key positions
    if (confidence !== 'low' || ['F', 'V', 'H'].includes(columnLetter)) {
      costColumns.push({
        column: `${columnLetter} (${header})`,
        index,
        confidence,
        reason,
        sampleValues: columnValues.slice(0, 5)
      });
    }
  });
  
  return costColumns;
}

function calculateTotals(headers: string[], data: any[]): TabAnalysis['totalValues'] {
  return headers.map(header => {
    if (!header) return { column: header, total: 0, validValues: 0 };
    
    const values = data.map(row => {
      const val = row[header];
      if (val == null) return 0;
      
      // Try to parse as number, removing common currency symbols
      const numStr = String(val).replace(/[\$,]/g, '');
      const num = parseFloat(numStr);
      return isNaN(num) ? 0 : num;
    }).filter(val => val > 0);
    
    return {
      column: header,
      total: values.reduce((sum, val) => sum + val, 0),
      validValues: values.length
    };
  }).filter(result => result.validValues > 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Get the file from database
    const file = await DataFileService.getDataFileWithFullData(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = (file.processed_data as any)?.file_content;
    if (!fileContent) {
      return NextResponse.json({ error: 'No file content available' }, { status: 400 });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileContent, 'base64');
    
    // Parse Excel file
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const analysis: TabAnalysis[] = [];
    
    // Analyze each worksheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      
      if (jsonData.length === 0) {
        analysis.push({
          tabName: sheetName,
          columnCount: 0,
          rowCount: 0,
          headers: [],
          sampleData: [],
          costColumns: [],
          totalValues: []
        });
        return;
      }
      
      const headers = Object.keys(jsonData[0] || {});
      const costColumns = identifyCostColumns(headers, jsonData);
      const totalValues = calculateTotals(headers, jsonData);
      
      analysis.push({
        tabName: sheetName,
        columnCount: headers.length,
        rowCount: jsonData.length,
        headers,
        sampleData: jsonData.slice(0, 3), // First 3 rows as sample
        costColumns,
        totalValues: totalValues.sort((a, b) => b.total - a.total).slice(0, 10) // Top 10 by total value
      });
    });

    return NextResponse.json({
      fileName: file.file_name,
      totalTabs: analysis.length,
      analysis,
      recommendations: generateRecommendations(analysis)
    });

  } catch (error) {
    console.error('Error analyzing Excel structure:', error);
    return NextResponse.json({
      error: 'Failed to analyze Excel file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

function generateRecommendations(analysis: TabAnalysis[]): Array<{
  tab: string;
  recommendedColumn: string;
  reason: string;
  total: number;
}> {
  return analysis.map(tab => {
    // Find the best cost column for this tab
    const highConfidenceCosts = tab.costColumns.filter(col => col.confidence === 'high');
    const mediumConfidenceCosts = tab.costColumns.filter(col => col.confidence === 'medium');
    
    let recommendedColumn = 'No clear cost column found';
    let reason = 'Unable to identify cost column automatically';
    let total = 0;
    
    if (highConfidenceCosts.length > 0) {
      // Prefer high confidence columns
      const best = highConfidenceCosts[0];
      recommendedColumn = best.column;
      reason = best.reason;
      
      // Find total for this column
      const columnHeader = best.column.split(' (')[1]?.replace(')', '');
      const totalInfo = tab.totalValues.find(t => t.column === columnHeader);
      total = totalInfo?.total || 0;
    } else if (mediumConfidenceCosts.length > 0) {
      // Fall back to medium confidence
      const best = mediumConfidenceCosts[0];
      recommendedColumn = best.column;
      reason = best.reason;
      
      const columnHeader = best.column.split(' (')[1]?.replace(')', '');
      const totalInfo = tab.totalValues.find(t => t.column === columnHeader);
      total = totalInfo?.total || 0;
    }
    
    return {
      tab: tab.tabName,
      recommendedColumn,
      reason,
      total
    };
  });
}
