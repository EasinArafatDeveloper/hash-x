import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import DatasetModel from '@/lib/models/Dataset';
import RecordModel from '@/lib/models/Record';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const dataset = await DatasetModel.findById(id).lean();
      if (!dataset) {
        return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
      }
      const liveCount = await RecordModel.countDocuments({
        $or: [{ datasetId: id }, { datasetId: (dataset as any)._id.toString() }],
      });
      return NextResponse.json({
        ...dataset,
        liveRecordsCount: liveCount,
        totalRecords: liveCount,
      });
    }

    const datasets = await DatasetModel.find({}).sort({ uploadedAt: -1 }).lean();

    // Attach real-time count of records associated with each dataset
    const datasetsWithCounts = await Promise.all(
      datasets.map(async (d: any) => {
        const liveCount = await RecordModel.countDocuments({
          $or: [{ datasetId: d._id.toString() }, { datasetId: d._id }],
        });

        // Sync totalRecords in background if differed
        if (d.totalRecords !== liveCount && d.newRecordsCount === undefined) {
          DatasetModel.updateOne({ _id: d._id }, { $set: { totalRecords: liveCount } }).catch(() => {});
        }

        return {
          ...d,
          totalRecords: liveCount,
          liveRecordsCount: liveCount,
        };
      })
    );

    return NextResponse.json(datasetsWithCounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can delete a dataset.' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }

    const dataset = await DatasetModel.findById(id);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const userName = session?.name || 'Administrator';

    // Soft delete all records belonging to this dataset — recoverable from
    // the recycle bin for 30 days instead of destroyed immediately. The
    // dataset's own id is reused as the batch id so the whole file can be
    // restored/purged together as one unit instead of record-by-record.
    const batchId = dataset._id.toString();
    const deleteRecordsResult = await RecordModel.updateMany(
      { $or: [{ datasetId: id }, { datasetId: batchId }] },
      { $set: { deletedAt: new Date(), deletionBatchId: batchId, deletionLabel: dataset.filename } }
    );

    const deletedCount = deleteRecordsResult.modifiedCount || 0;

    // Delete the dataset entry (metadata only, not customer data) — it is
    // recreated automatically if the batch is ever restored from the bin.
    await DatasetModel.findByIdAndDelete(id);

    const totalRemainingRecords = await RecordModel.countDocuments({});

    // Log Activity
    await ActivityLogModel.create({
      action: 'Dataset Deleted',
      description: `Moved dataset "${dataset.filename}" and ${deletedCount.toLocaleString()} associated records to the recycle bin`,
      user: userName,
      type: 'upload',
    });

    return NextResponse.json({
      success: true,
      deletedDataset: dataset.filename,
      deletedRecordsCount: deletedCount,
      totalRemainingRecords,
      message: `File "${dataset.filename}" and ${deletedCount.toLocaleString()} associated records moved to the recycle bin.`,
    });
  } catch (error: any) {
    console.error('Error deleting dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete dataset' }, { status: 500 });
  }
}
