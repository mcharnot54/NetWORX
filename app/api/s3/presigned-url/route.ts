import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// AWS Configuration
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

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize } = await request.json();

    // Validate input
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Check file size (5GB limit)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5GB.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Only Excel files (.xlsx, .xls) are supported' },
        { status: 400 }
      );
    }

    // Generate unique key for S3 object
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `excel-uploads/${timestamp}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    console.log(`Generated presigned URL for ${fileName}, key: ${key}`);

    return NextResponse.json({
      uploadUrl,
      key,
      bucket: S3_BUCKET,
      region: AWS_REGION,
      expiresIn: 3600,
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 's3-presigned-url',
    status: 'ok',
    bucket: S3_BUCKET,
    region: AWS_REGION,
    timestamp: new Date().toISOString(),
    note: 'AWS SDK configured and ready'
  });
}
