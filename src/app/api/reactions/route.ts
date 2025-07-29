import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { queries, initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = parseInt(searchParams.get('articleId') || '');
    
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Ensure database is initialized
    if (!queries?.getArticleReactions) {
      console.log('🔧 Initializing database for reactions...');
      initializeDatabase();
    }

    // Get all reactions for the article
    const reactions = queries.getArticleReactions.all(articleId);
    
    // Get reaction counts grouped by emoji
    const reactionCounts = queries.getReactionCounts.all(articleId);

    return NextResponse.json({
      reactions,
      reactionCounts,
      total: reactions.length
    });

  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = parseInt(searchParams.get('articleId') || '');
    
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure database is initialized
    if (!queries?.insertReaction) {
      console.log('🔧 Initializing database for reactions...');
      initializeDatabase();
    }

    const body = await request.json();
    const { emoji } = body;

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Valid emoji is required' }, { status: 400 });
    }

    // Check if article exists
    const article = queries.getArticleById.get(articleId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Insert or update reaction (REPLACE handles existing reactions)
    queries.insertReaction.run(articleId, user.id, emoji);

    // Update article reaction count
    queries.updateArticleReactionCount.run(articleId, articleId);

    // Create notification for article owner (if not reacting to own article)
    if (article.author_id !== user.id) {
      queries.insertNotification.run(
        article.author_id,
        'reaction',
        'New Reaction',
        `${user.display_name || user.username} reacted with ${emoji} to your article "${article.title}"`,
        articleId,
        null
      );
    }

    // Get updated reaction counts
    const reactionCounts = queries.getReactionCounts.all(articleId);

    return NextResponse.json({
      message: 'Reaction added successfully',
      reactionCounts
    });

  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = parseInt(searchParams.get('articleId') || '');
    
    if (isNaN(articleId)) {
      return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
    }

    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure database is initialized
    if (!queries?.deleteReaction) {
      console.log('🔧 Initializing database for reactions...');
      initializeDatabase();
    }

    // Delete user's reaction
    const result = queries.deleteReaction.run(articleId, user.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'No reaction found to delete' }, { status: 404 });
    }

    // Update article reaction count
    queries.updateArticleReactionCount.run(articleId, articleId);

    // Get updated reaction counts
    const reactionCounts = queries.getReactionCounts.all(articleId);

    return NextResponse.json({
      message: 'Reaction removed successfully',
      reactionCounts
    });

  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}