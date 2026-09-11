import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import { buildPhonePrefixRegex } from '@/lib/phone';

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

    // 1. DYNAMIC USER INTENT & PARAMETER EXTRACTION
    const parsedIntent = parseQueryIntent(lastMessage);

    // 2. RUN TARGETED LIVE MONGODB QUERY FOR THIS SPECIFIC QUESTION
    const targetDbQuery: any = {};

    if (parsedIntent.search) {
      if (parsedIntent.search.includes('|')) {
        const terms = parsedIntent.search.split('|').map((t: string) => t.trim()).filter(Boolean);
        const orConditions: any[] = [];
        terms.forEach((term: string) => {
          const r = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          orConditions.push(
            { name: r },
            { phone: r },
            { email: r },
            { location: r },
            { area: r },
            { 'customFields.nickname': r },
            { 'customFields.customer_name': r },
            { 'customFields.primary_merchant': r }
          );
        });
        targetDbQuery.$or = orConditions;
      } else {
        const searchRegex = new RegExp(parsedIntent.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        targetDbQuery.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { location: searchRegex },
          { area: searchRegex },
          { 'customFields.nickname': searchRegex },
          { 'customFields.customer_name': searchRegex },
          { 'customFields.primary_merchant': searchRegex },
        ];
      }
    }

    if (parsedIntent.tag && parsedIntent.tag !== 'All') {
      const tagRegex = new RegExp(`^${parsedIntent.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      targetDbQuery.$or = targetDbQuery.$or || [];
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

    if (parsedIntent.gender && parsedIntent.gender !== 'All') {
      targetDbQuery.gender = parsedIntent.gender;
    }

    if (parsedIntent.minOrderCount) {
      targetDbQuery.orderCount = { $gte: parseInt(parsedIntent.minOrderCount, 10) };
    }

    if (parsedIntent.minOrderAmount) {
      targetDbQuery.orderAmount = { $gte: parseFloat(parsedIntent.minOrderAmount) };
    }

    if (parsedIntent.merchant) {
      targetDbQuery['customFields.primary_merchant'] = new RegExp(parsedIntent.merchant, 'i');
    }

    if (parsedIntent.numberStartsWith) {
      const pfx = buildPhonePrefixRegex(parsedIntent.numberStartsWith);
      if (pfx) targetDbQuery.phone = { $regex: pfx };
    }

    const sortField = parsedIntent.sortBy || 'createdAt';
    const sortDir = parsedIntent.sortOrder === 'asc' ? 1 : -1;
    const fetchLimit = parsedIntent.limit || 10;

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
      RecordModel.countDocuments(targetDbQuery),
      RecordModel.find(targetDbQuery)
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
      // Targeted Live Results
      userQueryAnalysis: {
        criteriaApplied: parsedIntent,
        exactMatchingCount: targetedCount,
        topMatchingRecords: formattedTargetedRecords,
      },
    };

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

    const systemInstruction = `You are "Morpheus AI Copilot", an elite Data Analytics & Executive Assistant for the Morpheus DataFlow platform.
The user is asking you questions or issuing commands about their business dataset in Bengali, English, or Banglish.

LIVE DATABASE ANALYSIS FOR THIS SPECIFIC REQUEST:
${JSON.stringify(liveStatsSummary.userQueryAnalysis, null, 2)}

OVERALL DATABASE STATS:
${JSON.stringify({ totalRecords, totalGMV_BDT: fin.totalGMV, totalOrders: fin.totalOrders, vipCount, whatsappCount }, null, 2)}

INSTRUCTIONS:
1. Speak in the SAME language the user used (Bengali, English, or Banglish). Provide warm, clear, professional formatting.
2. Directly answer the user's specific question using the EXACT "exactMatchingCount" and "topMatchingRecords" from above.
   - Example: If user asked for 20+ orders, state clearly: "আপনার ডাটাবেজে **২০টির বেশি অর্ডার করেছে এমন ${targetedCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!"
   - Always display the matching records in a clean Markdown Table (# | Name | Phone | Orders | Spend BDT | Location/Store).
3. If no matches were found (exactMatchingCount = 0), explain politely with helpful suggestions (spelling variation, different filters).
4. ALWAYS provide "exportPayload", "exportLabel", and "explorerPath" so the user can 1-click download the CSV of these exact results or view them in Data Explorer.

OUTPUT ONLY JSON:
{
  "reply": "Markdown formatted rich response in Bengali/English with exact counts, bullet points, and markdown table",
  "exportPayload": {
    "search": "string",
    "tag": "string",
    "gender": "Female" | "Male" | "All",
    "minOrderAmount": "string",
    "minOrderCount": "string",
    "merchant": "string",
    "sortBy": "orderCount" | "orderAmount" | "createdAt",
    "sortOrder": "desc" | "asc",
    "limit": 10,
    "customFilename": "Custom_Name"
  },
  "exportLabel": "Download CSV Label (${targetedCount} rows)",
  "explorerPath": "/data/explorer?sortBy=orderCount&sortOrder=desc",
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
    const conversationPayload = [
      { role: 'system', content: systemInstruction },
      ...messages.slice(-6).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      })),
    ];

    if (!messages.some((m: any) => m.content === lastMessage)) {
      conversationPayload.push({ role: 'user', content: lastMessage });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const aiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: conversationPayload,
          temperature: 0.2,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            const sanitized = ensureExportAndExplorerPaths(parsed, parsedIntent, targetedCount);

            return NextResponse.json({
              success: true,
              result: sanitized,
              liveStats: liveStatsSummary,
            });
          } catch (pErr) {
            console.error('Failed to parse AI JSON:', pErr);
          }
        }
      }
    } catch (aiErr: any) {
      console.warn('DeepSeek AI Analytics chat API exception, using live dynamic generator:', aiErr?.message);
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

function parseQueryIntent(question: string) {
  const q = question.toLowerCase().trim();

  let search = '';
  let tag = 'All';
  let gender = 'All';
  let minOrderCount = '';
  let minOrderAmount = '';
  let merchant = '';
  let numberStartsWith = '';
  let sortBy = 'createdAt';
  let sortOrder = 'desc';
  let limit = 10;

  // 1. Order Count Detection (e.g. 20+ order, ২০টি অর্ডার, 3+ orders, order >= 5)
  const orderCountMatch = q.match(/(\d+)\s*(?:\+|er\s*besi|টি|ta|barer|bar)?\s*(?:order|অর্ডার)/i) ||
                          q.match(/(?:order|অর্ডার)\s*(?:>=|>|count|সংখ্যা|besi|count)\s*(\d+)/i) ||
                          q.match(/(\d+)\s*\+\s*order/i);
  if (orderCountMatch) {
    const num = parseInt(orderCountMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      minOrderCount = String(num);
      sortBy = 'orderCount';
      sortOrder = 'desc';
    }
  }

  // 2. Spend / Amount Detection (e.g. 10k+, spend > 5000, ৳10000)
  const spendMatch = q.match(/(?:spend|টাকা|খরচ|gmv|amount|>=|>|tk|bdt)\s*(\d+)/i) || q.match(/(\d+)\s*k/i);
  if (spendMatch) {
    let val = spendMatch[1];
    if (spendMatch[0].toLowerCase().includes('k')) {
      val = String(parseInt(val, 10) * 1000);
    }
    minOrderAmount = val;
    if (!sortBy || sortBy === 'createdAt') {
      sortBy = 'orderAmount';
      sortOrder = 'desc';
    }
  }

  // 3. VIP / High Spender
  if (q.includes('vip') || q.includes('ভিআইপি') || q.includes('high spend') || q.includes('টপ বায়ার')) {
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

  // 5. Gender
  if (q.includes('female') || q.includes('নারী') || q.includes('মহিলা') || q.includes('woman') || q.includes('women')) {
    gender = 'Female';
  } else if (q.includes('male') || q.includes('পুরুষ') || q.includes('man') || q.includes('men')) {
    gender = 'Male';
  }

  // 6. Name Search (e.g. "easin name a", "name easin", "rahim namer", "yeasin")
  let extractedName = '';
  const stopWords = ['ki', 'ke', 'ka', 'keu', 'kono', 'user', 'koto', 'list', 'dau', 'dao', 'bolo', 'onek', 'amek', 'amake', 'amader', 'tader', 'oy', 'ta', 'data'];
  const beforeNameMatch = q.match(/([a-zA-Z\u0980-\u09FF]{2,30})\s*(?:name|নাম|নামে|নামের)\b/i);
  const afterNameMatch = q.match(/(?:name|নাম|নামে|নামের)\s*(?:a|e|er|is|hocche)?\s*([a-zA-Z\u0980-\u09FF]{2,30})\b/i);

  if (beforeNameMatch && !stopWords.includes(beforeNameMatch[1].toLowerCase())) {
    extractedName = beforeNameMatch[1].trim();
  } else if (afterNameMatch && !stopWords.includes(afterNameMatch[1].toLowerCase())) {
    extractedName = afterNameMatch[1].trim();
  }

  if (extractedName) {
    const lName = extractedName.toLowerCase();
    if (lName === 'easin' || lName === 'yeasin' || lName === 'iasin') {
      search = 'easin|yeasin|iasin';
    } else {
      search = extractedName;
    }
  }

  // 7. Merchant Search
  if (q.includes('beautybaaz')) {
    merchant = 'BeautyBaaz';
  } else if (q.includes('fashionable dresses')) {
    merchant = 'Fashionable Dresses';
  }

  // 8. Location Search
  if (q.includes('dhaka') || q.includes('ঢাকা')) {
    search = search ? `${search}|Dhaka` : 'Dhaka';
  } else if (q.includes('keraniganj') || q.includes('কেরানীগঞ্জ')) {
    search = search ? `${search}|Keraniganj` : 'Keraniganj';
  }

  // 9. Limit
  const limitMatch = q.match(/(?:top|সেরা|টপ|\b)(\d+)\s*(?:জন|joner|ta|records|customers|buyers)?/i);
  if (limitMatch && limitMatch[1]) {
    const num = parseInt(limitMatch[1], 10);
    if (num > 0 && num <= 100) limit = num;
  }

  // 10. Operator
  if (q.includes('gp') || q.includes('grameenphone') || q.includes('017')) {
    numberStartsWith = '88017';
  } else if (q.includes('robi') || q.includes('018')) {
    numberStartsWith = '88018';
  } else if (q.includes('bl') || q.includes('banglalink') || q.includes('019')) {
    numberStartsWith = '88019';
  }

  return {
    search,
    tag,
    gender,
    minOrderCount,
    minOrderAmount,
    merchant,
    numberStartsWith,
    sortBy,
    sortOrder,
    limit,
  };
}

function ensureExportAndExplorerPaths(parsed: any, intent: any, totalCount: number) {
  const res = { ...parsed };

  if (!res.exportPayload) {
    res.exportPayload = {
      search: intent.search || undefined,
      tag: intent.tag !== 'All' ? intent.tag : undefined,
      gender: intent.gender !== 'All' ? intent.gender : undefined,
      minOrderCount: intent.minOrderCount || undefined,
      minOrderAmount: intent.minOrderAmount || undefined,
      merchant: intent.merchant || undefined,
      numberStartsWith: intent.numberStartsWith || undefined,
      sortBy: intent.sortBy || 'orderCount',
      sortOrder: intent.sortOrder || 'desc',
      limit: intent.limit || 10,
      customFilename: intent.minOrderCount ? `Top_Order_Count_${intent.minOrderCount}Plus` : `Filtered_Dataset`,
    };
  }

  if (!res.exportLabel) {
    res.exportLabel = `Download Results CSV (${totalCount.toLocaleString()} matching rows)`;
  }

  if (!res.explorerPath) {
    const params = new URLSearchParams();
    if (res.exportPayload.search) params.set('search', res.exportPayload.search);
    if (res.exportPayload.gender) params.set('gender', res.exportPayload.gender);
    if (res.exportPayload.tag) params.set('tag', res.exportPayload.tag);
    if (res.exportPayload.minOrderCount) params.set('minOrderCount', String(res.exportPayload.minOrderCount));
    if (res.exportPayload.minOrderAmount) params.set('minOrderAmount', String(res.exportPayload.minOrderAmount));
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
  let title = `📊 **আপনার রিকোয়েস্ট অনুযায়ী ডাটাবেজ অ্যানালাইসিস:**`;
  let description = '';

  if (intent.minOrderCount) {
    title = `📦 **${intent.minOrderCount}+ অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = `আপনার লাইভ ডাটাবেজে **${intent.minOrderCount} টির বেশি অর্ডার সম্পন্ন করেছে এমন মোট ${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের মধ্যে শীর্ষ কাস্টমারদের তালিকা নিচে দেওয়া হলো:`;
  } else if (intent.search) {
    title = `🔍 **"${intent.search}" সম্পর্কিত কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে "${intent.search}" এর সাথে ম্যাচিং **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!`
      : `আপনার ডাটাবেজে "${intent.search}" নামে কোনো সরাসরি রেকর্ড পাওয়া যায়নি। সম্ভাব্য বানান বা অন্য ফিল্টার ট্রাই করতে পারেন।`;
  } else if (intent.gender === 'Female') {
    title = `👩 **ফিমেল কাস্টমার অ্যানালাইসিস:**`;
    description = `আপনার ডাটাবেজে মোট **${matchingCount.toLocaleString()} জন ফিমেল কাস্টমার** রয়েছেন।`;
  } else {
    description = `আপনার রিকোয়েস্ট অনুযায়ী ডাটাবেজে **${matchingCount.toLocaleString()} টি রেকর্ড** ফিল্টার ও সর্ট করা হয়েছে:`;
  }

  // Generate clean Markdown Table if records exist
  let tableMarkdown = '';
  if (records.length > 0) {
    tableMarkdown = `\n\n| # | নাম | ফোন নম্বর | মোট অর্ডার | মোট স্পেন্ড (BDT) | লোকেশন / মার্চেন্ট |\n|---|---|---|---|---|---|\n` +
      records.map((r, idx) => `| ${idx + 1} | **${r.name}** | \`${r.phone}\` | **${r.orderCount}** টি | ৳${Number(r.orderAmount || 0).toLocaleString()} | ${r.location} (${r.primaryMerchant}) |`).join('\n');
  }

  const reply = `${title}\n\n${description}${tableMarkdown}\n\n💡 *নিচের বাটনগুলোতে ক্লিক করে আপনি সম্পূর্ণ ${matchingCount.toLocaleString()} টি রো এর CSV ডাউনলোড করতে পারবেন অথবা Data Explorer-এ লাইভ দেখতে পারবেন।*`;

  const exportPayload = {
    search: intent.search || undefined,
    tag: intent.tag !== 'All' ? intent.tag : undefined,
    gender: intent.gender !== 'All' ? intent.gender : undefined,
    minOrderCount: intent.minOrderCount || undefined,
    minOrderAmount: intent.minOrderAmount || undefined,
    merchant: intent.merchant || undefined,
    sortBy: intent.sortBy || 'orderCount',
    sortOrder: intent.sortOrder || 'desc',
    limit: intent.limit || 10,
    customFilename: intent.minOrderCount ? `Top_${intent.minOrderCount}Plus_Orders` : 'Filtered_Records',
  };

  const params = new URLSearchParams();
  if (exportPayload.search) params.set('search', exportPayload.search);
  if (exportPayload.gender) params.set('gender', exportPayload.gender);
  if (exportPayload.tag) params.set('tag', exportPayload.tag);
  if (exportPayload.minOrderCount) params.set('minOrderCount', String(exportPayload.minOrderCount));
  if (exportPayload.sortBy) params.set('sortBy', exportPayload.sortBy);
  if (exportPayload.sortOrder) params.set('sortOrder', exportPayload.sortOrder);

  return {
    reply,
    exportPayload,
    exportLabel: `Download ${matchingCount.toLocaleString()} Records CSV`,
    explorerPath: `/data/explorer?${params.toString()}`,
    keyMetrics: [
      { label: 'ম্যাচিং কাস্টমার', value: `${matchingCount.toLocaleString()} জন`, subtext: 'Matching criteria' },
      { label: 'মোট ডাটাবেজ', value: `${(stats.totalRecords || 2361).toLocaleString()} জন`, subtext: 'Full dataset' },
      { label: 'ফিল্টার টাইপ', value: intent.sortBy === 'orderCount' ? 'Highest Orders' : 'Smart Filter', subtext: 'Sorted' },
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
