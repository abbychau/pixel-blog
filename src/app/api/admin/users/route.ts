import { NextRequest, NextResponse } from 'next/server';
import { queries, initializeDatabase } from '@/lib/database';
import { hashPassword, getUserFromRequest } from '@/lib/auth';
import { validateUsername, sanitizeDisplayName, isValidDisplayName } from '@/lib/usernameUtils';

export async function GET(request: NextRequest) {
  try {
    // Ensure database is initialized
    if (!queries.getAllUsers) {
      console.warn('⚠️ Queries not initialized, reinitializing database...');
      initializeDatabase();
    }
    
    // Check authentication
    const user = await getUserFromRequest(request);
    console.log('🔍 Admin users API - Authenticated user:', user ? `${user.username} (${user.email}) - Role: ${user.role}` : 'null');
    
    if (!user || user.role !== 'admin') {
      console.log('❌ Admin users API - Access denied, admin role required');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    console.log('🔍 Admin users API - Fetching users...');
    const users = queries.getAllUsers.all();
    console.log('🔍 Admin users API - Found users:', users?.length || 0);
    
    return NextResponse.json(users || []);
  } catch (error) {
    console.error('❌ Admin users API - Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { username, display_name, email, password, role } = body;

    // Validate required fields
    if (!username || !display_name || !email || !password) {
      return NextResponse.json({ error: 'Username, display name, email, and password are required' }, { status: 400 });
    }

    // Validate username format
    if (!validateUsername(username.trim())) {
      return NextResponse.json({ error: 'Username must be 3-20 characters and contain only a-z, 0-9, and underscore' }, { status: 400 });
    }

    // Validate display name
    const sanitizedDisplayName = sanitizeDisplayName(display_name);
    if (!isValidDisplayName(sanitizedDisplayName)) {
      return NextResponse.json({ error: 'Display name must be 1-50 characters' }, { status: 400 });
    }

    // Check if username already exists
    const existingUser = queries.getUserByUsername.get(username.trim());
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // Check if email already exists
    const existingEmail = queries.getUserByEmail.get(email.trim());
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert new user
    const result = queries.insertUser.run(
      username.trim().toLowerCase(),
      sanitizedDisplayName,
      email.trim(),
      hashedPassword,
      role || 'admin'
    );

    // Return created user (without password)
    const newUser = queries.getAllUsers.all().find((u: any) => u.id === result.lastInsertRowid);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}