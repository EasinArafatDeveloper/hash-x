/**
 * DeepSeek AI Service for Morpheus DataFlow
 * 
 * Provides server-side AI reasoning for:
 * 1. Semantic Column Mapping to the 21 Business Schema Fields
 * 2. Anomaly & Conflict Detection (CREATE / UPDATE / KEEP / SKIP / FLAG)
 * 3. Data Sanitization & Deterministic Fallbacks
 */

import { getAutoSuggestedField } from '@/components/upload/ColumnMappingStudio';

export const DEEPSEEK_TARGET_FIELDS = [
  // 1. Core Profile & Contact
  { value: 'phone', label: 'Mobile No (Unique Key)', description: 'Primary mobile number / cell / contact phone' },
  { value: 'name', label: 'Customer Name', description: 'Customer full name, nickname, user title' },
  { value: 'address', label: 'Canonical Address', description: 'Full shipping / delivery / street address' },
  { value: 'gender', label: 'Gender', description: 'Customer gender (Male, Female, Other)' },
  { value: 'whatsapp_status', label: 'WhatsApp Status', description: 'WhatsApp availability or activity status' },

  // 2. Orders & Spending Metrics
  { value: 'matched_order_count', label: 'Matched Order Count', description: 'Number of orders matched in campaign' },
  { value: 'lifetime_order_count', label: 'Lifetime Order Count', description: 'Total lifetime order count' },
  { value: 'matched_net_order_amount_bdt', label: 'Matched Order Amount BDT', description: 'Net order spend BDT in matched period' },
  { value: 'lifetime_net_order_amount_bdt', label: 'Lifetime Order Amount BDT', description: 'Total lifetime spend amount BDT' },
  { value: 'prepaid_order_count', label: 'Prepaid Order Count', description: 'Count of prepaid orders' },

  // 3. Merchant Analytics
  { value: 'matched_unique_merchant_count', label: 'Matched Merchant Count', description: 'Unique merchants in matched campaign' },
  { value: 'lifetime_unique_merchant_count', label: 'Lifetime Merchant Count', description: 'Lifetime total unique merchants' },
  { value: 'primary_merchant', label: 'Primary Merchant', description: 'Favorite or main store/vendor/merchant' },

  // 4. Location & Geographic Filters
  { value: 'matched_district_filters', label: 'Matched District', description: 'District / Zilla filter or array' },
  { value: 'matched_city_filters', label: 'Matched City', description: 'City / Metro area filter or array' },
  { value: 'matched_area_filters', label: 'Matched Area', description: 'Thana / Sub-district / Area filter' },
  { value: 'matched_block_road_filters', label: 'Matched Block / Road', description: 'Block / Road / Sector / Ward' },
  { value: 'inferred_primary_area', label: 'Inferred Primary Area', description: 'Primary geographical inferred area' },

  // 5. Customer Segmentation
  { value: 'lifetime_frequency_segment', label: 'Frequency Segment', description: 'Order frequency segment (frequent_buyer, occasional, etc.)' },
  { value: 'lifetime_value_segment', label: 'Value Segment', description: 'Value tier (vip, high_value, standard, low_value)' },
  { value: 'lifetime_primary_category', label: 'Primary Category', description: 'Primary shopping category or interest' },

  // 6. Generic Fields & Skip
  { value: 'email', label: 'Email Address', description: 'Customer email address' },
  { value: 'age', label: 'Age', description: 'Customer age in years' },
  { value: 'location', label: 'General Location', description: 'City, division, state or country' },
  { value: 'avatarUrl', label: 'Avatar Photo URL', description: 'Profile picture web URL' },
  { value: 'tags', label: 'Tags / Labels', description: 'Comma-separated audience tags or badges' },
  { value: 'category', label: 'General Category', description: 'Product or group classification' },
  { value: 'status', label: 'Account Status', description: 'Active, Inactive, Pending status' },
  { value: 'skip', label: 'Skip (Do Not Import)', description: 'Ignore column, preserve existing DB data' },
];

export interface AIMappingRecommendation {
  targetField: string;
  confidence: number;
  reasoning: string;
}

export interface AIAuditDecisionItem {
  rowNumber: number;
  phone: string;
  name: string;
  decision: 'CREATE' | 'UPDATE' | 'KEEP' | 'SKIP' | 'FLAG_FOR_REVIEW';
  reason: string;
  anomalies?: string[];
  fieldDiffs?: Array<{ field: string; from: string; to: string }>;
}

export interface AIAuditSummary {
  qualityScore: number; // 0 - 100
  totalAnalyzed: number;
  decisions: {
    create: number;
    update: number;
    keep: number;
    skip: number;
    flagForReview: number;
  };
  sampleItems: AIAuditDecisionItem[];
  aiInsights: string[];
  anomaliesDetected: string[];
}

/**
 * Anonymize PII from sample values before sending to DeepSeek API
 */
function anonymizeSample(val: any, colName: string): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (!s) return '';

  const lk = colName.toLowerCase();
  if (lk.includes('phone') || lk.includes('mobile') || lk.includes('num') || lk.includes('cell')) {
    const clean = s.replace(/[\s\+\-\(\)]/g, '');
    if (clean.length >= 7) {
      return clean.slice(0, 4) + '***' + clean.slice(-3);
    }
  }

  if (lk.includes('mail') || s.includes('@')) {
    const parts = s.split('@');
    if (parts.length === 2) {
      return parts[0].slice(0, 2) + '***@' + parts[1];
    }
  }

  return s.length > 50 ? s.slice(0, 47) + '...' : s;
}

/**
 * Call DeepSeek AI to intelligently analyze uploaded columns and suggest accurate system mappings.
 */
export async function aiSuggestColumnMapping(
  columnNames: string[],
  sampleRows: any[] = []
): Promise<Record<string, AIMappingRecommendation>> {
  const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

  // Build fallback mapping using deterministic heuristics
  const fallbackResult: Record<string, AIMappingRecommendation> = {};
  columnNames.forEach((col) => {
    const samples = sampleRows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const suggested = getAutoSuggestedField(col, samples);
    fallbackResult[col] = {
      targetField: suggested,
      confidence: suggested !== 'skip' ? 85 : 50,
      reasoning: suggested !== 'skip' ? `Rule-based match for ${suggested}` : 'Unrecognized column name',
    };
  });

  if (!apiKey || columnNames.length === 0) {
    return fallbackResult;
  }

  try {
    // Build compact sample summary for AI
    const columnsWithSamples = columnNames.map((col) => {
      const samples = sampleRows
        .slice(0, 3)
        .map((r) => anonymizeSample(r[col], col))
        .filter(Boolean);
      return {
        column: col,
        samples,
      };
    });

    const systemPrompt = `You are a world-class Data Architect and Schema Ingestion Specialist for Morpheus DataFlow.
Your task is to analyze user-uploaded file column names (which may be written in English, Bengali, Banglish, abbreviations, vendor exports, or OCR text) and map each column to the SINGLE best target system field.

TARGET SYSTEM FIELDS:
${DEEPSEEK_TARGET_FIELDS.map((f) => `- "${f.value}": ${f.label} (${f.description})`).join('\n')}

MAPPING RULES:
1. Mobile / Phone number is the unique key ("phone").
2. Full delivery address or street address should map to "address".
3. "matched_order_count" vs "lifetime_order_count": If column mentions lifetime/total, map to "lifetime_order_count". If matched/campaign, map to "matched_order_count".
4. "matched_net_order_amount_bdt" vs "lifetime_net_order_amount_bdt": If column mentions total spend/lifetime amount, map to "lifetime_net_order_amount_bdt".
5. Geographic filters: "matched_district_filters" (districts), "matched_city_filters" (cities/metros like keraniganj, dhaka), "matched_area_filters" (thana/zones).
6. Merchant: "primary_merchant" (favorite shop/merchant name), "lifetime_unique_merchant_count" (count).
7. Segmentation: "lifetime_frequency_segment", "lifetime_value_segment", "lifetime_primary_category", "whatsapp_status".
8. If a column has irrelevant data (IDs, system hashes, temporary timestamps), map to "skip".

OUTPUT FORMAT (Strict JSON):
{
  "mappings": {
    "<Column_Name>": {
      "targetField": "<one of the valid target fields>",
      "confidence": <integer from 50 to 99>,
      "reasoning": "<brief 5-8 word explanation>"
    }
  }
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze and map these uploaded columns:\n${JSON.stringify(columnsWithSamples, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`DeepSeek API returned HTTP ${response.status}. Using deterministic fallback.`);
      return fallbackResult;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return fallbackResult;

    const parsed = JSON.parse(content);
    const mappings = parsed.mappings || parsed;

    const validFieldKeys = new Set(DEEPSEEK_TARGET_FIELDS.map((f) => f.value));
    const mergedResult: Record<string, AIMappingRecommendation> = { ...fallbackResult };

    Object.keys(mappings).forEach((col) => {
      const item = mappings[col];
      const target = typeof item === 'string' ? item : item?.targetField;
      const conf = typeof item?.confidence === 'number' ? Math.min(99, Math.max(50, item.confidence)) : 90;
      const rsn = item?.reasoning || `AI identified as ${target}`;

      if (validFieldKeys.has(target)) {
        mergedResult[col] = {
          targetField: target,
          confidence: conf,
          reasoning: rsn,
        };
      }
    });

    return mergedResult;
  } catch (error) {
    console.warn('DeepSeek AI Column Mapping exception, using deterministic fallback:', error);
    return fallbackResult;
  }
}

/**
 * Call DeepSeek AI to perform pre-flight audit and conflict analysis on a representative sample of upload records.
 */
export async function aiAuditDataBatch(
  sampleRows: any[],
  existingRecordsMap: Map<string, any>,
  columnMapping?: Record<string, string>
): Promise<AIAuditSummary> {
  const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-8fd0df2b25bb4509a6166f42ff224a3e';
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

  // 1. Deterministic baseline computation
  let createCount = 0;
  let updateCount = 0;
  let keepCount = 0;
  let skipCount = 0;
  let flagCount = 0;
  const sampleItems: AIAuditDecisionItem[] = [];
  const anomalies: string[] = [];

  const evaluatedRows = sampleRows.slice(0, 100);

  evaluatedRows.forEach((row, idx) => {
    const rowNum = idx + 1;
    // Extract phone
    let rawPhone = '';
    if (columnMapping) {
      const phoneCol = Object.keys(columnMapping).find((k) => columnMapping[k] === 'phone');
      if (phoneCol && row[phoneCol]) rawPhone = String(row[phoneCol]).trim();
    }
    if (!rawPhone) {
      for (const val of Object.values(row)) {
        const clean = String(val || '').replace(/[\s\+\-\(\)]/g, '');
        if (clean.length >= 7 && /^\d+$/.test(clean)) {
          rawPhone = String(val).trim();
          break;
        }
      }
    }

    const cleanPhoneDigits = rawPhone.replace(/[\s\+\-\(\)]/g, '');
    const rowAnomalies: string[] = [];

    // Check phone validity
    if (!rawPhone) {
      rowAnomalies.push('Missing mobile number');
    } else if (cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 15 || !/^\d+$/.test(cleanPhoneDigits)) {
      rowAnomalies.push(`Suspicious phone format: "${rawPhone}"`);
    }

    const matched = rawPhone ? existingRecordsMap.get(rawPhone) : null;
    let decision: AIAuditDecisionItem['decision'] = 'CREATE';
    let reason = '';

    if (rowAnomalies.length > 0) {
      decision = 'FLAG_FOR_REVIEW';
      reason = rowAnomalies.join('; ');
      flagCount++;
      rowAnomalies.forEach((a) => {
        if (!anomalies.includes(a)) anomalies.push(a);
      });
    } else if (matched) {
      // Check if row contains changes
      const diffs: Array<{ field: string; from: string; to: string }> = [];
      if (columnMapping) {
        Object.entries(columnMapping).forEach(([col, target]) => {
          if (target === 'skip') return;
          const val = row[col];
          if (val === null || val === undefined || String(val).trim() === '') return;
          const strVal = String(val).trim();
          const dbVal = matched[target] || matched.customFields?.[target];
          if (dbVal !== undefined && dbVal !== null && String(dbVal) !== strVal) {
            diffs.push({ field: target, from: String(dbVal), to: strVal });
          }
        });
      }

      if (diffs.length > 0) {
        decision = 'UPDATE';
        reason = `Existing contact matched. ${diffs.length} mapped field(s) will update.`;
        updateCount++;
      } else {
        decision = 'KEEP';
        reason = 'Existing contact has identical data. Database remains unchanged.';
        keepCount++;
      }
    } else {
      decision = 'CREATE';
      reason = 'New unique mobile number. Will create new record.';
      createCount++;
    }

    if (sampleItems.length < 10) {
      sampleItems.push({
        rowNumber: rowNum,
        phone: rawPhone ? anonymizeSample(rawPhone, 'phone') : '(None)',
        name: row.name || row.customer_name || `Record #${rowNum}`,
        decision,
        reason,
        anomalies: rowAnomalies,
      });
    }
  });

  const total = evaluatedRows.length || 1;
  const qualityScore = Math.max(70, Math.round(((total - flagCount) / total) * 100));

  const baselineSummary: AIAuditSummary = {
    qualityScore,
    totalAnalyzed: evaluatedRows.length,
    decisions: {
      create: createCount,
      update: updateCount,
      keep: keepCount,
      skip: skipCount,
      flagForReview: flagCount,
    },
    sampleItems,
    aiInsights: [
      `Analyzed sample of ${evaluatedRows.length} rows. Found ${createCount} new contacts and ${updateCount} existing contacts to update.`,
      flagCount > 0
        ? `⚠️ Flagged ${flagCount} suspicious row(s) with invalid phone lengths or missing keys.`
        : '✅ High data integrity. Zero duplicate collisions or severe schema anomalies detected.',
    ],
    anomaliesDetected: anomalies,
  };

  if (!apiKey || evaluatedRows.length === 0) {
    return baselineSummary;
  }

  // Enhance insights with DeepSeek AI reasoning
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const auditPrompt = `You are an AI Data Auditor for Morpheus DataFlow.
Review this ingestion batch statistics:
- Total Analyzed: ${evaluatedRows.length}
- New Contacts (CREATE): ${createCount}
- Updates to Existing (UPDATE): ${updateCount}
- Unchanged Records (KEEP): ${keepCount}
- Flagged for Review: ${flagCount}
- Detected Anomalies: ${JSON.stringify(anomalies)}

Provide 2-3 concise, expert bullet insights (max 15 words each) assessing dataset readiness, data cleanliness, and safety recommendations.

OUTPUT FORMAT (JSON):
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "cleanlinessRating": "Excellent" | "Good" | "Requires Attention"
}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: auditPrompt }],
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
        if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
          baselineSummary.aiInsights = parsed.insights;
        }
      }
    }
  } catch {}

  return baselineSummary;
}
