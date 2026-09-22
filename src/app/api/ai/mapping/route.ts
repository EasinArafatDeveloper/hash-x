import { NextRequest, NextResponse } from 'next/server';
import { aiSuggestColumnMapping } from '@/lib/deepseek';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'anonymous';
    const rl = await checkRateLimit(`ai-mapping:${ip}`, 30, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { columnNames, sampleRows = [] } = body || {};

    if (!columnNames || !Array.isArray(columnNames) || columnNames.length === 0) {
      return NextResponse.json(
        { error: 'columnNames array is required' },
        { status: 400 }
      );
    }

    const mappings = await aiSuggestColumnMapping(columnNames, sampleRows);

    return NextResponse.json({
      success: true,
      mappings,
    });
  } catch (error: any) {
    console.error('AI column mapping API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest column mapping' },
      { status: 500 }
    );
  }
}
