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

export async function GET() {
  try {
    const salesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';
    
    console.log('Debugging Historical Sales file:', salesKey);

    // Download file from S3
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: salesKey,
    });

    const response = await s3Client.send(command);
    const fileBuffer = await response.Body?.transformToByteArray();

    if (!fileBuffer) {
      throw new Error('Failed to download file from S3');
    }

    console.log('Sales file size:', fileBuffer.length);

    // Parse Excel file with different options
    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
    } catch (error) {
      // Try with different options if first attempt fails
      workbook = XLSX.read(fileBuffer, { type: 'buffer', cellFormula: false, cellHTML: false });
    }
    
    const sheetNames = workbook.SheetNames;
    console.log('Available sheets:', sheetNames);

    const debugInfo = {
      fileName: salesKey.split('/').pop(),
      fileSize: fileBuffer.length,
      sheetNames,
      sheets: {} as any
    };

    // Check the main sheet thoroughly
    const mainSheet = sheetNames[0];
    if (mainSheet) {
      try {
        const worksheet = workbook.Sheets[mainSheet];
        const range = worksheet['!ref'];
        
        console.log(`Sheet "${mainSheet}" range:`, range);
        
        // Try different parsing methods
        const jsonData1 = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const jsonData2 = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const jsonData3 = XLSX.utils.sheet_to_json(worksheet, { range: 1 }); // Skip header row
        
        // Check specific cells
        const cellA1 = worksheet['A1'] ? worksheet['A1'].v : 'Empty';
        const cellT1 = worksheet['T1'] ? worksheet['T1'].v : 'Empty';
        const cellAI1 = worksheet['AI1'] ? worksheet['AI1'].v : 'Empty';
        const cellA2 = worksheet['A2'] ? worksheet['A2'].v : 'Empty';
        const cellT2 = worksheet['T2'] ? worksheet['T2'].v : 'Empty';
        const cellAI2 = worksheet['AI2'] ? worksheet['AI2'].v : 'Empty';
        
        debugInfo.sheets[mainSheet] = {
          range,
          method1_rows: jsonData1.length,
          method2_rows: jsonData2.length,
          method3_rows: jsonData3.length,
          cellTests: {
            A1: cellA1,
            T1: cellT1,
            AI1: cellAI1,
            A2: cellA2,
            T2: cellT2,
            AI2: cellAI2
          },
          firstRowMethod1: jsonData1[0] || null,
          firstRowMethod2: jsonData2[0] || null,
          sampleRows: jsonData1.slice(0, 5)
        };
        
      } catch (error) {
        debugInfo.sheets[mainSheet] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error debugging sales file:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to debug sales file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
