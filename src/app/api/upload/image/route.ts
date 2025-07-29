import { NextRequest, NextResponse } from 'next/server';
import { minioClient, BUCKET_NAME, generateImageFilename, getImageUrl } from '@/lib/minio';
import { getUserFromRequest } from '@/lib/auth';
import { queries } from '@/lib/database';
import sharp from 'sharp';

const compressImage = async (buffer: Buffer, fileType: string, originalSize: number) => {
  const maxSizeBytes = 2 * 1024 * 1024; // 2MB
  
  // If already under 2MB, return as is
  if (originalSize <= maxSizeBytes) {
    const metadata = await sharp(buffer).metadata();
    return {
      buffer,
      size: originalSize,
      width: metadata.width,
      height: metadata.height
    };
  }

  let sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata();
  
  // For GIF files, preserve animation if possible
  if (fileType === 'image/gif') {
    // Check if it's an animated GIF
    const { pages } = metadata;
    if (pages && pages > 1) {
      // For animated GIFs, try to reduce quality while preserving animation
      // Sharp doesn't fully support animated GIF compression, so we'll reduce size by scaling
      const scaleFactor = Math.sqrt(maxSizeBytes / originalSize);
      const newWidth = Math.floor((metadata.width || 800) * scaleFactor);
      const newHeight = Math.floor((metadata.height || 600) * scaleFactor);
      
      const compressed = await sharpInstance
        .resize(newWidth, newHeight, { fit: 'inside' })
        .gif()
        .toBuffer();
      
      return {
        buffer: compressed,
        size: compressed.length,
        width: newWidth,
        height: newHeight
      };
    }
  }

  // For static images, compress more aggressively
  let quality = 85;
  let compressed: Buffer;
  
  do {
    if (fileType === 'image/png') {
      compressed = await sharpInstance
        .png({ 
          quality: quality,
          compressionLevel: 9,
          palette: true // Use palette for smaller file sizes
        })
        .toBuffer();
    } else if (fileType === 'image/webp') {
      compressed = await sharpInstance
        .webp({ quality: quality })
        .toBuffer();
    } else {
      // JPEG and others
      compressed = await sharpInstance
        .jpeg({ quality: quality })
        .toBuffer();
    }
    
    quality -= 10;
  } while (compressed.length > maxSizeBytes && quality > 30);

  const finalMetadata = await sharp(compressed).metadata();
  
  return {
    buffer: compressed,
    size: compressed.length,
    width: finalMetadata.width,
    height: finalMetadata.height
  };
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const articleId = formData.get('articleId') as string; // Optional: track which article is using this image
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' }, { status: 400 });
    }

    // Validate file size (max 10MB original)
    const maxOriginalSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxOriginalSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }

    // Convert file to buffer
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    
    // Compress image
    const { buffer: compressedBuffer, size: compressedSize, width, height } = await compressImage(
      originalBuffer, 
      file.type, 
      file.size
    );

    // Generate unique filename
    const filename = generateImageFilename(file.name);
    
    // Upload compressed image to MinIO
    await minioClient.putObject(BUCKET_NAME, filename, compressedBuffer, compressedSize, {
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });

    // Generate public URL
    const imageUrl = getImageUrl(filename);

    // Save image info to database
    const usedInArticles = articleId ? JSON.stringify([parseInt(articleId)]) : JSON.stringify([]);
    
    const imageRecord = queries.createImage.run(
      filename,
      file.name,
      compressedSize,
      file.type,
      width || null,
      height || null,
      imageUrl,
      user.id,
      usedInArticles
    );

    return NextResponse.json({
      success: true,
      url: imageUrl,
      filename: filename,
      id: imageRecord.lastInsertRowid,
      originalSize: file.size,
      compressedSize: compressedSize,
      compressionRatio: Math.round((1 - compressedSize / file.size) * 100),
      dimensions: { width, height }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}