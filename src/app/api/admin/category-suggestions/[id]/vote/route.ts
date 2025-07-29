import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
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

    // Check if user already voted
    const existingVote = queries.getCategorySuggestionVote.get(suggestionId, user.id);
    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted for this suggestion' }, { status: 400 });
    }

    // Add vote
    queries.insertCategorySuggestionVote.run(suggestionId, user.id);

    // Get new vote count
    const voteCount = queries.getCategorySuggestionVoteCount.get(suggestionId);
    const newVoteCount = voteCount.count;

    // Update suggestion vote count
    queries.updateCategorySuggestionVotes.run(newVoteCount, suggestionId);

    // Check if it should be auto-approved
    const thresholdSetting = queries.getSystemSetting.get('category_approval_threshold');
    const threshold = parseInt(thresholdSetting?.value || '5');

    if (newVoteCount >= threshold) {
      // Auto-approve the suggestion
      queries.insertCategory.run(
        suggestion.name,
        suggestion.slug,
        suggestion.description,
        suggestion.color
      );

      queries.updateCategorySuggestionStatus.run('approved', suggestionId);

      return NextResponse.json({ 
        message: 'Vote added and category auto-approved!',
        voteCount: newVoteCount,
        autoApproved: true
      });
    }

    return NextResponse.json({ 
      message: 'Vote added successfully',
      voteCount: newVoteCount,
      autoApproved: false
    });
  } catch (error) {
    console.error('Error adding vote:', error);
    return NextResponse.json({ error: 'Failed to add vote' }, { status: 500 });
  }
}

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

    // Check if user has voted
    const existingVote = queries.getCategorySuggestionVote.get(suggestionId, user.id);
    if (!existingVote) {
      return NextResponse.json({ error: 'You have not voted for this suggestion' }, { status: 400 });
    }

    // Remove vote
    queries.deleteCategorySuggestionVote.run(suggestionId, user.id);

    // Get new vote count
    const voteCount = queries.getCategorySuggestionVoteCount.get(suggestionId);
    const newVoteCount = voteCount.count;

    // Update suggestion vote count
    queries.updateCategorySuggestionVotes.run(newVoteCount, suggestionId);

    return NextResponse.json({ 
      message: 'Vote removed successfully',
      voteCount: newVoteCount
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
  }
}