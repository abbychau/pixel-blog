import { NextResponse } from 'next/server';
import { queries, ensureInitialized } from '@/lib/database';

export async function GET(request: Request) {
  try {
    // Ensure database is initialized
    ensureInitialized();
    
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    // Default: No limit for homepage, Maximum limit: 500 if specified
    const MAX_LIMIT = 500;
    
    let limit = MAX_LIMIT; // Default to maximum for homepage
    
    if (limitParam) {
      const requestedLimit = parseInt(limitParam, 10);
      if (!isNaN(requestedLimit) && requestedLimit > 0) {
        limit = Math.min(requestedLimit, MAX_LIMIT);
      }
    }
    
    // Use optimized query that excludes content field for better performance
    const articles = queries.getPublishedArticlesForListing.all(limit);
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}