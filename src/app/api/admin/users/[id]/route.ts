import { NextRequest, NextResponse } from 'next/server';
import { queries, initializeDatabase, db } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure database is initialized
    if (!queries.getUserById) {
      console.warn('⚠️ Queries not initialized, reinitializing database...');
      initializeDatabase();
    }

    // Check authentication
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { display_name, email, role, display_color } = body;

    console.log('🔍 Admin user update - Request data:', { userId, display_name, email, role, display_color });

    // Validate required fields
    if (!display_name || !email || !role) {
      return NextResponse.json({ error: 'Display name, email, and role are required' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = queries.getUserById.get(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is being changed and if it conflicts with another user
    if (email !== existingUser.email) {
      const emailConflict = queries.getUserByEmail.get(email);
      if (emailConflict && emailConflict.id !== userId) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Update user profile using a comprehensive query
    const updateQuery = db.prepare(`
      UPDATE users 
      SET display_name = ?, email = ?, role = ?, display_color = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    const result = updateQuery.run(
      display_name.trim(),
      email.trim(),
      role,
      display_color || '#ff8c00',
      userId
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Return updated user
    const updatedUser = queries.getUserById.get(userId);
    console.log('✅ Admin user update - User updated successfully');
    
    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Admin user update - Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}