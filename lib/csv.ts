import { parse, Options as CsvOptions } from "csv-parse";
import { Readable } from "stream";

export type CsvDialect = {
  delimiter: string;
  quote: string;
  escape: string;
  bom: boolean;
  columns: boolean;         // whether the file has headers
  relaxQuotes: boolean;
  relaxColumnCount: boolean;
};

export type CsvReport = {
  rowCount: number;
  badRows: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  dialect: CsvDialect;
  errors: { row: number; message: string }[];
};

export type CsvProcessOptions = {
  /** Provide if you've already read a Buffer; otherwise pass a Readable */
  buffer?: Buffer;
  stream?: Readable;
  /** If you know it: speed boost */
  hasHeader?: boolean;
  /** Limit for preview/sample */
  sampleLimit?: number;
  /** Stop early after N rows (useful in "catalog" scans) */
  hardRowLimit?: number;
};

export function detectEncodingAndStripBOM(buf: Buffer): { text: string; encoding: "utf8"|"utf16le"|"utf16be"|"unknown"; bom: boolean } {
  // UTF-8 BOM: EF BB BF
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return { text: buf.slice(3).toString("utf8"), encoding: "utf8", bom: true };
  }
  // UTF-16 LE BOM: FF FE
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    // Convert to UTF-8
    const text = new TextDecoder("utf-16le").decode(buf.slice(2));
    return { text, encoding: "utf16le", bom: true };
  }
  // UTF-16 BE BOM: FE FF
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    const text = new TextDecoder("utf-16be").decode(buf.slice(2));
    return { text, encoding: "utf16be", bom: true };
  }
  // Default assume UTF-8
  return { text: buf.toString("utf8"), encoding: "unknown", bom: false };
}

export function sniffDelimiter(firstLines: string): string {
  const candidates = [",", "\t", ";", "|"];
  const lines = firstLines.split(/\r?\n/).filter(Boolean).slice(0, 10);
  if (!lines.length) return ",";

  const scores = candidates.map(delim => {
    const counts = lines.map(l => (l.match(new RegExp(`\\${delim}`, "g")) || []).length);
    // Score: consistency of counts (low variance) + magnitude (more columns generally better)
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;
    const stability = 1 / (1 + variance);
    return { delim, score: stability * (avg + 1) };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0].delim;
}

export function normalizeHeader(s: string) {
  return s?.toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Process CSV with streaming:
 * - Detect encoding + delimiter
 * - Stream rows (low memory)
 * - Return headers, a sample, and an async iterator you can consume for validation/import
 */
export async function processCsv(
  opts: CsvProcessOptions
): Promise<{
  report: CsvReport;
  /** Async iterator of typed records (object mode) */
  rows: AsyncGenerator<Record<string, any>, void, unknown>;
}> {
  if (!opts.buffer && !opts.stream) {
    throw new Error("processCsv: provide buffer or stream");
  }

  // Get a string prefix for sniffing
  let text: string, bom = false;
  if (opts.buffer) {
    const enc = detectEncodingAndStripBOM(opts.buffer);
    text = enc.text;
    bom = enc.bom;
  } else {
    // if only stream given, read small chunk for sniffing
    const chunks: Buffer[] = [];
    let total = 0;
    const s = opts.stream as Readable;
    for await (const chunk of s) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      total += Buffer.byteLength(chunk);
      if (total > 32 * 1024) break; // 32KB for sniff
    }
    const buf = Buffer.concat(chunks);
    const enc = detectEncodingAndStripBOM(buf);
    text = enc.text;
    bom = enc.bom;
    // Rebuild a full stream from the sniffed part + remaining unreadable content
    const rest = s.read() as Buffer | null; // may be null; stream state can vary
    const back = rest ? Buffer.concat([buf, rest]) : buf;
    opts.buffer = back; // fall back to buffer path after sniff
  }

  const firstChunk = text.slice(0, 64 * 1024); // 64KB for delimiter sniff
  const delimiter = sniffDelimiter(firstChunk);
  const hasHeader = opts.hasHeader ?? true;

  // Build parser
  const csvOptions: CsvOptions = {
    delimiter,
    bom,
    columns: hasHeader,         // parse objects keyed by header
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true
  };

  // Create a stream from buffer (or from provided stream)
  const input = opts.buffer
    ? Readable.from(opts.buffer.toString("utf8"))
    : (opts.stream as Readable);

  const parser = input.pipe(parse(csvOptions));

  // State
  const headers: string[] = [];
  const sampleRows: Record<string, any>[] = [];
  const errors: { row: number; message: string }[] = [];
  let rowCount = 0;
  let badRows = 0;
  const sampleLimit = Math.max(0, opts.sampleLimit ?? 50);
  const hardLimit = opts.hardRowLimit ?? Infinity;

  // If we had no headers set by parser (columns=false), derive them from first record
  let headerReady = false;

  // Create async generator
  async function* rowGen() {
    for await (const record of parser) {
      try {
        if (!headerReady) {
          if (hasHeader) {
            // csv-parse already used first row as header names
            // Extract headers from the first record's keys
            if (record && typeof record === "object") {
              const recordKeys = Object.keys(record);
              headers.splice(0, headers.length, ...recordKeys);
            }
          } else {
            // derive from current record's keys (or create generic)
            const keys = Object.keys(record);
            if (keys.length) {
              headers.splice(0, headers.length, ...keys.map((_, i) => `col${i + 1}`));
            }
          }
          headerReady = true;
        }

        rowCount++;
        if (sampleRows.length < sampleLimit) sampleRows.push(record);
        yield record;

        if (rowCount >= hardLimit) {
          // drain remaining stream silently
          break;
        }
      } catch (e: any) {
        badRows++;
        errors.push({ row: rowCount, message: e?.message ?? "Unknown parse error" });
        continue;
      }
    }
  }

  const rows = rowGen();

  const report: CsvReport = {
    rowCount: 0,        // filled by the consumer after iteration, or leave 0 as preview mode
    badRows,
    headers,            // Will be populated by the generator
    sampleRows,
    dialect: {
      delimiter,
      quote: `"`,
      escape: `"`,
      bom,
      columns: hasHeader,
      relaxQuotes: true,
      relaxColumnCount: true,
    },
    errors,
  };

  // We can't know final rowCount until consumer finishes iterating.
  // If you want "quick analyze only", iterate a limited number of rows outside and set report.rowCount.

  return { report, rows };
}
