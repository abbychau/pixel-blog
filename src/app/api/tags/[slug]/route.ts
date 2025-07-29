import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tag = queries.getTagBySlug.get(slug);
    
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get articles with this tag
    const articles = queries.getTagArticles.all(tag.id);
    
    return NextResponse.json({
      tag,
      articles
    });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json({ error: 'Failed to fetch tag' }, { status: 500 });
  }
}