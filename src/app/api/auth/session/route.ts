import { NextRequest, NextResponse } from 'next/server';
import { createSession, getUserByEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firebaseUid, email } = body;

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: 'Firebase UID and email are required' }, { status: 400 });
    }

    console.log(`🔐 Creating session for Firebase user: ${email} (${firebaseUid})`);

    // Get user from database by email
    const user = await getUserByEmail(email);
    if (!user) {
      console.log(`❌ User not found in database: ${email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`✅ Found user in database: ${user.username} (ID: ${user.id}) - Role: ${user.role}`);

    // Create session
    const sessionToken = await createSession(user.id, firebaseUid);

    return NextResponse.json({
      sessionToken,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        display_color: user.display_color
      }
    });

  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { deleteSession } = await import('@/lib/auth');
    
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    let sessionToken = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    } else {
      // Also check x-session-token header as fallback
      sessionToken = request.headers.get('x-session-token') || '';
    }

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token provided' }, { status: 400 });
    }

    await deleteSession(sessionToken);
    
    return NextResponse.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Session deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}