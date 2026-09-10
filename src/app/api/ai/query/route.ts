import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt = '', availableTags = [], availableDatasets = [] } = body || {};

    const cleanPrompt = String(prompt).trim();
    if (!cleanPrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

    // 1. Fallback Heuristic Parser
    const fallbackParsed = parseNaturalLanguageHeuristics(cleanPrompt, availableTags);

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        result: fallbackParsed,
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const systemPrompt = `You are a Smart Data Query & Sequence Discovery AI for Morpheus DataFlow.
Your task is to convert the user's natural language query (which may be in English, Bengali, or Banglish) into a structured filter sequence and parameters.

AVAILABLE DATASET TAGS: ${JSON.stringify(availableTags)}

POSSIBLE PARAMETERS:
- "search": Keywords to search across Name, Location, Address, Area, Merchant (e.g. "Keraniganj", "BeautyBaaz", "Gulshan")
- "tag": Exact matching tag from available tags or "" (e.g. "VIP Client", "WhatsApp Active", "Hot Leads", "Dhaka Zone", "Female Shoppers")
- "gender": "Female" | "Male" | "All"
- "numberStartsWith": e.g. "88017", "88018", "88019", "88015", "88016", "017", "018", "019"
- "minOrderAmount": number string (e.g. "10000" for spend >= 10k)
- "maxOrderAmount": number string
- "minOrderCount": number string (e.g. "3" for 3+ orders)
- "maxOrderCount": number string
- "merchant": name of store/vendor (e.g. "BeautyBaaz", "Emotion 'B a z a a r'")
- "maxActiveDays": number string (e.g. "7" for active this week)
- "minAge": number string
- "maxAge": number string
- "sortBy": "orderAmount" | "orderCount" | "createdAt" | "lastActive" | "name"
- "sortOrder": "desc" | "asc"
- "sequenceSteps": Array of 3-5 clear human-readable sequence steps (e.g. ["1. 📍 Location / Area: Keraniganj", "2. ⚧ Gender: Female", "3. 💬 Channel: WhatsApp Active", "4. 💰 Minimum Spend: ≥ ৳10,000", "5. 📊 Sort: Highest Spend First"])
- "summaryBn": 1-2 sentence friendly summary in Bengali explaining the filter sequence.

OUTPUT ONLY JSON:
{
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
  "sortBy": "orderAmount" | "orderCount" | "createdAt" | "lastActive",
  "sortOrder": "desc" | "asc",
  "sequenceSteps": ["step 1", "step 2", "step 3"],
  "summaryBn": "ব্যাখ্যা"
}`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: cleanPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return NextResponse.json({
            success: true,
            result: {
              ...fallbackParsed,
              ...parsed,
              aiQueryText: cleanPrompt,
            },
          });
        }
      }
    } catch (err) {
      console.warn('DeepSeek AI natural query exception, using rule fallback:', err);
    }

    return NextResponse.json({
      success: true,
      result: {
        ...fallbackParsed,
        aiQueryText: cleanPrompt,
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

  // Gender detection
  if (lp.includes('female') || lp.includes('নারী') || lp.includes('মহিলা') || lp.includes('woman') || lp.includes('women')) {
    gender = 'Female';
    sequenceSteps.push('1. ⚧ Gender: Female');
  } else if (lp.includes('male') || lp.includes('পুরুষ') || lp.includes('man') || lp.includes('men')) {
    gender = 'Male';
    sequenceSteps.push('1. ⚧ Gender: Male');
  }

  // Tag detection
  if (lp.includes('vip') || lp.includes('ভিআইপি')) {
    tag = availableTags.find((t) => t.toLowerCase().includes('vip')) || 'VIP Client';
    minOrderAmount = '10000';
    sortBy = 'orderAmount';
    sequenceSteps.push('2. ⭐ Tag: VIP Client (Spend ≥ ৳10,000)');
  } else if (lp.includes('whatsapp') || lp.includes('হোয়াটসঅ্যাপ') || lp.includes('wp')) {
    tag = availableTags.find((t) => t.toLowerCase().includes('whatsapp')) || 'WhatsApp Active';
    sequenceSteps.push('2. 💬 Tag: WhatsApp Active');
  } else if (lp.includes('hot') || lp.includes('frequent') || lp.includes('টপ বায়ার') || lp.includes('repeat')) {
    tag = availableTags.find((t) => t.toLowerCase().includes('hot') || t.toLowerCase().includes('frequent')) || 'Hot Leads';
    minOrderCount = '3';
    sortBy = 'orderCount';
    sequenceSteps.push('2. 🔥 Tag: Frequent Buyer / Hot Leads (3+ Orders)');
  }

  // Location / Area detection
  const locations = [
    'keraniganj', 'কেরানীগঞ্জ',
    'dhaka', 'ঢাকা',
    'chittagong', 'chattogram', 'চট্টগ্রাম',
    'sylhet', 'সিলেট',
    'dhanmondi', 'ধানমন্ডি',
    'uttara', 'উত্তরা',
    'mirpur', 'মিরপুর',
    'gulshan', 'গুলশান',
    'gazipur', 'গাজীপুর',
    'narayanganj', 'নারায়ণগঞ্জ',
  ];

  for (const loc of locations) {
    if (lp.includes(loc)) {
      search = loc;
      sequenceSteps.unshift(`📍 Target Area / Keyword: ${loc}`);
      break;
    }
  }

  // Merchant detection
  if (lp.includes('beautybaaz') || lp.includes('বিউটিবাজ')) {
    search = search ? `${search} BeautyBaaz` : 'BeautyBaaz';
    sequenceSteps.push('🏪 Merchant: BeautyBaaz');
  }

  // Operator detection
  if (lp.includes('gp') || lp.includes('grameenphone') || lp.includes('গ্রামীন')) {
    numberStartsWith = '88017';
    sequenceSteps.push('📞 Operator: Grameenphone (88017 / 013)');
  } else if (lp.includes('robi') || lp.includes('রবি')) {
    numberStartsWith = '88018';
    sequenceSteps.push('📞 Operator: Robi (88018)');
  } else if (lp.includes('banglalink') || lp.includes('বাংলালিংক')) {
    numberStartsWith = '88019';
    sequenceSteps.push('📞 Operator: Banglalink (88019)');
  }

  if (sequenceSteps.length === 0) {
    sequenceSteps.push(`🔍 Keyword Search: "${prompt}"`);
    search = prompt;
  }

  return {
    search,
    tag,
    gender,
    numberStartsWith,
    minOrderAmount,
    minOrderCount,
    sortBy,
    sortOrder,
    sequenceSteps,
    summaryBn: `আপনার অনুরোধ অনুযায়ী সিকোয়েন্স তৈরি করা হয়েছে: ${sequenceSteps.join(' ➔ ')}`,
  };
}
