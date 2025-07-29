import { NextRequest } from 'next/server';
import { queries, ensureInitialized } from './database';
import { randomBytes } from 'crypto';

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  display_color?: string;
  is_active?: boolean;
  currency1?: number;
  avatar?: string;
}

// Generate a secure session token
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// Create a new session for a user
export async function createSession(userId: number, firebaseUid: string): Promise<string> {
  // Ensure database is initialized
  ensureInitialized();

  const sessionId = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Clean up expired sessions first
  queries.deleteExpiredSessions.run();
  
  // Create new session
  queries.createSession.run(sessionId, userId, firebaseUid, expiresAt.toISOString());
  
  console.log(`✅ Created session for user ${userId}: ${sessionId.substring(0, 8)}...`);
  return sessionId;
}

// Get user from session token
export async function getUserFromSession(sessionToken: string): Promise<AdminUser | null> {
  ensureInitialized();
  try {
    console.log('🔍 [Auth] Getting session for token:', sessionToken.substring(0, 8) + '...');
    const session = queries.getSession.get(sessionToken);
    console.log('🔍 [Auth] Session found:', session ? `User ID: ${session.user_id}` : 'null');
    if (!session) {
      return null;
    }

    // Update last used time
    queries.updateSessionLastUsed.run(sessionToken);

    return {
      id: session.user_id,
      username: session.username,
      display_name: session.display_name,
      email: session.email,
      role: session.role,
      display_color: session.display_color,
      currency1: session.currency1,
      avatar: session.avatar
    };
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
}

// Get user from local database by email
export async function getUserByEmail(email: string): Promise<AdminUser | null> {
  ensureInitialized();
  try {

    const user = queries.getUserByEmail.get(email);
    return user || null;
  } catch {
    return null;
  }
}

// Session-based authentication: get user from session token
export async function getUserFromRequest(request: NextRequest): Promise<AdminUser | null> {
  const fs = require('fs');
  const logData = `[${new Date().toISOString()}] [Auth] Getting user from request\n`;
  fs.appendFileSync('/tmp/pixel-blog-debug.log', logData);
  
  // Check for session token in Authorization header
  const authHeader = request.headers.get('authorization');
  fs.appendFileSync('/tmp/pixel-blog-debug.log', `[${new Date().toISOString()}] [Auth] Authorization header: ${authHeader ? authHeader.substring(0, 20) + '...' : 'null'}\n`);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const sessionToken = authHeader.substring(7);
    fs.appendFileSync('/tmp/pixel-blog-debug.log', `[${new Date().toISOString()}] [Auth] Extracted token: ${sessionToken.substring(0, 8)}...\n`);
    return await getUserFromSession(sessionToken);
  }

  // Also check for session token in x-session-token header (fallback)
  const sessionToken = request.headers.get('x-session-token');
  fs.appendFileSync('/tmp/pixel-blog-debug.log', `[${new Date().toISOString()}] [Auth] X-Session-Token header: ${sessionToken ? sessionToken.substring(0, 8) + '...' : 'null'}\n`);
  
  if (sessionToken) {
    return await getUserFromSession(sessionToken);
  }

  fs.appendFileSync('/tmp/pixel-blog-debug.log', `[${new Date().toISOString()}] [Auth] No valid session token found\n`);
  return null;
}

// Alias for getUserFromRequest for compatibility
export async function getSessionUser(request: NextRequest): Promise<AdminUser | null> {
  return await getUserFromRequest(request);
}

// Delete a session (logout)
export async function deleteSession(sessionToken: string): Promise<void> {
  ensureInitialized();
  try {

    queries.deleteSession.run(sessionToken);
    console.log(`✅ Deleted session: ${sessionToken.substring(0, 8)}...`);
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}

// Delete all sessions for a user
export async function deleteUserSessions(userId: number): Promise<void> {
  ensureInitialized();
  try {

    queries.deleteUserSessions.run(userId);
    console.log(`✅ Deleted all sessions for user ${userId}`);
  } catch (error) {
    console.error('Error deleting user sessions:', error);
  }
}

// Use same session authentication for admin requests
export async function getAdminUserFromRequest(request: NextRequest): Promise<AdminUser | null> {
  return getUserFromRequest(request);
}

// Alias for getUserFromRequest (for backward compatibility)
export async function verifyToken(request: NextRequest): Promise<AdminUser | null> {
  return getUserFromRequest(request);
}

// Hash password function
export async function hashPassword(password: string): Promise<string> {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Clear admin cookie function
export function clearAdminCookie() {
  return {
    name: 'admin-session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/'
  };
}