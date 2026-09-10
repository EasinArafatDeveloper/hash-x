import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import ActivityLogModel from '@/lib/models/ActivityLog';
import DownloadHistoryModel from '@/lib/models/DownloadHistory';
import { getSessionUser } from '@/lib/auth';
import { buildPhonePrefixRegex } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search') || '';
    const datasetId = searchParams.get('datasetId') || '';
    const gender = searchParams.get('gender') || '';
    const minAge = searchParams.get('minAge');
    const maxAge = searchParams.get('maxAge');
    const avatarType = searchParams.get('avatarType') || '';
    const numberStartsWith = searchParams.get('numberStartsWith') || '';
    const maxActiveDays = searchParams.get('maxActiveDays');
    const lastOnlineFrom = searchParams.get('lastOnlineFrom') || '';
    const lastOnlineTo = searchParams.get('lastOnlineTo') || '';
    const status = searchParams.get('status') || '';
    const location = searchParams.get('location') || '';
    const tag = searchParams.get('tag') || '';

    const nameWise = searchParams.get('nameWise') === 'true';
    const numberWise = searchParams.get('numberWise') === 'true';
    const genderWise = searchParams.get('genderWise') === 'true';
    const ageWise = searchParams.get('ageWise') === 'true';
    const lastOnlineWise = searchParams.get('lastOnlineWise') === 'true';
    const avatarTypeWise = searchParams.get('avatarTypeWise') === 'true';
    const tagWise = searchParams.get('tagWise') === 'true';

    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Build dynamic query
    const query: any = {};

    // 1. SMART OMNISEARCH
    if (search.trim()) {
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
        if (genderWise) {
          targetedConditions.push({ gender: searchRegex });
        }
        if (ageWise) {
          const numVal = parseInt(rawSearch, 10);
          if (!isNaN(numVal)) targetedConditions.push({ age: numVal });
        }
        if (avatarTypeWise) {
          targetedConditions.push({ avatarType: searchRegex });
        }
        if (tagWise) {
          targetedConditions.push({ tags: searchRegex });
          targetedConditions.push({ category: searchRegex });
          targetedConditions.push({ 'customFields.Tag / Label': searchRegex });
        }
        if (targetedConditions.length > 0) {
          query.$or = targetedConditions;
        }
      } else {
        // Universal Smart Omnisearch: Searches across Name, Phone, Email, Location, Address, Merchant, and Tags
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

    // 1.5. Dataset / Uploaded File filter
    if (datasetId && datasetId !== 'All') {
      query.datasetId = datasetId;
    }

    // 1.6. Tag / Category filter
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

    // 1.7. Merchant filter
    const merchant = searchParams.get('merchant');
    if (merchant && merchant !== 'All') {
      const mRegex = new RegExp(merchant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query['customFields.primary_merchant'] = mRegex;
    }

    // 1.8. Spend / Order Amount range filter
    const minOrderAmount = searchParams.get('minOrderAmount');
    const maxOrderAmount = searchParams.get('maxOrderAmount');
    if (minOrderAmount || maxOrderAmount) {
      query.orderAmount = {};
      if (minOrderAmount && !isNaN(parseFloat(minOrderAmount))) query.orderAmount.$gte = parseFloat(minOrderAmount);
      if (maxOrderAmount && !isNaN(parseFloat(maxOrderAmount))) query.orderAmount.$lte = parseFloat(maxOrderAmount);
    }

    // 1.9. Order count range filter
    const minOrderCount = searchParams.get('minOrderCount');
    const maxOrderCount = searchParams.get('maxOrderCount');
    if (minOrderCount || maxOrderCount) {
      query.orderCount = {};
      if (minOrderCount && !isNaN(parseInt(minOrderCount, 10))) query.orderCount.$gte = parseInt(minOrderCount, 10);
      if (maxOrderCount && !isNaN(parseInt(maxOrderCount, 10))) query.orderCount.$lte = parseInt(maxOrderCount, 10);
    }

    // 2. Gender filter
    if (gender && gender !== 'All') {
      query.gender = gender;
    }

    // 3. Avatar Type filter
    if (avatarType && avatarType !== 'All') {
      query.avatarType = avatarType;
    }

    // 4. Age range filter
    if (minAge || maxAge) {
      query.age = {};
      if (minAge) query.age.$gte = parseInt(minAge, 10);
      if (maxAge) query.age.$lte = parseInt(maxAge, 10);
    }

    // 5. Number starts with (e.g. 88017 / 017 / 88018 / 018)
    if (numberStartsWith && numberStartsWith.trim()) {
      const prefixRegexStr = buildPhonePrefixRegex(numberStartsWith);
      if (prefixRegexStr) {
        query.phone = { $regex: prefixRegexStr };
      }
    }

    // 6. Active days <=
    if (maxActiveDays && !isNaN(parseInt(maxActiveDays, 10))) {
      query.activeDays = { $lte: parseInt(maxActiveDays, 10) };
    }

    // 7. Last online date range
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

    const skip = (page - 1) * limit;

    const [records, totalMatching, totalDatasetRecords, activeCount, inactiveCount, pendingCount] =
      await Promise.all([
        RecordModel.find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
        RecordModel.countDocuments(query),
        RecordModel.countDocuments({}),
        RecordModel.countDocuments({ ...query, status: 'Active' }),
        RecordModel.countDocuments({ ...query, status: 'Inactive' }),
        RecordModel.countDocuments({ ...query, status: 'Pending' }),
      ]);

    // Average age calculation for matching records
    const ageAggregation = await RecordModel.aggregate([
      { $match: query },
      { $group: { _id: null, avgAge: { $avg: '$age' } } },
    ]);
    const avgAge = ageAggregation.length > 0 ? Math.round(ageAggregation[0].avgAge || 0) : 0;

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1,
      },
      summaryStats: {
        totalRecords: totalDatasetRecords,
        filteredRecords: totalMatching,
        activeCount,
        inactiveCount,
        pendingCount,
        avgAge,
      },
    });
  } catch (error: any) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data records', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin privileges required to reset system database.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    await RecordModel.deleteMany({});
    await DatasetModel.deleteMany({});
    await ActivityLogModel.deleteMany({});
    await DownloadHistoryModel.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'All datasets, activity, and history cleared successfully. App is 100% fresh.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
