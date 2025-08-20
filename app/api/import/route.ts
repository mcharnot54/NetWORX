import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const runtime = 'nodejs';
export const preferredRegion = ['iad1','cle1','pdx1'];

function sheetToAoA(ws: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    const fileSize = file.size;

    console.log(`Processing file: ${file.name} (${Math.round(fileSize / 1024)}KB)`);

    let aoa: any[][] = [];
    let sheetNames: string[] = [];

    if (name.endsWith('.csv')) {
      const text = buf.toString('utf8');
      // Use Papa Parse for better CSV handling
      const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
      aoa = parsed.data as any[][];
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsb')) {
      try {
        const wb = XLSX.read(buf, { type: 'buffer' });
        sheetNames = wb.SheetNames;
        
        // Process first sheet by default
        const ws = wb.Sheets[wb.SheetNames[0]];
        aoa = sheetToAoA(ws);
        
        console.log(`Excel file processed: ${sheetNames.length} sheets, using "${wb.SheetNames[0]}"`);
      } catch (xlsxError) {
        console.error('XLSX parsing error:', xlsxError);
        throw new Error(`Failed to parse Excel file: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown error'}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${name.split('.').pop()}`);
    }

    if (!aoa.length) {
      throw new Error('File appears to be empty or invalid');
    }

    // Extract headers (first row) and clean them
    const headers = (aoa[0] || []).map((h: any) => String(h || '').trim());
    
    // Return first 50 rows for preview to avoid huge payloads, but give a reasonable sample
    const previewRows = Math.min(50, aoa.length);
    const preview = aoa.slice(0, previewRows);
    
    // Provide basic file statistics
    const stats = {
      totalRows: aoa.length,
      previewRows: preview.length,
      totalColumns: headers.length,
      fileSize: fileSize,
      fileSizeFormatted: `${Math.round(fileSize / 1024)}KB`,
      sheetNames: sheetNames.length > 0 ? sheetNames : undefined
    };

    return NextResponse.json({ 
      ok: true, 
      name: file.name, 
      headers,
      rows: preview, 
      stats,
      message: `Processed ${stats.totalRows} rows, showing first ${stats.previewRows} for preview`
    });

  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json({ 
      ok: false, 
      error: err?.message ?? 'Import error',
      details: err?.stack ? err.stack.split('\n').slice(0, 3).join('\n') : undefined
    }, { status: 400 });
  }
}
