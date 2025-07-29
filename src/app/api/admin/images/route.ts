import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { queries, Image } from '@/lib/database';
import { minioClient, BUCKET_NAME } from '@/lib/minio';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let images: Image[];
    
    if (user.role === 'admin' && userId) {
      // Admin can view any user's images
      images = queries.getImagesByUser.all(parseInt(userId)) as Image[];
    } else if (user.role === 'admin' && !userId) {
      // Admin can view all images
      images = queries.getAllImages.all() as Image[];
    } else {
      // Regular users can only view their own images
      images = queries.getImagesByUser.all(user.id) as Image[];
    }

    // Parse the used_in_articles JSON and get article details for each image
    const imagesWithParsedUsage = images.map(image => {
      const articleIds = JSON.parse(image.used_in_articles || '[]');
      const articleDetails = articleIds.map((id: number) => {
        const article = queries.getArticleById.get(id);
        return article ? {
          id: article.id,
          title: article.title,
          slug: article.slug
        } : null;
      }).filter(Boolean);

      return {
        ...image,
        used_in_articles: articleIds,
        article_details: articleDetails
      };
    });

    return NextResponse.json(imagesWithParsedUsage);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');
    
    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
    }

    // Get image details
    const image = queries.getImageById.get(parseInt(imageId)) as Image;
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Check permission - users can only delete their own images, admins can delete any
    if (user.role !== 'admin' && image.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Check if image is being used in articles
    const usedInArticles = JSON.parse(image.used_in_articles || '[]');
    if (usedInArticles.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete image that is being used in articles',
        usedInArticles: usedInArticles
      }, { status: 400 });
    }

    try {
      // Delete from MinIO
      await minioClient.removeObject(BUCKET_NAME, image.filename);
    } catch (minioError) {
      console.error('Error deleting from MinIO:', minioError);
      // Continue with database deletion even if MinIO deletion fails
    }

    // Delete from database
    queries.deleteImage.run(parseInt(imageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}