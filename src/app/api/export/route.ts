import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DownloadHistoryModel from '@/lib/models/DownloadHistory';
import ActivityLogModel from '@/lib/models/ActivityLog';
import { getSessionUser } from '@/lib/auth';
import { buildPhonePrefixRegex } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow long-running streaming for 100k+ rows

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Prevent CSV Formula Injection in Excel/Google Sheets
  const trimmed = str.trim();
  if (/^[=\+\-@\t\r]/.test(trimmed)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

async function handleExportLogic(body: any) {
  await connectToDatabase();

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
    minOrderAmount,
    maxOrderAmount,
    minOrderCount,
    maxOrderCount,
    merchant,
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
  if (search && String(search).trim()) {
    const rawSearch = String(search).trim();
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
        targetedConditions.push({ 'customFields.customer_name': searchRegex });
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
        targetedConditions.push({ 'customFields.Tags / Labels': searchRegex });
        targetedConditions.push({ 'customFields.tag': searchRegex });
        targetedConditions.push({ 'customFields.tags': searchRegex });
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
        { address: searchRegex },
        { tags: searchRegex },
        { category: searchRegex },
        { 'customFields.nickname': searchRegex },
        { 'customFields.customer_name': searchRegex },
        { 'customFields.canonical_address': searchRegex },
        { 'customFields.primary_merchant': searchRegex },
        { 'customFields.matched_district_filters': searchRegex },
        { 'customFields.matched_city_filters': searchRegex },
        { 'customFields.matched_area_filters': searchRegex },
        { 'customFields.Tag / Label': searchRegex },
        { 'customFields.Tags / Labels': searchRegex },
        { 'customFields.tag': searchRegex },
        { 'customFields.tags': searchRegex },
      ];

      if (cleanPhoneSearch && /\d/.test(cleanPhoneSearch)) {
        orConditions.push({ phone: new RegExp(cleanPhoneSearch, 'i') });
      }

      query.$or = orConditions;
    }
  }

  if (datasetId && datasetId !== 'All') query.datasetId = datasetId;

  if (tag && tag !== 'All') {
    const tagRegex = new RegExp(`^${String(tag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
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

  // Merchant filter
  if (merchant && merchant !== 'All') {
    const mRegex = new RegExp(String(merchant).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query['customFields.primary_merchant'] = mRegex;
  }

  // Spend / Order Amount range filter
  if (minOrderAmount || maxOrderAmount) {
    query.orderAmount = {};
    if (minOrderAmount && !isNaN(parseFloat(String(minOrderAmount)))) query.orderAmount.$gte = parseFloat(String(minOrderAmount));
    if (maxOrderAmount && !isNaN(parseFloat(String(maxOrderAmount)))) query.orderAmount.$lte = parseFloat(String(maxOrderAmount));
  }

  // Order count range filter
  if (minOrderCount || maxOrderCount) {
    query.orderCount = {};
    if (minOrderCount && !isNaN(parseInt(String(minOrderCount), 10))) query.orderCount.$gte = parseInt(String(minOrderCount), 10);
    if (maxOrderCount && !isNaN(parseInt(String(maxOrderCount), 10))) query.orderCount.$lte = parseInt(String(maxOrderCount), 10);
  }

  if (gender && gender !== 'All') query.gender = gender;
  if (avatarType && avatarType !== 'All') query.avatarType = avatarType;

  if (minAge || maxAge) {
    query.age = {};
    if (minAge) query.age.$gte = parseInt(String(minAge), 10);
    if (maxAge) query.age.$lte = parseInt(String(maxAge), 10);
  }

  if (numberStartsWith && String(numberStartsWith).trim()) {
    const prefixRegexStr = buildPhonePrefixRegex(String(numberStartsWith));
    if (prefixRegexStr) {
      query.phone = { $regex: prefixRegexStr };
    }
  }

  if (maxActiveDays && !isNaN(parseInt(String(maxActiveDays), 10))) {
    query.activeDays = { $lte: parseInt(String(maxActiveDays), 10) };
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

  // Fast total count using indexed query
  const totalCount = await RecordModel.countDocuments(query);
  const filename = `morpheus-data-${totalCount}.csv`;

  const appliedFiltersList: string[] = [];
  if (search) appliedFiltersList.push(`Search: "${search}"`);
  if (tag && tag !== 'All') appliedFiltersList.push(`Tag: ${tag}`);
  if (gender && gender !== 'All') appliedFiltersList.push(`Gender: ${gender}`);
  if (avatarType && avatarType !== 'All') appliedFiltersList.push(`Avatar: ${avatarType}`);
  if (minAge || maxAge) appliedFiltersList.push(`Age: ${minAge || 18}-${maxAge || 65}`);
  if (numberStartsWith) appliedFiltersList.push(`Prefix: ${numberStartsWith}`);
  if (merchant && merchant !== 'All') appliedFiltersList.push(`Merchant: ${merchant}`);
  if (minOrderAmount || maxOrderAmount) appliedFiltersList.push(`Spend: ৳${minOrderAmount || '0'}–৳${maxOrderAmount || '∞'}`);
  if (minOrderCount || maxOrderCount) appliedFiltersList.push(`Orders: ${minOrderCount || '0'}–${maxOrderCount || '∞'}`);
  if (maxActiveDays) appliedFiltersList.push(`Active Days ≤ ${maxActiveDays}`);
  if (lastOnlineFrom || lastOnlineTo)
    appliedFiltersList.push(`Online: ${lastOnlineFrom || 'start'} to ${lastOnlineTo || 'now'}`);

  const filtersAppliedSummary =
    appliedFiltersList.length > 0 ? appliedFiltersList.join(' + ') : 'All Records (No Filters)';

  // Log download history & activity asynchronously
  DownloadHistoryModel.create({
    filename,
    recordCount: totalCount,
    filtersApplied: filtersAppliedSummary,
    status: 'Ready',
  }).catch(() => {});

  ActivityLogModel.create({
    action: 'CSV Exported',
    description: `Exported ${totalCount.toLocaleString()} matching records (${filtersAppliedSummary})`,
    user: currentUser,
    type: 'export',
  }).catch(() => {});

  // High-speed CSV Header row (Exact 21 business fields + standard metadata)
  const headers = [
    'Phone / Mobile',
    'Customer Name',
    'Canonical Address',
    'Gender',
    'Email',
    'Age',
    'Order Amount (BDT)',
    'Order Count',
    'Location',
    'Area',
    'Status',
    'Tags / Segments',
    'WhatsApp Status',
    'Matched Order Count',
    'Lifetime Order Count',
    'Matched Net Order Amount BDT',
    'Lifetime Net Order Amount BDT',
    'Prepaid Order Count',
    'Matched Unique Merchant Count',
    'Lifetime Unique Merchant Count',
    'Primary Merchant',
    'Matched District Filters',
    'Matched City Filters',
    'Matched Area Filters',
    'Matched Block Road Filters',
    'Inferred Primary Area',
    'Lifetime Frequency Segment',
    'Lifetime Value Segment',
    'Lifetime Primary Category',
    'Created At',
  ];

  // High-Speed Stream Processor using Cursor (Batch size 3500 for maximum throughput)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send UTF-8 BOM for Excel Unicode support + Header Row
        controller.enqueue(encoder.encode('\uFEFF' + headers.map(escapeCsvCell).join(',') + '\r\n'));

        const cursor = RecordModel.find(query).select('-__v').lean().cursor({ batchSize: 3500 });
        let buffer = '';

        for await (const doc of cursor) {
          const rec = doc as any;
          const cf = rec.customFields || {};

          const row = [
            escapeCsvCell(rec.phone || ''),
            escapeCsvCell(rec.name || ''),
            escapeCsvCell(rec.address || ''),
            escapeCsvCell(rec.gender || 'Other'),
            escapeCsvCell(rec.email || ''),
            escapeCsvCell(rec.age || ''),
            escapeCsvCell(rec.orderAmount ?? cf['matched_net_order_amount_bdt'] ?? cf['Order Amount'] ?? 0),
            escapeCsvCell(rec.orderCount ?? cf['matched_order_count'] ?? cf['Order Count'] ?? 0),
            escapeCsvCell(rec.location || ''),
            escapeCsvCell(rec.area || ''),
            escapeCsvCell(rec.status || 'Active'),
            escapeCsvCell(rec.tags && rec.tags.length > 0 ? rec.tags.join(', ') : rec.category || ''),
            escapeCsvCell(cf['whatsapp_status'] || cf['WhatsApp Status'] || ''),
            escapeCsvCell(cf['matched_order_count'] || cf['Matched Order Count'] || ''),
            escapeCsvCell(cf['lifetime_order_count'] || cf['Lifetime Order Count'] || rec.orderCount || ''),
            escapeCsvCell(cf['matched_net_order_amount_bdt'] || cf['Matched Order Amount BDT'] || ''),
            escapeCsvCell(cf['lifetime_net_order_amount_bdt'] || cf['Lifetime Order Amount BDT'] || rec.orderAmount || ''),
            escapeCsvCell(cf['prepaid_order_count'] || cf['Prepaid Order Count'] || ''),
            escapeCsvCell(cf['matched_unique_merchant_count'] || cf['Matched Unique Merchant Count'] || ''),
            escapeCsvCell(cf['lifetime_unique_merchant_count'] || cf['Lifetime Unique Merchant Count'] || ''),
            escapeCsvCell(cf['primary_merchant'] || cf['Primary Merchant'] || ''),
            escapeCsvCell(cf['matched_district_filters'] || cf['Matched District'] || ''),
            escapeCsvCell(cf['matched_city_filters'] || cf['Matched City'] || ''),
            escapeCsvCell(cf['matched_area_filters'] || cf['Matched Area'] || ''),
            escapeCsvCell(cf['matched_block_road_filters'] || cf['Matched Block / Road'] || ''),
            escapeCsvCell(cf['inferred_primary_area'] || cf['Inferred Primary Area'] || ''),
            escapeCsvCell(cf['lifetime_frequency_segment'] || cf['Frequency Segment'] || ''),
            escapeCsvCell(cf['lifetime_value_segment'] || cf['Value Segment'] || ''),
            escapeCsvCell(cf['lifetime_primary_category'] || cf['Primary Category'] || rec.category || ''),
            escapeCsvCell(rec.createdAt ? new Date(rec.createdAt).toISOString().split('T')[0] : ''),
          ];

          buffer += row.join(',') + '\r\n';

          // Flush chunk when buffer reaches 32KB
          if (buffer.length >= 32768) {
            controller.enqueue(encoder.encode(buffer));
            buffer = '';
          }
        }

        // Flush remaining buffer
        if (buffer.length > 0) {
          controller.enqueue(encoder.encode(buffer));
        }

        controller.close();
      } catch (streamErr) {
        console.error('CSV Stream error:', streamErr);
        controller.error(streamErr);
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData().catch(() => new FormData());
      const rawPayload = formData.get('payload');
      if (rawPayload && typeof rawPayload === 'string') {
        try {
          body = JSON.parse(rawPayload);
        } catch {
          body = {};
        }
      } else {
        for (const [key, value] of formData.entries()) {
          body[key] = value;
        }
      }
    }

    return await handleExportLogic(body);
  } catch (error: any) {
    console.error('Export CSV error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV export', message: error.message },
      { status: 500 }
    );
  }
}
