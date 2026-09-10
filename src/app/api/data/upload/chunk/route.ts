import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import { parseRowData, computeRecordUpdates, buildNewRecord } from '@/lib/data-ingest';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      datasetId,
      chunkIndex = 0,
      rows = [],
      tags = [],
      customTag,
      customCategory,
      customAttributes,
      columnMapping,
    } = body || {};

    if (!datasetId) {
      return NextResponse.json({ error: 'datasetId is required' }, { status: 400 });
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        success: true,
        chunkIndex,
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        skippedCount: 0,
      });
    }

    // Parse batch tags
    const rawBatchTags: string[] = [];
    if (Array.isArray(tags)) {
      tags.forEach((t: any) => {
        const str = String(t || '').trim();
        if (str && !rawBatchTags.includes(str)) rawBatchTags.push(str);
      });
    } else if (typeof tags === 'string' && tags.trim()) {
      tags.split(',').forEach((t: string) => {
        const str = t.trim();
        if (str && !rawBatchTags.includes(str)) rawBatchTags.push(str);
      });
    }
    if (customTag && typeof customTag === 'string' && customTag.trim()) {
      customTag.split(',').forEach((t: string) => {
        const str = t.trim();
        if (str && !rawBatchTags.includes(str)) rawBatchTags.push(str);
      });
    }

    let parsedRecords: ReturnType<typeof parseRowData>[] = [];
    let skippedCount = 0;

    rows.forEach((row, idx) => {
      const values = Object.values(row).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (values.length === 0) {
        skippedCount++;
        return;
      }

      const parsed = parseRowData(row, columnMapping, rawBatchTags, customCategory, customAttributes);
      parsedRecords.push(parsed);
    });

    if (parsedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        chunkIndex,
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        skippedCount,
      });
    }

    // 1. High-Speed Targeted Lookups by Unique Mobile Number (and email fallback)
    const incomingPhones = parsedRecords.map((r) => r.phone).filter(Boolean);
    const incomingEmails = parsedRecords.map((r) => r.email).filter(Boolean);

    const uniquePhones = Array.from(new Set(incomingPhones));
    const uniqueEmails = Array.from(new Set(incomingEmails));

    const projection =
      '_id phone email name age gender avatarUrl avatarType location area address activeDays lastActive tags category customFields';

    const [phoneDocs, emailDocs] = await Promise.all([
      uniquePhones.length > 0
        ? RecordModel.find({ phone: { $in: uniquePhones } })
            .select(projection)
            .lean()
        : Promise.resolve([]),
      uniqueEmails.length > 0
        ? RecordModel.find({ email: { $in: uniqueEmails } })
            .select(projection)
            .lean()
        : Promise.resolve([]),
    ]);

    const phoneMap = new Map<string, any>();
    const emailMap = new Map<string, any>();

    phoneDocs.forEach((doc: any) => {
      if (doc.phone) phoneMap.set(doc.phone, doc);
    });
    emailDocs.forEach((doc: any) => {
      if (doc.email) emailMap.set(doc.email, doc);
    });

    const newRecordsToInsert: any[] = [];
    const bulkUpdateOps: any[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    parsedRecords.forEach((incoming, idx) => {
      // Find matching existing record: Primary key is phone, secondary fallback is email
      const matched =
        (incoming.phone ? phoneMap.get(incoming.phone) : null) ||
        (incoming.email ? emailMap.get(incoming.email) : null);

      if (matched) {
        // SMART PARTIAL UPDATE
        const { hasChanges, updateFields } = computeRecordUpdates(incoming, matched);

        if (hasChanges && Object.keys(updateFields).length > 0) {
          if (matched._id) {
            bulkUpdateOps.push({
              updateOne: {
                filter: { _id: matched._id },
                update: { $set: updateFields },
              },
            });
          }
          // Update in-memory object so intra-batch duplicates merge cleanly
          Object.assign(matched, updateFields);
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        // BRAND NEW RECORD
        const newRecord = buildNewRecord(incoming, datasetId, chunkIndex * 2500 + idx + 1);
        newRecordsToInsert.push(newRecord);

        // Register in local lookup maps so intra-batch duplicates merge into this record
        if (newRecord.phone) phoneMap.set(newRecord.phone, newRecord);
        if (newRecord.email) emailMap.set(newRecord.email, newRecord);
        newCount++;
      }
    });

    // Execute bulk write operations in parallel
    const writePromises: Promise<any>[] = [];
    if (newRecordsToInsert.length > 0) {
      writePromises.push(RecordModel.insertMany(newRecordsToInsert, { ordered: false }));
    }
    if (bulkUpdateOps.length > 0) {
      writePromises.push(RecordModel.bulkWrite(bulkUpdateOps, { ordered: false }));
    }

    await Promise.all(writePromises);

    // Increment Dataset document stats atomically
    DatasetModel.updateOne(
      { _id: datasetId },
      {
        $inc: {
          totalRecords: newCount,
          newRecordsCount: newCount,
          updatedRecordsCount: updatedCount,
          unchangedRecordsCount: unchangedCount,
          skippedRowsCount: skippedCount,
        },
      }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      chunkIndex,
      newCount,
      updatedCount,
      unchangedCount,
      skippedCount,
      processedInChunk: parsedRecords.length,
    });
  } catch (error: any) {
    console.error('Upload chunk error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chunk' },
      { status: 500 }
    );
  }
}
