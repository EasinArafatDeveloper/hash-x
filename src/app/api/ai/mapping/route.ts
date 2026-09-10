import { NextRequest, NextResponse } from 'next/server';
import { aiSuggestColumnMapping } from '@/lib/deepseek';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
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
