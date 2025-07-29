import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Admin routes are now protected by Firebase authentication at the component level
  // No server-side authentication needed since we removed password auth
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};