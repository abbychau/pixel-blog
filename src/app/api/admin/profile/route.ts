import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { queries } from '@/lib/database';

export async function PUT(request: NextRequest) {
  try {
    // Get user from request (handles both Firebase and traditional auth)
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, display_color } = body;

    // Validate required fields
    if (!display_name || typeof display_name !== 'string') {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Validate display name length
    if (display_name.trim().length === 0 || display_name.trim().length > 50) {
      return NextResponse.json({ error: 'Display name must be 1-50 characters' }, { status: 400 });
    }

    // Validate color format (hex color)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (display_color && !colorRegex.test(display_color)) {
      return NextResponse.json({ error: 'Invalid color format. Use hex format like #00ff00' }, { status: 400 });
    }

    // Update user profile
    queries.updateUserProfile.run(
      display_name.trim(),
      display_color || '#00ff00',
      user.id
    );

    // Get updated user data
    const updatedUser = queries.getUserById.get(user.id);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}