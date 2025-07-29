import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';
import { processArticleTagsAndMentions, cleanupArticleTagsAndMentions } from '@/lib/tagMentionManager';
import { updateImageUsageForArticle, removeArticleFromImageUsage } from '@/lib/imageUsageTracker';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const articleId = parseInt(id);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if article exists
    const article = queries.getArticleById.get(articleId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check ownership (admins can delete any article, authors only their own)
    if (user.role !== 'admin' && article.author_id !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Clean up tags and mentions before deleting
    await cleanupArticleTagsAndMentions(articleId);

    // Remove article from image usage tracking
    await removeArticleFromImageUsage(articleId);

    // Delete the article
    queries.deleteArticle.run(articleId);
    
    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const articleId = parseInt(id);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const article = queries.getArticleById.get(articleId);
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check ownership (admins can view any article, authors only their own)
    if (user.role !== 'admin' && article.author_id !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const articleId = parseInt(id);
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { title, slug, content, excerpt, category_id, status, published_at } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Check if article exists
    const existingArticle = queries.getArticleById.get(articleId);
    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check ownership (admins can edit any article, authors only their own)
    if (user.role !== 'admin' && existingArticle.author_id !== user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Handle slug - use article ID if no slug provided
    let finalSlug;
    if (slug?.trim()) {
      finalSlug = slug.trim();
      
      // Validate that custom slug is not numeric-only
      if (/^\d+$/.test(finalSlug)) {
        return NextResponse.json({ error: 'Custom slug cannot be numeric only. This would conflict with article IDs.' }, { status: 400 });
      }
      
      // Check if slug is being changed and if new slug already exists
      if (finalSlug !== existingArticle.slug) {
        const slugExists = queries.getArticleBySlug.get(finalSlug);
        if (slugExists) {
          return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
        }

        // Check if user has enough currency for custom slug change (unless admin or changing from article ID)
        if (user.role !== 'admin' && existingArticle.slug === articleId.toString()) {
          // Only charge if changing from default ID slug to custom slug
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
      }
    } else {
      // If no slug provided, use article ID
      finalSlug = articleId.toString();
    }

    // Update the article
    queries.updateArticle.run(
      title,
      finalSlug,
      content,
      excerpt || null,
      category_id || null,
      status || 'published',
      published_at || null,
      articleId
    );

    // Process tags and mentions for updated content
    await processArticleTagsAndMentions(
      articleId,
      content.trim(),
      title.trim(),
      status === 'published'
    );

    // Update image usage tracking
    await updateImageUsageForArticle(articleId, content.trim());

    // Return updated article
    const updatedArticle = queries.getArticleById.get(articleId);
    return NextResponse.json(updatedArticle);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}