import { NextResponse } from 'next/server';
import { queries, ensureInitialized } from '@/lib/database';

export async function GET() {
  try {
    // Ensure database and queries are initialized
    ensureInitialized();
    
    const categories = queries.getAllCategories.all();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Ensure database and queries are initialized
    ensureInitialized();
    
    const body = await request.json();

    const { name, slug, description, color } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if slug already exists
    const existingCategory = queries.getCategoryBySlug.get(slug.trim());
    if (existingCategory) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // Insert new category
    const result = queries.insertCategory.run(
      name.trim(),
      slug.trim(),
      description?.trim() || null,
      color || '#ff8c00'
    );

    // Return created category
    const newCategory = queries.getCategoryById.get(result.lastInsertRowid);
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}