import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { queries, initializeDatabase } from '@/lib/database';

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure database is initialized
    if (!queries?.markAllNotificationsRead) {
      console.log('🔧 Initializing database for notification bulk update...');
      await initializeDatabase();
    }

    // Mark all user notifications as read
    const result = queries.markAllNotificationsRead.run(user.id);
    
    return NextResponse.json({ 
      message: 'All notifications marked as read',
      updatedCount: result.changes 
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}