import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { suggestMapping, normalizeHeader } from "@/lib/headerMap";
import { classifyColumns } from "@/lib/columnClassifier";
import { warehouseRow, transportRow, inventoryRow, validateAndTransformData } from "@/lib/schemas";

type Domain = "WAREHOUSE" | "TRANSPORT" | "INVENTORY";

export const runtime = "nodejs"; // ensure Node runtime for parsing

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const domain = (form.get("domain") as string | null)?.toUpperCase() as Domain | null;

  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (!domain) return NextResponse.json({ error: "Missing domain" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  // Decide by MIME/extension
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xlsb") || name.endsWith(".xls");

  const rows: any[] = [];
  let rawHeaders: string[] = [];

  if (isExcel) {
    // Dynamic import for XLSX
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf, { type: "buffer" });
    
    // Smart sheet selection using header scoring
    let bestSheet = wb.SheetNames[0];
    let bestScore = -1;

    for (const sheetName of wb.SheetNames) {
      // Use smart header detection to find actual headers
      const rawData = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1, raw: false });
      
      // Find the best header row (skip logos/empty rows)
      let headerRowIndex = 0;
      let bestHeaderScore = 0;
      
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] ?? [];
        if (row.length === 0) continue;
        
        let score = 0;
        for (const cell of row) {
          if (cell && typeof cell === 'string' && cell.trim().length > 0) {
            // Score meaningful headers
            const mapping = suggestMapping(String(cell));
            score += mapping.score;
          }
        }
        
        if (score > bestHeaderScore && score >= 1) { // At least some meaningful headers
          bestHeaderScore = score;
          headerRowIndex = i;
        }
      }
      
      if (bestHeaderScore > bestScore) {
        bestScore = bestHeaderScore;
        bestSheet = sheetName;
      }
    }

    const ws = wb.Sheets[bestSheet];
    
    // Use smart header detection
    const allRowsRaw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false });
    let headerRowIndex = 0;
    let bestHeaderScore = 0;
    
    for (let i = 0; i < Math.min(10, allRowsRaw.length); i++) {
      const row = allRowsRaw[i] ?? [];
      if (row.length === 0) continue;
      
      let score = 0;
      for (const cell of row) {
        if (cell && typeof cell === 'string' && cell.trim().length > 0) {
          const mapping = suggestMapping(String(cell));
          score += mapping.score;
        }
      }
      
      if (score > bestHeaderScore && score >= 1) {
        bestHeaderScore = score;
        headerRowIndex = i;
      }
    }
    
    // Extract data starting from detected header row
    const headerRow = allRowsRaw[headerRowIndex] ?? [];
    const dataRows = allRowsRaw.slice(headerRowIndex + 1);
    
    rawHeaders = headerRow.map(String).filter(Boolean);
    
    // Convert to object format
    dataRows.forEach(row => {
      const obj: any = {};
      rawHeaders.forEach((header, idx) => {
        obj[header] = row[idx] ?? null;
      });
      if (Object.values(obj).some(v => v != null)) {
        rows.push(obj);
      }
    });
    
  } else {
    const text = buf.toString("utf8");
    const parsed = Papa.parse<any>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      return NextResponse.json({ error: "CSV parse error", details: parsed.errors.slice(0, 3) }, { status: 400 });
    }
    rawHeaders = parsed.meta.fields ?? [];
    rows.push(...parsed.data);
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }

  // Enhanced column classification
  const columnAnalysis = classifyColumns(rawHeaders, rows.slice(0, 100));

  // Map headers using both similarity and classification
  const headerMap: Record<string, string> = {};
  const mappingResults = rawHeaders.map(h => {
    const suggestion = suggestMapping(h);
    const columnInfo = columnAnalysis.columns.find(c => c.header === h);
    
    // Use classification if confidence is higher
    let finalMapping = suggestion.mappedTo;
    let finalScore = suggestion.score;
    
    if (columnInfo && columnInfo.classification.p > finalScore + 0.1) {
      finalMapping = columnInfo.classification.guess;
      finalScore = columnInfo.classification.p;
    }
    
    if (finalMapping) {
      headerMap[h] = finalMapping;
    }
    
    return {
      ...suggestion,
      mappedTo: finalMapping,
      score: finalScore,
      classificationMethod: columnInfo?.classification.method,
      transportAnalysis: columnInfo?.transportAnalysis
    };
  });

  // Apply mapping & validate
  const validated: any[] = [];
  const issues: { row: number; field: string; message: string }[] = [];

  const rowSchema =
    domain === "WAREHOUSE" ? warehouseRow :
    domain === "TRANSPORT" ? transportRow :
    inventoryRow;

  // Build canonical rows
  const canonicalRows = rows.map(r => {
    const canon: Record<string, any> = {};
    for (const [raw, canonKey] of Object.entries(headerMap)) {
      canon[canonKey] = r[raw];
    }
    
    // Smart imputations
    if (canon["available_qty"] == null && canon["on_hand_qty"] != null && canon["allocated_qty"] != null) {
      canon["available_qty"] = Number(canon["on_hand_qty"]) - Number(canon["allocated_qty"]);
    }
    
    return canon;
  });

  // Validate using enhanced validation
  const validationResult = validateAndTransformData(canonicalRows, rowSchema);

  // Build enhanced report
  const unmapped = rawHeaders.filter(h => !(h in headerMap));
  const report = {
    file: name,
    domain,
    totalRows: rows.length,
    mappedFields: Object.values(headerMap),
    unmappedHeaders: unmapped,
    mappingPreview: mappingResults,
    validRows: validationResult.valid.length,
    errorCount: validationResult.errors.length,
    validationStats: validationResult.stats,
    sampleErrors: validationResult.errors.slice(0, 20),
    columnAnalysis: {
      totalColumns: rawHeaders.length,
      classifiedColumns: columnAnalysis.columns.filter(c => c.classification.guess).length,
      bestTransportColumn: columnAnalysis.bestTransportColumn,
      transportColumns: columnAnalysis.columns.filter(c => c.transportAnalysis.isTransportColumn)
    }
  };

  return NextResponse.json({ 
    headerMap, 
    report, 
    preview: validationResult.valid.slice(0, 200),
    columnAnalysis: columnAnalysis.columns
  });
}
