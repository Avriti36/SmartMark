import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Uncomment and configure for Cloudflare R2:
  // endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

const BUCKET = process.env.AWS_S3_BUCKET!;

/**
 * Download a remote image URL and upload it to S3/R2.
 * Returns the permanent public URL of the stored file.
 */
export async function uploadThumbnailFromUrl(
  sourceUrl: string,
  key: string
): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      })
    );

    return `https://${BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
  } catch (err) {
    console.error('[storage] uploadThumbnailFromUrl failed:', err);
    return null;
  }
}

/**
 * Upload raw buffer (e.g. downloaded Instagram image) directly.
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string | null> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      })
    );

    return `https://${BUCKET}.s3.${process.env.AWS_REGION ?? 'us-east-1'}.amazonaws.com/${key}`;
  } catch (err) {
    console.error('[storage] uploadBuffer failed:', err);
    return null;
  }
}

/**
 * Orchestration helper used by the worker. Uploads a thumbnail from any
 * source URL to S3 and returns the permanent URL.
 */
export async function uploadThumbnail(
  sourceUrl: string,
  processedContentId: string
): Promise<string | null> {
  const ext = sourceUrl.split('.').pop()?.split('?')[0] ?? 'jpg';
  const key = `thumbnails/${processedContentId}.${ext}`;
  return uploadThumbnailFromUrl(sourceUrl, key);
}

export async function deleteThumbnail(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Download media from a URL (e.g. expiring Instagram CDN link) into a Buffer.
 */
export async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
