import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role === 'viewer') {
      return NextResponse.json({ error: 'You do not have permission to finalize uploads.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { datasetId } = body || {};

    if (!datasetId || !mongoose.Types.ObjectId.isValid(datasetId)) {
      return NextResponse.json({ error: 'Valid datasetId is required' }, { status: 400 });
    }

    const dataset = await DatasetModel.findById(datasetId);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    dataset.status = 'Ready';
    await dataset.save();

    const uploaderName = session?.name || session?.username || dataset.uploadedBy || 'Administrator';

    const newCount = dataset.newRecordsCount || 0;
    const updatedCount = dataset.updatedRecordsCount || 0;
    const unchangedCount = dataset.unchangedRecordsCount || 0;
    const skippedCount = dataset.skippedRowsCount || 0;

    // Log activity
    await ActivityLogModel.create({
      action: 'File Uploaded',
      description: `Uploaded "${dataset.filename}" with ${(dataset.totalRowsInFile || newCount + updatedCount).toLocaleString()} rows (${newCount.toLocaleString()} new, ${updatedCount.toLocaleString()} merged, ${unchangedCount.toLocaleString()} duplicate)${skippedCount > 0 ? ` [${skippedCount} empty rows skipped]` : ''}`,
      user: uploaderName,
      type: 'upload',
    });

    const totalRecordsInDb = await RecordModel.countDocuments({});

    // Trigger background auto-archival for any new external avatar URLs
    (async () => {
      try {
        const pendingDocs = await RecordModel.find({
          datasetId: dataset._id.toString(),
          $and: [
            {
              $or: [
                { avatarUrl: { $regex: '^https?://', $options: 'i' } },
                { avatarOriginalUrl: { $regex: '^https?://', $options: 'i' } },
              ],
            },
            {
              $or: [
                { avatarBase64: { $exists: false } },
                { avatarBase64: '' },
                { avatarBase64: null },
              ],
            },
          ],
        })
          .limit(80)
          .select('_id avatarUrl avatarOriginalUrl');

        if (pendingDocs.length > 0) {
          const bulkOps: any[] = [];
          await Promise.all(
            pendingDocs.map(async (doc) => {
              const u = doc.avatarOriginalUrl || doc.avatarUrl;
              if (!u || !u.startsWith('http')) return;
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000);
                const resp = await fetch(u, {
                  signal: controller.signal,
                  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                clearTimeout(timeoutId);
                if (resp.ok) {
                  const arr = await resp.arrayBuffer();
                  const buf = Buffer.from(arr);
                  const ct = resp.headers.get('content-type') || 'image/jpeg';
                  bulkOps.push({
                    updateOne: {
                      filter: { _id: doc._id },
                      update: {
                        $set: {
                          avatarBase64: `data:${ct};base64,${buf.toString('base64')}`,
                          avatarOriginalUrl: u,
                        },
                      },
                    },
                  });
                }
              } catch {}
            })
          );
          if (bulkOps.length > 0) {
            await RecordModel.bulkWrite(bulkOps);
          }
        }
      } catch (err) {
        console.error('Background auto-archiver error:', err);
      }
    })();

    return NextResponse.json({
      success: true,
      newCount,
      updatedCount,
      unchangedCount,
      totalCount: totalRecordsInDb,
      skippedCount,
      dataset,
    });
  } catch (error: any) {
    console.error('Upload finalize error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to finalize dataset' },
      { status: 500 }
    );
  }
}
