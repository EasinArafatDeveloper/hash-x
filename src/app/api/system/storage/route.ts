import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BYTES_PER_MB = 1024 * 1024;

// GET — live MongoDB storage usage, overall and broken down per dataset,
// admin only. Real numbers straight from MongoDB ($bsonSize / dbStats),
// not estimates.
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can view storage usage.' }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database connection not ready' }, { status: 503 });
    }

    const [dbStats, datasetSizes, datasets, deletedAgg] = await Promise.all([
      db.stats(),
      RecordModel.aggregate([
        {
          $group: {
            _id: '$datasetId',
            recordCount: { $sum: 1 },
            bytes: { $sum: { $bsonSize: '$$ROOT' } },
          },
        },
        { $sort: { bytes: -1 } },
      ]),
      DatasetModel.find({}).select('filename').lean(),
      RecordModel.aggregate([
        { $match: { deletedAt: { $ne: null } } },
        { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: { $bsonSize: '$$ROOT' } } } },
      ]),
    ]);

    const filenameByDatasetId = new Map<string, string>();
    for (const d of datasets as any[]) filenameByDatasetId.set(String(d._id), d.filename);

    const totalRecordBytes = datasetSizes.reduce((sum: number, d: any) => sum + (d.bytes || 0), 0);

    const datasetBreakdown = datasetSizes.map((d: any) => ({
      datasetId: d._id,
      filename: (d._id && filenameByDatasetId.get(String(d._id))) || 'Unlinked / legacy records',
      recordCount: d.recordCount,
      sizeMB: Math.round((d.bytes / BYTES_PER_MB) * 100) / 100,
      percentOfRecords: totalRecordBytes > 0 ? Math.round((d.bytes / totalRecordBytes) * 1000) / 10 : 0,
    }));

    const trashed = deletedAgg[0] || { count: 0, bytes: 0 };

    // Atlas shared-tier storage caps (e.g. the free M0 tier is 512 MB)
    // aren't exposed through the driver — configure MONGODB_STORAGE_LIMIT_MB
    // to show a used/limit bar; otherwise we just show usage with no cap.
    const configuredLimitMB = Number(process.env.MONGODB_STORAGE_LIMIT_MB);
    const limitMB = Number.isFinite(configuredLimitMB) && configuredLimitMB > 0 ? configuredLimitMB : null;

    const storageSizeMB = Math.round((dbStats.storageSize / BYTES_PER_MB) * 100) / 100;
    const dataSizeMB = Math.round((dbStats.dataSize / BYTES_PER_MB) * 100) / 100;
    const indexSizeMB = Math.round((dbStats.indexSize / BYTES_PER_MB) * 100) / 100;
    const totalSizeMB = Math.round(((dbStats.storageSize + dbStats.indexSize) / BYTES_PER_MB) * 100) / 100;

    return NextResponse.json({
      database: {
        name: db.databaseName,
        dataSizeMB,
        storageSizeMB,
        indexSizeMB,
        totalSizeMB,
        limitMB,
        usedPercent: limitMB ? Math.min(100, Math.round((totalSizeMB / limitMB) * 1000) / 10) : null,
      },
      trashRecycleBin: {
        recordCount: trashed.count,
        sizeMB: Math.round((trashed.bytes / BYTES_PER_MB) * 100) / 100,
      },
      datasets: datasetBreakdown,
    });
  } catch (error: any) {
    console.error('Error fetching storage stats:', error);
    return NextResponse.json({ error: 'Failed to fetch storage usage' }, { status: 500 });
  }
}
