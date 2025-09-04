import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';
import { createS3Client, getBucketName } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const s3Client = createS3Client();
const S3_BUCKET = getBucketName();

export async function GET(request: NextRequest) {
  try {
    const networkKey = 'excel-uploads/2025-08-19T16-31-36-753Z/Network Footprint and Capacity-Active Skus-Upload (2).xlsx';
    const salesKey = 'excel-uploads/2025-08-19T16-32-44-960Z/Historial Sales Data Continuum Datasets 050125 (3).xlsx';

    const networkInfo = await inspectFile(networkKey, 'Network Footprint');
    const salesInfo = await inspectFile(salesKey, 'Historical Sales');

    return NextResponse.json({
      success: true,
      files: {
        networkFootprint: networkInfo,
        historicalSales: salesInfo
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error listing sheets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list sheets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function inspectFile(s3Key: string, fileType: string) {
  console.log(`Inspecting ${fileType} file:`, s3Key);

  // Download file from S3
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const fileBuffer = await response.Body?.transformToByteArray();

  if (!fileBuffer) {
    throw new Error(`Failed to download ${fileType} file from S3`);
  }

  // Parse Excel file
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  console.log(`${fileType} file has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

  const sheets = [];

  // Inspect each sheet
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 10 }); // Sample first 10 rows
    
    // Get actual row count by checking the range
    const totalRows = range.e.r + 1; // End row + 1 for total count
    const totalCols = range.e.c + 1; // End col + 1 for total count
    
    console.log(`Sheet "${sheetName}": ${totalRows} rows, ${totalCols} columns`);
    
    // Get headers from first row
    const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 })[0] as any[];
    
    sheets.push({
      name: sheetName,
      totalRows,
      totalColumns: totalCols,
      headers: headerRow || [],
      sampleData: jsonData,
      potentialColumns: {
        ...(fileType === 'Network Footprint' && {
          columnA: headerRow ? headerRow[0] : null,
          columnM: headerRow ? headerRow[12] : null, 
          columnN: headerRow ? headerRow[13] : null,
          columnQ: headerRow ? headerRow[16] : null,
          columnS: headerRow ? headerRow[18] : null
        }),
        ...(fileType === 'Historical Sales' && {
          columnT: headerRow ? headerRow[19] : null,
          columnAI: headerRow ? headerRow[34] : null
        })
      }
    });
  }

  return {
    fileName: s3Key.split('/').pop(),
    fileSize: fileBuffer.length,
    sheetCount: workbook.SheetNames.length,
    sheets
  };
}
