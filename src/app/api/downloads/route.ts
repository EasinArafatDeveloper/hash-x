import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DownloadHistoryModel from '@/lib/models/DownloadHistory';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const history = await DownloadHistoryModel.find({}).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Downloads history error:', error);
    return NextResponse.json({ error: 'Failed to fetch download history' }, { status: 500 });
  }
}
