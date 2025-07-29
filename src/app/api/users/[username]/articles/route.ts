import { NextRequest, NextResponse } from 'next/server';
import { queries, initializeDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Ensure database is initialized
    if (!queries?.getAllUsers || !queries?.getArticlesByAuthor) {
      console.log('🔧 Initializing database for user articles...');
      initializeDatabase();
    }

    // Get user by username
    const users = queries.getAllUsers.all();
    const user = users.find((u: any) => u.username === username);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get articles by this author
    const articles = queries.getArticlesByAuthor.all(user.id);

    return NextResponse.json(articles);

  } catch (error) {
    console.error('Error fetching user articles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}