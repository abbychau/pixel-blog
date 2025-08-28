import { NextRequest, NextResponse } from 'next/server';
import { queries, ensureInitialized } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    ensureInitialized();
    const resolvedParams = await params;
    const { slug } = resolvedParams;

    // Get article by slug first
    const article = queries.getArticleBySlug.get(slug);
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if comments are enabled for this article
    if (!article.comments_enabled) {
      return NextResponse.json({ comments: [] });
    }

    // Get comments for this article
    const comments = queries.getArticleComments.all(article.id);
    
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    ensureInitialized();
    const resolvedParams = await params;
    const { slug } = resolvedParams;
    const body = await request.json();
    const { content, parent_id } = body;

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: 'Comment is too long (max 1000 characters)' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get article by slug
    const article = queries.getArticleBySlug.get(slug);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if comments are enabled for this article
    if (!article.comments_enabled) {
      return NextResponse.json({ error: 'Comments are disabled for this article' }, { status: 403 });
    }

    // If this is a reply, verify the parent comment exists
    if (parent_id) {
      const parentComment = queries.getCommentById.get(parent_id);
      if (!parentComment || parentComment.article_id !== article.id) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
      }
    }

    // Insert new comment
    const result = queries.insertComment.run(
      article.id,
      user.id,
      content.trim(),
      parent_id || null
    );

    // Get the newly created comment with user info
    const newComment = queries.getCommentById.get(result.lastInsertRowid);
    
    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}