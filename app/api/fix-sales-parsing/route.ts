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
    const historicalSalesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';
    
    console.log('Downloading Historical Sales file...');
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: historicalSalesKey });
    const response = await s3Client.send(command);
    const fileBuffer = await response.Body?.transformToByteArray();

    if (!fileBuffer) {
      throw new Error('Failed to download Historical Sales file');
    }

    console.log(`File size: ${fileBuffer.length} bytes`);

    // Try multiple parsing approaches
    const results = [];

    // Method 1: Standard parsing
    try {
      const workbook1 = XLSX.read(fileBuffer, { type: 'buffer' });
      results.push({
        method: 'Standard',
        sheetNames: workbook1.SheetNames,
        sheetCount: workbook1.SheetNames.length
      });
    } catch (error) {
      results.push({
        method: 'Standard',
        error: error instanceof Error ? error.message : 'Failed'
      });
    }

    // Method 2: With different options
    try {
      const workbook2 = XLSX.read(fileBuffer, { 
        type: 'buffer', 
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      results.push({
        method: 'WithOptions',
        sheetNames: workbook2.SheetNames,
        sheetCount: workbook2.SheetNames.length
      });
    } catch (error) {
      results.push({
        method: 'WithOptions',
        error: error instanceof Error ? error.message : 'Failed'
      });
    }

    // Method 3: Force XLS format
    try {
      const workbook3 = XLSX.read(fileBuffer, { 
        type: 'buffer',
        bookType: 'xls'
      });
      results.push({
        method: 'ForceXLS',
        sheetNames: workbook3.SheetNames,
        sheetCount: workbook3.SheetNames.length
      });
    } catch (error) {
      results.push({
        method: 'ForceXLS',
        error: error instanceof Error ? error.message : 'Failed'
      });
    }

    // If we got any successful parsing, try to extract data
    let dataExtraction = null;
    
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    if (workbook.SheetNames.length > 0) {
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      
      // Get worksheet info
      const range = worksheet['!ref'];
      
      // Try to get raw cell data
      const cellA1 = worksheet['A1'];
      const cellT1 = worksheet['T1'];
      const cellAI1 = worksheet['AI1'];
      
      // Try different conversion methods
      try {
        const jsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const jsonObjects = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        dataExtraction = {
          sheetName: firstSheet,
          range,
          cellA1: cellA1?.v,
          cellT1: cellT1?.v,
          cellAI1: cellAI1?.v,
          arrayMethod: {
            totalRows: jsonArray.length,
            firstRow: jsonArray[0],
            secondRow: jsonArray[1],
            hasColumnT: jsonArray[0] && jsonArray[0][19] ? true : false,
            hasColumnAI: jsonArray[0] && jsonArray[0][34] ? true : false
          },
          objectMethod: {
            totalRows: jsonObjects.length,
            firstObject: jsonObjects[0],
            keys: jsonObjects[0] ? Object.keys(jsonObjects[0]) : []
          }
        };
        
      } catch (conversionError) {
        dataExtraction = {
          error: conversionError instanceof Error ? conversionError.message : 'Conversion failed'
        };
      }
    }

    return NextResponse.json({
      success: true,
      fileName: 'Historial Sales Data Continuum Datasets 050125 (3).xlsx',
      fileSize: fileBuffer.length,
      parsingMethods: results,
      dataExtraction,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fixing sales parsing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
