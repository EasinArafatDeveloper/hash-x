import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — list soft-deleted records grouped into deletion batches (recycle
// bin), admin only. Grouping means a 56,000-record dataset delete shows up
// as ONE entry with a "restore/purge all" action, not 56,000 rows.
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can view the recycle bin.' }, { status: 403 });
    }

    await connectToDatabase();

    // Self-heal: records soft-deleted before batch tracking existed (or by
    // any future write path that forgets to set it) have deletionBatchId:
    // null, which Mongo groups together into one unmanageable bucket. Give
    // each such record a real batch id — its own datasetId when it has one
    // (so a whole legacy dataset purge groups back together correctly),
    // otherwise its own _id (so it stands alone). Idempotent and cheap once
    // everything is migrated, since it only ever matches null batch ids.
    await RecordModel.updateMany({ deletedAt: { $ne: null }, deletionBatchId: null }, [
      {
        $set: {
          deletionBatchId: { $ifNull: ['$datasetId', { $toString: '$_id' }] },
          deletionLabel: { $ifNull: [{ $cond: [{ $eq: ['$deletionLabel', ''] }, null, '$deletionLabel'] }, 'Deleted records'] },
        },
      },
    ]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    // Each pipeline's own explicit `$match` on `deletedAt` already satisfies
    // the soft-delete middleware's bypass condition (see excludeSoftDeleted
    // in models/Record.ts) — no extra options needed to see trashed docs.
    const [batches, totalBatchesAgg, totalTrashedRecords] = await Promise.all([
      RecordModel.aggregate([
        { $match: { deletedAt: { $ne: null } } },
        {
          $group: {
            _id: '$deletionBatchId',
            label: { $first: '$deletionLabel' },
            count: { $sum: 1 },
            deletedAt: { $max: '$deletedAt' },
            sample: { $push: { name: '$name', phone: '$phone' } },
          },
        },
        { $sort: { deletedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _id: 0, batchId: '$_id', label: 1, count: 1, deletedAt: 1, sample: { $slice: ['$sample', 5] } } },
      ]),
      RecordModel.aggregate([
        { $match: { deletedAt: { $ne: null } } },
        { $group: { _id: '$deletionBatchId' } },
        { $count: 'total' },
      ]),
      RecordModel.countDocuments({ deletedAt: { $ne: null } }),
    ]);

    const totalBatches = totalBatchesAgg[0]?.total || 0;

    return NextResponse.json({
      batches,
      totalTrashedRecords,
      pagination: { page, limit, total: totalBatches, totalPages: Math.ceil(totalBatches / limit) || 1 },
    });
  } catch (error: any) {
    console.error('Error listing recycle bin:', error);
    return NextResponse.json({ error: 'Failed to load recycle bin' }, { status: 500 });
  }
}
