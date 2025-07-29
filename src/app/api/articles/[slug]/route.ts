import { NextResponse } from 'next/server';
import { queries } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    let article;
    
    // Check if slug is numeric (database ID)
    if (/^\d+$/.test(slug)) {
      // Query by ID
      article = queries.getArticleById.get(parseInt(slug));
    } else {
      // Query by slug
      article = queries.getArticleBySlug.get(slug);
    }
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}