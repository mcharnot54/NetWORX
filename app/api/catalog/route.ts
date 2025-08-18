import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { classifyColumn } from "@/lib/columnClassifier";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files") as File[]; // allow multiple
  const domain = (form.get("domain") as string | null)?.toUpperCase() || "AUTO";

  const catalog: any[] = [];

  for (const file of files) {
    const buf = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    const isExcel = /\.(xlsx|xlsb|xls)$/i.test(name);
    const items: any[] = [];

    const parseSheet = (rows: any[], sheetName?: string) => {
      const headers = Object.keys(rows[0] ?? {});
      const columnSamples: Record<string, any[]> = {};
      for (const h of headers) columnSamples[h] = [];
      for (const r of rows.slice(0, 500)) for (const h of headers) columnSamples[h].push(r[h]);

      const columns = headers.map((h, index) => {
        const cls = classifyColumn(h, columnSamples[h], index);
        return { 
          rawHeader: h, 
          guess: cls.guess, 
          confidence: Number(cls.p.toFixed(2)), 
          alts: cls.alts,
          method: cls.method
        };
      });

      items.push({ 
        sheetName: sheetName || 'default',
        columns,
        rowCount: rows.length,
        columnCount: headers.length
      });
    };

    if (isExcel) {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: "buffer" });
      
      for (const sheetName of wb.SheetNames) {
        // Smart header detection for each sheet
        const ws = wb.Sheets[sheetName];
        const allRowsRaw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false });
        
        let headerRowIndex = 0;
        let bestScore = 0;
        
        // Find best header row (skip logos)
        for (let i = 0; i < Math.min(10, allRowsRaw.length); i++) {
          const row = allRowsRaw[i] ?? [];
          if (row.length === 0) continue;
          
          let score = 0;
          for (const cell of row) {
            if (cell && typeof cell === 'string' && cell.trim().length > 0) {
              score += 1;
              // Boost for meaningful headers
              if (cell.toLowerCase().match(/date|cost|amount|total|charge|net|id|name|sku/)) {
                score += 2;
              }
            }
          }
          
          if (score > bestScore && score >= 3) {
            bestScore = score;
            headerRowIndex = i;
          }
        }
        
        // Extract data from detected header row
        const headerRow = allRowsRaw[headerRowIndex] ?? [];
        const dataRows = allRowsRaw.slice(headerRowIndex + 1);
        
        if (headerRow.length > 0 && dataRows.length > 0) {
          const headers = headerRow.map(String).filter(Boolean);
          const objectData = dataRows.map(row => {
            const obj: any = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx] ?? null;
            });
            return obj;
          }).filter(obj => Object.values(obj).some(v => v != null));
          
          if (objectData.length > 0) {
            parseSheet(objectData, sheetName);
          }
        }
      }
    } else {
      const text = buf.toString("utf8");
      const parsed = Papa.parse<any>(text, { header: true, skipEmptyLines: true });
      if (parsed.data?.length) parseSheet(parsed.data);
    }

    catalog.push({ 
      file: file.name, 
      items,
      fileSize: file.size,
      totalSheets: items.length
    });
  }

  return NextResponse.json({ catalog });
}
