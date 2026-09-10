import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DownloadHistoryModel from '@/lib/models/DownloadHistory';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';
import { buildPhonePrefixRegex } from '@/lib/phone';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

function sanitizeCsvField(val: any): any {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^[=\+\-@\t\r]/.test(trimmed)) {
      return `'${val}`;
    }
  }
  return val ?? '';
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      search,
      datasetId,
      tag,
      gender,
      minAge,
      maxAge,
      avatarType,
      numberStartsWith,
      maxActiveDays,
      lastOnlineFrom,
      lastOnlineTo,
      nameWise,
      numberWise,
      genderWise,
      ageWise,
      lastOnlineWise,
      avatarTypeWise,
      tagWise,
    } = body || {};

    const query: any = {};

    // 1. SMART OMNISEARCH FOR EXPORT
    if (search && search.trim()) {
      const rawSearch = search.trim();
      const cleanPhoneSearch = rawSearch.replace(/[\s\+\-\(\)]/g, '');
      const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');

      const isTargeted =
        (nameWise && (numberWise || genderWise || ageWise || lastOnlineWise || avatarTypeWise || tagWise)) ||
        numberWise ||
        genderWise ||
        ageWise ||
        lastOnlineWise ||
        avatarTypeWise ||
        tagWise;

      if (isTargeted) {
        const targetedConditions: any[] = [];
        if (nameWise) {
          targetedConditions.push({ name: searchRegex });
          targetedConditions.push({ 'customFields.nickname': searchRegex });
        }
        if (numberWise) {
          targetedConditions.push({ phone: new RegExp(cleanPhoneSearch || escaped, 'i') });
        }
        if (genderWise) targetedConditions.push({ gender: searchRegex });
        if (ageWise) {
          const numVal = parseInt(rawSearch, 10);
          if (!isNaN(numVal)) targetedConditions.push({ age: numVal });
        }
        if (avatarTypeWise) targetedConditions.push({ avatarType: searchRegex });
        if (tagWise) {
          targetedConditions.push({ tags: searchRegex });
          targetedConditions.push({ category: searchRegex });
          targetedConditions.push({ 'customFields.Tag / Label': searchRegex });
        }
        if (targetedConditions.length > 0) {
          query.$or = targetedConditions;
        }
      } else {
        const orConditions: any[] = [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { location: searchRegex },
          { area: searchRegex },
          { tags: searchRegex },
          { category: searchRegex },
          { 'customFields.nickname': searchRegex },
          { 'customFields.Tag / Label': searchRegex },
        ];

        if (cleanPhoneSearch && /\d/.test(cleanPhoneSearch)) {
          orConditions.push({ phone: new RegExp(cleanPhoneSearch, 'i') });
        }

        query.$or = orConditions;
      }
    }

    if (datasetId && datasetId !== 'All') query.datasetId = datasetId;

    if (tag && tag !== 'All') {
      const tagRegex = new RegExp(`^${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { tags: tagRegex },
          { category: tagRegex },
          { 'customFields.Tag / Label': tagRegex },
          { 'customFields.Tags / Labels': tagRegex },
          { 'customFields.tag': tagRegex },
          { 'customFields.tags': tagRegex },
        ],
      });
    }
    if (gender && gender !== 'All') query.gender = gender;
    if (avatarType && avatarType !== 'All') query.avatarType = avatarType;

    if (minAge || maxAge) {
      query.age = {};
      if (minAge) query.age.$gte = parseInt(minAge, 10);
      if (maxAge) query.age.$lte = parseInt(maxAge, 10);
    }

    if (numberStartsWith && numberStartsWith.trim()) {
      const prefixRegexStr = buildPhonePrefixRegex(numberStartsWith);
      if (prefixRegexStr) {
        query.phone = { $regex: prefixRegexStr };
      }
    }

    if (maxActiveDays && !isNaN(parseInt(maxActiveDays, 10))) {
      query.activeDays = { $lte: parseInt(maxActiveDays, 10) };
    }

    if (lastOnlineFrom || lastOnlineTo) {
      query.lastActive = {};
      if (lastOnlineFrom) {
        const fromDate = new Date(lastOnlineFrom);
        fromDate.setHours(0, 0, 0, 0);
        query.lastActive.$gte = fromDate;
      }
      if (lastOnlineTo) {
        const toDate = new Date(lastOnlineTo);
        toDate.setHours(23, 59, 59, 999);
        query.lastActive.$lte = toDate;
      }
    }

    const session = await getSessionUser();
    const currentUser = session?.name || session?.username || 'Administrator';

    const matchingRecords = await RecordModel.find(query).lean();

    // Map records to clean, formula-injection-safe CSV columns including dynamic customFields
    const csvData = matchingRecords.map((rec: any) => {
      const baseRow: Record<string, any> = {
        'Phone / Mobile': sanitizeCsvField(rec.phone),
        'Customer Name': sanitizeCsvField(rec.name),
        'Canonical Address': sanitizeCsvField(rec.address || ''),
        Gender: sanitizeCsvField(rec.gender),
        Email: sanitizeCsvField(rec.email),
        Age: rec.age || '',
        'Order Amount (BDT)': rec.orderAmount || 0,
        'Order Count': rec.orderCount || 0,
        Location: sanitizeCsvField(rec.location || ''),
        Area: sanitizeCsvField(rec.area || ''),
        Status: sanitizeCsvField(rec.status || 'Active'),
        'Tags / Segments': sanitizeCsvField(rec.tags && rec.tags.length > 0 ? rec.tags.join(', ') : rec.category || ''),
      };

      // Dynamically attach all custom attributes uploaded by the user
      if (rec.customFields && typeof rec.customFields === 'object') {
        Object.entries(rec.customFields).forEach(([k, v]) => {
          if (v !== null && v !== undefined && k !== 'Tags / Labels') {
            baseRow[k] = sanitizeCsvField(v);
          }
        });
      }

      baseRow['Created At'] = rec.createdAt ? new Date(rec.createdAt).toISOString().split('T')[0] : '';
      return baseRow;
    });

    const csvString = Papa.unparse(csvData);
    const filename = `filtered-data-${matchingRecords.length}.csv`;

    const appliedFiltersList: string[] = [];
    if (search) appliedFiltersList.push(`Search: "${search}"`);
    if (tag && tag !== 'All') appliedFiltersList.push(`Tag: ${tag}`);
    if (gender && gender !== 'All') appliedFiltersList.push(`Gender: ${gender}`);
    if (avatarType && avatarType !== 'All') appliedFiltersList.push(`Avatar: ${avatarType}`);
    if (minAge || maxAge) appliedFiltersList.push(`Age: ${minAge || 18}-${maxAge || 65}`);
    if (numberStartsWith) appliedFiltersList.push(`Prefix: ${numberStartsWith}`);
    if (maxActiveDays) appliedFiltersList.push(`Active Days ≤ ${maxActiveDays}`);
    if (lastOnlineFrom || lastOnlineTo)
      appliedFiltersList.push(`Online: ${lastOnlineFrom || 'start'} to ${lastOnlineTo || 'now'}`);

    const filtersAppliedSummary =
      appliedFiltersList.length > 0 ? appliedFiltersList.join(' + ') : 'All Records (No Filters)';

    await DownloadHistoryModel.create({
      filename,
      recordCount: matchingRecords.length,
      filtersApplied: filtersAppliedSummary,
      status: 'Ready',
    });

    await ActivityLogModel.create({
      action: 'CSV Exported',
      description: `Exported ${matchingRecords.length.toLocaleString()} matching records (${filtersAppliedSummary})`,
      user: currentUser,
      type: 'export',
    });

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV export', message: error.message },
      { status: 500 }
    );
  }
}
