import { NextRequest, NextResponse } from 'next/server';
import { db, ensureInitialized } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Ensure database is initialized
    ensureInitialized();
    // Get all sessions from database
    const sessions = db.prepare(`
      SELECT s.id, s.user_id, s.firebase_uid, s.expires_at, s.created_at, s.last_used_at,
             u.username, u.email, u.role
      FROM sessions s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > CURRENT_TIMESTAMP
      ORDER BY s.created_at DESC
      LIMIT 10
    `).all();

    // Get all users
    const users = db.prepare(`
      SELECT id, username, email, role, last_login, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return NextResponse.json({
      activeSessions: sessions,
      recentUsers: users,
      totalSessions: sessions.length,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Debug session status error:', error);
    return NextResponse.json({ error: 'Failed to get debug info' }, { status: 500 });
  }
}