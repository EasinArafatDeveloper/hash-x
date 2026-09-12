import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import { buildPhonePrefixRegex } from '@/lib/phone';
import { callAIModel } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages = [], question = '' } = body || {};

    const lastMessage = question || (messages.length > 0 ? messages[messages.length - 1].content : '');
    if (!lastMessage || !String(lastMessage).trim()) {
      return NextResponse.json({ error: 'Question / message is required' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. DYNAMIC USER INTENT & MULTI-TURN CONVERSATION MEMORY EXTRACTION
    const parsedIntent = parseQueryIntent(lastMessage, messages);

    // ==========================================
    // 2. DIRECT AI DATABASE ACTION EXECUTION (DELETE / UPDATE / CRUD)
    // ==========================================
    if (parsedIntent.action === 'delete') {
      let targetQuery: any = null;
      if (parsedIntent.targetPhone) {
        const cleanP = parsedIntent.targetPhone.replace(/[^0-9]/g, '');
        targetQuery = { phone: { $regex: cleanP } };
      } else if (parsedIntent.search) {
        const sRegex = new RegExp(parsedIntent.search, 'i');
        targetQuery = {
          $or: [
            { name: sRegex },
            { phone: sRegex },
            { 'customFields.nickname': sRegex },
            { 'customFields.customer_name': sRegex },
          ],
        };
      }

      if (targetQuery) {
        const recordToDelete = await RecordModel.findOne(targetQuery).lean();
        if (recordToDelete) {
          await RecordModel.findByIdAndDelete(recordToDelete._id);
          const totalRemaining = await RecordModel.countDocuments({});

          const reply = `🗑️ **কাস্টমার রেকর্ড সফলভাবে ডাটাবেজ থেকে মুছে ফেলা হয়েছে (Deleted)!**

**মুছে ফেলা রেকর্ডের বিবরণ:**
- 👤 **নাম:** **${recordToDelete.name || 'Unnamed Client'}**
- 📱 **ফোন নম্বর:** \`${recordToDelete.phone || 'N/A'}\`
- 📦 **মোট অর্ডার:** **${recordToDelete.orderCount || 0}** টি
- 💰 **মোট স্পেন্ড:** **৳${Number(recordToDelete.orderAmount || 0).toLocaleString()}** BDT
- 📍 **লোকেশন:** ${recordToDelete.location || recordToDelete.area || 'Dhaka'}
- 🏪 **মার্চেন্ট:** ${recordToDelete.customFields?.primary_merchant || 'Direct / Store'}

> ℹ️ আপনার ডাটাবেজে এখন মোট **${totalRemaining.toLocaleString()} জন** কাস্টমারের ডাটা সংরক্ষিত রয়েছে।`;

          return NextResponse.json({
            success: true,
            actionExecuted: 'delete',
            deletedRecord: {
              id: recordToDelete._id,
              name: recordToDelete.name,
              phone: recordToDelete.phone,
            },
            result: {
              type: 'data_query',
              reply,
              exportPayload: { limit: 15 },
              exportLabel: `Download All Records CSV (${totalRemaining.toLocaleString()} rows)`,
              explorerPath: `/data/explorer`,
              keyMetrics: [
                { label: 'অ্যাকশন সম্পন্ন', value: 'মুছে ফেলা হয়েছে', subtext: 'Record Deleted' },
                { label: 'অবশিষ্ট ডাটাবেজ', value: `${totalRemaining.toLocaleString()} জন`, subtext: 'Active Records' },
              ],
              suggestedActions: [
                { label: '🎯 View Database in Explorer', path: '/data/explorer' },
              ],
              followUpQuestions: [
                'অন্য কোনো কাস্টমার রেকর্ড মুছে ফেলতে বা আপডেট করতে চান?',
                'বর্তমান ডাটাবেজের টপ ক্রেতাদের ওভারভিউ দাও?',
              ],
            },
          });
        } else {
          return NextResponse.json({
            success: true,
            result: {
              type: 'data_query',
              reply: `⚠️ না স্যার, আপনার উল্লেখিত ফোন নম্বর বা নামের কোনো কাস্টমার রেকর্ড ডাটাবেজে খুঁজে পাওয়া যায়নি। মুছে ফেলার জন্য সঠিক ফোন নম্বর দিন।`,
              explorerPath: '/data/explorer',
            },
          });
        }
      }
    }

    if (parsedIntent.action === 'update') {
      let targetQuery: any = null;
      if (parsedIntent.targetPhone) {
        const cleanP = parsedIntent.targetPhone.replace(/[^0-9]/g, '');
        targetQuery = { phone: { $regex: cleanP } };
      } else if (parsedIntent.search) {
        const sRegex = new RegExp(parsedIntent.search, 'i');
        targetQuery = {
          $or: [
            { name: sRegex },
            { phone: sRegex },
            { 'customFields.nickname': sRegex },
            { 'customFields.customer_name': sRegex },
          ],
        };
      }

      if (targetQuery) {
        const recordToUpdate = await RecordModel.findOne(targetQuery).lean();
        if (recordToUpdate) {
          if (parsedIntent.updateFields && Object.keys(parsedIntent.updateFields).length > 0) {
            const updatedDoc = await RecordModel.findByIdAndUpdate(
              recordToUpdate._id,
              { $set: parsedIntent.updateFields },
              { new: true }
            ).lean();

            if (updatedDoc) {
              const changeRows = Object.entries(parsedIntent.updateFields)
                .map(([k, newVal]) => {
                  const oldVal = (recordToUpdate as any)[k] ?? 'N/A';
                  const label = k === 'name' ? 'নাম (Name)' : k === 'location' ? 'লোকেশন (Location)' : k === 'orderCount' ? 'অর্ডার সংখ্যা (Orders)' : k === 'orderAmount' ? 'মোট স্পেন্ড (Spend)' : k === 'tags' ? 'ট্যাগ (Tags)' : k === 'gender' ? 'জেন্ডার (Gender)' : k === 'status' ? 'স্ট্যাটাস (Status)' : k;
                  return `| **${label}** | \`${Array.isArray(oldVal) ? oldVal.join(', ') : oldVal}\` | **\`${Array.isArray(newVal) ? newVal.join(', ') : newVal}\`** |`;
                })
                .join('\n');

              const reply = `✏️ **কাস্টমার তথ্য সফলভাবে ডাটাবেজে আপডেট করা হয়েছে (Updated)!**

**কাস্টমার:** **${updatedDoc.name}** (\`${updatedDoc.phone}\`)

| ফিল্ড | পূর্বের মান | নতুন আপডেট মান |
|---|---|---|
${changeRows}

**আপডেট পরবর্তী বর্তমান প্রোফাইল:**
- 👤 **নাম:** **${updatedDoc.name}**
- 📱 **ফোন নম্বর:** \`${updatedDoc.phone}\`
- 📦 **মোট অর্ডার:** **${updatedDoc.orderCount || 0}** টি
- 💰 **মোট স্পেন্ড:** **৳${Number(updatedDoc.orderAmount || 0).toLocaleString()}** BDT
- 📍 **লোকেশন:** ${updatedDoc.location || updatedDoc.area || 'Dhaka'}
- 🏷️ **ট্যাগ:** ${Array.isArray(updatedDoc.tags) && updatedDoc.tags.length > 0 ? updatedDoc.tags.join(', ') : 'None'}`;

              return NextResponse.json({
                success: true,
                actionExecuted: 'update',
                updatedRecord: updatedDoc,
                result: {
                  type: 'data_query',
                  reply,
                  exportPayload: { search: updatedDoc.phone, limit: 1 },
                  exportLabel: `Download Record CSV`,
                  explorerPath: `/data/explorer?search=${encodeURIComponent(updatedDoc.phone || '')}`,
                  keyMetrics: [
                    { label: 'অ্যাকশন সম্পন্ন', value: 'সফলভাবে আপডেট', subtext: 'Record Updated' },
                    { label: 'কাস্টমার নাম', value: updatedDoc.name, subtext: updatedDoc.phone },
                  ],
                  suggestedActions: [
                    { label: `🎯 View ${updatedDoc.name} in Explorer`, path: `/data/explorer?search=${encodeURIComponent(updatedDoc.phone || '')}` },
                  ],
                  followUpQuestions: [
                    'এই কাস্টমারের আর কোনো ফিল্ড আপডেট বা পরিবর্তন করতে চান?',
                    'এই কাস্টমারের পূর্ববর্তী অর্ডার হিস্ট্রি বিশ্লেষণ করো?',
                  ],
                },
              });
            }
          } else {
            // Interactive guide when no specific update field value is provided yet
            const reply = `✏️ **কাস্টমার তথ্য আপডেট করার জন্য প্রস্তুত!**

**টার্গেট কাস্টমার:** **${recordToUpdate.name || 'Unnamed Client'}** (\`${recordToUpdate.phone || 'N/A'}\`)
- 📍 **বর্তমান লোকেশন:** ${recordToUpdate.location || recordToUpdate.area || 'Dhaka'}
- 📦 **বর্তমান অর্ডার:** **${recordToUpdate.orderCount || 0}** টি
- 💰 **বর্তমান স্পেন্ড:** **৳${Number(recordToUpdate.orderAmount || 0).toLocaleString()}** BDT
- 🏷️ **বর্তমান ট্যাগ:** ${Array.isArray(recordToUpdate.tags) && recordToUpdate.tags.length > 0 ? recordToUpdate.tags.join(', ') : 'None'}

👉 **আপনি কোন ফিল্ডটি কী পরিবর্তন করতে চান? নিচের যেকোনোভাবে লিখুন:**
1. **নাম পরিবর্তন:** \`${recordToUpdate.phone} er name update kore ${recordToUpdate.name} Ahmed dao\`
2. **লোকেশন পরিবর্তন:** \`${recordToUpdate.phone} location change kore Keraniganj koro\`
3. **অর্ডার সংখ্যা:** \`${recordToUpdate.phone} order count 25 koro\`
4. **ট্যাগ যুক্ত:** \`${recordToUpdate.phone} vip tag lagao\`
5. **জেন্ডার:** \`${recordToUpdate.phone} gender Female set koro\``;

            return NextResponse.json({
              success: true,
              actionExecuted: 'update_prompt',
              result: {
                type: 'data_query',
                reply,
                exportPayload: { search: recordToUpdate.phone, limit: 1 },
                exportLabel: `Download Record CSV`,
                explorerPath: `/data/explorer?search=${encodeURIComponent(recordToUpdate.phone || '')}`,
                keyMetrics: [
                  { label: 'টার্গেট কাস্টমার', value: recordToUpdate.name, subtext: recordToUpdate.phone },
                  { label: 'বর্তমান অর্ডার', value: `${recordToUpdate.orderCount || 0} টি`, subtext: `৳${Number(recordToUpdate.orderAmount || 0).toLocaleString()}` },
                ],
                suggestedActions: [
                  { label: `🎯 View ${recordToUpdate.name} in Explorer`, path: `/data/explorer?search=${encodeURIComponent(recordToUpdate.phone || '')}` },
                ],
                followUpQuestions: [
                  `${recordToUpdate.phone} er name update kore ${recordToUpdate.name} Ahmed dao`,
                  `${recordToUpdate.phone} location change kore Keraniganj koro`,
                ],
              },
            });
          }
        } else {
          return NextResponse.json({
            success: true,
            result: {
              type: 'data_query',
              reply: `⚠️ না স্যার, আপনার উল্লেখিত ফোন নম্বর বা নামের কোনো কাস্টমার রেকর্ড ডাটাবেজে খুঁজে পাওয়া যায়নি। আপডেট করার জন্য সঠিক ফোন নম্বর বা নাম উল্লেখ করুন।`,
              explorerPath: '/data/explorer',
            },
          });
        }
      }
    }

    // ==========================================
    // 3. RUN TARGETED LIVE MONGODB READ QUERY FOR THIS SPECIFIC QUESTION
    // ==========================================
    const targetDbQuery: any = {};

    if (!parsedIntent.isConversational && parsedIntent.search) {
      const searchTerms = parsedIntent.search.split('|').map((t: string) => t.trim()).filter(Boolean);
      const searchRegex = new RegExp(searchTerms.map((t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

      if (parsedIntent.searchField === 'name') {
        // STRICT NAME SEARCH: Only match customer name & nickname, never merchant or address
        targetDbQuery.$or = [
          { name: searchRegex },
          { 'customFields.nickname': searchRegex },
          { 'customFields.customer_name': searchRegex },
        ];
      } else if (parsedIntent.searchField === 'address') {
        // ADDRESS / AREA ONLY SEARCH
        targetDbQuery.$or = [
          { location: searchRegex },
          { area: searchRegex },
          { address: searchRegex },
          { 'customFields.canonical_address': searchRegex },
          { 'customFields.matched_district_filters': searchRegex },
          { 'customFields.matched_city_filters': searchRegex },
          { 'customFields.matched_area_filters': searchRegex },
        ];
      } else if (parsedIntent.searchField === 'merchant') {
        // MERCHANT ONLY SEARCH
        targetDbQuery['customFields.primary_merchant'] = searchRegex;
      } else {
        // OMNISEARCH ACROSS PRIMARY USER FIELDS
        targetDbQuery.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { location: searchRegex },
          { area: searchRegex },
          { address: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { 'customFields.nickname': searchRegex },
          { 'customFields.customer_name': searchRegex },
          { 'customFields.canonical_address': searchRegex },
          { 'customFields.primary_merchant': searchRegex },
          { 'customFields.matched_district_filters': searchRegex },
          { 'customFields.matched_city_filters': searchRegex },
          { 'customFields.matched_area_filters': searchRegex },
          { 'customFields.lifetime_primary_category': searchRegex },
          { 'customFields.Tag / Label': searchRegex },
          { 'customFields.Tags / Labels': searchRegex },
        ];
      }
    }

    if (!parsedIntent.isConversational && parsedIntent.tag && parsedIntent.tag !== 'All') {
      const tagRegex = new RegExp(`^${parsedIntent.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      targetDbQuery.$and = targetDbQuery.$and || [];
      targetDbQuery.$and.push({
        $or: [
          { tags: tagRegex },
          { category: tagRegex },
          { 'customFields.Tag / Label': tagRegex },
          { 'customFields.Tags / Labels': tagRegex },
          { 'customFields.tag': tagRegex },
        ],
      });
    }

    if (!parsedIntent.isConversational && parsedIntent.gender && parsedIntent.gender !== 'All') {
      targetDbQuery.gender = parsedIntent.gender;
    }

    // Order Count range / comparisons (min vs max / less than vs greater than)
    if (!parsedIntent.isConversational && (parsedIntent.minOrderCount || parsedIntent.maxOrderCount)) {
      targetDbQuery.orderCount = {};
      if (parsedIntent.minOrderCount && !isNaN(parseInt(parsedIntent.minOrderCount, 10))) {
        targetDbQuery.orderCount.$gte = parseInt(parsedIntent.minOrderCount, 10);
      }
      if (parsedIntent.maxOrderCount && !isNaN(parseInt(parsedIntent.maxOrderCount, 10))) {
        targetDbQuery.orderCount.$lte = parseInt(parsedIntent.maxOrderCount, 10);
      }
    }

    // Order Amount / Spend range / comparisons (min vs max / less than vs greater than)
    if (!parsedIntent.isConversational && (parsedIntent.minOrderAmount || parsedIntent.maxOrderAmount)) {
      targetDbQuery.orderAmount = {};
      if (parsedIntent.minOrderAmount && !isNaN(parseFloat(parsedIntent.minOrderAmount))) {
        targetDbQuery.orderAmount.$gte = parseFloat(parsedIntent.minOrderAmount);
      }
      if (parsedIntent.maxOrderAmount && !isNaN(parseFloat(parsedIntent.maxOrderAmount))) {
        targetDbQuery.orderAmount.$lte = parseFloat(parsedIntent.maxOrderAmount);
      }
    }

    if (!parsedIntent.isConversational && parsedIntent.merchant) {
      targetDbQuery['customFields.primary_merchant'] = new RegExp(parsedIntent.merchant, 'i');
    }

    // Phone Number Matching (Suffix vs Prefix)
    if (!parsedIntent.isConversational && parsedIntent.numberEndsWith) {
      const cleanEnds = parsedIntent.numberEndsWith.replace(/[^0-9]/g, '');
      if (cleanEnds) {
        targetDbQuery.phone = { $regex: new RegExp(`${cleanEnds}$`) };
      }
    } else if (!parsedIntent.isConversational && parsedIntent.numberStartsWith) {
      const pfx = buildPhonePrefixRegex(parsedIntent.numberStartsWith);
      if (pfx) targetDbQuery.phone = { $regex: pfx };
    }

    const sortField = parsedIntent.sortBy || 'createdAt';
    const sortDir = parsedIntent.sortOrder === 'asc' ? 1 : -1;
    const fetchLimit = parsedIntent.limit || 15;

    // Execute targeted query + global stats in parallel
    const [
      targetedCount,
      targetedRecords,
      totalRecords,
      activeDataset,
      financialAgg,
      genderAgg,
      topLocations,
      topMerchants,
      topSpenders,
      whatsappCount,
      vipCount,
      frequentBuyers,
      operatorCounts,
    ] = await Promise.all([
      parsedIntent.isConversational ? 0 : RecordModel.countDocuments(targetDbQuery),
      parsedIntent.isConversational
        ? []
        : RecordModel.find(targetDbQuery)
            .sort({ [sortField]: sortDir })
            .limit(fetchLimit)
            .select('name phone gender orderAmount orderCount location area customFields tags')
            .lean(),
      RecordModel.countDocuments({}),
      DatasetModel.findOne({}).sort({ createdAt: -1 }).lean(),
      RecordModel.aggregate([
        {
          $group: {
            _id: null,
            totalGMV: { $sum: { $ifNull: ['$orderAmount', 0] } },
            totalOrders: { $sum: { $ifNull: ['$orderCount', 0] } },
            avgOrderValue: { $avg: { $ifNull: ['$orderAmount', 0] } },
            maxSpend: { $max: { $ifNull: ['$orderAmount', 0] } },
          },
        },
      ]),
      RecordModel.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      RecordModel.aggregate([
        { $group: { _id: { $ifNull: ['$location', 'Unspecified'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      RecordModel.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$customFields.primary_merchant', 'Direct / Multi-category'] },
            count: { $sum: 1 },
            totalSpend: { $sum: { $ifNull: ['$orderAmount', 0] } },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      RecordModel.find({})
        .sort({ orderAmount: -1 })
        .limit(5)
        .select('name phone gender orderAmount orderCount location customFields')
        .lean(),
      RecordModel.countDocuments({
        $or: [
          { tags: { $regex: 'WhatsApp Active', $options: 'i' } },
          { 'customFields.whatsapp_status': { $regex: 'active', $options: 'i' } },
        ],
      }),
      RecordModel.countDocuments({
        $or: [{ tags: { $regex: 'VIP', $options: 'i' } }, { orderAmount: { $gte: 10000 } }],
      }),
      RecordModel.countDocuments({ orderCount: { $gte: 3 } }),
      Promise.all([
        RecordModel.countDocuments({ phone: { $regex: '^(88017|88013|017|013)' } }),
        RecordModel.countDocuments({ phone: { $regex: '^(88018|018)' } }),
        RecordModel.countDocuments({ phone: { $regex: '^(88019|88014|019|014)' } }),
        RecordModel.countDocuments({ phone: { $regex: '^(88016|016)' } }),
        RecordModel.countDocuments({ phone: { $regex: '^(88015|015)' } }),
      ]),
    ]);

    const fin = financialAgg[0] || { totalGMV: 0, totalOrders: 0, avgOrderValue: 0, maxSpend: 0 };
    const [gpCount, robiCount, blCount, airtelCount, teletalkCount] = operatorCounts;

    const formattedTargetedRecords = targetedRecords.map((r: any) => ({
      name: r.name || 'Unnamed Client',
      phone: r.phone || 'N/A',
      gender: r.gender || 'Other',
      orderCount: r.orderCount || r.customFields?.matched_order_count || 0,
      orderAmount: r.orderAmount || r.customFields?.matched_net_order_amount_bdt || 0,
      location: r.location || r.area || 'Dhaka',
      primaryMerchant: r.customFields?.primary_merchant || 'Direct / Store',
    }));

    const liveStatsSummary = {
      totalRecords,
      datasetFilename: activeDataset?.filename || 'dataset-export.csv',
      totalGMV_BDT: fin.totalGMV,
      totalOrders: fin.totalOrders,
      avgOrderValue_BDT: Math.round(fin.avgOrderValue),
      maxSingleCustomerSpend_BDT: fin.maxSpend,
      genderBreakdown: genderAgg.map((g) => ({ gender: g._id || 'Other', count: g.count })),
      topDistricts: topLocations.map((l) => ({ location: l._id, count: l.count })),
      topMerchants: topMerchants.map((m) => ({ merchant: m._id, ordersCount: m.count, totalSpend: m.totalSpend })),
      top5Spenders: topSpenders.map((s) => ({
        name: s.name,
        phone: s.phone,
        gender: s.gender,
        orderAmount: s.orderAmount,
        orderCount: s.orderCount,
        location: s.location,
        primaryMerchant: s.customFields?.primary_merchant || 'N/A',
      })),
      vipCustomersCount: vipCount,
      whatsappActiveCount: whatsappCount,
      frequentBuyers3PlusOrders: frequentBuyers,
      telecomDistribution: {
        Grameenphone_017_013: gpCount,
        Robi_018: robiCount,
        Banglalink_019_014: blCount,
        Airtel_016: airtelCount,
        Teletalk_015: teletalkCount,
      },
      userQueryAnalysis: {
        isConversational: parsedIntent.isConversational,
        criteriaApplied: parsedIntent,
        exactMatchingCount: targetedCount,
        topMatchingRecords: formattedTargetedRecords,
      },
    };

    const systemInstruction = `You are "Morpheus AI Copilot", an elite AI Data Scientist and friendly Executive Assistant powered by OpenAI GPT-4o.
The user is conversing with you or querying/managing their live business dataset in Bengali, English, or Banglish.

LIVE DATABASE CONTEXT:
- Total Customer Records in Database: ${totalRecords.toLocaleString()}
- Total Lifetime GMV: ৳${fin.totalGMV.toLocaleString()} BDT
- Total Orders: ${fin.totalOrders.toLocaleString()}
- VIP Customers: ${vipCount.toLocaleString()}
- WhatsApp Active Customers: ${whatsappCount.toLocaleString()}
- 3+ Repeat Buyers: ${frequentBuyers.toLocaleString()}
- Top Districts: ${topLocations.map((l: any) => `${l._id} (${l.count})`).join(', ')}

CURRENT USER REQUEST ANALYSIS & FILTER STATE:
${JSON.stringify(liveStatsSummary.userQueryAnalysis, null, 2)}

BANGLISH & BANGLA PHONETIC UNDERSTANDING RULES:
1. UNDERSTAND LESS THAN / BELOW / UNDER / NICHE:
   - "nesa", "nise", "niche", "nece", "kom", "under", "below", "less than", "max", "upto", "porjonto" = LESS THAN OR EQUAL (<=).
   - Example: "20 are nesa" / "20 er niche" -> ORDER COUNT <= 20 (NOT >= 20!).
2. UNDERSTAND GREATER THAN / ABOVE / BESHI / PLUS:
   - "besi", "beshi", "plus", "+", "above", "over", "more than", "min", "at least", "upore" = GREATER THAN OR EQUAL (>=).
   - Example: "20 plus" / "20 er beshi" -> ORDER COUNT >= 20.
3. UNDERSTAND TYPOS & PHONETIC SPELLINGS:
   - "cout" = "count"
   - "oder", "odr" = "order"
   - "plased" = "placed"
   - "are nesa" / "ar nesa" = "এর নিচে (below/under)"

INSTRUCTIONS & CAPABILITIES:
1. HUMAN CONVERSATION & GREETINGS:
   - If greeting ("hi", "hello", "kemon aso", "thanks", "bujso"):
     - Respond warmly, naturally in fluent Bengali/English. Introduce live dataset of ${totalRecords.toLocaleString()} records.
     - Set "type": "chat".

2. MULTI-TURN CONVERSATIONS & MICRO-REFINEMENTS (CONTEXT RETENTION):
   - When the user refines previous data (e.g., "acha ay data modde jader total order cout 20 are nesa asa tader list ta dau"):
     - Maintain the PREVIOUS name/keyword filter (e.g. "Easin / Yeasin / Iasin").
     - Confirm that you are showing customers whose order count is LESS THAN OR EQUAL TO 20 (২০ বা তার নিচে).
     - STRICT ACCURACY RULE: Always use "userQueryAnalysis" -> "exactMatchingCount" (${targetedCount}) as the single source of truth!

3. DATA & ANALYTICAL QUERIES:
   - If "exactMatchingCount" === 0:
     - Explain politely that no matching records were found with that criteria.
     - Set "type": "data_query".
   - If "exactMatchingCount" > 0:
     - Clearly state the exact count in bold Bengali.
     - Render a clean Markdown Table (# | Name | Phone Number | Orders | Spend BDT | Location/Store).
     - Provide accurate "exportPayload", "exportLabel", and "explorerPath".

4. OUTPUT ONLY VALID JSON:
{
  "type": "chat" | "data_query" | "strategy",
  "reply": "Rich markdown formatted response in Bengali/English with bullet points and tables if applicable",
  "exportPayload": {
    "search": "string",
    "nameWise": "true" | undefined,
    "tag": "string",
    "gender": "Female" | "Male" | "All",
    "minOrderAmount": "string",
    "maxOrderAmount": "string",
    "minOrderCount": "string",
    "maxOrderCount": "string",
    "merchant": "string",
    "numberStartsWith": "string",
    "numberEndsWith": "string",
    "sortBy": "orderCount" | "orderAmount" | "createdAt",
    "sortOrder": "desc" | "asc",
    "limit": 15,
    "customFilename": "Custom_Filename"
  },
  "exportLabel": "Download CSV (${targetedCount} rows)",
  "explorerPath": "/data/explorer?...",
  "keyMetrics": [
    { "label": "Metric Name", "value": "Value", "subtext": "Subtext" }
  ],
  "suggestedActions": [
    { "label": "Action Label", "path": "/data/explorer?..." }
  ],
  "followUpQuestions": [
    "Follow-up question 1?",
    "Follow-up question 2?"
  ]
}`;

    // Format conversation history
    const conversationPayload: any[] = [
      { role: 'system', content: systemInstruction },
      ...messages.slice(-6).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      })),
    ];

    if (!messages.some((m: any) => m.content === lastMessage)) {
      conversationPayload.push({ role: 'user', content: lastMessage });
    }

    // 3. CALL FLAGSHIP AI (OPENAI GPT-4o / DEEPSEEK)
    try {
      const { content, provider, model } = await callAIModel({
        messages: conversationPayload,
        preferredModel: 'gpt-4o',
        jsonMode: true,
        temperature: 0.2,
        maxTokens: 2000,
        timeoutMs: 15000,
      });

      if (content) {
        try {
          const parsed = JSON.parse(content);
          const sanitized = ensureExportAndExplorerPaths(parsed, parsedIntent, targetedCount);

          return NextResponse.json({
            success: true,
            provider,
            model,
            result: sanitized,
            liveStats: liveStatsSummary,
          });
        } catch (pErr) {
          console.error('Failed to parse AI JSON:', pErr);
        }
      }
    } catch (aiErr: any) {
      console.warn('AI Analytics chat API exception, using live dynamic generator:', aiErr?.message);
    }

    // Dynamic Live Fallback using Real MongoDB Query Results
    const fallbackReply = buildDynamicLiveResponse(parsedIntent, targetedCount, formattedTargetedRecords, liveStatsSummary);

    return NextResponse.json({
      success: true,
      result: fallbackReply,
      liveStats: liveStatsSummary,
    });
  } catch (error: any) {
    console.error('AI Analytics chat route error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI analytics query', message: error.message },
      { status: 500 }
    );
  }
}

interface QueryIntent {
  action: 'query' | 'delete' | 'update';
  targetPhone?: string;
  updateFields?: Record<string, any>;
  isConversational: boolean;
  search: string;
  searchField: 'name' | 'address' | 'merchant' | 'any';
  tag: string;
  gender: string;
  minOrderCount: string;
  maxOrderCount: string;
  minOrderAmount: string;
  maxOrderAmount: string;
  merchant: string;
  numberStartsWith: string;
  numberEndsWith: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  limit: number;
}

function parseQueryIntent(question: string, history: any[] = []): QueryIntent {
  const normalizedQ = question
    .replace(/[০-৯]/g, (d) => String(['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'].indexOf(d)))
    .toLowerCase()
    .trim();

  // Normalize phonetic Banglish typos & variations
  const q = normalizedQ
    .replace(/\bcout\b/gi, 'count')
    .replace(/\boder\b/gi, 'order')
    .replace(/\bodr\b/gi, 'order')
    .replace(/\bplased\b/gi, 'placed')
    .replace(/\bare\b/gi, 'er')
    .replace(/\bar\b/gi, 'er')
    .replace(/\bdea\b/gi, 'diye');

  // Phone number extraction in current query or history
  const phoneMatch = q.match(/(?:\+?(?:880|0)?1[3-9]\d{8})/);
  let targetPhone = phoneMatch ? phoneMatch[0].replace(/^\+/, '') : '';

  if (!targetPhone && history.length > 0) {
    const lastMsgWithPhone = [...history].reverse().find((m) => /(?:\+?(?:880|0)?1[3-9]\d{8})/.test(m.content || ''));
    if (lastMsgWithPhone) {
      const pm = lastMsgWithPhone.content.match(/(?:\+?(?:880|0)?1[3-9]\d{8})/);
      if (pm) targetPhone = pm[0].replace(/^\+/, '');
    }
  }

  // ==========================================
  // A. ACTION DETECTION: DELETE OPERATION
  // ==========================================
  const isDeleteAction =
    q.includes('delete') ||
    q.includes('remove') ||
    q.includes('muche') ||
    q.includes('shoraw') ||
    q.includes('shoriye') ||
    q.includes('bad dao') ||
    q.includes('drop');

  if (isDeleteAction && (targetPhone || q.includes('data') || q.includes('record') || q.includes('customer') || q.includes('ay') || q.includes('ei'))) {
    return {
      action: 'delete',
      targetPhone,
      isConversational: false,
      search: targetPhone || '',
      searchField: 'any',
      tag: 'All',
      gender: 'All',
      minOrderCount: '',
      maxOrderCount: '',
      minOrderAmount: '',
      maxOrderAmount: '',
      merchant: '',
      numberStartsWith: '',
      numberEndsWith: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 1,
    };
  }

  // ==========================================
  // B. ACTION DETECTION: UPDATE / EDIT OPERATION
  // ==========================================
  const isUpdateAction =
    q.includes('update') ||
    q.includes('change') ||
    q.includes('edit') ||
    q.includes('bodle') ||
    q.includes('bodlao') ||
    q.includes('set koro') ||
    q.includes('lagao') ||
    q.includes('banao') ||
    (targetPhone && (q.includes('koro') || q.includes('dao')) && (q.includes('name') || q.includes('naam') || q.includes('location') || q.includes('address') || q.includes('order') || q.includes('spend') || q.includes('tag') || q.includes('gender') || q.includes('status')));

  if (isUpdateAction && (targetPhone || q.includes('data') || q.includes('name') || q.includes('location') || q.includes('phone') || q.includes('gender') || q.includes('tag') || q.includes('order') || q.includes('ei') || q.includes('tar'))) {
    const updateFields: Record<string, any> = {};

    const isInvalidValue = (val: string) => {
      const clean = val.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/g, ' ').trim();
      const words = clean.split(/\s+/).filter(Boolean);
      const stopWords = new Set(['ta', 'ti', 'ei', 'oi', 'tar', 'ar', 'er', 'update', 'change', 'koro', 'karo', 'kore', 'dao', 'set', 'banao', 'data', 'record', 'customer', 'naam', 'name', 'hobe', 'to', 'ba', 'ja', 'kono', 'field']);
      return words.length === 0 || words.every((w) => stopWords.has(w));
    };

    // 1. Name update
    const nameChangeMatch =
      question.match(/(?:name|naam|নাম)\s*(?:change|update|kore|bodle|set|banao)?\s*(?:kore|to|hobe|:)?\s*['"]?([a-zA-Z\u0980-\u09FF\s]{2,40})['"]?\s*(?:dao|koro|set|banao)?/i) ||
      question.match(/['"]([a-zA-Z\u0980-\u09FF\s]{2,40})['"]\s*(?:name|naam)/i);

    if (nameChangeMatch) {
      let val = nameChangeMatch[1].trim()
        .replace(/^(change|update|kore|to|set|hobe|koro|dao|banao)\s+/i, '')
        .replace(/\s+(dao|koro|set|hobe|kore|banao)$/i, '')
        .trim();
      if (!isInvalidValue(val)) {
        updateFields.name = val;
      }
    }

    // 2. Location / Area update
    const locChangeMatch =
      question.match(/(?:location|area|address|ঠিকানা|এলাকা)\s*(?:change|update|kore|bodle|set|banao)?\s*(?:kore|to|hobe|:)?\s*['"]?([a-zA-Z\u0980-\u09FF\s]{2,30})['"]?\s*(?:dao|koro|set|banao)?/i);
    if (locChangeMatch) {
      let val = locChangeMatch[1].trim()
        .replace(/^(change|update|kore|to|set|hobe|koro|dao|banao)\s+/i, '')
        .replace(/\s+(dao|koro|set|hobe|kore|banao)$/i, '')
        .trim();
      if (!isInvalidValue(val)) {
        updateFields.location = val;
      }
    }

    // 3. Order Count update
    const orderCountMatch = question.match(/(?:order\s*count|total\s*order|order)\s*(?:count)?\s*(?:change|update|kore|set|banao)?\s*(?:kore|to|hobe|:|=)?\s*(\d+)\s*(?:dao|koro|set|banao|ta|ti)?/i);
    if (orderCountMatch && !q.includes('nesa') && !q.includes('nise') && !q.includes('besi') && !q.includes('plus')) {
      updateFields.orderCount = parseInt(orderCountMatch[1], 10);
    }

    // 4. Spend / Amount update
    const spendMatch = question.match(/(?:spend|order\s*amount|taka|amount|টাকা)\s*(?:change|update|kore|set|banao)?\s*(?:kore|to|hobe|:|=)?\s*(\d+)/i);
    if (spendMatch && (q.includes('update') || q.includes('change') || q.includes('set') || q.includes('koro') || q.includes('banao') || q.includes('dao'))) {
      updateFields.orderAmount = parseFloat(spendMatch[1]);
    }

    // 5. Tag update
    if (q.includes('vip')) updateFields.tags = ['VIP Client'];
    if (q.includes('whatsapp active')) updateFields.tags = ['WhatsApp Active'];
    if (q.includes('regular')) updateFields.tags = ['Regular'];

    // 6. Gender update
    if (q.match(/\b(female|মহিলা|নারী)\b/i) && (q.includes('change') || q.includes('set') || q.includes('koro') || q.includes('gender') || q.includes('dao'))) {
      updateFields.gender = 'Female';
    } else if (q.match(/\b(male|পুরুষ)\b/i) && (q.includes('change') || q.includes('set') || q.includes('koro') || q.includes('gender') || q.includes('dao'))) {
      updateFields.gender = 'Male';
    }

    // 7. Status update
    if (q.match(/\b(active)\b/i) && (q.includes('change') || q.includes('set') || q.includes('koro') || q.includes('status') || q.includes('dao'))) {
      updateFields.status = 'active';
    } else if (q.match(/\b(inactive|blocked)\b/i) && (q.includes('change') || q.includes('set') || q.includes('koro') || q.includes('status') || q.includes('dao'))) {
      updateFields.status = 'inactive';
    }

    return {
      action: 'update',
      targetPhone,
      updateFields,
      isConversational: false,
      search: targetPhone || '',
      searchField: 'any',
      tag: 'All',
      gender: 'All',
      minOrderCount: '',
      maxOrderCount: '',
      minOrderAmount: '',
      maxOrderAmount: '',
      merchant: '',
      numberStartsWith: '',
      numberEndsWith: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 1,
    };
  }

  // ==========================================
  // C. STANDARD READ & ANALYTICS QUERIES
  // ==========================================
  // Check for greetings & casual conversation
  const casualGreetingPatterns = [
    /^(hi|hello|hey|hii|helo|hiii|assalamu|salam|kemon|halo|hola|good\s*morning|good\s*evening|good\s*afternoon)\b/i,
    /^(ki\s*khobor|kemon\s*acho|kemon\s*aso|bhalo\s*acho|bhalo\s*aso|who\s*are\s*you|what\s*can\s*you\s*do|tume\s*ki|apni\s*ke|tumi\s*ke)\b/i,
    /^(thanks|thank\s*you|dhonnobad|dhonno|shukriya|ok|okay|thik\s*ase|accha|acha|bujso|bujhlam)$/i,
  ];

  const isConversational =
    casualGreetingPatterns.some((pattern) => pattern.test(q)) &&
    !q.includes('order') &&
    !q.includes('spend') &&
    !q.includes('data') &&
    !q.includes('customer') &&
    !q.includes('vip') &&
    !q.includes('list') &&
    !q.includes('kau') &&
    !q.includes('name') &&
    !q.includes('number') &&
    !q.includes('digit');

  let search = '';
  let searchField: 'name' | 'address' | 'merchant' | 'any' = 'any';
  let tag = 'All';
  let gender = 'All';
  let minOrderCount = '';
  let maxOrderCount = '';
  let minOrderAmount = '';
  let maxOrderAmount = '';
  let merchant = '';
  let numberStartsWith = '';
  let numberEndsWith = '';
  let sortBy = 'createdAt';
  let sortOrder: 'asc' | 'desc' = 'desc';
  let limit = 15;

  if (isConversational) {
    return {
      action: 'query',
      isConversational: true,
      search: '',
      searchField: 'any',
      tag: 'All',
      gender: 'All',
      minOrderCount: '',
      maxOrderCount: '',
      minOrderAmount: '',
      maxOrderAmount: '',
      merchant: '',
      numberStartsWith: '',
      numberEndsWith: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 10,
    };
  }

  // 1. Order Count Detection (handles ranges, less-than/nise/nesa/kom, and greater-than/beshi/plus)
  const orderRangeMatch =
    q.match(/(\d+)\s*(?:theke|to|-|থেকে)\s*(\d+)\s*(?:ta|ti|টির|টি)?\s*(?:order|অর্ডার)/i) ||
    q.match(/(?:order|অর্ডার)\s*(?:count|সংখ্যা|placed)?\s*(\d+)\s*(?:theke|to|-|থেকে)\s*(\d+)/i);

  const hasLessOrderKeyword =
    q.includes('nesa') ||
    q.includes('nise') ||
    q.includes('niche') ||
    q.includes('neeche') ||
    q.includes('nece') ||
    q.includes('kom') ||
    q.includes('কম') ||
    q.includes('নিচে') ||
    q.includes('under') ||
    q.includes('below') ||
    q.includes('less') ||
    q.includes('upto') ||
    q.includes('porjonto') ||
    q.includes('max') ||
    q.includes('<=') ||
    q.includes('<');

  const hasMoreOrderKeyword =
    q.includes('besi') ||
    q.includes('beshi') ||
    q.includes('বেশি') ||
    q.includes('অধিক') ||
    q.includes('upore') ||
    q.includes('upor') ||
    q.includes('plus') ||
    q.includes('+') ||
    q.includes('above') ||
    q.includes('over') ||
    q.includes('more') ||
    q.includes('min') ||
    q.includes('>=') ||
    q.includes('>');

  if (orderRangeMatch) {
    const low = parseInt(orderRangeMatch[1], 10);
    const high = parseInt(orderRangeMatch[2], 10);
    if (!isNaN(low) && !isNaN(high)) {
      minOrderCount = String(Math.min(low, high));
      maxOrderCount = String(Math.max(low, high));
      sortBy = 'orderCount';
      sortOrder = 'desc';
    }
  } else if ((q.includes('order') || q.includes('অর্ডার') || q.includes('count') || q.includes('সংখ্যা')) && hasLessOrderKeyword) {
    const numMatch = q.match(/(\d+)/);
    if (numMatch) {
      maxOrderCount = numMatch[1];
      sortBy = 'orderCount';
      sortOrder = 'asc';
    }
  } else if (hasLessOrderKeyword && !hasMoreOrderKeyword && q.match(/(\d+)/)) {
    const numMatch = q.match(/(\d+)/);
    if (numMatch) {
      maxOrderCount = numMatch[1];
      sortBy = 'orderCount';
      sortOrder = 'asc';
    }
  } else {
    const orderCountMatch =
      q.match(/(?:order|অর্ডার)\s*(?:placed|count|সংখ্যা|complete|কমপ্লিট|kora|করা|হয়েছে|hoise|besi|বেশি|অধিক|>=|>|:|=)?\s*(\d+)\s*(?:\+|plus)?/i) ||
      q.match(/(\d+)\s*(?:টির|টি|ta|er|বারের|বার)?\s*(?:besi|বেশি|অধিক|placed|\+|plus)?\s*(?:order|অর্ডার)/i) ||
      q.match(/(\d+)\s*(?:\+|plus)\s*order/i) ||
      q.match(/(?:order|অর্ডার)\s*(\d+)\s*(?:\+|plus)?/i);

    if (orderCountMatch) {
      const num = parseInt(orderCountMatch[1], 10);
      if (!isNaN(num) && num > 0) {
        minOrderCount = String(num);
        sortBy = 'orderCount';
        sortOrder = 'desc';
      }
    }
  }

  // 2. Spend / Amount Detection (ranges, less-than, and greater-than)
  const spendRangeMatch =
    q.match(/(\d+)\s*(?:theke|to|-|থেকে)\s*(\d+)\s*(?:taka|টাকা|tk|bdt|k\b)/i) ||
    q.match(/(?:spend|টাকা|খরচ|gmv|amount)\s*(\d+)\s*(?:theke|to|-|থেকে)\s*(\d+)/i);

  if (spendRangeMatch) {
    let low = spendRangeMatch[1];
    let high = spendRangeMatch[2];
    minOrderAmount = low;
    maxOrderAmount = high;
    sortBy = 'orderAmount';
    sortOrder = 'desc';
  } else if ((q.includes('spend') || q.includes('টাকা') || q.includes('খরচ') || q.includes('tk') || q.includes('bdt') || q.includes('amount')) && hasLessOrderKeyword) {
    const numMatch = q.match(/(\d+)/);
    if (numMatch) {
      let val = numMatch[1];
      if (q.includes('k') && !q.includes('taka')) val = String(parseInt(val, 10) * 1000);
      maxOrderAmount = val;
      sortBy = 'orderAmount';
      sortOrder = 'asc';
    }
  } else {
    const spendMatch =
      q.match(/(?:spend|টাকা|খরচ|gmv|amount|খরচ\s*করেছে|>=|>|tk|bdt)\s*(\d+)/i) ||
      q.match(/(\d+)\s*(?:taka|টাকা|tk|bdt|k\b)/i);
    if (spendMatch) {
      let val = spendMatch[1];
      if (spendMatch[0].toLowerCase().includes('k') && !spendMatch[0].toLowerCase().includes('taka')) {
        val = String(parseInt(val, 10) * 1000);
      }
      minOrderAmount = val;
      if (!sortBy || sortBy === 'createdAt') {
        sortBy = 'orderAmount';
        sortOrder = 'desc';
      }
    }
  }

  // 3. VIP / High Spender
  if (
    q.includes('vip') ||
    q.includes('ভিআইপি') ||
    q.includes('high spend') ||
    q.includes('টপ বায়ার') ||
    q.includes('সর্বোচ্চ খরচ')
  ) {
    tag = 'VIP Client';
    if (!sortBy || sortBy === 'createdAt') {
      sortBy = 'orderAmount';
      sortOrder = 'desc';
    }
  }

  // 4. WhatsApp
  if (q.includes('whatsapp') || q.includes('হোয়াটসঅ্যাপ') || q.includes('wp')) {
    tag = 'WhatsApp Active';
  }

  // 5. Gender (with word boundaries to prevent 'rahman' or 'permanent' false positives)
  if (q.match(/\b(female|woman|women|নারী|মহিলা|মেয়ে)\b/i)) {
    gender = 'Female';
  } else if (q.match(/\b(male|man|men|পুরুষ|ছেলে)\b/i) && !q.match(/\b(female|woman|women)\b/i)) {
    gender = 'Male';
  }

  // 6. Name Search (e.g. "easin name a", "name easin", "rahim namer", "yeasin")
  const isExplicitName =
    q.includes('name') ||
    q.includes('নাম') ||
    q.includes('নামে') ||
    q.includes('নামের') ||
    q.includes('namer') ||
    q.includes('naam');

  let extractedName = '';
  const stopWords = [
    'ki', 'ke', 'ka', 'keu', 'kono', 'user', 'koto', 'list', 'dau', 'dao', 'bolo',
    'onek', 'amek', 'amake', 'amader', 'tader', 'oy', 'ta', 'data', 'customer', 'kotojon'
  ];
  const beforeNameMatch = q.match(/([a-zA-Z\u0980-\u09FF]{2,30})\s*(?:name|নাম|নামে|নামের)\b/i);
  const afterNameMatch = q.match(/(?:name|নাম|নামে|নামের)\s*(?:a|e|er|is|hocche)?\s*([a-zA-Z\u0980-\u09FF]{2,30})\b/i);

  if (beforeNameMatch && !stopWords.includes(beforeNameMatch[1].toLowerCase())) {
    extractedName = beforeNameMatch[1].trim();
    searchField = 'name';
  } else if (afterNameMatch && !stopWords.includes(afterNameMatch[1].toLowerCase())) {
    extractedName = afterNameMatch[1].trim();
    searchField = 'name';
  } else if (isExplicitName) {
    searchField = 'name';
  }

  // If common personal names mentioned directly
  const commonNames = [
    'easin', 'yeasin', 'iasin', 'musa', 'samiya', 'maria', 'karim', 'rahim', 'abdullah', 'arafat', 'tasnim', 'tanvir'
  ];
  if (!extractedName) {
    for (const cn of commonNames) {
      if (q.split(/\s+/).includes(cn)) {
        extractedName = cn;
        if (isExplicitName) searchField = 'name';
        break;
      }
    }
  }

  if (extractedName) {
    const lName = extractedName.toLowerCase();
    if (lName === 'easin' || lName === 'yeasin' || lName === 'iasin') {
      search = 'easin|yeasin|iasin';
    } else {
      search = extractedName;
    }
    if (isExplicitName || commonNames.includes(lName)) {
      searchField = 'name';
    }
  }

  // 7. Merchant & Category Search
  const categoryKeywords = ['fashion', 'boutique', 'beauty', 'jewelry', 'jewellery', 'apparel', 'clothing', 'saree', 'cosmetics', 'grocery', 'shoes', 'bag'];
  for (const cat of categoryKeywords) {
    if (q.includes(cat)) {
      search = search ? `${search}|${cat}` : cat;
      break;
    }
  }

  if (q.includes('beautybaaz')) {
    merchant = 'BeautyBaaz';
    searchField = 'merchant';
  } else if (q.includes('fashionable dresses')) {
    merchant = 'Fashionable Dresses';
    searchField = 'merchant';
  }

  // 8. Landmark, Area & Location Search
  const isLocationQuery =
    q.includes('area') ||
    q.includes('এলাকা') ||
    q.includes('district') ||
    q.includes('location') ||
    q.includes('ঠিকানা') ||
    q.includes('zone') ||
    q.includes('tower') ||
    q.includes('বিল্ডিং');

  const knownLocations = [
    'rahman tower', 'tailghat', 'keraniganj', 'কেরানীগঞ্জ', 'dhaka', 'ঢাকা',
    'chittagong', 'চট্টগ্রাম', 'sylhet', 'সিলেট', 'rajshahi', 'khulna', 'barisal',
    'comilla', 'gazipur', 'narayanganj', 'dhanmondi', 'mirpur', 'uttara', 'gulshan', 'banani', 'mugda'
  ];

  for (const loc of knownLocations) {
    if (q.includes(loc.toLowerCase())) {
      search = search ? `${search}|${loc}` : loc;
      if (isLocationQuery) searchField = 'address';
    }
  }

  // 9. Limit
  const limitMatch = q.match(/(?:top|সেরা|টপ|\b)(\d+)\s*(?:জন|joner|ta|records|customers|buyers)?/i);
  if (limitMatch && limitMatch[1]) {
    const num = parseInt(limitMatch[1], 10);
    if (num > 0 && num <= 100) limit = num;
  }

  // 10. Intelligent Phone Number Extraction (Suffix / Ends-With vs Prefix / Starts-With)
  const isEndsWith =
    q.includes('last') ||
    q.includes('লাস্ট') ||
    q.includes('শেষ') ||
    q.includes('shesh') ||
    q.includes('sesh') ||
    q.includes('ends with') ||
    q.includes('ending');

  const isStartsWith =
    q.includes('shuru') ||
    q.includes('suru') ||
    q.includes('sur') ||
    q.includes('starts with') ||
    q.includes('starting') ||
    q.includes('শুরু') ||
    q.includes('dea sur') ||
    q.includes('diye shuru');

  if (isEndsWith) {
    const allNumbers = q.match(/\d+/g) || [];
    if (allNumbers.length === 1) {
      numberEndsWith = allNumbers[0];
    } else if (allNumbers.length >= 2) {
      // In queries like "last a 2 ta digit a 14", the last number is the target sequence
      numberEndsWith = allNumbers[allNumbers.length - 1];
    }
  } else if (isStartsWith) {
    const prefixMatch =
      q.match(/(?:\+?(?:880|0)?1[3-9]\d{0,11})/i) ||
      q.match(/\b(\d{2,11})\b/);
    if (prefixMatch) {
      numberStartsWith = prefixMatch[0].replace(/^\+/, '');
    } else if (q.includes('gp') || q.includes('grameenphone') || q.includes('গ্রামীণফোন') || q.includes('জিপি')) {
      numberStartsWith = '88017';
    } else if (q.includes('robi') || q.includes('রবি')) {
      numberStartsWith = '88018';
    } else if (q.includes('bl') || q.includes('banglalink') || q.includes('বাংলালিংক')) {
      numberStartsWith = '88019';
    } else if (q.includes('airtel') || q.includes('এয়ারটেল')) {
      numberStartsWith = '88016';
    } else if (q.includes('teletalk') || q.includes('টেলিটক')) {
      numberStartsWith = '88015';
    }
  } else if (targetPhone) {
    numberStartsWith = targetPhone;
  } else if (q.includes('phone') || q.includes('mobile') || q.includes('number') || q.includes('নম্বর')) {
    const phoneMatchAny = q.match(/(?:\+?(?:880|0)?1[3-9]\d{1,11})/);
    if (phoneMatchAny) {
      numberStartsWith = phoneMatchAny[0].replace(/^\+/, '');
    }
  }

  // 11. Multi-turn Merge & Follow-up Micro-Refinement Support
  if (history && history.length > 0) {
    const isRefinement =
      q.includes('ar moddhe') ||
      q.includes('ar modde') ||
      q.includes('ar modhe') ||
      q.includes('er moddhe') ||
      q.includes('er modde') ||
      q.includes('er modhe') ||
      q.includes('tader moddhe') ||
      q.includes('tader modde') ||
      q.includes('tader modhe') ||
      q.includes('tader') ||
      q.includes('ar maje') ||
      q.includes('er maje') ||
      q.includes('ager') ||
      q.includes('uporer') ||
      q.includes('merge') ||
      q.includes('also') ||
      q.includes('sudhu') ||
      q.includes('sud') ||
      q.includes('only') ||
      q.includes('just') ||
      q.includes('jader') ||
      q.includes('jara') ||
      (!search && (minOrderCount || maxOrderCount || minOrderAmount || maxOrderAmount || gender !== 'All' || tag !== 'All' || numberStartsWith || numberEndsWith));

    if (isRefinement) {
      const lastUserMsg = [...history].reverse().find(
        (m) => (m.role === 'user' && m.content !== question) || (m.role !== 'assistant' && m.content !== question)
      );
      if (lastUserMsg && lastUserMsg.content) {
        const prevIntent = parseQueryIntent(lastUserMsg.content, []);
        if (!search && prevIntent.search) {
          search = prevIntent.search;
          searchField = prevIntent.searchField || 'any';
        }
        if (!minOrderCount && !maxOrderCount && prevIntent.minOrderCount) minOrderCount = prevIntent.minOrderCount;
        if (!minOrderCount && !maxOrderCount && prevIntent.maxOrderCount) maxOrderCount = prevIntent.maxOrderCount;
        if (!minOrderAmount && !maxOrderAmount && prevIntent.minOrderAmount) minOrderAmount = prevIntent.minOrderAmount;
        if (!minOrderAmount && !maxOrderAmount && prevIntent.maxOrderAmount) maxOrderAmount = prevIntent.maxOrderAmount;
        if (!merchant && prevIntent.merchant) merchant = prevIntent.merchant;
        if (gender === 'All' && prevIntent.gender !== 'All') gender = prevIntent.gender;
        if (tag === 'All' && prevIntent.tag !== 'All') tag = prevIntent.tag;
        if (!numberStartsWith && prevIntent.numberStartsWith) numberStartsWith = prevIntent.numberStartsWith;
        if (!numberEndsWith && prevIntent.numberEndsWith) numberEndsWith = prevIntent.numberEndsWith;
      }
    }
  }

  // 12. Generic Search Keyword Extractor (If unclassified and not an overview request)
  const isOverviewRequest =
    q.includes('total') ||
    q.includes('overview') ||
    q.includes('summary') ||
    q.includes('mot') ||
    q.includes('সব') ||
    q.includes('shob') ||
    q.includes('all') ||
    (limitMatch && !q.includes('name') && !q.includes('number') && !q.includes('phone') && !q.includes('digit'));

  if (
    !search &&
    !numberStartsWith &&
    !numberEndsWith &&
    !minOrderCount &&
    !maxOrderCount &&
    !minOrderAmount &&
    !maxOrderAmount &&
    tag === 'All' &&
    gender === 'All' &&
    !merchant &&
    !isOverviewRequest
  ) {
    const questionStopWords = [
      'koy', 'koyta', 'koto', 'kotojon', 'koto_jon', 'data', 'record', 'records',
      'asa', 'ase', 'ache', 'ki', 'ke', 'keu', 'kono', 'show', 'dekhao', 'dau',
      'dao', 'deba', 'bolo', 'list', 'details', 'khuje', 'pawa', 'geche', 'ay',
      'ei', 'oi', 'rakomer', 'morpheus', 'bujso', 'sir', 'bhai', 'please', 'help',
      'information', 'info', 'koro', 'kortasi', 'user', 'customer', 'customers', 'kon',
    ];
    const words = q.split(/\s+/).filter((w) => w.length > 1 && !questionStopWords.includes(w));
    if (words.length > 0) {
      search = words.join(' ');
    }
  }

  return {
    action: 'query',
    isConversational: false,
    search,
    searchField,
    tag,
    gender,
    minOrderCount,
    maxOrderCount,
    minOrderAmount,
    maxOrderAmount,
    merchant,
    numberStartsWith,
    numberEndsWith,
    sortBy,
    sortOrder,
    limit,
  };
}

function ensureExportAndExplorerPaths(parsed: any, intent: any, totalCount: number) {
  const res = { ...parsed };

  if (intent.isConversational) {
    return res;
  }

  if (!res.exportPayload) {
    res.exportPayload = {
      search: intent.search || undefined,
      nameWise: intent.searchField === 'name' ? 'true' : undefined,
      tag: intent.tag !== 'All' ? intent.tag : undefined,
      gender: intent.gender !== 'All' ? intent.gender : undefined,
      minOrderCount: intent.minOrderCount || undefined,
      maxOrderCount: intent.maxOrderCount || undefined,
      minOrderAmount: intent.minOrderAmount || undefined,
      maxOrderAmount: intent.maxOrderAmount || undefined,
      merchant: intent.merchant || undefined,
      numberStartsWith: intent.numberStartsWith || undefined,
      numberEndsWith: intent.numberEndsWith || undefined,
      sortBy: intent.sortBy || 'orderCount',
      sortOrder: intent.sortOrder || 'desc',
      limit: intent.limit || 15,
      customFilename: intent.search
        ? `Records_${intent.search.replace(/\|/g, '_')}`
        : intent.maxOrderCount
        ? `Records_Max_${intent.maxOrderCount}_Orders`
        : intent.minOrderCount
        ? `Records_Min_${intent.minOrderCount}_Orders`
        : intent.numberEndsWith
        ? `Records_Phone_Ends_${intent.numberEndsWith}`
        : intent.numberStartsWith
        ? `Records_Phone_${intent.numberStartsWith}`
        : `Filtered_Dataset`,
    };
  }

  if (!res.exportLabel) {
    res.exportLabel = `Download Results CSV (${totalCount.toLocaleString()} matching rows)`;
  }

  if (!res.explorerPath) {
    const params = new URLSearchParams();
    if (res.exportPayload.search) params.set('search', res.exportPayload.search);
    if (intent.searchField === 'name' || res.exportPayload.nameWise) params.set('nameWise', 'true');
    if (res.exportPayload.gender) params.set('gender', res.exportPayload.gender);
    if (res.exportPayload.tag) params.set('tag', res.exportPayload.tag);
    if (res.exportPayload.numberStartsWith) params.set('numberStartsWith', res.exportPayload.numberStartsWith);
    if (res.exportPayload.numberEndsWith) params.set('numberEndsWith', res.exportPayload.numberEndsWith);
    if (res.exportPayload.minOrderCount) params.set('minOrderCount', String(res.exportPayload.minOrderCount));
    if (res.exportPayload.maxOrderCount) params.set('maxOrderCount', String(res.exportPayload.maxOrderCount));
    if (res.exportPayload.minOrderAmount) params.set('minOrderAmount', String(res.exportPayload.minOrderAmount));
    if (res.exportPayload.maxOrderAmount) params.set('maxOrderAmount', String(res.exportPayload.maxOrderAmount));
    if (res.exportPayload.sortBy) params.set('sortBy', res.exportPayload.sortBy);
    if (res.exportPayload.sortOrder) params.set('sortOrder', res.exportPayload.sortOrder);
    res.explorerPath = `/data/explorer?${params.toString()}`;
  }

  return res;
}

function buildDynamicLiveResponse(
  intent: any,
  matchingCount: number,
  records: any[],
  stats: any
) {
  // If user sent casual greeting
  if (intent.isConversational) {
    return {
      type: 'chat',
      reply: `👋 **হ্যালো! আমি Morpheus AI Analytics Copilot (GPT-4o).**\n\nআপনার ডাটাবেজের **${(stats.totalRecords || 2361).toLocaleString()} টি রিয়েল-টাইম রেকর্ডের** সম্পূর্ণ তথ্য আমার কাছে সংযুক্ত আছে।\n\nআপনি বাংলায় বা ইংরেজিতে যেকোনো প্রশ্ন করতে পারেন—যেমন:\n- 👑 **টপ ৫ জন সর্বোচ্চ স্পেন্ড করা VIP কাস্টমার কারা?**\n- 📦 **১০০টির বেশি অর্ডার করেছে এমন কাস্টমারদের তালিকা দাও?**\n- 💬 **হোয়াটসঅ্যাপে সক্রিয় ও ঢাকার কাস্টমারদের ডাটা কত?**\n\nআমি সাথে সাথে অ্যানালাইসিস করে আপনাকে সর্ট করা ডাটা এবং ১-ক্লিকে CSV ডাউনলোড ফাইল তৈরি করে দেব!`,
      keyMetrics: [
        { label: 'মোট ডাটাবেজ', value: `${(stats.totalRecords || 2361).toLocaleString()} টি`, subtext: 'Live Records' },
        { label: 'লাইফটাইম GMV', value: `৳${Number(stats.totalGMV_BDT || 0).toLocaleString()}`, subtext: 'Total spend' },
        { label: 'VIP ক্রেতা', value: `${(stats.vipCustomersCount || 0).toLocaleString()} জন`, subtext: 'Spend ≥ ৳10k' },
      ],
      suggestedActions: [
        { label: '👑 টপ VIP ক্রেতা দেখুন', path: '/data/explorer?tag=VIP+Client&sortBy=orderAmount&sortOrder=desc' },
        { label: '💬 WhatsApp Active দেখুন', path: '/data/explorer?tag=WhatsApp+Active' },
      ],
      followUpQuestions: [
        'টপ ৫ জন সর্বোচ্চ খরচ করা VIP কাস্টমার কারা?',
        'আমাদের ডাটার জেন্ডার ও স্পেন্ড হিসাব কেমন?',
        'কেরানীগঞ্জ ও ঢাকার কাস্টমারদের সেলস কত?',
      ],
    };
  }

  let title = `📊 **আপনার রিকোয়েস্ট অনুযায়ী ডাটাবেজ অ্যানালাইসিস:**`;
  let description = '';

  const searchDisplay = intent.search ? intent.search.replace(/\|/g, ' / ') : '';

  if (intent.search && intent.minOrderCount && intent.maxOrderCount) {
    title = `📦 **"${searchDisplay}" নাম/কীওয়ার্ডে ${intent.minOrderCount} থেকে ${intent.maxOrderCount} টি অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে **"${searchDisplay}"** যাদের অর্ডার সংখ্যা **${intent.minOrderCount} থেকে ${intent.maxOrderCount}-এর মধ্যে** রয়েছে এমন মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে "${searchDisplay}" নাম/কীওয়ার্ডে ${intent.minOrderCount} থেকে ${intent.maxOrderCount} টি অর্ডার করেছে এমন কোনো কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.search && intent.maxOrderCount) {
    title = `📦 **"${searchDisplay}" নাম/কীওয়ার্ডে ${intent.maxOrderCount} বা তার নিচে অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে **"${searchDisplay}"** যাদের মধ্যে মোট অর্ডার সংখ্যা **${intent.maxOrderCount} বা তার নিচে** রয়েছে এমন মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে "${searchDisplay}" নাম/কীওয়ার্ডে ${intent.maxOrderCount} বা তার নিচে অর্ডার করেছে এমন কোনো কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.search && intent.minOrderCount) {
    title = `📦 **"${searchDisplay}" নাম/কীওয়ার্ডে ${intent.minOrderCount}+ অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে **"${searchDisplay}"** যাদের মধ্যে **${intent.minOrderCount} টির বেশি অর্ডার** রয়েছে এমন মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের প্রিভিউ তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে "${searchDisplay}" নাম/কীওয়ার্ডে ${intent.minOrderCount} টির বেশি অর্ডার করেছে এমন কোনো কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.maxOrderCount) {
    title = `📦 **${intent.maxOrderCount} বা তার নিচে অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার লাইভ ডাটাবেজে **${intent.maxOrderCount} বা তার নিচে অর্ডার সম্পন্ন করেছে এমন মোট ${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের মধ্যে শীর্ষ কাস্টমারদের তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে ${intent.maxOrderCount} বা তার নিচে অর্ডার করেছে এমন কোনো কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.minOrderCount) {
    title = `📦 **${intent.minOrderCount}+ অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার লাইভ ডাটাবেজে **${intent.minOrderCount} টির বেশি অর্ডার সম্পন্ন করেছে এমন মোট ${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের মধ্যে শীর্ষ কাস্টমারদের তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে **${intent.minOrderCount} টির বেশি অর্ডার করেছে এমন কোনো কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.numberEndsWith) {
    title = `📱 **"${intent.numberEndsWith}" দিয়ে শেষ হওয়া ফোন নম্বরের কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার লাইভ ডাটাবেজে শেষে "${intent.numberEndsWith}" রয়েছে এমন মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের প্রিভিউ তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে শেষে "${intent.numberEndsWith}" রয়েছে এমন কোনো ফোন নম্বরের কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.numberStartsWith) {
    title = `📱 **"${intent.numberStartsWith}" দিয়ে শুরু হওয়া ফোন নম্বরের কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার লাইভ ডাটাবেজে "${intent.numberStartsWith}" দিয়ে শুরু এমন মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের প্রিভিউ তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে "${intent.numberStartsWith}" দিয়ে শুরু এমন কোনো ফোন নম্বরের কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.search) {
    const fieldLabel = intent.searchField === 'name' ? 'নামে' : 'কীওয়ার্ডে';
    title = `🔍 **"${searchDisplay}" ${fieldLabel} কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে "${searchDisplay}" ${fieldLabel} মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nনিচে শীর্ষ ${records.length} জনের প্রিভিউ দেওয়া হলো (সম্পূর্ণ ${matchingCount} জনের ফাইল দেখতে নিচের বাটনে ক্লিক করুন):`
      : `না স্যার, আপনার ডাটাবেজে "${searchDisplay}" ${fieldLabel} কোনো সরাসরি রেকর্ড খুঁজে পাওয়া যায়নি। ভিন্ন বানান বা ফিল্টার দিয়ে দেখতে পারেন।`;
  } else if (intent.gender === 'Female') {
    title = `👩 **ফিমেল কাস্টমার অ্যানালাইসিস:**`;
    description = `আপনার ডাটাবেজে মোট **${matchingCount.toLocaleString()} জন ফিমেল কাস্টমার** রয়েছেন।`;
  } else if (matchingCount === 0) {
    title = `🔍 **কোনো ম্যাচিং ডাটা পাওয়া যায়নি**`;
    description = `না স্যার, আপনার উল্লেখিত তথ্যের সাথে মিল রেখে ডাটাবেজে কোনো রেকর্ড খুঁজে পাওয়া যায়নি। আপনি কি অন্য কোনো ফিল্টার বা নাম্বার দিয়ে দেখতে চান?`;
  } else {
    description = `আপনার রিকোয়েস্ট অনুযায়ী ডাটাবেজে **${matchingCount.toLocaleString()} টি রেকর্ড** ফিল্টার ও সর্ট করা হয়েছে:`;
  }

  // Generate clean Markdown Table if records exist
  let tableMarkdown = '';
  if (records.length > 0) {
    tableMarkdown =
      `\n\n| # | নাম | ফোন নম্বর | মোট অর্ডার | মোট স্পেন্ড (BDT) | লোকেশন / মার্চেন্ট |\n|---|---|---|---|---|---|\n` +
      records
        .map(
          (r, idx) =>
            `| ${idx + 1} | **${r.name}** | \`${r.phone}\` | **${r.orderCount}** টি | ৳${Number(
              r.orderAmount || 0
            ).toLocaleString()} | ${r.location} (${r.primaryMerchant}) |`
        )
        .join('\n');
  }

  const reply = `${title}\n\n${description}${tableMarkdown}`;

  const exportPayload = {
    search: intent.search || undefined,
    nameWise: intent.searchField === 'name' ? 'true' : undefined,
    tag: intent.tag !== 'All' ? intent.tag : undefined,
    gender: intent.gender !== 'All' ? intent.gender : undefined,
    minOrderCount: intent.minOrderCount || undefined,
    maxOrderCount: intent.maxOrderCount || undefined,
    minOrderAmount: intent.minOrderAmount || undefined,
    maxOrderAmount: intent.maxOrderAmount || undefined,
    merchant: intent.merchant || undefined,
    numberStartsWith: intent.numberStartsWith || undefined,
    numberEndsWith: intent.numberEndsWith || undefined,
    sortBy: intent.sortBy || 'orderCount',
    sortOrder: intent.sortOrder || 'desc',
    limit: intent.limit || 15,
    customFilename: intent.search
      ? `Records_${intent.search.replace(/\|/g, '_')}`
      : intent.maxOrderCount
      ? `Records_Max_${intent.maxOrderCount}_Orders`
      : intent.minOrderCount
      ? `Records_Min_${intent.minOrderCount}_Orders`
      : intent.numberEndsWith
      ? `Records_Phone_Ends_${intent.numberEndsWith}`
      : intent.numberStartsWith
      ? `Records_Phone_${intent.numberStartsWith}`
      : 'Filtered_Records',
  };

  const params = new URLSearchParams();
  if (exportPayload.search) params.set('search', exportPayload.search);
  if (intent.searchField === 'name') params.set('nameWise', 'true');
  if (exportPayload.gender) params.set('gender', exportPayload.gender);
  if (exportPayload.tag) params.set('tag', exportPayload.tag);
  if (exportPayload.numberStartsWith) params.set('numberStartsWith', exportPayload.numberStartsWith);
  if (exportPayload.numberEndsWith) params.set('numberEndsWith', exportPayload.numberEndsWith);
  if (exportPayload.minOrderCount) params.set('minOrderCount', String(exportPayload.minOrderCount));
  if (exportPayload.maxOrderCount) params.set('maxOrderCount', String(exportPayload.maxOrderCount));
  if (exportPayload.minOrderAmount) params.set('minOrderAmount', String(exportPayload.minOrderAmount));
  if (exportPayload.maxOrderAmount) params.set('maxOrderAmount', String(exportPayload.maxOrderAmount));
  if (exportPayload.sortBy) params.set('sortBy', exportPayload.sortBy);
  if (exportPayload.sortOrder) params.set('sortOrder', exportPayload.sortOrder);

  return {
    type: 'data_query',
    reply,
    exportPayload,
    exportLabel: `Download ${matchingCount.toLocaleString()} Records CSV`,
    explorerPath: `/data/explorer?${params.toString()}`,
    keyMetrics: [
      { label: 'ম্যাচিং কাস্টমার', value: `${matchingCount.toLocaleString()} জন`, subtext: 'Matching criteria' },
      { label: 'মোট ডাটাবেজ', value: `${(stats.totalRecords || 2361).toLocaleString()} জন`, subtext: 'Full dataset' },
      {
        label: 'ফিল্টার টাইপ',
        value:
          intent.searchField === 'name'
            ? 'Name Matching'
            : intent.maxOrderCount
            ? `≤ ${intent.maxOrderCount} Orders`
            : intent.minOrderCount
            ? `${intent.minOrderCount}+ Orders`
            : intent.numberEndsWith
            ? 'Phone Suffix'
            : intent.numberStartsWith
            ? 'Phone Prefix'
            : intent.sortBy === 'orderCount'
            ? 'Highest Orders'
            : 'Smart Filter',
        subtext: 'Criteria',
      },
    ],
    suggestedActions: [
      { label: `📥 Download CSV (${matchingCount.toLocaleString()} rows)`, path: `/api/export` },
      { label: `🎯 View in Data Explorer`, path: `/data/explorer?${params.toString()}` },
    ],
    followUpQuestions: [
      'এই কাস্টমারদের মধ্যে কতজন হোয়াটসঅ্যাপে অ্যাক্টিভ?',
      'তাদের মধ্যে সর্বোচ্চ স্পেন্ড করা ৫ জনের বিস্তারিত দাও?',
      'ঢাকার বাইরে অন্য কোনো এরিয়া থেকে কারা বেশি অর্ডার করেছে?',
    ],
  };
}
