import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get user via current auth method
    const user = await getUserFromRequest(request);
    
    // Check for admin token cookie
    const adminToken = request.cookies.get('admin-token')?.value;
    
    // Check for Firebase headers
    const firebaseEmail = request.headers.get('x-firebase-email');
    const firebaseUid = request.headers.get('x-firebase-uid');
    
    return NextResponse.json({
      user: user ? {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active
      } : null,
      authentication: {
        hasAdminToken: !!adminToken,
        adminTokenLength: adminToken?.length || 0,
        firebaseEmail: firebaseEmail || null,
        firebaseUid: firebaseUid || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug auth failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}