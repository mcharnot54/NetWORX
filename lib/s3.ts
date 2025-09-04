import { S3Client } from '@aws-sdk/client-s3';

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : undefined;
}

export function resolveSpacesCredentials() {
  const accessKeyId =
    getEnv('AWS_ACCESS_KEY_ID') ||
    getEnv('DO_SPACES_KEY') ||
    getEnv('SPACES_ACCESS_KEY_ID') ||
    getEnv('SPACES_KEY');

  const secretAccessKey =
    getEnv('AWS_SECRET_ACCESS_KEY') ||
    getEnv('DO_SPACES_SECRET') ||
    getEnv('SPACES_SECRET_ACCESS_KEY') ||
    getEnv('SPACES_SECRET');

  return { accessKeyId, secretAccessKey };
}

export function resolveSpacesEndpoint() {
  // Prefer explicit endpoint
  const explicit = getEnv('S3_ENDPOINT');
  if (explicit) return explicit;
  const region = getEnv('SPACES_REGION') || getEnv('AWS_REGION') || 'us-east-1';
  // DigitalOcean Spaces endpoint pattern: <region>.digitaloceanspaces.com
  // If region already looks like a hostname, return as-is
  if (region.includes('.')) return `https://${region}`;
  return `https://${region}.digitaloceanspaces.com`;
}

export function getBucketName() {
  return (
    getEnv('S3_BUCKET_NAME') ||
    getEnv('SPACES_BUCKET') ||
    'networx-uploads'
  );
}

export function createS3Client() {
  const { accessKeyId, secretAccessKey } = resolveSpacesCredentials();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('DigitalOcean Spaces credentials are missing. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or DO_SPACES_KEY/DO_SPACES_SECRET.');
  }
  const region = getEnv('SPACES_REGION') || getEnv('AWS_REGION') || 'us-east-1';
  const endpoint = resolveSpacesEndpoint();

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: false,
    credentials: { accessKeyId, secretAccessKey },
  });
}
