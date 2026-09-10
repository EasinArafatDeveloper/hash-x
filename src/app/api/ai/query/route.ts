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

        const systemPrompt = `You are a Smart Data Query & Sequence Discovery Conversational AI for Morpheus DataFlow.
The user may chat with you in English, Bengali, or Banglish (e.g. "amake tume top 10 vip and high order korsa ay rkomer 10 joner list dau", "dhakar female high spender der list dao", "BeautyBaaz orders").

AVAILABLE DATASET TAGS: ${JSON.stringify(availableTags)}

YOUR GOAL:
Understand the user's free-form request in ANY format/language, formulate the exact filter criteria, limit, sorting, and provide a friendly conversational response in the user's language (Bengali/English).

POSSIBLE PARAMETERS:
- "search": Keywords (e.g. "Keraniganj", "BeautyBaaz", "Dhaka")
- "tag": Exact matching tag (e.g. "VIP Client", "WhatsApp Active", "Hot Leads", "Corporate Lead")
- "gender": "Female" | "Male" | "All"
- "numberStartsWith": e.g. "88017", "88018", "88019", "88015", "88016", "017", "018", "019"
- "minOrderAmount": number string (e.g. "10000")
- "maxOrderAmount": number string
- "minOrderCount": number string (e.g. "3")
- "maxOrderCount": number string
- "merchant": name of store/vendor (e.g. "BeautyBaaz", "Emotion 'B a z a a r'")
- "maxActiveDays": number string (e.g. "7")
- "minAge": number string
- "maxAge": number string
- "limit": number (e.g. 10 if user asks for top 10 / 10 জন / 10 joner list, 5 for top 5, 20 for top 20, default 25)
- "sortBy": "orderAmount" | "orderCount" | "createdAt" | "lastActive" | "name" (use "orderCount" for high order/frequency, "orderAmount" for high spend/VIP spenders)
- "sortOrder": "desc" | "asc"
- "reply": Conversational response in Bengali/English explaining what you found and sorted.
- "sequenceSteps": Array of 3-5 sequence steps (e.g. ["1. ⭐ VIP Client", "2. 📦 High Orders (≥ 3)", "3. 📊 Sort: Highest Order Count First", "4. 🎯 Limit: Top 10 Customers"])
- "summaryBn": 1-2 sentence friendly summary in Bengali explaining the result.

OUTPUT ONLY JSON:
{
  "reply": "Conversational markdown response with explanation and table",
  "search": "string",
  "tag": "string",
  "gender": "Female" | "Male" | "All",
  "numberStartsWith": "string",
  "minOrderAmount": "string",
  "maxOrderAmount": "string",
  "minOrderCount": "string",
  "maxOrderCount": "string",
  "merchant": "string",
  "maxActiveDays": "string",
  "minAge": "string",
  "maxAge": "string",
  "limit": 10,
  "sortBy": "orderAmount" | "orderCount" | "createdAt" | "lastActive",
  "sortOrder": "desc" | "asc",
  "sequenceSteps": ["step 1", "step 2", "step 3"],
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

    // 2. Query MongoDB Live Records for preview
    const dbQuery: any = {};
    if (parsedResult.search) {
      const searchRegex = new RegExp(parsedResult.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      dbQuery.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { location: searchRegex },
        { area: searchRegex },
        { 'customFields.primary_merchant': searchRegex },
      ];
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
      location: r.location || 'Keraniganj',
      primaryMerchant: r.customFields?.primary_merchant || 'Eferiwala / Multi-store',
    }));

    const exportLabel = `Download Top ${recordsPreview.length} CSV (${recordsPreview.length} rows)`;

    return NextResponse.json({
      success: true,
      result: {
        ...parsedResult,
        aiQueryText: cleanPrompt,
        matchingCount: totalCount,
        recordsPreview,
        exportPayload: {
          search: parsedResult.search,
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

  // High order detection
  if (lp.includes('high order') || lp.includes('বেশি অর্ডার') || lp.includes('order count') || lp.includes('ফ্রিকোয়েন্ট') || lp.includes('frequent')) {
    sortBy = 'orderCount';
    sortOrder = 'desc';
    minOrderCount = '3';
    sequenceSteps.push('📦 Filter: 3+ Lifetime Orders');
    sequenceSteps.push('📊 Sort: Highest Order Count First');
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
