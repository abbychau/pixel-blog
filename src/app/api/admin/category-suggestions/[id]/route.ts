import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const suggestionId = parseInt(id);
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if suggestion exists
    const suggestion = queries.getCategorySuggestionById.get(suggestionId);
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    // Allow deletion if: user is admin OR user is the original suggester AND suggestion is still pending
    const canDelete = user.role === 'admin' || (suggestion.suggested_by === user.id && suggestion.status === 'pending');
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'You can only delete your own pending suggestions' 
      }, { status: 403 });
    }

    // Delete the suggestion (votes will be deleted by CASCADE)
    queries.deleteCategorySuggestion.run(suggestionId);
    
    return NextResponse.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json({ error: 'Failed to delete suggestion' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const suggestionId = parseInt(id);
    if (isNaN(suggestionId)) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can approve/reject suggestions
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action } = body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Check if suggestion exists
    const suggestion = queries.getCategorySuggestionById.get(suggestionId);
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Create the actual category
      queries.insertCategory.run(
        suggestion.name,
        suggestion.slug,
        suggestion.description,
        suggestion.color
      );

      // Update suggestion status
      queries.updateCategorySuggestionStatus.run('approved', suggestionId);

      return NextResponse.json({ message: 'Category approved and created successfully' });
    } else {
      // Reject the suggestion
      queries.updateCategorySuggestionStatus.run('rejected', suggestionId);
      return NextResponse.json({ message: 'Category suggestion rejected' });
    }
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}