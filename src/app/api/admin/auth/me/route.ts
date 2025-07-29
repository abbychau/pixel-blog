import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserFromRequest } from '@/lib/auth';
import { queries } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getAdminUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch fresh user data from database to include display_name and display_color
    const freshUser = queries.getUserById.get(user.id);
    if (!freshUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = freshUser;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}