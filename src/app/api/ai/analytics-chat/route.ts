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

    // 2. RUN TARGETED LIVE MONGODB QUERY FOR THIS SPECIFIC QUESTION
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

    if (!parsedIntent.isConversational && parsedIntent.minOrderCount) {
      targetDbQuery.orderCount = { $gte: parseInt(parsedIntent.minOrderCount, 10) };
    }

    if (!parsedIntent.isConversational && parsedIntent.minOrderAmount) {
      targetDbQuery.orderAmount = { $gte: parseFloat(parsedIntent.minOrderAmount) };
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
The user is conversing with you or querying their live business dataset in Bengali, English, or Banglish.

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

INSTRUCTIONS & CAPABILITIES (BEHAVE LIKE A GENUINE HUMAN ASSISTANT / CHATGPT):
1. HUMAN CONVERSATION & GREETINGS:
   - If the user sends a greeting (e.g. "hi", "hello", "kemon aso", "who are you", "what can you do", "thanks", "bujso"):
     - Respond warmly, naturally, and smartly in fluent Bengali/English.
     - NEVER say "no keyword data found" for greetings!
     - Introduce yourself as their live Morpheus AI Copilot with ${totalRecords.toLocaleString()} real-time customer records connected.
     - Suggest 3 concrete, powerful questions they can ask (e.g. VIP clients, top repeat buyers, WhatsApp segmentation).
     - Set "type": "chat".

2. MULTI-TURN CONVERSATIONS & MICRO-REFINEMENTS (CONTEXT RETENTION):
   - When the user asks a follow-up or refinement on previous data (e.g., "ar modde jader order 15 plus tader ta sud dua", "tader modde female kara", "017 number kotojon"):
     - UNDERSTAND that this query is a micro-filter applied to the PREVIOUS customer set (e.g., matching the specific name/keyword previously queried).
     - Clearly acknowledge the active search/name context and explain how many of those specific customers meet the new condition.
     - STRICT ACCURACY RULE: Always use "userQueryAnalysis" -> "exactMatchingCount" as the single source of truth for the exact number of matching customers.

3. DATA & ANALYTICAL QUERIES:
   - If user asked for order counts, phone prefix/suffix, areas, categories, or names:
     - STRICT ACCURACY: Use the exact count from exactMatchingCount.
     - NEVER hallucinate, guess, or dump unrelated database records!
     - If "exactMatchingCount" === 0:
       - Explain politely and honestly in fluent Bengali (e.g. "না স্যার, আপনার ডাটাবেজে এই নির্দিষ্ট শর্ত বা তথ্যের কোনো ডাটা খুঁজে পাওয়া যায়নি। আপনি কি অন্য কোনো ফিল্টার বা নাম্বার দিয়ে দেখতে চান?").
       - DO NOT render a table of unrelated records when 0 matches exist!
       - Set "type": "data_query".
     - If "exactMatchingCount" > 0:
       - Clearly state the exact count in bold Bengali.
       - If exactMatchingCount > formattedTargetedRecords.length:
         - State clearly: "নিচে শীর্ষ ${formattedTargetedRecords.length} জনের তালিকা দেওয়া হলো (সম্পূর্ণ ${targetedCount} জনের ফাইল দেখতে নিচের বাটনে ক্লিক করুন):"
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
    "minOrderCount": "string",
    "merchant": "string",
    "numberStartsWith": "string",
    "numberEndsWith": "string",
    "sortBy": "orderCount" | "orderAmount" | "createdAt",
    "sortOrder": "desc" | "asc",
    "limit": 10,
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
  isConversational: boolean;
  search: string;
  searchField: 'name' | 'address' | 'merchant' | 'any';
  tag: string;
  gender: string;
  minOrderCount: string;
  minOrderAmount: string;
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
  const q = normalizedQ;

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
  let minOrderAmount = '';
  let merchant = '';
  let numberStartsWith = '';
  let numberEndsWith = '';
  let sortBy = 'createdAt';
  let sortOrder: 'asc' | 'desc' = 'desc';
  let limit = 10;

  if (isConversational) {
    return {
      isConversational: true,
      search: '',
      searchField: 'any',
      tag: 'All',
      gender: 'All',
      minOrderCount: '',
      minOrderAmount: '',
      merchant: '',
      numberStartsWith: '',
      numberEndsWith: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 10,
    };
  }

  // 1. Order Count Detection (handles "order plased 100", "order placed 100", "100 order", "order >= 50", "20+ order", "২০টি অর্ডার", "order 15 plus", "15+ order")
  const orderCountMatch =
    q.match(/(?:order|অর্ডার)\s*(?:placed|plased|count|সংখ্যা|complete|কমপ্লিট|kora|করা|হয়েছে|hoise|besi|বেশি|অধিক|>=|>|:|=)?\s*(\d+)\s*(?:\+|plus)?/i) ||
    q.match(/(\d+)\s*(?:টির|টি|ta|er|বারের|বার)?\s*(?:besi|বেশি|অধিক|placed|plased|\+|plus)?\s*(?:order|অর্ডার)/i) ||
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

  // 2. Spend / Amount Detection (e.g. 10k+, spend > 5000, ৳10000, 50000 taka)
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
  } else if (q.includes('phone') || q.includes('mobile') || q.includes('number') || q.includes('নম্বর')) {
    const phoneMatch = q.match(/(?:\+?(?:880|0)?1[3-9]\d{1,11})/);
    if (phoneMatch) {
      numberStartsWith = phoneMatch[0].replace(/^\+/, '');
    }
  }

  // 11. Multi-turn Merge & Follow-up Micro-Refinement Support
  if (history && history.length > 0) {
    const isRefinement =
      q.includes('ar moddhe') ||
      q.includes('ar modde') ||
      q.includes('ar modhe') ||
      q.includes('tader moddhe') ||
      q.includes('tader modde') ||
      q.includes('tader modhe') ||
      q.includes('tader') ||
      q.includes('ar maje') ||
      q.includes('er moddhe') ||
      q.includes('er modde') ||
      q.includes('er modhe') ||
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
      (!search && (minOrderCount || minOrderAmount || gender !== 'All' || tag !== 'All' || numberStartsWith || numberEndsWith));

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
        if (!minOrderCount && prevIntent.minOrderCount) minOrderCount = prevIntent.minOrderCount;
        if (!minOrderAmount && prevIntent.minOrderAmount) minOrderAmount = prevIntent.minOrderAmount;
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
    !minOrderAmount &&
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
    isConversational: false,
    search,
    searchField,
    tag,
    gender,
    minOrderCount,
    minOrderAmount,
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
      minOrderAmount: intent.minOrderAmount || undefined,
      merchant: intent.merchant || undefined,
      numberStartsWith: intent.numberStartsWith || undefined,
      numberEndsWith: intent.numberEndsWith || undefined,
      sortBy: intent.sortBy || 'orderCount',
      sortOrder: intent.sortOrder || 'desc',
      limit: intent.limit || 10,
      customFilename: intent.search
        ? `Records_${intent.search.replace(/\|/g, '_')}`
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

  if (intent.search && intent.minOrderCount) {
    title = `📦 **"${searchDisplay}" নাম/কীওয়ার্ডে ${intent.minOrderCount}+ অর্ডার সম্পন্নকারী কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে **"${searchDisplay}"** যাদের মধ্যে **${intent.minOrderCount} টির বেশি অর্ডার** রয়েছে এমন মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!\n\nতাদের প্রিভিউ তালিকা নিচে দেওয়া হলো:`
      : `না স্যার, আপনার ডাটাবেজে "${searchDisplay}" নাম/কীওয়ার্ডে ${intent.minOrderCount} টির বেশি অর্ডার করেছে এমন কোনো কাস্টমার খুঁজে পাওয়া যায়নি।`;
  } else if (intent.search && intent.gender && intent.gender !== 'All') {
    title = `👩 **"${searchDisplay}" নাম/কীওয়ার্ডে ${intent.gender} কাস্টমারদের তথ্য:**`;
    description = matchingCount > 0
      ? `আপনার ডাটাবেজে **"${searchDisplay}"** এর মধ্যে **${intent.gender}** মোট **${matchingCount.toLocaleString()} জন কাস্টমার** পাওয়া গেছে!`
      : `না স্যার, "${searchDisplay}" এর মধ্যে কোনো ${intent.gender} কাস্টমার পাওয়া যায়নি।`;
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
    minOrderAmount: intent.minOrderAmount || undefined,
    merchant: intent.merchant || undefined,
    numberStartsWith: intent.numberStartsWith || undefined,
    numberEndsWith: intent.numberEndsWith || undefined,
    sortBy: intent.sortBy || 'orderCount',
    sortOrder: intent.sortOrder || 'desc',
    limit: intent.limit || 10,
    customFilename: intent.search
      ? `Records_${intent.search.replace(/\|/g, '_')}`
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
