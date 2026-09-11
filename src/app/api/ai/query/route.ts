import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import { buildPhonePrefixRegex } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt = '', messages = [], availableTags = [], availableDatasets = [] } = body || {};

    const cleanPrompt = String(prompt || (messages.length > 0 ? messages[messages.length - 1].content : '')).trim();
    if (!cleanPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    await connectToDatabase();

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

    // 1. Fallback Heuristic Parser
    const fallbackParsed = parseNaturalLanguageHeuristics(cleanPrompt, availableTags);

    let parsedResult = fallbackParsed;

    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const systemPrompt = `You are a friendly, conversational AI Data Assistant for Morpheus DataFlow — like a helpful colleague who knows the database inside out.
The user chats with you in English, Bengali, or Banglish. Reply naturally and warmly in their language.

AVAILABLE DATASET TAGS: ${JSON.stringify(availableTags)}

PARAMETERS TO EXTRACT:
- "search": One name/keyword OR multiple names joined by | for OR search.
  MULTI-NAME RULE: If the user asks for multiple names (e.g. "Musa and Samiya", "Musa ba Samiya"), set search as "Musa|Samiya" (pipe-separated). Single keyword: "Dhaka", "BeautyBaaz".
- "searchField": Which field to search — "name" | "address" | "any" (default "any").
- "tag": Exact tag from available tags (e.g. "VIP Client", "WhatsApp Active", "Hot Leads")
- "gender": "Female" | "Male" | "All"
- "numberStartsWith": "88017" | "88018" | "88019" | "017" | "018" etc.
- "minOrderAmount": minimum spend (number string)
- "maxOrderAmount": maximum spend (number string)
- "minOrderCount": minimum orders (number string, e.g. "3")
- "maxOrderCount": maximum orders
- "merchant": store/vendor name
- "maxActiveDays": days since last active
- "minAge": minimum age
- "maxAge": maximum age
- "limit": number of records (default 25, use 10 for "top 10", 5 for "top 5" etc.)
- "sortBy": "orderAmount" | "orderCount" | "createdAt" | "lastActive" | "name"
- "sortOrder": "desc" | "asc"
- "reply": Warm, conversational reply in the user's language. Be friendly and specific.
- "sequenceSteps": 3-5 short step labels showing the filter logic applied.
- "summaryBn": 1-2 sentence Bengali/Banglish friendly summary.
- "needsClarification": boolean — true ONLY when field is ambiguous (see rule below).
- "clarificationQuestion": question to ask the user (Bengali/Banglish) when needsClarification is true.
- "clarificationOptions": array of choice labels e.g. ["শুধু নাম দিয়ে খুঁজবো", "শুধু এলাকা/ঠিকানায় খুঁজবো", "সব জায়গায় খুঁজবো"].
- "clarificationSearch": the ambiguous search term (same as search).

REVENUE & TARGETING RULE: When the user asks about "best customers to target", "revenue", "high value customers", "repeat buyers", "বেশি order", "target করব", "revenue পাবো", "valo revenue", "frequent buyers", "loyal customers", "sob theke besi order", "most ordered", "top buyers", "highest spend" — you MUST apply meaningful filters to give an actionable list:
- Set minOrderCount: "3" (3+ orders = proven repeat buyer)
- Set sortBy: "orderAmount", sortOrder: "desc"  ← SORT BY MONEY SPENT, not order count
- Set limit: 50
- Reply must be warm and specific about WHY these customers are valuable for revenue targeting.
- sequenceSteps: ["📦 3+ Lifetime Orders", "💰 Sort: Highest Lifetime Spend First", "🎯 Revenue Targeting List"]

FIELD DETECTION RULE (CRITICAL — decide searchField first):
1. NAME EXPLICIT: If the user's query contains "name", "নাম", "namer", "নামে", "নামের", "naam", "namic" → set searchField: "name". Search ONLY name/nickname field. Never search address. Example: "Abdullah name a kau asa" → searchField: "name", search: "Abdullah".
2. ADDRESS EXPLICIT: If the user's query mentions "area", "এলাকা", "location", "address", "ঠিকানা", "zone", "te ase", "তে আছে" → set searchField: "address".
3. AMBIGUOUS — ask clarification: When the user gives a SINGLE SHORT WORD with NO field indicator AND that word could reasonably match both a person's name AND a place/address (e.g., a word that is both a common name and part of an area name like "Abdullahpur"). In this case set needsClarification: true, clarificationSearch to the term, clarificationQuestion in Bengali, and clarificationOptions array. DO NOT run a search when needsClarification is true.
4. CLEAR NAME: For clearly personal names with no ambiguity (e.g., "Musa", "Samiya", "Maria", "Karim", "Rahim") when context suggests person lookup → set searchField: "name" directly (no clarification).
5. If the user has just clicked a clarification option (conversation history shows a previous clarification question and user's follow-up choice), extract their choice and set searchField accordingly.

CONVERSATION STYLE:
- Be warm and conversational: "পেয়ে গেছি! Musa এবং Samiya নামে মোট X জন আছেন:"
- Never be robotic. Acknowledge what the user asked for.
- If user says thanks or asks a follow-up, respond naturally.

OUTPUT ONLY VALID JSON (no markdown, no explanation outside JSON):
{
  "reply": "friendly conversational response",
  "search": "keyword or Name1|Name2 for multi-name OR",
  "searchField": "any",
  "needsClarification": false,
  "clarificationQuestion": "",
  "clarificationOptions": [],
  "clarificationSearch": "",
  "tag": "All",
  "gender": "All",
  "numberStartsWith": "",
  "minOrderAmount": "",
  "maxOrderAmount": "",
  "minOrderCount": "",
  "maxOrderCount": "",
  "merchant": "",
  "maxActiveDays": "",
  "minAge": "",
  "maxAge": "",
  "limit": 25,
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "sequenceSteps": ["step 1", "step 2"],
  "summaryBn": "বাংলা সামারি"
}`;

        const conversation = [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-4).map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
          })),
        ];

        if (!messages.some((m: any) => m.content === cleanPrompt)) {
          conversation.push({ role: 'user', content: cleanPrompt });
        }

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: conversation,
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            parsedResult = {
              ...fallbackParsed,
              ...parsed,
            };
          }
        }
      } catch (err) {
        console.warn('DeepSeek AI natural query exception, using rule fallback:', err);
      }
    }

    // 1b. Early return for clarification — don't query DB yet
    if (parsedResult.needsClarification) {
      const clarTerm = parsedResult.clarificationSearch || parsedResult.search || '';
      return NextResponse.json({
        success: true,
        result: {
          reply: parsedResult.clarificationQuestion || `"${clarTerm}" দিয়ে কোন field এ খুঁজবো?`,
          needsClarification: true,
          clarificationQuestion: parsedResult.clarificationQuestion || `"${clarTerm}" দিয়ে কী খুঁজবেন?`,
          clarificationOptions: parsedResult.clarificationOptions?.length
            ? parsedResult.clarificationOptions
            : ['শুধু নাম দিয়ে খুঁজবো', 'শুধু এলাকা/ঠিকানায় খুঁজবো', 'সব জায়গায় খুঁজবো'],
          clarificationSearch: clarTerm,
          sequenceSteps: ['❓ কোন field এ খুঁজবো?'],
          summaryBn: 'আপনার উত্তর অনুযায়ী সার্চ করা হবে।',
          matchingCount: 0,
          recordsPreview: [],
          noResults: false,
          aiQueryText: cleanPrompt,
        },
      });
    }

    // 2. Query MongoDB Live Records for preview
    const dbQuery: any = {};
    if (parsedResult.search) {
      const rawSearch = parsedResult.search as string;
      const searchField = (parsedResult.searchField as string) || 'any';

      // Multi-name OR search: "Musa|Samiya" → match ANY name
      if (rawSearch.includes('|')) {
        const names = rawSearch.split('|').map((n: string) => n.trim()).filter(Boolean);
        dbQuery.$or = names.flatMap((name: string) => {
          const r = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          return [{ name: r }, { phone: r }, { email: r }];
        });
      } else if (searchField === 'name') {
        // Name-only search — prevents address fields from matching
        const searchRegex = new RegExp(rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        dbQuery.$or = [
          { name: searchRegex },
          { 'customFields.nickname': searchRegex },
        ];
      } else if (searchField === 'address') {
        // Address/area-only search
        const searchRegex = new RegExp(rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        dbQuery.$or = [
          { location: searchRegex },
          { area: searchRegex },
          { address: searchRegex },
          { 'customFields.canonical_address': searchRegex },
          { 'customFields.matched_district_filters': searchRegex },
          { 'customFields.matched_city_filters': searchRegex },
          { 'customFields.matched_area_filters': searchRegex },
        ];
      } else {
        // Omnisearch across all fields (default)
        const searchRegex = new RegExp(rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        dbQuery.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { location: searchRegex },
          { area: searchRegex },
          { email: searchRegex },
          { 'customFields.primary_merchant': searchRegex },
        ];
      }
    }

    if (parsedResult.tag && parsedResult.tag !== 'All') {
      const tagRegex = new RegExp(`^${parsedResult.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      dbQuery.$or = [
        { tags: tagRegex },
        { category: tagRegex },
        { 'customFields.Tag / Label': tagRegex },
      ];
    }

    if (parsedResult.gender && parsedResult.gender !== 'All') {
      dbQuery.gender = parsedResult.gender;
    }

    if (parsedResult.numberStartsWith) {
      const pfx = buildPhonePrefixRegex(parsedResult.numberStartsWith);
      if (pfx) dbQuery.phone = { $regex: pfx };
    }

    if (parsedResult.minOrderAmount) {
      dbQuery.orderAmount = { $gte: parseFloat(parsedResult.minOrderAmount) };
    }

    if (parsedResult.minOrderCount) {
      dbQuery.orderCount = { $gte: parseInt(parsedResult.minOrderCount, 10) };
    }

    if (parsedResult.merchant) {
      dbQuery['customFields.primary_merchant'] = new RegExp(parsedResult.merchant, 'i');
    }

    const sortField = parsedResult.sortBy || 'createdAt';
    const sortDir = parsedResult.sortOrder === 'asc' ? 1 : -1;
    const fetchLimit = parsedResult.limit ? parseInt(String(parsedResult.limit), 10) : 10;

    const [matchingRecords, totalCount] = await Promise.all([
      RecordModel.find(dbQuery)
        .sort({ [sortField]: sortDir })
        .limit(fetchLimit)
        .select('name phone gender orderAmount orderCount location customFields tags')
        .lean(),
      RecordModel.countDocuments(dbQuery),
    ]);

    const recordsPreview = matchingRecords.map((r: any) => ({
      name: r.name,
      phone: r.phone,
      gender: r.gender,
      orderAmount: r.orderAmount || r.customFields?.matched_net_order_amount_bdt || 0,
      orderCount: r.orderCount || r.customFields?.matched_order_count || 0,
      location: r.location || '',
      primaryMerchant: r.customFields?.primary_merchant || '',
    }));

    // ── Override AI reply based on actual DB result ──────────────────
    const searchLabel = parsedResult.search
      ? `"${parsedResult.search.replace(/\|/g, '" বা "')}" নামে`
      : parsedResult.tag && parsedResult.tag !== 'All'
      ? `"${parsedResult.tag}" ট্যাগে`
      : 'এই criteria-তে';

    if (totalCount === 0) {
      parsedResult.reply =
        `দুঃখিত! ${searchLabel} ডাটাবেজে কোনো রেকর্ড পাওয়া যায়নি। ` +
        `অন্য নাম বা ভিন্ন filter দিয়ে আবার চেষ্টা করুন।`;
      parsedResult.summaryBn = `কোনো ম্যাচিং রেকর্ড পাওয়া যায়নি।`;
      parsedResult.sequenceSteps = ['🔍 খোঁজা হয়েছে', '❌ কোনো রেকর্ড পাওয়া যায়নি'];
    } else if (recordsPreview.length > 0) {
      parsedResult.reply =
        `পেয়ে গেছি! ${searchLabel} মোট **${totalCount.toLocaleString()}** জন আছেন। ` +
        `নিচে শীর্ষ ${recordsPreview.length} জনের তালিকা দেওয়া হলো:`;
    }

    const exportLabel = `Download ${recordsPreview.length} Records CSV`;

    return NextResponse.json({
      success: true,
      result: {
        ...parsedResult,
        aiQueryText: cleanPrompt,
        matchingCount: totalCount,
        recordsPreview,
        noResults: totalCount === 0,
        exportPayload: {
          search: parsedResult.search,
          nameWise: parsedResult.searchField === 'name' ? 'true' : undefined,
          tag: parsedResult.tag !== 'All' ? parsedResult.tag : undefined,
          gender: parsedResult.gender !== 'All' ? parsedResult.gender : undefined,
          numberStartsWith: parsedResult.numberStartsWith,
          minOrderAmount: parsedResult.minOrderAmount,
          minOrderCount: parsedResult.minOrderCount,
          merchant: parsedResult.merchant,
          sortBy: parsedResult.sortBy,
          sortOrder: parsedResult.sortOrder,
          limit: parsedResult.limit || fetchLimit,
          customFilename: `Top_${recordsPreview.length}_Results`,
        },
        exportLabel,
      },
    });
  } catch (error: any) {
    console.error('AI Query endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse AI query' },
      { status: 500 }
    );
  }
}

function parseNaturalLanguageHeuristics(prompt: string, availableTags: string[] = []) {
  const lp = prompt.toLowerCase();
  const sequenceSteps: string[] = [];

  let search = '';
  let tag = 'All';
  let gender = 'All';
  let minOrderAmount = '';
  let minOrderCount = '';
  let numberStartsWith = '';
  let sortBy = 'createdAt';
  let sortOrder = 'desc';
  let limit = 25;

  // Limit detection (e.g. top 10, 10 joner, 5 jon, 20 ta)
  const limitMatch = lp.match(/(?:top|সেরা|টপ|\b)(\d+)\s*(?:জন|joner|ta|records|customers|buyers)?/i);
  if (limitMatch && limitMatch[1]) {
    const num = parseInt(limitMatch[1], 10);
    if (num > 0 && num <= 500) {
      limit = num;
      sequenceSteps.push(`🎯 Limit: Top ${num} Customers`);
    }
  }

  // Gender detection
  if (lp.includes('female') || lp.includes('নারী') || lp.includes('মহিলা') || lp.includes('woman') || lp.includes('women')) {
    gender = 'Female';
    sequenceSteps.push('1. ⚧ Gender: Female');
  } else if (lp.includes('male') || lp.includes('পুরুষ') || lp.includes('man') || lp.includes('men')) {
    gender = 'Male';
    sequenceSteps.push('1. ⚧ Gender: Male');
  }

  // VIP detection
  if (lp.includes('vip') || lp.includes('ভিআইপি') || lp.includes('high spender') || lp.includes('স্পেন্ডার')) {
    tag = 'VIP Client';
    sequenceSteps.push('2. ⭐ Tag: VIP Client');
    if (!sortBy || sortBy === 'createdAt') {
      sortBy = 'orderAmount';
      sortOrder = 'desc';
      sequenceSteps.push('3. 💰 Sort: Highest Lifetime Spend First');
    }
  }

  // High order / revenue targeting detection
  const isRevenueTarget =
    lp.includes('high order') || lp.includes('order count') ||
    lp.includes('frequent') || lp.includes('target') ||
    lp.includes('revenue') || lp.includes('loyal') || lp.includes('repeat') ||
    lp.includes('besi order') || lp.includes('beshi order') ||
    lp.includes('sob theke') || lp.includes('most order') ||
    lp.includes('best customer') || lp.includes('valo customer');
  if (isRevenueTarget) {
    sortBy = 'orderAmount';
    sortOrder = 'desc';
    minOrderCount = '3';
    limit = 50;
    sequenceSteps.push('📦 Filter: 3+ Lifetime Orders');
    sequenceSteps.push('💰 Sort: Highest Lifetime Spend First');
    sequenceSteps.push('🎯 Revenue Targeting List');
  }

  // Spend threshold
  const spendMatch = lp.match(/(?:spend|টাকা|খরচ|>=|>|tk|bdt)\s*(\d+)/i) || lp.match(/(\d+)\s*k/i);
  if (spendMatch) {
    let val = spendMatch[1];
    if (spendMatch[0].toLowerCase().includes('k')) {
      val = String(parseInt(val, 10) * 1000);
    }
    minOrderAmount = val;
    sortBy = 'orderAmount';
    sortOrder = 'desc';
    sequenceSteps.push(`💰 Min Spend: ≥ ৳${Number(val).toLocaleString()}`);
  }

  // WhatsApp detection
  if (lp.includes('whatsapp') || lp.includes('হোয়াটসঅ্যাপ') || lp.includes('wp')) {
    tag = 'WhatsApp Active';
    sequenceSteps.push('💬 Channel: WhatsApp Active');
  }

  // Location detection
  if (lp.includes('dhaka') || lp.includes('ঢাকা')) {
    search = 'Dhaka';
    sequenceSteps.push('📍 Location: Dhaka');
  } else if (lp.includes('keraniganj') || lp.includes('কেরানীগঞ্জ')) {
    search = 'Keraniganj';
    sequenceSteps.push('📍 Location: Keraniganj');
  }

  return {
    search,
    searchField: search ? 'any' : '',
    needsClarification: false,
    clarificationQuestion: '',
    clarificationOptions: [] as string[],
    clarificationSearch: '',
    tag,
    gender,
    numberStartsWith,
    minOrderAmount,
    maxOrderAmount: '',
    minOrderCount,
    maxOrderCount: '',
    merchant: '',
    maxActiveDays: '',
    minAge: '',
    maxAge: '',
    limit,
    sortBy,
    sortOrder,
    sequenceSteps: sequenceSteps.length > 0 ? sequenceSteps : ['1. 🔍 Universal Smart Filter'],
    summaryBn: `আপনার প্রম্পট অনুযায়ী ফিল্টার ও সর্ট সিকোয়েন্স প্রয়োগ করা হয়েছে।`,
    reply: `আপনার চাওয়া অনুযায়ী ডাটাবেজ থেকে ফিল্টার এবং সর্ট করে নিচের তালিকায় দেখানো হলো:`,
  };
}
