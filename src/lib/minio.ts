import { Client } from 'minio';

// Initialize MinIO client
export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT!),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME!;
export const MINIO_DOMAIN = process.env.MINIO_DOMAIN!;

// Generate a unique filename for uploaded images
export const generateImageFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || 'png';
  return `images/${timestamp}-${randomString}.${extension}`;
};

// Get public URL for an uploaded image
export const getImageUrl = (filename: string): string => {
  return `${MINIO_DOMAIN}/${BUCKET_NAME}/${filename}`;
};