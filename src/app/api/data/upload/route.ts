import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';

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

    let validRecords: any[] = [];
    let skippedCount = 0;

    const hasCustomMapping =
      columnMapping &&
      typeof columnMapping === 'object' &&
      Object.keys(columnMapping).length > 0;

    rows.forEach((row, idx) => {
      const values = Object.values(row).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (values.length === 0) {
        skippedCount++;
        return;
      }

      const normalizedRow: any = {
        name: '',
        phone: '',
        email: '',
        age: 0,
        gender: 'Other',
        location: '',
        area: '',
        address: '',
        orderAmount: 0,
        orderCount: 0,
        status: 'Active',
        activeDays: 0,
        avatarType: 'Without Avatar',
        avatarUrl: '',
        tags: [],
        category: '',
        lastActive: new Date(),
        customFields: {},
      };

      if (hasCustomMapping) {
        // Explicit Custom Mapping from user
        Object.keys(row).forEach((key) => {
          const targetField = columnMapping[key];
          const val = row[key];
          if (val === null || val === undefined || String(val).trim() === '') return;

          if (targetField === 'skip') {
            return;
          }

          if (targetField === 'phone') {
            normalizedRow.phone = String(val).trim();
          } else if (targetField === 'name') {
            normalizedRow.name = String(val).trim();
          } else if (targetField === 'email') {
            normalizedRow.email = String(val).trim();
          } else if (targetField === 'address') {
            normalizedRow.address = String(val).trim();
          } else if (targetField === 'orderAmount') {
            const cleanAmount = String(val).replace(/[^0-9.-]+/g, '');
            const num = parseFloat(cleanAmount);
            if (!isNaN(num)) {
              normalizedRow.orderAmount = num;
              normalizedRow.customFields['Order Amount'] = num;
            } else {
              normalizedRow.customFields['Order Amount'] = val;
            }
          } else if (targetField === 'area') {
            normalizedRow.area = String(val).trim();
            if (!normalizedRow.location) normalizedRow.location = String(val).trim();
          } else if (targetField === 'age') {
            const num = parseInt(String(val), 10);
            if (!isNaN(num)) normalizedRow.age = num;
          } else if (targetField === 'gender') {
            const gStr = String(val).trim().toLowerCase();
            if (gStr.startsWith('m')) normalizedRow.gender = 'Male';
            else if (gStr.startsWith('f')) normalizedRow.gender = 'Female';
            else normalizedRow.gender = 'Other';
          } else if (targetField === 'orderCount') {
            const cleanCount = String(val).replace(/[^0-9.-]+/g, '');
            const num = parseInt(cleanCount, 10);
            if (!isNaN(num)) {
              normalizedRow.orderCount = num;
              normalizedRow.customFields['Order Count'] = num;
            } else {
              normalizedRow.customFields['Order Count'] = val;
            }
          } else if (targetField === 'avatarUrl') {
            const avatarVal = String(val).trim();
            if (avatarVal.startsWith('http://') || avatarVal.startsWith('https://')) {
              normalizedRow.avatarUrl = avatarVal;
              normalizedRow.avatarOriginalUrl = avatarVal;
              normalizedRow.avatarType = 'With Avatar';
            } else if (avatarVal) {
              normalizedRow.avatarType = avatarVal;
            }
          } else if (targetField === 'avatarType') {
            normalizedRow.avatarType = String(val).trim();
          } else if (targetField === 'tags') {
            String(val).split(',').forEach((t) => {
              const ct = t.trim();
              if (ct && !normalizedRow.tags.includes(ct)) normalizedRow.tags.push(ct);
            });
          } else if (targetField === 'category') {
            normalizedRow.category = String(val).trim();
          } else if (targetField === 'status') {
            const sVal = String(val).trim();
            normalizedRow.status = ['Active', 'Inactive', 'Pending', 'Suspended'].includes(sVal) ? sVal : 'Active';
          } else if (targetField === 'activeDays') {
            const num = parseInt(String(val), 10);
            if (!isNaN(num)) normalizedRow.activeDays = num;
          } else if (targetField === 'lastActive') {
            const parsedDate = new Date(val);
            if (!isNaN(parsedDate.getTime())) normalizedRow.lastActive = parsedDate;
          } else {
            normalizedRow.customFields[key] = val;
          }
        });
      } else {
        // Automatic heuristic mapping
        Object.keys(row).forEach((key) => {
          const lowerKey = key.trim().toLowerCase().replace(/[\s_\.-]+/g, '');
          const val = row[key];

          if (
            lowerKey === 'name' ||
            lowerKey === 'fullname' ||
            lowerKey === 'username' ||
            lowerKey === 'nickname' ||
            lowerKey === 'nick' ||
            lowerKey === 'contactname' ||
            lowerKey === 'customername' ||
            lowerKey === 'person' ||
            lowerKey === 'title'
          ) {
            const nameStr = String(val || '').trim();
            if (nameStr && !normalizedRow.name) {
              normalizedRow.name = nameStr;
            }
          } else if (
            lowerKey === 'phone' ||
            lowerKey === 'mobile' ||
            lowerKey === 'number' ||
            lowerKey === 'contact' ||
            lowerKey === 'cell' ||
            lowerKey === 'phonenumber' ||
            lowerKey === 'tel' ||
            lowerKey === 'msisdn'
          ) {
            normalizedRow.phone = String(val || '').trim();
          } else if (
            lowerKey === 'email' ||
            lowerKey === 'mail' ||
            lowerKey === 'emailaddress'
          ) {
            normalizedRow.email = String(val || '').trim();
          } else if (
            lowerKey === 'age' ||
            lowerKey === 'years'
          ) {
            const numAge = parseInt(val, 10);
            if (!isNaN(numAge)) normalizedRow.age = numAge;
          } else if (
            lowerKey === 'gender' ||
            lowerKey === 'sex'
          ) {
            const gStr = String(val || '').trim().toLowerCase();
            if (gStr.startsWith('m')) normalizedRow.gender = 'Male';
            else if (gStr.startsWith('f')) normalizedRow.gender = 'Female';
            else normalizedRow.gender = 'Other';
          } else if (
            lowerKey === 'avatartype' ||
            lowerKey === 'avatar' ||
            lowerKey === 'avatarurl' ||
            lowerKey === 'photo' ||
            lowerKey === 'image' ||
            lowerKey === 'picture' ||
            lowerKey === 'userphoto'
          ) {
            const avatarVal = String(val || '').trim();
            if (avatarVal.startsWith('http://') || avatarVal.startsWith('https://')) {
              normalizedRow.avatarUrl = avatarVal;
              normalizedRow.avatarOriginalUrl = avatarVal;
              normalizedRow.avatarType = 'With Avatar';
            } else if (avatarVal) {
              normalizedRow.avatarType = avatarVal;
            }
          } else if (
            lowerKey === 'activedays' ||
            lowerKey === 'days' ||
            lowerKey === 'active' ||
            lowerKey === 'activeday'
          ) {
            const numDays = parseInt(val, 10);
            if (!isNaN(numDays)) normalizedRow.activeDays = numDays;
          } else if (
            lowerKey === 'lastonline' ||
            lowerKey === 'lastonlinetime' ||
            lowerKey === 'lastactive' ||
            lowerKey === 'online' ||
            lowerKey === 'date' ||
            lowerKey === 'timestamp'
          ) {
            const parsedDate = new Date(val);
            if (!isNaN(parsedDate.getTime())) normalizedRow.lastActive = parsedDate;
          } else if (
            lowerKey === 'location' ||
            lowerKey === 'district' ||
            lowerKey === 'city' ||
            lowerKey === 'division' ||
            lowerKey === 'state' ||
            lowerKey === 'country'
          ) {
            normalizedRow.location = String(val || '').trim();
          } else if (
            lowerKey === 'area' ||
            lowerKey === 'thana' ||
            lowerKey === 'zone'
          ) {
            normalizedRow.area = String(val || '').trim();
          } else if (
            lowerKey === 'address' ||
            lowerKey === 'fulladdress'
          ) {
            normalizedRow.address = String(val || '').trim();
          } else if (
            lowerKey === 'status' ||
            lowerKey === 'state'
          ) {
            const sVal = String(val || '').trim();
            normalizedRow.status = ['Active', 'Inactive', 'Pending', 'Suspended'].includes(sVal) ? sVal : 'Active';
          } else if (
            lowerKey === 'tag' ||
            lowerKey === 'tags' ||
            lowerKey === 'label' ||
            lowerKey === 'labels' ||
            lowerKey === 'badge'
          ) {
            const tagVal = String(val || '').trim();
            if (tagVal) {
              tagVal.split(',').forEach((t) => {
                const ct = t.trim();
                if (ct && !normalizedRow.tags.includes(ct)) normalizedRow.tags.push(ct);
              });
            }
          } else if (
            lowerKey === 'category' ||
            lowerKey === 'group' ||
            lowerKey === 'segment'
          ) {
            normalizedRow.category = String(val || '').trim();
          } else {
            normalizedRow.customFields[key] = val;
          }
        });
      }

      // Single column auto-detection
      if (!normalizedRow.phone) {
        for (const v of values) {
          const cleanStr = String(v).replace(/[\s\+\-\(\)]/g, '');
          if (cleanStr.length >= 7 && /^\d+$/.test(cleanStr)) {
            normalizedRow.phone = String(v).trim();
            break;
          }
        }
      }

      // Apply batch custom tags and category
      if (rawBatchTags.length > 0) {
        rawBatchTags.forEach((tag) => {
          if (!normalizedRow.tags.includes(tag)) {
            normalizedRow.tags.push(tag);
          }
        });
        if (!normalizedRow.category) {
          normalizedRow.category = customCategory ? customCategory.trim() : rawBatchTags[0];
        }
        normalizedRow.customFields['Tags / Labels'] = normalizedRow.tags.join(', ');
      }
      if (customAttributes && typeof customAttributes === 'object') {
        Object.assign(normalizedRow.customFields, customAttributes);
      }

      // Name fallback
      if (!normalizedRow.name) {
        if (row.nickname || row.Nickname || row.NickName || row.nick) {
          normalizedRow.name = String(row.nickname || row.Nickname || row.NickName || row.nick).trim();
        } else if (normalizedRow.phone) {
          normalizedRow.name = `User (${normalizedRow.phone})`;
        } else if (values[0]) {
          normalizedRow.name = String(values[0]).trim();
        } else {
          normalizedRow.name = `Record #${idx + 1}`;
        }
      }

      // Check any other columns for image URLs
      if (!normalizedRow.avatarUrl) {
        Object.values(row).forEach((v) => {
          const str = String(v || '').trim();
          if (str.startsWith('http://') || str.startsWith('https://')) {
            normalizedRow.avatarUrl = str;
            normalizedRow.avatarOriginalUrl = str;
            normalizedRow.avatarType = 'With Avatar';
          }
        });
      }

      validRecords.push(normalizedRow);
    });

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid data records found in uploaded file', skippedCount },
        { status: 400 }
      );
    }

    // --- SMART UPSERT & MERGE LOGIC ---
    // 1. Gather all phone numbers & emails to look up existing records in one fast batch
    const incomingPhones = validRecords.map((r) => r.phone).filter(Boolean);
    const incomingEmails = validRecords.map((r) => r.email).filter(Boolean);

    const lookupConditions: any[] = [];
    if (incomingPhones.length > 0) lookupConditions.push({ phone: { $in: incomingPhones } });
    if (incomingEmails.length > 0) lookupConditions.push({ email: { $in: incomingEmails } });

    let existingDocs: any[] = [];
    if (lookupConditions.length > 0) {
      existingDocs = await RecordModel.find({ $or: lookupConditions }).lean();
    }

    // Index existing docs by phone and by email for O(1) matching
    const phoneMap = new Map<string, any>();
    const emailMap = new Map<string, any>();

    existingDocs.forEach((doc) => {
      if (doc.phone) phoneMap.set(doc.phone, doc);
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

    // Track processed IDs in this batch to prevent duplicate updates within the same file
    const matchedDocIds = new Set<string>();

    // Create Dataset record first so we have the datasetId
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

    validRecords.forEach((incoming, idx) => {
      const rowNum = idx + 1;
      // Find matching existing record: first by phone, then by email
      const matched = (incoming.phone ? phoneMap.get(incoming.phone) : null) ||
                      (incoming.email ? emailMap.get(incoming.email) : null);

      if (matched && !matchedDocIds.has(matched._id.toString())) {
        matchedDocIds.add(matched._id.toString());

        const updateFields: any = {};
        const changedList: string[] = [];
        const diffs: Array<{ field: string; from: string; to: string }> = [];

        // Merge / Fill missing email
        if ((!matched.email || matched.email === '') && incoming.email) {
          updateFields.email = incoming.email;
          changedList.push('Email');
          diffs.push({ field: 'Email', from: matched.email || '(Empty)', to: incoming.email });
          fieldUpdatesSummary.emailUpdated++;
        }

        // Merge / Improve Name if previous was empty or generic 'User (..)'
        if (incoming.name && (!matched.name || matched.name.startsWith('User (')) && !incoming.name.startsWith('User (')) {
          updateFields.name = incoming.name;
          changedList.push('Name');
          diffs.push({ field: 'Name', from: matched.name || '(Empty)', to: incoming.name });
          fieldUpdatesSummary.nameUpdated++;
        }

        // Merge / Fill missing Phone
        if ((!matched.phone || matched.phone === '') && incoming.phone) {
          updateFields.phone = incoming.phone;
          changedList.push('Phone');
          diffs.push({ field: 'Phone', from: matched.phone || '(Empty)', to: incoming.phone });
          fieldUpdatesSummary.phoneUpdated++;
        }

        // Merge / Fill missing Age
        if ((!matched.age || matched.age === 0) && incoming.age > 0) {
          updateFields.age = incoming.age;
          changedList.push('Age');
          diffs.push({ field: 'Age', from: String(matched.age || 0), to: String(incoming.age) });
          fieldUpdatesSummary.ageUpdated++;
        }

        // Merge / Fill missing Gender
        if ((!matched.gender || matched.gender === 'Other') && incoming.gender && incoming.gender !== 'Other') {
          updateFields.gender = incoming.gender;
          changedList.push('Gender');
          diffs.push({ field: 'Gender', from: matched.gender || 'Other', to: incoming.gender });
          fieldUpdatesSummary.genderUpdated++;
        }

        // Merge / Fill missing Avatar URL / Type
        if ((!matched.avatarUrl || matched.avatarUrl === '') && incoming.avatarUrl) {
          updateFields.avatarUrl = incoming.avatarUrl;
          updateFields.avatarType = 'With Avatar';
          changedList.push('Avatar Photo');
          diffs.push({ field: 'Avatar Photo', from: '(No Photo)', to: incoming.avatarUrl });
          fieldUpdatesSummary.avatarUpdated++;
        }

        // Merge / Fill missing Location / Area / Address
        if ((!matched.location || matched.location === '') && incoming.location) {
          updateFields.location = incoming.location;
          changedList.push('Location');
          diffs.push({ field: 'Location', from: matched.location || '(Empty)', to: incoming.location });
          fieldUpdatesSummary.locationUpdated++;
        }
        if ((!matched.area || matched.area === '') && incoming.area) {
          updateFields.area = incoming.area;
          changedList.push('Area');
          diffs.push({ field: 'Area', from: matched.area || '(Empty)', to: incoming.area });
        }
        if ((!matched.address || matched.address === '') && incoming.address) {
          updateFields.address = incoming.address;
          changedList.push('Address');
          diffs.push({ field: 'Address', from: matched.address || '(Empty)', to: incoming.address });
        }

        // Update Active Days if new has higher/newer count
        if (incoming.activeDays > 0 && (!matched.activeDays || incoming.activeDays > matched.activeDays)) {
          updateFields.activeDays = incoming.activeDays;
          changedList.push('Active Days');
          diffs.push({ field: 'Active Days', from: String(matched.activeDays || 0), to: String(incoming.activeDays) });
          fieldUpdatesSummary.activeDaysUpdated++;
        }

        // Update Last Online if incoming has newer date
        if (incoming.lastActive) {
          const incomingDate = new Date(incoming.lastActive);
          const existingDate = matched.lastActive ? new Date(matched.lastActive) : new Date(0);
          if (incomingDate > existingDate) {
            updateFields.lastActive = incomingDate;
            changedList.push('Last Online');
            diffs.push({
              field: 'Last Online',
              from: matched.lastActive ? new Date(matched.lastActive).toISOString().split('T')[0] : '(None)',
              to: incomingDate.toISOString().split('T')[0],
            });
            fieldUpdatesSummary.lastActiveUpdated++;
          }
        }

        // Merge Tags / Labels into existing matched record
        if (incoming.tags && incoming.tags.length > 0) {
          const currentTags: string[] = Array.isArray(matched.tags) ? matched.tags : [];
          const newTagsToAdd = incoming.tags.filter((t: string) => !currentTags.includes(t));
          if (newTagsToAdd.length > 0) {
            updateFields.tags = [...currentTags, ...newTagsToAdd];
            changedList.push(`Tag: ${newTagsToAdd.join(', ')}`);
            diffs.push({
              field: 'Tag / Label',
              from: currentTags.length > 0 ? currentTags.join(', ') : '(None)',
              to: newTagsToAdd.join(', '),
            });
            fieldUpdatesSummary.tagsUpdated += newTagsToAdd.length;
          }
        }

        // Merge Category if missing
        if ((!matched.category || matched.category === '') && incoming.category) {
          updateFields.category = incoming.category;
          changedList.push('Category');
          diffs.push({ field: 'Category', from: '(None)', to: incoming.category });
        }

        // Merge Custom Fields without overwriting existing custom keys
        const incomingCustomKeys = Object.keys(incoming.customFields || {});
        if (incomingCustomKeys.length > 0) {
          const mergedCustom = { ...(matched.customFields || {}), ...(incoming.customFields || {}) };
          updateFields.customFields = mergedCustom;
          changedList.push('Custom Attributes');
          fieldUpdatesSummary.customFieldsUpdated += incomingCustomKeys.length;
        }

        if (Object.keys(updateFields).length > 0) {
          bulkUpdateOps.push({
            updateOne: {
              filter: { _id: matched._id },
              update: { $set: updateFields },
            },
          });
          updatedCount++;

          if (auditSample.length < 300) {
            auditSample.push({
              rowNumber: rowNum,
              identifier: incoming.phone || incoming.email || incoming.name,
              name: incoming.name || matched.name,
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
              identifier: incoming.phone || incoming.email || incoming.name,
              name: incoming.name || matched.name,
              status: 'unchanged',
              updatedFields: [],
              changes: [],
            });
          }
        }
      } else {
        // Brand new record - tag with datasetId
        incoming.datasetId = datasetId;
        newRecordsToInsert.push(incoming);
        newCount++;

        if (auditSample.length < 300) {
          auditSample.push({
            rowNumber: rowNum,
            identifier: incoming.phone || incoming.email || incoming.name,
            name: incoming.name,
            status: 'new',
            updatedFields: ['New Contact Added'],
            changes: [
              { field: 'Contact Phone', from: '(None)', to: incoming.phone || 'N/A' },
              { field: 'Gender / Age', from: '(None)', to: `${incoming.gender || 'N/A'} / ${incoming.age || 'N/A'}` },
              { field: 'Location', from: '(None)', to: incoming.location || 'N/A' },
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
      description: `Uploaded "${filename || 'file'}" with ${validRecords.length.toLocaleString()} rows (${newCount.toLocaleString()} new, ${updatedCount.toLocaleString()} merged, ${unchangedCount.toLocaleString()} duplicate)${skippedCount > 0 ? ` [${skippedCount} empty rows skipped]` : ''}`,
      user: uploaderName,
      type: 'upload',
    });

    // Trigger background auto-archival for any new external avatar URLs
    (async () => {
      try {
        const pendingDocs = await RecordModel.find({
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
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process dataset' },
      { status: 500 }
    );
  }
}
