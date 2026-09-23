import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function buildBatchFilter(batchId: string) {
  if (!batchId || batchId === 'null' || batchId === 'undefined' || batchId === 'unbatched') {
    return {
      deletedAt: { $ne: null },
      $or: [
        { deletionBatchId: null },
        { deletionBatchId: '' },
        { deletionBatchId: 'null' },
        { deletionBatchId: 'unbatched' },
        { deletionBatchId: { $exists: false } },
      ],
    };
  }
  return { deletedAt: { $ne: null }, deletionBatchId: batchId };
}

// GET — list the individual records inside one deletion batch (for
// inspecting/managing a large batch record-by-record instead of restoring
// or purging the whole thing at once), admin only.
export async function GET(request: NextRequest, props: { params: Promise<{ batchId: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can view the recycle bin.' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100));

    const filter = buildBatchFilter(params.batchId);

    const [total, records] = await Promise.all([
      RecordModel.countDocuments(filter),
      RecordModel.find(filter)
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
    console.error('Error listing recycle bin batch:', error);
    return NextResponse.json({ error: 'Failed to load batch' }, { status: 500 });
  }
}

// DELETE — permanently purge every record in this batch immediately,
// instead of waiting for the 30-day auto-purge. Irreversible. Admin only.
export async function DELETE(_req: NextRequest, props: { params: Promise<{ batchId: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can permanently delete records.' }, { status: 403 });
    }

    await connectToDatabase();

    const filter = buildBatchFilter(params.batchId);
    const count = await RecordModel.countDocuments(filter);
    if (count === 0) {
      return NextResponse.json({ error: 'Batch not found in recycle bin' }, { status: 404 });
    }

    const result = await RecordModel.deleteMany(filter);

    await ActivityLogModel.create({
      action: 'Recycle Bin Purged',
      description: `Permanently deleted ${result.deletedCount || count} record(s) from the recycle bin`,
      user: session.name,
      type: 'system',
    });

    return NextResponse.json({ success: true, purgedCount: result.deletedCount || count });
  } catch (error: any) {
    console.error('Error purging recycle bin batch:', error);
    return NextResponse.json({ error: 'Failed to permanently delete batch' }, { status: 500 });
  }
}
