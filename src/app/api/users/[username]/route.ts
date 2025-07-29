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
    if (!queries?.getAllUsers) {
      console.log('🔧 Initializing database for user lookup...');
      initializeDatabase();
    }

    // Get all users and find by username (since we don't have a direct query)
    const users = queries.getAllUsers.all();
    const user = users.find((u: any) => u.username === username);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return public user information only (exclude sensitive data)
    const publicUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      display_color: user.display_color,
      role: user.role,
      created_at: user.created_at
    };

    return NextResponse.json(publicUser);

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}