import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — list soft-deleted records (recycle bin), admin only
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can view the recycle bin.' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    const filter = { deletedAt: { $ne: null } };
    const queryOptions = { includeSoftDeleted: true };

    const [total, records] = await Promise.all([
      RecordModel.countDocuments(filter).setOptions(queryOptions),
      RecordModel.find(filter)
        .setOptions(queryOptions)
        .sort({ deletedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name phone email location orderCount orderAmount deletedAt')
        .lean(),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    console.error('Error listing recycle bin:', error);
    return NextResponse.json({ error: 'Failed to load recycle bin' }, { status: 500 });
  }
}
