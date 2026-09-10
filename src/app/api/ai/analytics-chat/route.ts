import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';

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

    // 1. Fetch Real-time Live Snapshot from MongoDB
    const [
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
    };

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

    const systemInstruction = `You are "Morpheus AI Copilot", an elite Data Analytics & Business Intelligence Assistant inside the enterprise DataFlow platform.
The user is talking to you directly on their admin dashboard to get real-time analytics, insights, breakdowns, comparisons, top customer details, revenue metrics, and data discovery.

CURRENT LIVE DATABASE FACTS (USE THESE EXACT FIGURES):
${JSON.stringify(liveStatsSummary, null, 2)}

INSTRUCTIONS:
1. Always respond in the SAME language the user speaks (Bengali, English, or Banglish). If the user asks in Bengali or Banglish, provide a warm, professional, natural Bengali response with clear formatting.
2. Be precise and quote accurate numbers from the live database facts above.
3. Structure your response clearly using emojis, bold numbers (e.g. **৳২৪,৫০০ BDT**), bullet points, and clean Markdown tables when comparing or listing top customers/merchants.
4. ALWAYS provide "exportPayload", "exportLabel", and "explorerPath" so the user can immediately:
   - Click "Download CSV" to download the exact sorted/filtered CSV of the results.
   - Click "View in Data Explorer" to view the sorted/filtered results on the Data Explorer page.
5. Provide 2-3 smart "followUpQuestions" related to the query.

OUTPUT ONLY JSON:
{
  "reply": "Markdown formatted rich response in Bengali/English with facts, breakdown, and insights. (Include markdown tables for lists)",
  "exportPayload": {
    "search": "Keraniganj",
    "tag": "VIP Client",
    "gender": "Female" | "Male" | "All",
    "minOrderAmount": "10000",
    "minOrderCount": "3",
    "merchant": "BeautyBaaz",
    "sortBy": "orderAmount" | "orderCount" | "createdAt" | "lastActive",
    "sortOrder": "desc" | "asc",
    "limit": 5,
    "customFilename": "Top_5_VIP_Spenders"
  },
  "exportLabel": "Download Top 5 VIP Spenders CSV (5 rows)",
  "explorerPath": "/data/explorer?sortBy=orderAmount&sortOrder=desc",
  "keyMetrics": [
    { "label": "Short Metric Name", "value": "Formatted Value", "subtext": "Brief detail" }
  ],
  "suggestedActions": [
    { "label": "Action Button Label", "path": "/data/explorer?sortBy=orderAmount&sortOrder=desc" }
  ],
  "followUpQuestions": [
    "Next related question 1?",
    "Next related question 2?"
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
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const aiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: conversationPayload,
          temperature: 0.3,
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

            // Ensure exportPayload and explorerPath exist
            const sanitized = ensureExportAndExplorerPaths(parsed, lastMessage);

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
      console.warn('DeepSeek AI Analytics chat API error:', aiErr?.message);
    }

    // Fallback Heuristic Response if AI API times out
    const fallbackReply = generateFallbackAnalyticsReply(lastMessage, liveStatsSummary);

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

function ensureExportAndExplorerPaths(parsed: any, question: string) {
  const q = question.toLowerCase();
  const res = { ...parsed };

  if (!res.exportPayload) {
    const isSpenderQuery = q.includes('spend') || q.includes('টপ') || q.includes('vip') || q.includes('খরচ');
    const isFemaleQuery = q.includes('female') || q.includes('নারী') || q.includes('ফিমেল');
    const isKeraniganj = q.includes('keraniganj') || q.includes('কেরানীগঞ্জ');

    res.exportPayload = {
      search: isKeraniganj ? 'Keraniganj' : '',
      gender: isFemaleQuery ? 'Female' : undefined,
      sortBy: isSpenderQuery ? 'orderAmount' : 'createdAt',
      sortOrder: 'desc',
      limit: q.includes('৫') || q.includes('5') ? 5 : q.includes('১০') || q.includes('10') ? 10 : undefined,
      customFilename: isSpenderQuery ? 'Top_VIP_Spenders' : 'Filtered_Dataset',
    };
  }

  if (!res.exportLabel) {
    res.exportLabel = `Download Sorted CSV (${res.exportPayload.limit ? `${res.exportPayload.limit} rows` : 'Matching'})`;
  }

  if (!res.explorerPath) {
    const params = new URLSearchParams();
    if (res.exportPayload.search) params.set('search', res.exportPayload.search);
    if (res.exportPayload.gender) params.set('gender', res.exportPayload.gender);
    if (res.exportPayload.tag) params.set('tag', res.exportPayload.tag);
    if (res.exportPayload.minOrderAmount) params.set('minOrderAmount', String(res.exportPayload.minOrderAmount));
    if (res.exportPayload.sortBy) params.set('sortBy', res.exportPayload.sortBy);
    if (res.exportPayload.sortOrder) params.set('sortOrder', res.exportPayload.sortOrder);
    res.explorerPath = `/data/explorer?${params.toString()}`;
  }

  return res;
}

function generateFallbackAnalyticsReply(question: string, stats: any) {
  const q = question.toLowerCase();

  const totalRec = stats.totalRecords || 0;
  const gmv = (stats.totalGMV_BDT || 0).toLocaleString();
  const vipCount = stats.vipCustomersCount || 0;
  const waCount = stats.whatsappActiveCount || 0;

  if (q.includes('female') || q.includes('নারী') || q.includes('ফিমেল') || q.includes('gender') || q.includes('জেন্ডার')) {
    const females = stats.genderBreakdown.find((g: any) => g.gender === 'Female')?.count || 0;
    const males = stats.genderBreakdown.find((g: any) => g.gender === 'Male')?.count || 0;
    const femalePct = totalRec > 0 ? Math.round((females / totalRec) * 100) : 0;

    return {
      reply: `📊 **জেন্ডার ও ডেমোগ্রাফিক অ্যানালিটিক্স:**\n\n- 👩 **ফিমেল কাস্টমার:** **${females.toLocaleString()} জন** (${femalePct}%)\n- 👨 **মেল কাস্টমার:** **${males.toLocaleString()} জন**\n- 📦 **মোট কাস্টমার:** **${totalRec.toLocaleString()} জন**\n\nফিমেল কাস্টমারদের সংখ্যা সবচেয়ে বেশি এবং তাদের মধ্যে সক্রিয় ক্রেতার সংখ্যাও উল্লেখযোগ্য।`,
      keyMetrics: [
        { label: 'ফিমেল কাস্টমার', value: `${females.toLocaleString()}`, subtext: `${femalePct}% of total` },
        { label: 'মোট স্পেন্ড', value: `৳${gmv} BDT`, subtext: 'Lifetime GMV' },
      ],
      suggestedActions: [
        { label: '👩 View All Female Shoppers', path: '/data/explorer?gender=Female' },
        { label: '⭐ View Female VIPs', path: '/data/explorer?gender=Female&tag=VIP+Client' },
      ],
      followUpQuestions: [
        'ফিমেল কাস্টমারদের মধ্যে কতজন হোয়াটসঅ্যাপে সক্রিয়?',
        'টপ ৫ জন সর্বোচ্চ খরচ করা ফিমেল কাস্টমার কারা?',
      ],
    };
  }

  if (q.includes('spend') || q.includes('টাকা') || q.includes('খরচ') || q.includes('gmv') || q.includes('revenue') || q.includes('সেলস') || q.includes('order')) {
    return {
      reply: `💰 **আর্থিক ও অর্ডার ওভারভিউ:**\n\n- 💎 **মোট লাইফটাইম GMV / স্পেন্ড:** **৳${gmv} BDT**\n- 📦 **মোট অর্ডার সংখ্যা:** **${(stats.totalOrders || 0).toLocaleString()} টি**\n- 🏷️ **গড় অর্ডার ভ্যালু (AOV):** **৳${(stats.avgOrderValue_BDT || 0).toLocaleString()} BDT**\n- 👑 **সর্বোচ্চ একক স্পেন্ড:** **৳${(stats.maxSingleCustomerSpend_BDT || 0).toLocaleString()} BDT**`,
      keyMetrics: [
        { label: 'Total GMV', value: `৳${gmv}`, subtext: 'Lifetime Revenue' },
        { label: 'Total Orders', value: `${(stats.totalOrders || 0).toLocaleString()}`, subtext: 'Processed' },
      ],
      suggestedActions: [
        { label: '💎 Explore High Spenders (≥ ৳10k)', path: '/data/explorer?minOrderAmount=10000' },
        { label: '📦 Frequent Buyers (3+ Orders)', path: '/data/explorer?minOrderCount=3' },
      ],
      followUpQuestions: [
        'টপ ৫ জন সর্বোচ্চ স্পেন্ড করা VIP কাস্টমার কারা?',
        'কোন স্টোর বা মার্চেন্ট থেকে সবচেয়ে বেশি সেলস আসছে?',
      ],
    };
  }

  return {
    reply: `👋 **মর্ফিয়াস AI অ্যানালিটিক্স অ্যাসিস্ট্যান্টে স্বাগতম!**\n\nআপনার ডাটাবেজের বর্তমান স্ট্যাটাস:\n\n- 📁 **মোট ডেটা রেকর্ড:** **${totalRec.toLocaleString()} জন**\n- 💎 **মোট লাইফটাইম স্পেন্ড:** **৳${gmv} BDT**\n- ⭐ **ভিআইপি ক্লায়েন্ট:** **${vipCount.toLocaleString()} জন**\n- 💬 **হোয়াটসঅ্যাপ অ্যাক্টিভ:** **${waCount.toLocaleString()} জন**\n\nআপনি ডাটা সম্পর্কিত যেকোনো প্রশ্ন করতে পারেন, যেমন: এরিয়া ভিত্তিক হিসাব, টপ স্পেন্ডার, মার্চেন্ট সেলস বা কাস্টমার ক্যাটাগরি।`,
    keyMetrics: [
      { label: 'Total Records', value: `${totalRec.toLocaleString()}`, subtext: 'Live database' },
      { label: 'Total GMV', value: `৳${gmv}`, subtext: 'Lifetime spend' },
      { label: 'VIP Clients', value: `${vipCount.toLocaleString()}`, subtext: 'High value' },
    ],
    suggestedActions: [
      { label: '🔍 Data Explorer এ সব ডেটা দেখুন', path: '/data/explorer' },
      { label: '⭐ VIP কাস্টমারদের ফিল্টার করুন', path: '/data/explorer?tag=VIP+Client' },
    ],
    followUpQuestions: [
      'আমাদের ডাটার জেন্ডার ও এরিয়া ডেমোগ্রাফিক্স কেমন?',
      'টপ ৫ জন সর্বোচ্চ স্পেন্ড করা কাস্টমার কারা?',
      'কোন টেলিকম অপারেটরের (GP, Robi, BL) ইউজার বেশি?',
    ],
  };
}
