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
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';
    
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: historicalSalesKey });
    const response = await s3Client.send(command);
    const fileBuffer = await response.Body?.transformToByteArray();

    if (!fileBuffer) {
      throw new Error('Failed to download Historical Sales file');
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
    console.log(`Available sheets: ${sheetNames.join(', ')}`);
    
    const sheetAnalysis = [];
    
    // Analyze each sheet
    for (const sheetName of sheetNames) {
      try {
        const worksheet = workbook.Sheets[sheetName];
        const range = worksheet['!ref'];
        
        // Try different parsing methods
        const jsonData1 = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const jsonData2 = XLSX.utils.sheet_to_json(worksheet);
        
        // Get sample of first few rows
        const sampleRows = jsonData1.slice(0, 5);
        
        // Check for data in expected columns
        let dataInColumnT = 0;
        let dataInColumnAI = 0;
        
        for (let i = 1; i < Math.min(jsonData1.length, 100); i++) {
          const row = jsonData1[i] as any[];
          if (row && row[19]) dataInColumnT++; // Column T
          if (row && row[34]) dataInColumnAI++; // Column AI
        }
        
        sheetAnalysis.push({
          sheetName,
          range,
          totalRows: jsonData1.length,
          totalRowsAsObjects: jsonData2.length,
          sampleRows: sampleRows,
          dataInColumnT,
          dataInColumnAI,
          hasData: jsonData1.length > 1,
          firstRowAsArray: jsonData1[0],
          secondRowAsArray: jsonData1[1]
        });
        
      } catch (error) {
        sheetAnalysis.push({
          sheetName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      fileName: 'Historial Sales Data Continuum Datasets 050125 (3).xlsx',
      totalSheets: sheetNames.length,
      sheetNames,
      sheetAnalysis,
      recommendation: sheetAnalysis.find(s => s.totalRows > 1) ? 
        `Use sheet: ${sheetAnalysis.find(s => s.totalRows > 1)?.sheetName}` :
        'No sheets with data found'
    });
    
  } catch (error) {
    console.error('Error debugging sales sheets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
