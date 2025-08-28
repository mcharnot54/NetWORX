import { z } from "zod";

export const warehouseRow = z.object({
  sku: z.string().min(1),
  description: z.string().optional(),
  item_class: z.string().optional(),
  uom: z.string().min(1).default("EA"),
  qty: z.coerce.number().finite(),
  location: z.string().optional(),
  loc_type: z.string().optional(),
  lot: z.string().optional(),
  serial: z.string().optional(),
  owner: z.string().optional(),
  warehouse: z.string().optional(),
  area: z.string().optional(),
  transaction_type: z.string().optional(),
  transaction_ts: z.coerce.date().optional(),
});

export const transportRow = z.object({
  order_id: z.string().min(1),
  ship_date: z.coerce.date(),
  origin_zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  dest_zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  service_level: z.string().optional(),
  mode: z.enum(["parcel", "ltl", "tl", "air", "ocean", "intermodal"]).optional(),
  carrier: z.string().optional(),
  weight_lb: z.coerce.number().nonnegative().optional(),
  cube_cf: z.coerce.number().nonnegative().optional(),
  pkgs: z.coerce.number().int().nonnegative().optional(),
  freight_cost_usd: z.coerce.number().nonnegative().optional(),
  // Transport-specific fields for current system integration
  net_charge: z.coerce.number().nonnegative().optional(),
  gross_charge: z.coerce.number().nonnegative().optional(),
  column_v: z.coerce.number().nonnegative().optional(),
  ltl_cost: z.coerce.number().nonnegative().optional(),
  tl_cost: z.coerce.number().nonnegative().optional(),
  parcel_cost: z.coerce.number().nonnegative().optional(),
});

export const inventoryRow = z.object({
  sku: z.string().min(1),
  description: z.string().optional(),
  item_class: z.string().optional(),
  uom: z.string().min(1).default("EA"),
  on_hand_qty: z.coerce.number().int(),
  allocated_qty: z.coerce.number().int().default(0),
  available_qty: z.coerce.number().int().optional(),
  reorder_point: z.coerce.number().int().optional(),
  reorder_qty: z.coerce.number().int().optional(),
  unit_cost_usd: z.coerce.number().nonnegative().optional(),
});

// Enhanced schemas for the learning system
export const uploadSchema = z.object({
  filename: z.string().min(1),
  fileHash: z.string().min(1),
  bytes: z.number().positive(),
  domain: z.enum(["WAREHOUSE", "TRANSPORT", "INVENTORY"]).optional(),
});

export const schemaMappingSchema = z.object({
  rawHeaderNorm: z.string().min(1),
  canonicalField: z.string().min(1),
  confidence: z.number().min(0).max(1),
  hits: z.number().int().positive().default(1),
});

export const headerLearningSchema = z.object({
  originalHeader: z.string().min(1),
  normalizedHeader: z.string().min(1),
  detectedColumn: z.string().min(1),
  confidence: z.number().min(0).max(1),
  dataPattern: z.enum(["currency", "numeric", "text", "date", "zip"]),
  sampleValues: z.array(z.any()).max(10),
  userConfirmed: z.boolean().default(false),
});

export const transportExtractionSchema = z.object({
  fileName: z.string().min(1),
  sheetName: z.string().min(1),
  columnName: z.string().min(1),
  extractedAmount: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  method: z.enum(["column_v", "header_match", "pattern_match", "position_match"]),
  rowsProcessed: z.number().int().nonnegative(),
});

// Validation function for dynamic schema selection
export function getSchemaForDomain(domain: "WAREHOUSE" | "TRANSPORT" | "INVENTORY") {
  switch (domain) {
    case "WAREHOUSE":
      return warehouseRow;
    case "TRANSPORT":
      return transportRow;
    case "INVENTORY":
      return inventoryRow;
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }
}

// Helper function for validating and transforming data
export function validateAndTransformData(
  data: unknown[],
  schema: z.ZodTypeAny
): {
  valid: any[];
  errors: Array<{ row: number; field: string; message: string }>;
  stats: { totalRows: number; validRows: number; errorRate: number };
} {
  const valid: any[] = [];
  const errors: Array<{ row: number; field: string; message: string }> = [];

  data.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
    } else {
      result.error.issues.forEach(issue => {
        errors.push({
          row: index + 1,
          field: String(issue.path[0] ?? "unknown"),
          message: issue.message,
        });
      });
    }
  });

  return {
    valid,
    errors,
    stats: {
      totalRows: data.length,
      validRows: valid.length,
      errorRate: data.length > 0 ? errors.length / data.length : 0,
    },
  };
}
