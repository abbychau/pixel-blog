import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getUserFromRequest } from '@/lib/auth';
import { queries, ensureInitialized } from '@/lib/database';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    ensureInitialized();
    
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `${user.id}_${timestamp}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      // Process image with sharp
      // 1. Get image metadata to determine dimensions
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return NextResponse.json({ error: 'Invalid image file' }, { status: 400 });
      }

      // 2. Calculate crop dimensions for center square
      const size = Math.min(metadata.width, metadata.height);
      const left = Math.floor((metadata.width - size) / 2);
      const top = Math.floor((metadata.height - size) / 2);

      // 3. Process image: crop to square, resize to 256x256, convert to JPEG
      const processedBuffer = await sharp(buffer)
        .extract({
          left: left,
          top: top,
          width: size,
          height: size
        })
        .resize(256, 256, {
          kernel: sharp.kernel.lanczos3,
          fit: 'cover'
        })
        .jpeg({
          quality: 90,
          mozjpeg: true
        })
        .toBuffer();

      // 4. Save processed image
      await writeFile(filepath, processedBuffer);

      // 5. Update user avatar in database
      const avatarUrl = `/avatars/${filename}`;
      queries.updateUserAvatar.run(avatarUrl, user.id);

      console.log(`✅ Avatar uploaded for user ${user.id}: ${filename}`);

      return NextResponse.json({
        success: true,
        avatar: avatarUrl,
        message: 'Avatar uploaded successfully'
      });

    } catch (imageError) {
      console.error('Image processing error:', imageError);
      return NextResponse.json({ 
        error: 'Failed to process image. Please try a different file.' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload avatar' 
    }, { status: 500 });
  }
}

// GET endpoint to retrieve current user's avatar
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    return NextResponse.json({
      avatar: user.avatar || null
    });

  } catch (error) {
    console.error('Avatar fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch avatar' 
    }, { status: 500 });
  }
}