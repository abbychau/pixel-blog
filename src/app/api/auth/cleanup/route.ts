import { NextRequest, NextResponse } from 'next/server';
import { queries, initializeDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    if (!queries?.deleteExpiredSessions) {
      console.log('🔧 Initializing database for session cleanup...');
      await initializeDatabase();
    }

    // Delete expired sessions
    const result = queries.deleteExpiredSessions.run();
    
    console.log(`🧹 Cleaned up ${result.changes} expired sessions`);
    
    return NextResponse.json({ 
      message: 'Session cleanup completed',
      deletedSessions: result.changes 
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json({ error: 'Failed to cleanup sessions' }, { status: 500 });
  }
}

// Allow GET for manual cleanup requests
export async function GET(request: NextRequest) {
  return POST(request);
}