import { NextResponse } from 'next/server';
import { queries, db, ensureInitialized } from '@/lib/database';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure database and queries are initialized
    ensureInitialized();

    const { id } = await params;
    const body = await request.json();
    
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    const { name, slug, description, color } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    // Check if category exists
    const existingCategory = queries.getCategoryById.get(categoryId);
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if slug is already used by another category (exclude current category)
    const slugConflict = queries.getCategoryBySlug.get(slug.trim());
    if (slugConflict && slugConflict.id !== categoryId) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 400 });
    }

    // Check if name is already used by another category (exclude current category)
    const nameConflict = queries.getAllCategories.all().find((cat: any) => 
      cat.name.toLowerCase() === name.trim().toLowerCase() && cat.id !== categoryId
    );
    if (nameConflict) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 });
    }

    // Update the category
    try {
      queries.updateCategory.run(
        name.trim(),
        slug.trim(),
        description?.trim() || null,
        color || '#ff8c00',
        categoryId
      );
    } catch (dbError: any) {
      console.error('Database error during category update:', dbError);
      if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return NextResponse.json({ error: 'Category name or slug already exists' }, { status: 400 });
      }
      throw dbError; // Re-throw other database errors
    }

    // Return updated category
    const updatedCategory = queries.getCategoryById.get(categoryId);
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure database and queries are initialized
    ensureInitialized();

    const { id } = await params;
    
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'Invalid category ID' }, { status: 400 });
    }

    // Check if category exists
    const category = queries.getCategoryById.get(categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if there are articles using this category
    const articlesUsingCategory = queries.getAllArticles.all().filter((article: any) => article.category_id === categoryId);
    
    if (articlesUsingCategory.length > 0) {
      // Update all articles using this category to have no category (NULL)
      try {
        const stmt = db.prepare('UPDATE articles SET category_id = NULL WHERE category_id = ?');
        stmt.run(categoryId);
        console.log(`Updated ${articlesUsingCategory.length} articles to remove category reference`);
      } catch (updateError) {
        console.error('Error updating articles before category deletion:', updateError);
        return NextResponse.json({ 
          error: `Cannot delete category: ${articlesUsingCategory.length} articles are using this category. Please reassign them first.` 
        }, { status: 400 });
      }
    }

    // Delete the category
    queries.deleteCategory.run(categoryId);
    
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}