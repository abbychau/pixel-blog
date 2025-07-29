import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';
import { generateSlug } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const suggestions = queries.getAllCategorySuggestions.all();
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error fetching category suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch category suggestions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, description, color } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const trimmedName = name.trim();
    const slug = generateSlug(trimmedName);

    // Check if category already exists
    const existingCategory = queries.getCategoryBySlug.get(slug);
    if (existingCategory) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    // Check if suggestion already exists
    const existingSuggestion = queries.getCategorySuggestionByName.get(trimmedName, slug);
    if (existingSuggestion) {
      return NextResponse.json({ error: 'Category suggestion already exists' }, { status: 400 });
    }

    // Insert new category suggestion
    const result = queries.insertCategorySuggestion.run(
      trimmedName,
      slug,
      description?.trim() || null,
      color || '#ff8c00',
      user.id
    );

    // Also add the user's vote
    queries.insertCategorySuggestionVote.run(result.lastInsertRowid, user.id);

    // Return created suggestion
    const newSuggestion = queries.getCategorySuggestionById.get(result.lastInsertRowid);
    return NextResponse.json(newSuggestion, { status: 201 });
  } catch (error) {
    console.error('Error creating category suggestion:', error);
    return NextResponse.json({ error: 'Failed to create category suggestion' }, { status: 500 });
  }
}