import { NextRequest, NextResponse } from 'next/server';
import { queries, db, ensureInitialized } from '@/lib/database';
import { getSessionUser } from '@/lib/auth';

// POST /api/claim-daily - Claim daily M-coin reward
export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    ensureInitialized();
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get current user data including last claim date
    const userData = db.prepare(`
      SELECT id, currency1, last_daily_claim 
      FROM users 
      WHERE id = ?
    `).get(sessionUser.id) as any;

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has already claimed today (using UTC for consistency)
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format in UTC
    
    if (userData.last_daily_claim) {
      // Parse the stored time and convert to UTC date
      const lastClaimUTC = new Date(userData.last_daily_claim + 'Z'); // Force UTC interpretation
      const lastClaimDate = lastClaimUTC.toISOString().split('T')[0];
      if (lastClaimDate === today) {
        // Calculate hours until next claim
        const lastClaim = new Date(userData.last_daily_claim);
        const nextClaim = new Date(lastClaim);
        nextClaim.setDate(nextClaim.getDate() + 1);
        nextClaim.setHours(0, 0, 0, 0); // Reset to start of next day
        
        const hoursUntilNext = Math.ceil((nextClaim.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        return NextResponse.json({ 
          error: 'Already claimed today',
          canClaimAgainIn: `${hoursUntilNext} hours`,
          nextClaimTime: nextClaim.toISOString()
        }, { status: 429 });
      }
    }

    // Get daily bonus amount from settings
    const dailyBonusSetting = db.prepare(`
      SELECT value FROM system_settings 
      WHERE key = 'currency_daily_login_bonus'
    `).get() as any;
    
    const dailyBonus = dailyBonusSetting ? parseInt(dailyBonusSetting.value) : 1;

    // Update user currency and claim date
    const newBalance = (userData.currency1 || 0) + dailyBonus;
    
    // Update both currency and last claim date (using UTC time)
    db.prepare(`
      UPDATE users 
      SET currency1 = ?, last_daily_claim = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
      WHERE id = ?
    `).run(newBalance, sessionUser.id);

    // Get streak information (consecutive days)
    const streak = calculateStreak(sessionUser.id);

    return NextResponse.json({
      success: true,
      claimed: dailyBonus,
      newBalance: newBalance,
      previousBalance: userData.currency1 || 0,
      streak: streak,
      nextClaimAvailable: getNextClaimTime(now)
    });

  } catch (error) {
    console.error('Daily claim error:', error);
    return NextResponse.json({ error: 'Failed to process daily claim' }, { status: 500 });
  }
}

// GET /api/claim-daily - Check claim status
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Claim Status] Starting claim status check');
    // Ensure database is initialized
    ensureInitialized();
    console.log('🔍 [Claim Status] Database initialized');
    const sessionUser = await getSessionUser(request);
    console.log('🔍 [Claim Status] Session user:', sessionUser ? `ID: ${sessionUser.id}` : 'null');
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get current user data
    console.log('🔍 [Claim Status] Getting user data for ID:', sessionUser.id);
    const userData = db.prepare(`
      SELECT id, currency1, last_daily_claim 
      FROM users 
      WHERE id = ?
    `).get(sessionUser.id) as any;

    console.log('🔍 [Claim Status] User data:', userData);
    if (!userData) {
      console.log('❌ [Claim Status] User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get daily bonus amount from settings
    const dailyBonusSetting = db.prepare(`
      SELECT value FROM system_settings 
      WHERE key = 'currency_daily_login_bonus'
    `).get() as any;
    
    const dailyBonus = dailyBonusSetting ? parseInt(dailyBonusSetting.value) : 1;

    // Check if user can claim today (using UTC for consistency)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let canClaim = true;
    let nextClaimTime = null;
    let hoursUntilNext = 0;
    
    if (userData.last_daily_claim) {
      // Parse the stored time and convert to UTC date
      const lastClaimUTC = new Date(userData.last_daily_claim + 'Z'); // Force UTC interpretation
      const lastClaimDate = lastClaimUTC.toISOString().split('T')[0];
      if (lastClaimDate === today) {
        canClaim = false;
        const lastClaim = new Date(userData.last_daily_claim);
        nextClaimTime = getNextClaimTime(lastClaim);
        hoursUntilNext = Math.ceil((new Date(nextClaimTime).getTime() - now.getTime()) / (1000 * 60 * 60));
      }
    }

    const streak = calculateStreak(sessionUser.id);

    return NextResponse.json({
      canClaim,
      dailyBonus,
      currentBalance: userData.currency1 || 0,
      lastClaim: userData.last_daily_claim,
      nextClaimTime,
      hoursUntilNext,
      streak
    });

  } catch (error) {
    console.error('❌ [Claim Status] Error occurred:', error);
    console.error('❌ [Claim Status] Error stack:', error instanceof Error ? error.stack : 'No stack available');
    return NextResponse.json({ error: 'Failed to check claim status' }, { status: 500 });
  }
}

// Helper function to calculate consecutive days streak
function calculateStreak(userId: number): number {
  try {
    // This is a simplified streak calculation
    // In a production system, you might want to store streak data separately
    const user = db.prepare(`
      SELECT last_daily_claim 
      FROM users 
      WHERE id = ?
    `).get(userId) as any;

    if (!user?.last_daily_claim) return 0;

    const lastClaim = new Date(user.last_daily_claim);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24));
    
    // If claimed today or yesterday, it's at least a 1-day streak
    if (diffDays <= 1) return 1;
    
    // For simplicity, return 1 for now
    // A full implementation would track consecutive claims
    return 1;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

// Helper function to get next claim time (start of next day)
function getNextClaimTime(fromDate: Date): string {
  const nextClaim = new Date(fromDate);
  nextClaim.setDate(nextClaim.getDate() + 1);
  nextClaim.setHours(0, 0, 0, 0);
  return nextClaim.toISOString();
}