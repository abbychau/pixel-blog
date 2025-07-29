import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can view system settings
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const settings = queries.getAllSystemSettings.all();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Failed to fetch system settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Get current user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can update system settings
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Support both single setting update and batch update
    if (body.key && body.value !== undefined) {
      // Single setting update (legacy format)
      const { key, value } = body;

      // Validate specific settings
      if (key === 'category_approval_threshold') {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1 || numValue > 100) {
          return NextResponse.json({ error: 'Threshold must be between 1 and 100' }, { status: 400 });
        }
      }

      // Update the setting
      queries.updateSystemSetting.run(value, key);

      return NextResponse.json({ message: 'Setting updated successfully' });
    } else {
      // Batch update for currency settings
      const currencyKeys = ['currency_url_slug_cost', 'currency_registration_bonus', 'currency_daily_login_bonus'];
      
      for (const [key, value] of Object.entries(body)) {
        if (currencyKeys.includes(key)) {
          // Validate currency values
          const numValue = parseInt(value as string);
          if (isNaN(numValue) || numValue < 0) {
            return NextResponse.json({ error: `${key} must be a non-negative number` }, { status: 400 });
          }
          
          // Additional validation for specific settings
          if (key === 'currency_url_slug_cost' && numValue > 100) {
            return NextResponse.json({ error: 'URL slug cost cannot exceed 100' }, { status: 400 });
          }
          if (key === 'currency_registration_bonus' && numValue > 1000) {
            return NextResponse.json({ error: 'Registration bonus cannot exceed 1000' }, { status: 400 });
          }
          if (key === 'currency_daily_login_bonus' && numValue > 50) {
            return NextResponse.json({ error: 'Daily login bonus cannot exceed 50' }, { status: 400 });
          }

          // Update the setting
          queries.updateSystemSetting.run(value as string, key);
        }
      }

      return NextResponse.json({ message: 'Currency settings updated successfully' });
    }
  } catch (error) {
    console.error('Error updating system setting:', error);
    return NextResponse.json({ error: 'Failed to update system setting' }, { status: 500 });
  }
}