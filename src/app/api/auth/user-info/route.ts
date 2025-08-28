import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const sessionTokenHeader = request.headers.get('x-session-token');
    
    console.log('🔍 User info API - Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 15)}...` : 'none');
    console.log('🔍 User info API - Session token header:', sessionTokenHeader ? `${sessionTokenHeader.substring(0, 8)}...` : 'none');
    
    const user = await getUserFromRequest(request);
    console.log('🔍 User info API - Resolved user:', user ? `${user.username} (${user.email}) - Role: ${user.role}` : 'null');
    
    if (!user) {
      console.log('❌ User info API - No user found, returning 401');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Return user info without sensitive data
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        display_color: user.display_color,
        currency1: user.currency1,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}