import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';
import { parseRowData, computeRecordUpdates, buildNewRecord } from '@/lib/data-ingest';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { filename, rows, fileSize, customTag, customCategory, customAttributes, columnMapping } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found in the uploaded file' },
        { status: 400 }
      );
    }

    // Parse multiple batch tags & labels from upload payload
    const rawBatchTags: string[] = [];
    if (Array.isArray(body.tags)) {
      body.tags.forEach((t: any) => {
        const str = String(t || '').trim();
        if (str && !rawBatchTags.includes(str)) rawBatchTags.push(str);
      });
    } else if (typeof body.tags === 'string' && body.tags.trim()) {
      body.tags.split(',').forEach((t: string) => {
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

    rows.forEach((row) => {
      const values = Object.values(row).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (values.length === 0) {
        skippedCount++;
        return;
      }

      const parsed = parseRowData(row, columnMapping, rawBatchTags, customCategory, customAttributes);
      parsedRecords.push(parsed);
    });

    if (parsedRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid data records found in uploaded file', skippedCount },
        { status: 400 }
      );
    }

    // --- SMART UPSERT & MERGE ENGINE ---
    // 1. Gather all phone numbers & emails to look up existing records in one fast batch
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

    // Index existing docs by phone and by email for O(1) matching
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

    const fieldUpdatesSummary = {
      emailUpdated: 0,
      phoneUpdated: 0,
      nameUpdated: 0,
      ageUpdated: 0,
      genderUpdated: 0,
      locationUpdated: 0,
      avatarUpdated: 0,
      tagsUpdated: 0,
      activeDaysUpdated: 0,
      lastActiveUpdated: 0,
      customFieldsUpdated: 0,
    };

    const auditSample: Array<{
      rowNumber: number;
      identifier: string;
      name: string;
      status: 'new' | 'updated' | 'unchanged';
      updatedFields: string[];
      changes: Array<{ field: string; from: string; to: string }>;
    }> = [];

    // Create Dataset record first
    const totalFieldsCount = Object.keys(rows[0] || {}).length || 18;
    const session = await getSessionUser();
    const uploaderName = session?.name || 'Administrator';

    const dataset = await DatasetModel.create({
      filename: filename || 'uploaded-dataset.csv',
      totalRecords: 0,
      totalRowsInFile: rows.length,
      newRecordsCount: 0,
      updatedRecordsCount: 0,
      unchangedRecordsCount: 0,
      skippedRowsCount: skippedCount,
      fieldUpdatesSummary,
      auditSample: [],
      totalFields: totalFieldsCount,
      fileSize: fileSize || `${(JSON.stringify(rows).length / 1024).toFixed(1)} KB`,
      status: 'Ready',
      uploadedBy: uploaderName,
      uploadedAt: new Date(),
    });

    const datasetId = dataset._id.toString();

    parsedRecords.forEach((incoming, idx) => {
      const rowNum = idx + 1;
      // Match by unique Mobile Number first, then email fallback
      const matched =
        (incoming.phone ? phoneMap.get(incoming.phone) : null) ||
        (incoming.email ? emailMap.get(incoming.email) : null);

      if (matched) {
        // SMART PARTIAL UPDATE
        const { hasChanges, updateFields, changedList, diffs } = computeRecordUpdates(incoming, matched);

        if (hasChanges && Object.keys(updateFields).length > 0) {
          if (matched._id) {
            bulkUpdateOps.push({
              updateOne: {
                filter: { _id: matched._id },
                update: { $set: updateFields },
              },
            });
          }

          // Update summary counters
          if (updateFields.email) fieldUpdatesSummary.emailUpdated++;
          if (updateFields.name) fieldUpdatesSummary.nameUpdated++;
          if (updateFields.phone) fieldUpdatesSummary.phoneUpdated++;
          if (updateFields.age) fieldUpdatesSummary.ageUpdated++;
          if (updateFields.gender) fieldUpdatesSummary.genderUpdated++;
          if (updateFields.location || updateFields.area || updateFields.address) fieldUpdatesSummary.locationUpdated++;
          if (updateFields.avatarUrl) fieldUpdatesSummary.avatarUpdated++;
          if (updateFields.tags) fieldUpdatesSummary.tagsUpdated++;
          if (updateFields.activeDays) fieldUpdatesSummary.activeDaysUpdated++;
          if (updateFields.lastActive) fieldUpdatesSummary.lastActiveUpdated++;
          if (updateFields.customFields) fieldUpdatesSummary.customFieldsUpdated++;

          // Update local in-memory object for intra-file duplicate merges
          Object.assign(matched, updateFields);
          updatedCount++;

          if (auditSample.length < 300) {
            auditSample.push({
              rowNumber: rowNum,
              identifier: incoming.phone || incoming.email || incoming.providedFields.name || 'Record',
              name: incoming.providedFields.name || matched.name,
              status: 'updated',
              updatedFields: changedList,
              changes: diffs,
            });
          }
        } else {
          unchangedCount++;
          if (auditSample.length < 300) {
            auditSample.push({
              rowNumber: rowNum,
              identifier: incoming.phone || incoming.email || incoming.providedFields.name || 'Record',
              name: incoming.providedFields.name || matched.name,
              status: 'unchanged',
              updatedFields: [],
              changes: [],
            });
          }
        }
      } else {
        // BRAND NEW RECORD
        const newRecord = buildNewRecord(incoming, datasetId, rowNum);
        newRecordsToInsert.push(newRecord);

        // Register in local lookup maps so intra-batch duplicates merge into this record
        if (newRecord.phone) phoneMap.set(newRecord.phone, newRecord);
        if (newRecord.email) emailMap.set(newRecord.email, newRecord);
        newCount++;

        if (auditSample.length < 300) {
          auditSample.push({
            rowNumber: rowNum,
            identifier: incoming.phone || incoming.email || newRecord.name,
            name: newRecord.name,
            status: 'new',
            updatedFields: ['New Contact Added'],
            changes: [
              { field: 'Contact Phone', from: '(None)', to: incoming.phone || 'N/A' },
              { field: 'Gender / Age', from: '(None)', to: `${newRecord.gender || 'N/A'} / ${newRecord.age || 'N/A'}` },
              { field: 'Location', from: '(None)', to: newRecord.location || newRecord.address || 'N/A' },
            ],
          });
        }
      }
    });

    // Execute bulk insertions in chunks
    if (newRecordsToInsert.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < newRecordsToInsert.length; i += chunkSize) {
        const chunk = newRecordsToInsert.slice(i, i + chunkSize);
        await RecordModel.insertMany(chunk, { ordered: false });
      }
    }

    // Execute bulk updates
    if (bulkUpdateOps.length > 0) {
      await RecordModel.bulkWrite(bulkUpdateOps);
    }

    // Update dataset record counts and audit details
    dataset.newRecordsCount = newCount;
    dataset.updatedRecordsCount = updatedCount;
    dataset.unchangedRecordsCount = unchangedCount;
    dataset.skippedRowsCount = skippedCount;
    dataset.totalRecords = newCount;
    dataset.fieldUpdatesSummary = fieldUpdatesSummary;
    dataset.auditSample = auditSample;
    await dataset.save();

    const totalRecordsInDb = await RecordModel.countDocuments({});

    // Log Activity
    await ActivityLogModel.create({
      action: 'File Uploaded',
      description: `Uploaded "${filename || 'file'}" with ${parsedRecords.length.toLocaleString()} rows (${newCount.toLocaleString()} new, ${updatedCount.toLocaleString()} merged, ${unchangedCount.toLocaleString()} duplicate)${skippedCount > 0 ? ` [${skippedCount} empty rows skipped]` : ''}`,
      user: uploaderName,
      type: 'upload',
    });

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
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process dataset' },
      { status: 500 }
    );
  }
}
