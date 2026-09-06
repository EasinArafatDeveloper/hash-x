import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';

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
        Object.keys(row).forEach((key) => {
          const targetField = columnMapping[key];
          const val = row[key];
          if (val === null || val === undefined || String(val).trim() === '') return;

          if (targetField === 'skip') return;

          if (targetField === 'phone') {
            normalizedRow.phone = String(val).trim();
          } else if (targetField === 'name') {
            normalizedRow.name = String(val).trim();
          } else if (targetField === 'email') {
            normalizedRow.email = String(val).trim();
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
          } else if (targetField === 'age') {
            const num = parseInt(String(val), 10);
            if (!isNaN(num)) normalizedRow.age = num;
          } else if (targetField === 'gender') {
            const gStr = String(val).trim().toLowerCase();
            if (gStr.startsWith('m')) normalizedRow.gender = 'Male';
            else if (gStr.startsWith('f')) normalizedRow.gender = 'Female';
            else normalizedRow.gender = 'Other';
          } else if (targetField === 'location') {
            normalizedRow.location = String(val).trim();
          } else if (targetField === 'area') {
            normalizedRow.area = String(val).trim();
          } else if (targetField === 'address') {
            normalizedRow.address = String(val).trim();
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
            if (nameStr && !normalizedRow.name) normalizedRow.name = nameStr;
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
          } else if (lowerKey === 'age' || lowerKey === 'years') {
            const numAge = parseInt(val, 10);
            if (!isNaN(numAge)) normalizedRow.age = numAge;
          } else if (lowerKey === 'gender' || lowerKey === 'sex') {
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
          } else if (lowerKey === 'activedays' || lowerKey === 'days' || lowerKey === 'active' || lowerKey === 'activeday') {
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
          } else if (lowerKey === 'area' || lowerKey === 'thana' || lowerKey === 'zone') {
            normalizedRow.area = String(val || '').trim();
          } else if (lowerKey === 'address' || lowerKey === 'fulladdress') {
            normalizedRow.address = String(val || '').trim();
          } else if (lowerKey === 'status' || lowerKey === 'state') {
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
          } else if (lowerKey === 'category' || lowerKey === 'group' || lowerKey === 'segment') {
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
          normalizedRow.name = `Record #${chunkIndex * 2500 + idx + 1}`;
        }
      }

      // Check for image URLs
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
      return NextResponse.json({
        success: true,
        chunkIndex,
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        skippedCount,
      });
    }

    // 1. High-Speed Targeted Index Lookups using B-Tree Projected Index Queries
    const incomingPhones = validRecords.map((r) => r.phone).filter(Boolean);
    const incomingEmails = validRecords.map((r) => r.email).filter(Boolean);

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

    const matchedDocIds = new Set<string>();
    const batchSeenKeys = new Set<string>();

    validRecords.forEach((incoming) => {
      // Check intra-batch duplicate
      const dedupKey = incoming.phone || incoming.email || '';
      if (dedupKey && batchSeenKeys.has(dedupKey)) {
        unchangedCount++;
        return;
      }
      if (dedupKey) {
        batchSeenKeys.add(dedupKey);
      }

      const matched =
        (incoming.phone ? phoneMap.get(incoming.phone) : null) ||
        (incoming.email ? emailMap.get(incoming.email) : null);

      if (matched && !matchedDocIds.has(matched._id.toString())) {
        matchedDocIds.add(matched._id.toString());
        const updateFields: any = {};

        if ((!matched.email || matched.email === '') && incoming.email) {
          updateFields.email = incoming.email;
        }
        if (incoming.name && (!matched.name || matched.name.startsWith('User (')) && !incoming.name.startsWith('User (')) {
          updateFields.name = incoming.name;
        }
        if ((!matched.phone || matched.phone === '') && incoming.phone) {
          updateFields.phone = incoming.phone;
        }
        if ((!matched.age || matched.age === 0) && incoming.age > 0) {
          updateFields.age = incoming.age;
        }
        if ((!matched.gender || matched.gender === 'Other') && incoming.gender && incoming.gender !== 'Other') {
          updateFields.gender = incoming.gender;
        }
        if ((!matched.avatarUrl || matched.avatarUrl === '') && incoming.avatarUrl) {
          updateFields.avatarUrl = incoming.avatarUrl;
          updateFields.avatarType = 'With Avatar';
        }
        if ((!matched.location || matched.location === '') && incoming.location) {
          updateFields.location = incoming.location;
        }
        if ((!matched.area || matched.area === '') && incoming.area) {
          updateFields.area = incoming.area;
        }
        if ((!matched.address || matched.address === '') && incoming.address) {
          updateFields.address = incoming.address;
        }
        if (incoming.activeDays > 0 && (!matched.activeDays || incoming.activeDays > matched.activeDays)) {
          updateFields.activeDays = incoming.activeDays;
        }
        if (incoming.lastActive) {
          const incomingDate = new Date(incoming.lastActive);
          const existingDate = matched.lastActive ? new Date(matched.lastActive) : new Date(0);
          if (incomingDate > existingDate) {
            updateFields.lastActive = incomingDate;
          }
        }
        if (incoming.tags && incoming.tags.length > 0) {
          const currentTags: string[] = Array.isArray(matched.tags) ? matched.tags : [];
          const newTagsToAdd = incoming.tags.filter((t: string) => !currentTags.includes(t));
          if (newTagsToAdd.length > 0) {
            updateFields.tags = [...currentTags, ...newTagsToAdd];
          }
        }
        if ((!matched.category || matched.category === '') && incoming.category) {
          updateFields.category = incoming.category;
        }
        const incomingCustomKeys = Object.keys(incoming.customFields || {});
        if (incomingCustomKeys.length > 0) {
          updateFields.customFields = { ...(matched.customFields || {}), ...(incoming.customFields || {}) };
        }

        if (Object.keys(updateFields).length > 0) {
          bulkUpdateOps.push({
            updateOne: {
              filter: { _id: matched._id },
              update: { $set: updateFields },
            },
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        incoming.datasetId = datasetId;
        newRecordsToInsert.push(incoming);
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
      processedInChunk: validRecords.length,
    });
  } catch (error: any) {
    console.error('Upload chunk error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chunk' },
      { status: 500 }
    );
  }
}
