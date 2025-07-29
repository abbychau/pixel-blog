import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/database';

export async function GET() {
  try {
    const tags = queries.getAllTags.all();
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}