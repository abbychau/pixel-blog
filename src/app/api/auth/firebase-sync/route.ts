import { NextRequest, NextResponse } from 'next/server';
import { queries, ensureInitialized } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Ensure database and queries are initialized
    ensureInitialized();
    
    const body = await request.json();
    const { uid, email, displayName, photoURL, provider } = body;
    
    console.log('🔍 Firebase sync - Request data:', { uid, email, displayName, provider });

    if (!uid || !email) {
      console.log('❌ Firebase sync - Missing UID or email');
      return NextResponse.json({ error: 'UID and email are required' }, { status: 400 });
    }

    // Check if user already exists by email
    console.log('🔍 Firebase sync - Checking if user exists with email:', email);
    const existingUser = queries.getUserByEmail.get(email);
    console.log('🔍 Firebase sync - Existing user:', existingUser);
    
    if (existingUser) {
      // User exists - check for daily login bonus
      console.log('✅ Firebase sync - User exists, checking daily login bonus');
      
      const lastLogin = existingUser.last_login ? new Date(existingUser.last_login) : null;
      const today = new Date();
      const todayDateString = today.toDateString();
      const lastLoginDateString = lastLogin ? lastLogin.toDateString() : null;
      
      let dailyBonusAwarded = false;
      
      // Award daily bonus if user hasn't logged in today
      if (!lastLogin || lastLoginDateString !== todayDateString) {
        const dailyBonusSetting = queries.getSystemSetting.get('currency_daily_login_bonus');
        const dailyBonus = parseInt(dailyBonusSetting?.value || '1');
        
        if (dailyBonus > 0) {
          const newCurrency = (existingUser.currency1 || 0) + dailyBonus;
          queries.updateUserCurrency.run(newCurrency, existingUser.id);
          queries.updateUserLastLogin.run(existingUser.id);
          dailyBonusAwarded = true;
          console.log(`✅ Firebase sync - Daily bonus awarded: ${dailyBonus} currency`);
        }
      }
      
      return NextResponse.json({ 
        message: 'User already exists',
        dailyBonusAwarded,
        user: {
          id: existingUser.id,
          username: existingUser.username,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }

    // Create new user
    const username = displayName || email.split('@')[0];

    console.log('🔍 Firebase sync - Creating new user with username:', username);
    
    // Check if insertUser query exists
    if (!queries.insertUser) {
      console.log('❌ Firebase sync - insertUser query not found');
      return NextResponse.json({ error: 'Database query not available' }, { status: 500 });
    }
    
    try {
      // Get registration bonus from settings
      const registrationBonusSetting = queries.getSystemSetting.get('currency_registration_bonus');
      const registrationBonus = parseInt(registrationBonusSetting?.value || '10');
      
      const result = queries.insertUser.run(
        username,
        displayName || username,  // Add display_name
        email,
        'user', // Default role for Firebase users
        registrationBonus // Currency bonus
      );

      const newUser = queries.getUserById.get(result.lastInsertRowid);
      
      // Set initial login time for new user
      queries.updateUserLastLogin.run(result.lastInsertRowid);
      
      return NextResponse.json({ 
        message: 'User created successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      }, { status: 201 });
    } catch (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
  } catch (error) {
    console.error('Firebase sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}