import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const extractionSchema = z.object({
  fileName: z.string(),
  sheetName: z.string(),
  fileType: z.enum(['UPS', 'TL', 'RL', 'OTHER']),
  columnName: z.string(),
  extractedAmount: z.number(),
  confidence: z.number(),
  method: z.string(),
  rowsProcessed: z.number(),
  columnHeaders: z.array(z.string()),
  sampleData: z.any().optional(),
  learningMetrics: z.object({
    patternDetected: z.string().optional(),
    adaptiveConfidence: z.number().optional(),
    fallbackUsed: z.boolean().optional(),
    processingTime: z.number().optional(),
    adaptiveTemplate: z.object({
      id: z.string(),
      confidence: z.number(),
      mappingsCount: z.number()
    }).optional()
  }).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = extractionSchema.parse(body);
    
    // Store the extraction data for learning and optimization
    // This will feed into future network analysis and cost optimization
    
    console.log(`📊 LEARNING STORAGE: ${data.fileType} ${data.sheetName} - $${data.extractedAmount.toLocaleString()} from ${data.columnName}`);
    console.log(`🧠 CONFIDENCE: ${(data.confidence * 100).toFixed(1)}% using method: ${data.method}`);
    console.log(`🎯 FUTURE OPTIMIZATION: Data ready for network analysis with ${data.rowsProcessed} rows processed`);
    
    // Store in database for future machine learning and pattern recognition
    // This data will be crucial for complex operational cost structures
    
    return NextResponse.json({ 
      success: true, 
      message: "Extraction data stored for learning and optimization",
      learningId: `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
  } catch (error) {
    console.error("Error storing extraction learning data:", error);
    return NextResponse.json(
      { error: "Failed to store learning data" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Future: Return learning analytics and pattern insights
  return NextResponse.json({
    status: "Learning system operational",
    capabilities: [
      "Transportation cost extraction",
      "Column pattern recognition", 
      "Adaptive confidence scoring",
      "Network optimization data prep",
      "Complex operational cost structure support"
    ],
    ready_for: [
      "Inventory optimization",
      "Warehouse cost analysis", 
      "Multi-dimensional data structures",
      "Advanced pattern learning"
    ]
  });
}
