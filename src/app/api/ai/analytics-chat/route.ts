import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import RecordModel from '@/lib/models/Record';
import DatasetModel from '@/lib/models/Dataset';
import { buildPhonePrefixRegex } from '@/lib/phone';
import { callAIModel, AIToolDefinition, CallAIMessage } from '@/lib/ai-provider';
import { getSessionUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { createPendingAction, consumePendingAction } from '@/lib/pending-actions';
import type { UserSession } from '@/types';

export const dynamic = 'force-dynamic';

const MAX_TOOL_ROUNDS = 4;
const MAX_SEARCH_LIMIT = 100;
const MAX_MUTATION_MATCH = 500;

// ============================================================
// Shared filter schema, query builder and URL/export helpers
// ============================================================

interface RecordFilters {
  search?: string;
  phone?: string;
  tag?: string;
  gender?: 'Male' | 'Female' | 'Other';
  minOrderCount?: number;
  maxOrderCount?: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  merchant?: string;
  numberStartsWith?: string;
  numberEndsWith?: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFilters(raw: any): RecordFilters {
  if (!raw || typeof raw !== 'object') return {};
  const f: RecordFilters = {};
  if (typeof raw.search === 'string' && raw.search.trim()) f.search = raw.search.trim().slice(0, 200);
  if (typeof raw.phone === 'string' && raw.phone.trim()) f.phone = raw.phone.trim().slice(0, 40);
  if (typeof raw.tag === 'string' && raw.tag.trim()) f.tag = raw.tag.trim().slice(0, 60);
  if (raw.gender === 'Male' || raw.gender === 'Female' || raw.gender === 'Other') f.gender = raw.gender;
  if (Number.isFinite(Number(raw.minOrderCount))) f.minOrderCount = Number(raw.minOrderCount);
  if (Number.isFinite(Number(raw.maxOrderCount))) f.maxOrderCount = Number(raw.maxOrderCount);
  if (Number.isFinite(Number(raw.minOrderAmount))) f.minOrderAmount = Number(raw.minOrderAmount);
  if (Number.isFinite(Number(raw.maxOrderAmount))) f.maxOrderAmount = Number(raw.maxOrderAmount);
  if (typeof raw.merchant === 'string' && raw.merchant.trim()) f.merchant = raw.merchant.trim().slice(0, 80);
  if (typeof raw.numberStartsWith === 'string' && raw.numberStartsWith.trim()) f.numberStartsWith = raw.numberStartsWith.trim().slice(0, 20);
  if (typeof raw.numberEndsWith === 'string' && raw.numberEndsWith.trim()) f.numberEndsWith = raw.numberEndsWith.trim().slice(0, 20);
  return f;
}

function buildRecordQuery(filters: RecordFilters): any {
  const query: any = {};
  const and: any[] = [];

  if (filters.search) {
    const terms = filters.search.split('|').map((t) => t.trim()).filter(Boolean);
    if (terms.length > 0) {
      const regex = new RegExp(terms.map(escapeRegex).join('|'), 'i');
      and.push({
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { location: regex },
          { area: regex },
          { address: regex },
          { category: regex },
          { tags: regex },
          { 'customFields.nickname': regex },
          { 'customFields.customer_name': regex },
          { 'customFields.primary_merchant': regex },
        ],
      });
    }
  }

  if (filters.tag) {
    const tagRegex = new RegExp(`(^|,\\s*)${escapeRegex(filters.tag)}(,\\s*|$)`, 'i');
    and.push({ $or: [{ tags: tagRegex }, { category: tagRegex }] });
  }

  if (filters.gender) query.gender = filters.gender;

  if (filters.minOrderCount != null || filters.maxOrderCount != null) {
    query.orderCount = {};
    if (filters.minOrderCount != null) query.orderCount.$gte = filters.minOrderCount;
    if (filters.maxOrderCount != null) query.orderCount.$lte = filters.maxOrderCount;
  }

  if (filters.minOrderAmount != null || filters.maxOrderAmount != null) {
    query.orderAmount = {};
    if (filters.minOrderAmount != null) query.orderAmount.$gte = filters.minOrderAmount;
    if (filters.maxOrderAmount != null) query.orderAmount.$lte = filters.maxOrderAmount;
  }

  if (filters.merchant) {
    and.push({ 'customFields.primary_merchant': new RegExp(escapeRegex(filters.merchant), 'i') });
  }

  // Phone match: an explicit `phone` filter, or start/end-of-number matching (end wins if both given)
  if (filters.numberEndsWith) {
    const clean = filters.numberEndsWith.replace(/[^0-9]/g, '');
    if (clean) query.phone = { $regex: new RegExp(`${clean}$`) };
  } else if (filters.numberStartsWith) {
    const pfx = buildPhonePrefixRegex(filters.numberStartsWith);
    if (pfx) query.phone = { $regex: pfx };
  } else if (filters.phone) {
    const clean = filters.phone.replace(/[^0-9]/g, '');
    if (clean) query.phone = { $regex: clean };
  }

  if (and.length > 0) query.$and = and;
  return query;
}

function buildExplorerPath(filters: RecordFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.minOrderCount != null) params.set('minOrderCount', String(filters.minOrderCount));
  if (filters.maxOrderCount != null) params.set('maxOrderCount', String(filters.maxOrderCount));
  if (filters.minOrderAmount != null) params.set('minOrderAmount', String(filters.minOrderAmount));
  if (filters.maxOrderAmount != null) params.set('maxOrderAmount', String(filters.maxOrderAmount));
  if (filters.merchant) params.set('merchant', filters.merchant);
  if (filters.numberStartsWith) params.set('numberStartsWith', filters.numberStartsWith);
  if (filters.numberEndsWith) params.set('numberEndsWith', filters.numberEndsWith);
  return `/data/explorer?${params.toString()}`;
}

function buildExportPayload(filters: RecordFilters): Record<string, any> {
  return {
    search: filters.search || undefined,
    tag: filters.tag || undefined,
    gender: filters.gender || undefined,
    minOrderCount: filters.minOrderCount != null ? String(filters.minOrderCount) : undefined,
    maxOrderCount: filters.maxOrderCount != null ? String(filters.maxOrderCount) : undefined,
    minOrderAmount: filters.minOrderAmount != null ? String(filters.minOrderAmount) : undefined,
    maxOrderAmount: filters.maxOrderAmount != null ? String(filters.maxOrderAmount) : undefined,
    merchant: filters.merchant || undefined,
    numberStartsWith: filters.numberStartsWith || undefined,
    numberEndsWith: filters.numberEndsWith || undefined,
  };
}

// ============================================================
// Tool definitions offered to the model — the exposed set is
// gated by role, so a viewer/manager literally cannot be given
// a tool they aren't allowed to call.
// ============================================================

const FILTER_PROPERTIES = {
  search: { type: 'string', description: 'Free text to match against name, phone, email, location, tags or merchant. Use | to OR multiple keywords.' },
  phone: { type: 'string', description: 'A specific (partial or full) phone number to match.' },
  tag: { type: 'string', description: 'Match customers carrying this tag/category, e.g. "VIP Client", "WhatsApp Active".' },
  gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
  minOrderCount: { type: 'number' },
  maxOrderCount: { type: 'number' },
  minOrderAmount: { type: 'number' },
  maxOrderAmount: { type: 'number' },
  merchant: { type: 'string', description: 'Match the customer’s primary merchant/store name.' },
  numberStartsWith: { type: 'string', description: 'Phone number prefix, e.g. "017" or "88018".' },
  numberEndsWith: { type: 'string', description: 'Phone number suffix digits.' },
};

const READ_TOOLS: AIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_customers',
      description: 'Search/filter the live customer database. Use this to answer any question about customers, or to look up who matches before editing/deleting them.',
      parameters: {
        type: 'object',
        properties: {
          ...FILTER_PROPERTIES,
          sortBy: { type: 'string', enum: ['orderCount', 'orderAmount', 'createdAt'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          limit: { type: 'number', description: 'Max rows to return, default 10, max 100.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_overview',
      description: 'Get aggregate live statistics for the whole database: totals, GMV, VIP/WhatsApp counts, gender split, top districts, top merchants, telecom operator distribution.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// Every data-changing action follows the same two-step pattern: a "request_*"
// tool only PREVIEWS the change and stages it under a token (nothing is
// written yet), and the single confirm_pending_action tool is the only way
// to actually execute a staged action — and only once the user has
// explicitly confirmed it in a later message. This exists specifically so
// the model can never mutate or delete real data off a guessed/hallucinated
// value or an ambiguous request — the user always sees exactly what would
// change before it happens.
const WRITE_TOOLS: AIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'request_update_customers',
      description: 'Preview and stage an update of one or more fields (name, location, area, address, gender, status, age, orderAmount, orderCount, activeDays) on all customers matching the given filters. Does NOT change anything yet — returns a token and a preview of exactly what would change. Only use a field/value the user explicitly stated; never guess or invent a value.',
      parameters: {
        type: 'object',
        properties: {
          filters: { type: 'object', properties: FILTER_PROPERTIES, description: 'Filters identifying which customers to update.' },
          fields: { type: 'object', description: 'Field/value pairs to set, e.g. {"location": "Mirpur", "status": "Active"}. Every value must come directly from what the user said.' },
        },
        required: ['filters', 'fields'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_tag_change',
      description: 'Preview and stage adding or removing a tag from all customers matching the given filters. Does NOT change anything yet.',
      parameters: {
        type: 'object',
        properties: {
          filters: { type: 'object', properties: FILTER_PROPERTIES },
          tag: { type: 'string' },
          action: { type: 'string', enum: ['add', 'remove'] },
        },
        required: ['filters', 'tag', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_text_edit',
      description: 'Preview and stage appending or prepending text to a text field (name, location or address) for all customers matching the given filters. Does NOT change anything yet.',
      parameters: {
        type: 'object',
        properties: {
          filters: { type: 'object', properties: FILTER_PROPERTIES },
          field: { type: 'string', enum: ['name', 'location', 'address'] },
          text: { type: 'string' },
          mode: { type: 'string', enum: ['append', 'prepend'] },
        },
        required: ['filters', 'field', 'text', 'mode'],
      },
    },
  },
];

const DELETE_TOOLS: AIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'request_delete_customers',
      description: 'Preview and stage a permanent delete of customers matching the given filters. Does NOT delete anything yet.',
      parameters: {
        type: 'object',
        properties: { filters: { type: 'object', properties: FILTER_PROPERTIES } },
        required: ['filters'],
      },
    },
  },
];

const CONFIRM_TOOL: AIToolDefinition = {
  type: 'function',
  function: {
    name: 'confirm_pending_action',
    description: 'Executes a change (update/tag/text-edit/delete) that was previously staged by one of the request_* tools, using its token. Only call this AFTER the user has explicitly confirmed the exact preview you showed them in their own most recent message (e.g. said "yes", "confirm", "হ্যাঁ", "করো"). Never call this in the same turn as the request_* call, never call it speculatively, and never call it if the user asked for something different from what was staged.',
    parameters: {
      type: 'object',
      properties: { token: { type: 'string' } },
      required: ['token'],
    },
  },
};

function getToolsForRole(role: string | undefined): AIToolDefinition[] {
  if (role === 'admin') return [...READ_TOOLS, ...WRITE_TOOLS, ...DELETE_TOOLS, CONFIRM_TOOL];
  if (role === 'manager') return [...READ_TOOLS, ...WRITE_TOOLS, CONFIRM_TOOL];
  return READ_TOOLS; // viewer, or unrecognized role — read-only
}

// ============================================================
// Tool execution — the actual MongoDB operations. Every write is
// still capped and role-checked here too (defense in depth, in
// case the exposed-tool gating above is ever bypassed).
// ============================================================

async function executeTool(name: string, args: any, sessionUser: UserSession): Promise<any> {
  switch (name) {
    case 'search_customers': {
      const filters = extractFilters(args);
      const query = buildRecordQuery(filters);
      const limit = Math.min(Math.max(parseInt(args?.limit, 10) || 10, 1), MAX_SEARCH_LIMIT);
      const sortField = ['orderCount', 'orderAmount', 'createdAt'].includes(args?.sortBy) ? args.sortBy : 'createdAt';
      const sortDir = args?.sortOrder === 'asc' ? 1 : -1;

      const [matchedCount, records] = await Promise.all([
        RecordModel.countDocuments(query),
        RecordModel.find(query)
          .sort({ [sortField]: sortDir })
          .limit(limit)
          .select('name phone email gender orderAmount orderCount location area tags customFields')
          .lean(),
      ]);

      return {
        matchedCount,
        records: records.map((r: any) => ({
          name: r.name || 'Unnamed',
          phone: r.phone || '',
          email: r.email || '',
          gender: r.gender || '',
          orderCount: r.orderCount || 0,
          orderAmount: r.orderAmount || 0,
          location: r.location || r.area || '',
          tags: r.tags || [],
          merchant: r.customFields?.primary_merchant || '',
        })),
        filtersUsed: filters,
      };
    }

    case 'get_dashboard_overview': {
      const [totalRecords, financialAgg, genderAgg, topLocations, topMerchants, vipCount, whatsappCount, frequentBuyers, operatorCounts] =
        await Promise.all([
          RecordModel.countDocuments({}),
          RecordModel.aggregate([
            { $group: { _id: null, totalGMV: { $sum: { $ifNull: ['$orderAmount', 0] } }, totalOrders: { $sum: { $ifNull: ['$orderCount', 0] } }, avgOrderValue: { $avg: { $ifNull: ['$orderAmount', 0] } } } },
          ]),
          RecordModel.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
          RecordModel.aggregate([{ $group: { _id: { $ifNull: ['$location', 'Unspecified'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]),
          RecordModel.aggregate([{ $group: { _id: { $ifNull: ['$customFields.primary_merchant', 'Direct'] }, count: { $sum: 1 }, totalSpend: { $sum: { $ifNull: ['$orderAmount', 0] } } } }, { $sort: { count: -1 } }, { $limit: 5 }]),
          RecordModel.countDocuments({ $or: [{ tags: { $regex: 'VIP', $options: 'i' } }, { orderAmount: { $gte: 10000 } }] }),
          RecordModel.countDocuments({ $or: [{ tags: { $regex: '(^|,\\s*)WhatsApp Active(,\\s*|$)', $options: 'i' } }, { 'customFields.whatsapp_status': { $regex: '^(active|yes|true|valid)$', $options: 'i' } }] }),
          RecordModel.countDocuments({ orderCount: { $gte: 3 } }),
          Promise.all([
            RecordModel.countDocuments({ phone: { $regex: '^(88017|88013|017|013)' } }),
            RecordModel.countDocuments({ phone: { $regex: '^(88018|018)' } }),
            RecordModel.countDocuments({ phone: { $regex: '^(88019|88014|019|014)' } }),
            RecordModel.countDocuments({ phone: { $regex: '^(88016|016)' } }),
            RecordModel.countDocuments({ phone: { $regex: '^(88015|015)' } }),
          ]),
        ]);

      const fin = financialAgg[0] || { totalGMV: 0, totalOrders: 0, avgOrderValue: 0 };
      const [gp, robi, bl, airtel, teletalk] = operatorCounts;

      return {
        totalRecords,
        totalGMV: fin.totalGMV,
        totalOrders: fin.totalOrders,
        avgOrderValue: Math.round(fin.avgOrderValue),
        vipCount,
        whatsappActiveCount: whatsappCount,
        frequentBuyers3Plus: frequentBuyers,
        genderBreakdown: genderAgg.map((g: any) => ({ gender: g._id || 'Other', count: g.count })),
        topDistricts: topLocations.map((l: any) => ({ location: l._id, count: l.count })),
        topMerchants: topMerchants.map((m: any) => ({ merchant: m._id, count: m.count, totalSpend: m.totalSpend })),
        telecomDistribution: { Grameenphone: gp, Robi: robi, Banglalink: bl, Airtel: airtel, Teletalk: teletalk },
      };
    }

    case 'request_update_customers': {
      if (sessionUser.role === 'viewer') return { error: 'permission_denied', message: 'Only admins and managers can update records.' };

      const filters = extractFilters(args?.filters);
      const allowedFields = ['name', 'email', 'phone', 'age', 'gender', 'location', 'area', 'address', 'status', 'orderAmount', 'orderCount', 'activeDays'];
      const setFields: Record<string, any> = {};
      for (const [k, v] of Object.entries(args?.fields || {})) {
        if (allowedFields.includes(k) && v !== undefined && v !== null && String(v).trim() !== '') setFields[k] = v;
      }
      if (Object.keys(setFields).length === 0) return { error: 'no_valid_fields' };

      const query = buildRecordQuery(filters);
      const matched = await RecordModel.find(query).limit(MAX_MUTATION_MATCH).select('_id name phone').lean();
      if (matched.length === 0) return { matchedCount: 0, filtersUsed: filters };

      const token = await createPendingAction(
        'update',
        { recordIds: matched.map((m: any) => String(m._id)), fields: setFields },
        sessionUser.id
      );
      return {
        status: 'confirmation_required',
        token,
        matchedCount: matched.length,
        fieldsToSet: setFields,
        preview: matched.slice(0, 5).map((m: any) => ({ name: m.name, phone: m.phone })),
        filtersUsed: filters,
      };
    }

    case 'request_tag_change': {
      if (sessionUser.role === 'viewer') return { error: 'permission_denied', message: 'Only admins and managers can manage tags.' };
      const tag = String(args?.tag || '').trim();
      if (!tag) return { error: 'tag_required' };
      const action = args?.action === 'remove' ? 'remove' : 'add';

      const filters = extractFilters(args?.filters);
      const query = buildRecordQuery(filters);
      const matched = await RecordModel.find(query).limit(MAX_MUTATION_MATCH).select('_id name phone').lean();
      if (matched.length === 0) return { matchedCount: 0, filtersUsed: filters };

      const token = await createPendingAction(
        'tag',
        { recordIds: matched.map((m: any) => String(m._id)), tag, action },
        sessionUser.id
      );
      return {
        status: 'confirmation_required',
        token,
        matchedCount: matched.length,
        tag,
        action,
        preview: matched.slice(0, 5).map((m: any) => ({ name: m.name, phone: m.phone })),
        filtersUsed: filters,
      };
    }

    case 'request_text_edit': {
      if (sessionUser.role === 'viewer') return { error: 'permission_denied', message: 'Only admins and managers can edit records.' };
      const field = ['name', 'location', 'address'].includes(args?.field) ? args.field : null;
      const text = String(args?.text || '').trim();
      const mode = args?.mode === 'prepend' ? 'prepend' : 'append';
      if (!field || !text) return { error: 'field_and_text_required' };

      const filters = extractFilters(args?.filters);
      const query = buildRecordQuery(filters);
      const matched = await RecordModel.find(query).limit(MAX_MUTATION_MATCH).select(`_id name phone ${field}`).lean();
      if (matched.length === 0) return { matchedCount: 0, filtersUsed: filters };

      const token = await createPendingAction(
        'edit_text',
        { recordIds: matched.map((m: any) => String(m._id)), field, text, mode },
        sessionUser.id
      );
      return {
        status: 'confirmation_required',
        token,
        matchedCount: matched.length,
        field,
        text,
        mode,
        preview: matched.slice(0, 5).map((m: any) => ({
          name: m.name,
          phone: m.phone,
          currentValue: m[field] || '',
          newValue: mode === 'prepend' ? `${text} ${m[field] || ''}`.trim() : `${m[field] || ''} ${text}`.trim(),
        })),
        filtersUsed: filters,
      };
    }

    case 'request_delete_customers': {
      if (sessionUser.role !== 'admin') return { error: 'permission_denied', message: 'Only admins can delete records.' };
      const filters = extractFilters(args?.filters);
      const query = buildRecordQuery(filters);
      const matched = await RecordModel.find(query).limit(MAX_MUTATION_MATCH).select('_id name phone orderCount orderAmount').lean();
      if (matched.length === 0) return { matchedCount: 0, filtersUsed: filters };

      const token = await createPendingAction('delete', { recordIds: matched.map((m: any) => String(m._id)) }, sessionUser.id);
      return {
        status: 'confirmation_required',
        token,
        matchedCount: matched.length,
        preview: matched.slice(0, 5).map((m: any) => ({ name: m.name, phone: m.phone, orderCount: m.orderCount || 0, orderAmount: m.orderAmount || 0 })),
        filtersUsed: filters,
      };
    }

    case 'confirm_pending_action': {
      const token = String(args?.token || '');
      const staged = await consumePendingAction(token, sessionUser.id);
      if (!staged) {
        return { error: 'invalid_or_expired_token', message: 'This confirmation has expired or was already used — ask the user to repeat the request.' };
      }

      const roleRequired = staged.type === 'delete' ? 'admin' : null;
      if (roleRequired === 'admin' && sessionUser.role !== 'admin') {
        return { error: 'permission_denied', message: 'Only admins can delete records.' };
      }
      if (staged.type !== 'delete' && sessionUser.role === 'viewer') {
        return { error: 'permission_denied', message: 'Only admins and managers can change records.' };
      }

      switch (staged.type) {
        case 'update': {
          const { recordIds, fields } = staged.payload;
          await RecordModel.updateMany({ _id: { $in: recordIds } }, { $set: fields });
          return { executed: 'update', updatedCount: recordIds.length, fields };
        }
        case 'tag': {
          const { recordIds, tag, action } = staged.payload;
          if (action === 'remove') {
            await RecordModel.updateMany({ _id: { $in: recordIds } }, { $pull: { tags: tag } });
          } else {
            await RecordModel.updateMany({ _id: { $in: recordIds } }, { $addToSet: { tags: tag } });
          }
          return { executed: 'tag', affectedCount: recordIds.length, tag, action };
        }
        case 'edit_text': {
          const { recordIds, field, text, mode } = staged.payload;
          const docs = await RecordModel.find({ _id: { $in: recordIds } }).select(`_id ${field}`).lean();
          const bulkOps = docs.map((doc: any) => {
            const oldVal = String(doc[field] || '').trim();
            const newVal = mode === 'prepend' ? `${text} ${oldVal}`.trim() : `${oldVal} ${text}`.trim();
            return { updateOne: { filter: { _id: doc._id }, update: { $set: { [field]: newVal } } } };
          });
          if (bulkOps.length > 0) await RecordModel.bulkWrite(bulkOps);
          return { executed: 'edit_text', affectedCount: docs.length, field, mode };
        }
        case 'delete': {
          const { recordIds } = staged.payload;
          // Soft delete — moves records to the recycle bin (restorable by
          // an admin for 30 days) instead of destroying them immediately.
          const result = await RecordModel.updateMany({ _id: { $in: recordIds } }, { $set: { deletedAt: new Date() } });
          const totalRemaining = await RecordModel.countDocuments({});
          return { executed: 'delete', deletedCount: result.modifiedCount || 0, totalRemaining };
        }
        default:
          return { error: 'unknown_pending_action_type' };
      }
    }

    default:
      return { error: 'unknown_tool' };
  }
}

// ============================================================
// Route handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(`ai-chat:${sessionUser.id || ip}`, 30, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before querying AI Copilot again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { messages = [], question = '' } = body || {};
    const lastMessage = question || (messages.length > 0 ? messages[messages.length - 1].content : '');
    if (!lastMessage || !String(lastMessage).trim()) {
      return NextResponse.json({ error: 'Question / message is required' }, { status: 400 });
    }

    await connectToDatabase();

    const [totalRecords, activeDataset] = await Promise.all([
      RecordModel.countDocuments({}),
      DatasetModel.findOne({}).sort({ createdAt: -1 }).lean(),
    ]);

    const systemPrompt = `You are "Morpheus AI Copilot", the data assistant embedded in a company's internal customer-data platform. You speak fluent Bengali, English and Banglish, and you always reply in whichever of those the user is using.

LIVE DATABASE: ${totalRecords.toLocaleString()} customer records. Active dataset: ${(activeDataset as any)?.filename || 'none yet'}. The signed-in user is "${sessionUser.name}" (role: ${sessionUser.role}).

You have tools to search the database and read aggregate stats (always safe, no confirmation needed), and — if your role allows — request_update_customers, request_tag_change, request_text_edit and request_delete_customers to stage changes, plus confirm_pending_action to actually execute a staged change. Rules:
1. Always ground factual answers in a tool call (search_customers or get_dashboard_overview) rather than guessing — you have no other source of truth about the data.
2. If you are not certain whether the user wants to READ something or CHANGE something, or if a write request doesn't give you an explicit new value, treat it as a read: call search_customers and ask a clarifying question in your reply. NEVER invent, guess, or default a value for a field the user did not explicitly state — if a "fields"/"text"/"tag" argument isn't directly supported by the user's own words, do not call a request_* tool at all.
3. EVERY write action — update, tag change, text edit, AND delete — requires confirmation, no exceptions. Call the matching request_* tool first (this only stages the change and returns a token + a preview of exactly what would change, nothing is written yet). Show that exact preview to the user in your reply and ask them to confirm. Only call confirm_pending_action in a LATER turn, after the user has explicitly confirmed in their own most recent message (said yes/confirm/হ্যাঁ/হাঁ/করো etc) — and only if what they're confirming matches what you staged. Never call confirm_pending_action in the same turn as a request_* call, never call it speculatively, and never treat a bare mention of an update/delete verb (without having shown a preview first) as a confirmation.
4. When you are done (with or without tool calls), reply with ONLY a single JSON object, no markdown code fences, in exactly this shape:
{
  "type": "chat" | "data_query" | "action_result",
  "reply": "Rich, warm, well-formatted reply in the user's language. Use a markdown table for a list of customers.",
  "exportPayload": { "search": "...", "tag": "...", "gender": "...", "minOrderCount": "...", "maxOrderCount": "...", "minOrderAmount": "...", "maxOrderAmount": "...", "merchant": "...", "numberStartsWith": "...", "numberEndsWith": "..." } | null,
  "exportLabel": "Download CSV (...)" | null,
  "explorerPath": "/data/explorer?..." | null,
  "keyMetrics": [ { "label": "...", "value": "...", "subtext": "..." } ] | null,
  "suggestedActions": [ { "label": "...", "path": "/data/explorer?..." } ] | null,
  "followUpQuestions": [ "...", "..." ] | null
}
Only include exportPayload/explorerPath when there is a specific filtered set of customers relevant to this answer (omit/null them for pure chat or aggregate-only answers).`;

    const tools = getToolsForRole(sessionUser.role);

    const conversation: CallAIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content || '' })),
    ];
    if (!messages.some((m: any) => m.content === lastMessage)) {
      conversation.push({ role: 'user', content: lastMessage });
    }

    let lastFilters: RecordFilters | null = null;
    let finalContent = '';
    let provider = 'openai';
    let model = 'gpt-4o';

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const result = await callAIModel({
          messages: conversation,
          preferredModel: 'gpt-4o',
          jsonMode: true,
          temperature: 0.2,
          maxTokens: 1200,
          timeoutMs: 20000,
          tools,
          toolChoice: 'auto',
        });
        provider = result.provider;
        model = result.model;

        if (!result.toolCalls || result.toolCalls.length === 0) {
          finalContent = result.content;
          break;
        }

        conversation.push({ role: 'assistant', content: result.content || null, tool_calls: result.toolCalls });

        for (const call of result.toolCalls) {
          let args: any = {};
          try {
            args = JSON.parse(call.function.arguments || '{}');
          } catch {
            args = {};
          }
          const toolResult = await executeTool(call.function.name, args, sessionUser);
          if (toolResult?.filtersUsed) lastFilters = toolResult.filtersUsed;
          conversation.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(toolResult).slice(0, 6000),
          });
        }
      }

      if (!finalContent) {
        conversation.push({
          role: 'system',
          content: 'Tool budget reached. Respond now with the final JSON answer only, no more tool calls.',
        });
        const forced = await callAIModel({
          messages: conversation,
          preferredModel: 'gpt-4o',
          jsonMode: true,
          temperature: 0.2,
          maxTokens: 1200,
          timeoutMs: 20000,
        });
        finalContent = forced.content;
        provider = forced.provider;
        model = forced.model;
      }
    } catch (aiErr: any) {
      console.error('AI Analytics chat error:', aiErr?.message);
      return NextResponse.json({
        success: true,
        result: {
          type: 'chat',
          reply: 'দুঃখিত, এই মুহূর্তে AI সার্ভিসে সংযোগ করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
        },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(finalContent);
    } catch {
      parsed = { type: 'chat', reply: finalContent || 'দুঃখিত, উত্তর তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' };
    }

    if (!parsed.exportPayload && lastFilters) {
      parsed.exportPayload = buildExportPayload(lastFilters);
      parsed.explorerPath = parsed.explorerPath || buildExplorerPath(lastFilters);
    }

    return NextResponse.json({ success: true, provider, model, result: parsed });
  } catch (error: any) {
    console.error('AI Analytics chat route error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI analytics query', message: error.message },
      { status: 500 }
    );
  }
}
