import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { queries } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const stats = queries.getImageUsageStats.get(user.id) as {
      total_images: number;
      total_size: number;
      uploaded_by: number;
    };

    const formattedStats = {
      totalImages: stats?.total_images || 0,
      totalSize: stats?.total_size || 0,
      averageSize: stats?.total_images ? Math.round(stats.total_size / stats.total_images) : 0,
      totalSizeMB: stats?.total_size ? (stats.total_size / 1024 / 1024).toFixed(2) : '0.00'
    };

    return NextResponse.json(formattedStats);
  } catch (error) {
    console.error('Error fetching image stats:', error);
    return NextResponse.json({ error: 'Failed to fetch image statistics' }, { status: 500 });
  }
}