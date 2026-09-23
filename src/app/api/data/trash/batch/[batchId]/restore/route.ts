import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
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

// POST — restore every record in one deletion batch at once (e.g. an
// entire deleted dataset, or a whole AI copilot bulk delete), admin only.
export async function POST(_req: NextRequest, props: { params: Promise<{ batchId: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can restore records.' }, { status: 403 });
    }

    await connectToDatabase();

    const filter = buildBatchFilter(params.batchId);
    const sample = await RecordModel.findOne(filter).select('name phone datasetId deletionLabel').lean();
    if (!sample) {
      return NextResponse.json({ error: 'Batch not found in recycle bin' }, { status: 404 });
    }

    const result = await RecordModel.updateMany(filter, {
      $set: { deletedAt: null, deletionBatchId: null, deletionLabel: '' },
    });
    const restoredCount = result.modifiedCount || 0;

    // If this batch was a whole-dataset delete (the batch id is the
    // original dataset's own _id — see datasets/route.ts and
    // delete-chunk/route.ts), and that Dataset document is gone, recreate
    // it with the same id so the restored records re-link correctly and
    // reappear as a normal dataset in the UI.
    let datasetRestored = false;
    if (params.batchId && mongoose.Types.ObjectId.isValid(params.batchId)) {
      const datasetId = (sample as any).datasetId;
      const isDatasetBatch = datasetId === params.batchId;
      if (isDatasetBatch) {
        const existingDataset = await DatasetModel.findById(params.batchId);
        if (!existingDataset) {
          await DatasetModel.create({
            _id: new mongoose.Types.ObjectId(params.batchId),
            filename: (sample as any).deletionLabel || 'Restored dataset',
            totalRecords: restoredCount,
            totalFields: 18,
            fileSize: '0 KB',
            status: 'Ready',
            uploadedBy: session.name,
            uploadedAt: new Date(),
          });
          datasetRestored = true;
        }
      }
    }

    await ActivityLogModel.create({
      action: 'Recycle Bin Restore',
      description: `Restored ${restoredCount} record(s) from the recycle bin${datasetRestored ? ' and recreated the dataset' : ''}`,
      user: session.name,
      type: 'system',
    });

    return NextResponse.json({ success: true, restoredCount, datasetRestored });
  } catch (error: any) {
    console.error('Error restoring recycle bin batch:', error);
    return NextResponse.json({ error: 'Failed to restore batch' }, { status: 500 });
  }
}
