import { NextRequest, NextResponse } from 'next/server';
import { queries, ensureInitialized } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureInitialized();
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { content } = body;

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

    // Get the comment
    const comment = queries.getCommentById.get(id);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns this comment or is admin
    if (comment.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update comment
    queries.updateComment.run(content.trim(), id, comment.user_id);

    // Get updated comment
    const updatedComment = queries.getCommentById.get(id);
    
    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureInitialized();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the comment
    const comment = queries.getCommentById.get(id);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user owns this comment or is admin
    if (comment.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete comment
    queries.deleteComment.run(id, comment.user_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}