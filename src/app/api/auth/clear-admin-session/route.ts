import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({ 
      success: true, 
      message: 'Admin session cleared' 
    });
    
    // Clear the admin-token cookie
    response.cookies.set(clearAdminCookie());
    
    return response;
  } catch (error) {
    console.error('Error clearing admin session:', error);
    return NextResponse.json(
      { error: 'Failed to clear admin session' },
      { status: 500 }
    );
  }
}