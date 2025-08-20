import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'networx-uploads';

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { s3Key } = await request.json();

    if (!s3Key) {
      return NextResponse.json(
        { error: 's3Key is required' },
        { status: 400 }
      );
    }

    console.log('Inspecting S3 file:', s3Key);

    // Download file from S3
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    const fileBuffer = await response.Body?.transformToByteArray();

    if (!fileBuffer) {
      throw new Error('Failed to download file from S3');
    }

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log(`File has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

    const inspection = {
      fileName: s3Key.split('/').pop(),
      fileSize: fileBuffer.length,
      sheets: [] as any[]
    };

    // Inspect each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log(`Sheet "${sheetName}" has ${jsonData.length} rows`);
      
      // Get first few rows for inspection
      const sampleRows = jsonData.slice(0, 10);
      
      // Check column headers (first row)
      const headers = jsonData[0] as any[];
      
      const sheetInfo = {
        name: sheetName,
        totalRows: jsonData.length,
        totalColumns: headers ? headers.length : 0,
        headers: headers || [],
        sampleData: sampleRows,
        columnInfo: {
          columnA: headers ? headers[0] : 'Not found',
          columnM: headers ? headers[12] : 'Not found',
          columnN: headers ? headers[13] : 'Not found', 
          columnQ: headers ? headers[16] : 'Not found',
          columnS: headers ? headers[18] : 'Not found',
          columnT: headers ? headers[19] : 'Not found',
          columnAI: headers ? headers[34] : 'Not found'
        }
      };
      
      inspection.sheets.push(sheetInfo);
    }

    return NextResponse.json({
      success: true,
      inspection,
      bucket: S3_BUCKET,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error inspecting S3 file:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to inspect file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 's3-inspect-files',
    status: 'ok',
    description: 'Inspects Excel file structure from S3',
    timestamp: new Date().toISOString()
  });
}
