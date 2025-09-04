import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'networx-uploads';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const s3Client = new S3Client({
  region: AWS_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const networkKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    
    console.log('Debugging Network Footprint file:', networkKey);

    // Download file from S3
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: networkKey,
    });

    const response = await s3Client.send(command);
    const fileBuffer = await response.Body?.transformToByteArray();

    if (!fileBuffer) {
      throw new Error('Failed to download file from S3');
    }

    console.log('File size:', fileBuffer.length);

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    const sheetNames = workbook.SheetNames;
    console.log('Available sheets:', sheetNames);

    const debugInfo = {
      fileName: networkKey.split('/').pop(),
      fileSize: fileBuffer.length,
      sheetNames,
      sheets: {} as any
    };

    // Check each sheet
    for (const sheetName of sheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        const range = worksheet['!ref'];
        
        // Try to get some data
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        debugInfo.sheets[sheetName] = {
          range,
          rowCount: jsonData.length,
          firstFewRows: jsonData.slice(0, 3),
          hasData: jsonData.length > 1
        };
        
        console.log(`Sheet "${sheetName}": ${jsonData.length} rows, range: ${range}`);
        
      } catch (error) {
        debugInfo.sheets[sheetName] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendation: 'Look for sheets with significant row counts and data',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error debugging Excel file:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to debug Excel file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
