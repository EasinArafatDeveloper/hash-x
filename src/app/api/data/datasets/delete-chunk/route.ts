import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DatasetModel from '@/lib/models/Dataset';
import RecordModel from '@/lib/models/Record';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const requestingUser = await getSessionUser();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can purge dataset records.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const { datasetId, batchSize = 10000 } = body || {};

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }

    const dataset = await DatasetModel.findById(datasetId);
    if (!dataset) {
      // Dataset document already gone, soft-delete any dangling records so
      // they're still recoverable from the recycle bin.
      await RecordModel.updateMany(
        { $or: [{ datasetId: datasetId }, { datasetId: datasetId.toString() }] },
        { $set: { deletedAt: new Date(), deletionBatchId: String(datasetId), deletionLabel: 'Deleted dataset' } }
      );
      return NextResponse.json({
        success: true,
        deletedInBatch: 0,
        remainingRecords: 0,
        isCompleted: true,
        message: 'Dataset already removed.',
      });
    }

    const clampedBatchSize = Math.max(1000, Math.min(Number(batchSize) || 10000, 25000));

    // 1. Fetch a batch of record IDs to delete
    const query = {
      $or: [{ datasetId: datasetId }, { datasetId: dataset._id.toString() }],
    };

    const recordsBatch = await RecordModel.find(query)
      .select('_id')
      .limit(clampedBatchSize)
      .lean();

    let deletedInBatch = 0;

    if (recordsBatch.length > 0) {
      const ids = recordsBatch.map((r: any) => r._id);
      // Soft delete — moves records to the recycle bin (restorable for 30
      // days) instead of destroying them immediately. The dataset's own id
      // is reused as the batch id across every chunk call for this purge,
      // so the whole file restores/purges together as one unit.
      const delRes = await RecordModel.updateMany(
        { _id: { $in: ids } },
        { $set: { deletedAt: new Date(), deletionBatchId: dataset._id.toString(), deletionLabel: dataset.filename } }
      );
      deletedInBatch = delRes.modifiedCount || ids.length;
    }

    // 2. Count remaining records for this dataset
    const remainingRecords = await RecordModel.countDocuments(query);

    const isCompleted = remainingRecords === 0;

    // 3. If no records remain, remove dataset metadata and log activity
    if (isCompleted) {
      await DatasetModel.findByIdAndDelete(datasetId);

      const session = await getSessionUser();
      const userName = session?.name || 'Administrator';

      await ActivityLogModel.create({
        action: 'Dataset Purged',
        description: `Moved dataset "${dataset.filename}" and all its records to the recycle bin`,
        user: userName,
        type: 'upload',
      });
    }

    return NextResponse.json({
      success: true,
      deletedInBatch,
      remainingRecords,
      isCompleted,
      filename: dataset.filename,
      message: isCompleted
        ? `Dataset "${dataset.filename}" and its records were moved to the recycle bin.`
        : `Moved batch of ${deletedInBatch.toLocaleString()} records to the recycle bin. ${remainingRecords.toLocaleString()} remaining.`,
    });
  } catch (error: any) {
    console.error('Error in delete-chunk:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process deletion chunk' },
      { status: 500 }
    );
  }
}
