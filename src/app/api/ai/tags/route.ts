import { NextRequest, NextResponse } from 'next/server';
import { aiDiscoverSmartTags, computeSmartTagsFromRows } from '@/lib/deepseek';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sampleRows = [], totalRows = 0, columnMapping } = body || {};

    if (!Array.isArray(sampleRows) || sampleRows.length === 0) {
      return NextResponse.json(
        { error: 'sampleRows array is required' },
        { status: 400 }
      );
    }

    const smartTags = await aiDiscoverSmartTags(
      sampleRows,
      totalRows || sampleRows.length,
      columnMapping
    );

    return NextResponse.json({
      success: true,
      smartTags,
    });
  } catch (error: any) {
    console.error('AI Smart Tags API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover smart tags' },
      { status: 500 }
    );
  }
}
