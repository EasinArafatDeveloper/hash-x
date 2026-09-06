import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DatasetModel from '@/lib/models/Dataset';
import RecordModel from '@/lib/models/Record';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { datasetId, batchSize = 10000 } = body || {};

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }

    const dataset = await DatasetModel.findById(datasetId);
    if (!dataset) {
      // Dataset document already gone, ensure no dangling records remain
      await RecordModel.deleteMany({
        $or: [{ datasetId: datasetId }, { datasetId: datasetId.toString() }],
      });
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
      const delRes = await RecordModel.deleteMany({ _id: { $in: ids } });
      deletedInBatch = delRes.deletedCount || ids.length;
    }

    // 2. Count remaining records for this dataset
    const remainingRecords = await RecordModel.countDocuments(query);

    const isCompleted = remainingRecords === 0;

    // 3. If no records remain, remove dataset metadata and log activity
    if (isCompleted) {
      await DatasetModel.findByIdAndDelete(datasetId);

      const session = await getSessionUser();
      const userName = session?.name || 'Administrator';

      // Clean up orphaned records if total datasets is 0
      const totalDatasetsLeft = await DatasetModel.countDocuments({});
      if (totalDatasetsLeft === 0) {
        await RecordModel.deleteMany({});
      }

      await ActivityLogModel.create({
        action: 'Dataset Purged',
        description: `Permanently deleted dataset "${dataset.filename}" and purged all associated records`,
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
        ? `Dataset "${dataset.filename}" and its records were completely purged.`
        : `Purged batch of ${deletedInBatch.toLocaleString()} records. ${remainingRecords.toLocaleString()} remaining.`,
    });
  } catch (error: any) {
    console.error('Error in delete-chunk:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process deletion chunk' },
      { status: 500 }
    );
  }
}
