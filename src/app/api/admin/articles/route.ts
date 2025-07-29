import { NextRequest, NextResponse } from 'next/server';
import { queries, db } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';
import { processArticleTagsAndMentions } from '@/lib/tagMentionManager';
import { updateImageUsageForArticle } from '@/lib/imageUsageTracker';

export async function GET(request: NextRequest) {
  try {
    // Debug: Check what headers we're receiving
    const firebaseEmail = request.headers.get('x-firebase-email');
    console.log('🔍 Admin articles API - Firebase email header:', firebaseEmail);
    
    // Get current user
    const user = await getUserFromRequest(request);
    console.log('🔍 Admin articles API - Resolved user:', user ? `${user.username} (${user.email}) - Role: ${user.role}` : 'null');
    
    if (!user) {
      console.log('❌ Admin articles API - No user found, returning 401');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    // Default limit: 50 for admin, Maximum limit: 200
    const DEFAULT_LIMIT = 50;
    const MAX_LIMIT = 200;
    
    let limit = DEFAULT_LIMIT;
    
    if (limitParam) {
      const requestedLimit = parseInt(limitParam, 10);
      if (!isNaN(requestedLimit) && requestedLimit > 0) {
        limit = Math.min(requestedLimit, MAX_LIMIT);
      }
    }

    // Admin users can see all articles, authors only see their own
    let articles;
    if (user.role === 'admin') {
      articles = queries.getAllArticlesForListing.all(limit);
    } else {
      // Use optimized query for author-specific articles
      articles = queries.getArticlesByAuthorForListing.all(user.id, limit);
    }
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { title, slug, content, excerpt, category_id, status, published_at } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Get current user from auth
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create article first to get ID, then update slug if needed
    let finalSlug = slug?.trim();
    
    // If no slug provided, we'll use the article ID after creation
    if (finalSlug) {
      // Validate that custom slug is not numeric-only
      if (/^\d+$/.test(finalSlug)) {
        return NextResponse.json({ error: 'Custom slug cannot be numeric only. This would conflict with article IDs.' }, { status: 400 });
      }
      
      // Check if slug already exists
      const existingArticle = queries.getArticleBySlug.get(finalSlug);
      if (existingArticle) {
        return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
      }

      // Check if user has enough currency for custom slug (unless admin)
      if (user.role !== 'admin') {
        const slugCostSetting = queries.getSystemSetting.get('currency_url_slug_cost');
        const slugCost = parseInt(slugCostSetting?.value || '5');
        
        if ((user.currency1 || 0) < slugCost) {
          return NextResponse.json({ 
            error: `Insufficient M-Coin. Custom URL slug costs ${slugCost} M-Coin. You have ${user.currency1 || 0}.` 
          }, { status: 400 });
        }
        
        // Deduct currency for custom slug
        queries.updateUserCurrency.run((user.currency1 || 0) - slugCost, user.id);
      }
    } else {
      // Use a temporary slug for insertion, will update after getting ID
      finalSlug = `temp-${Date.now()}`;
    }

    // Insert new article
    const result = queries.insertArticle.run(
      title.trim(),
      finalSlug,
      content.trim(),
      excerpt?.trim() || null,
      category_id || null,
      user.id, // author_id
      status || 'published',
      published_at || null
    );

    const articleId = result.lastInsertRowid;
    
    // If no slug was originally provided, update to use article ID
    if (!slug?.trim()) {
      // Update the slug to use the article ID
      const updateSlugQuery = `UPDATE articles SET slug = ? WHERE id = ?`;
      db.prepare(updateSlugQuery).run(articleId.toString(), articleId);
    }
    
    // Process tags and mentions
    await processArticleTagsAndMentions(
      articleId,
      content.trim(),
      title.trim(),
      status === 'published'
    );

    // Update image usage tracking
    await updateImageUsageForArticle(articleId, content.trim());

    // Return created article
    const newArticle = queries.getArticleById.get(articleId);
    return NextResponse.json(newArticle, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}