'use client';

import React from 'react';
import {
  SlidersHorizontal,
  Phone,
  User,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Ban,
  Layers,
  CheckCircle2,
  MessageSquare,
  CreditCard,
  Store,
  ShoppingBag,
  Compass,
  Building2,
  Navigation,
  LocateFixed,
  BarChart3,
  Tag,
  RefreshCw,
} from 'lucide-react';

export interface ColumnMappingItem {
  sourceColumn: string;
  targetField: string;
  sampleValues: any[];
}

export const TARGET_SYSTEM_FIELDS = [
  // 1. Core Profile & Contact
  { value: 'phone', label: '📞 Mobile No (phone)', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400', isKey: true },
  { value: 'name', label: '👤 Customer Name (customer_name)', icon: User, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'address', label: '🏠 Canonical Address (canonical_address)', icon: MapPin, color: 'text-teal-600 dark:text-teal-400' },
  { value: 'gender', label: '⚧ Gender (gender)', icon: User, color: 'text-indigo-600 dark:text-indigo-400' },
  { value: 'whatsapp_status', label: '💬 WhatsApp Status (whatsapp_status)', icon: MessageSquare, color: 'text-green-600 dark:text-green-400' },

  // 2. Orders & Spending Metrics
  { value: 'matched_order_count', label: '📦 Matched Order Count (matched_order_count)', icon: Package, color: 'text-sky-600 dark:text-sky-400' },
  { value: 'lifetime_order_count', label: '📦 Lifetime Order Count (lifetime_order_count)', icon: Package, color: 'text-cyan-600 dark:text-cyan-400' },
  { value: 'matched_net_order_amount_bdt', label: '💰 Matched Order Amount BDT (matched_net_order_amount_bdt)', icon: DollarSign, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'lifetime_net_order_amount_bdt', label: '💰 Lifetime Order Amount BDT (lifetime_net_order_amount_bdt)', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'prepaid_order_count', label: '💳 Prepaid Order Count (prepaid_order_count)', icon: CreditCard, color: 'text-violet-600 dark:text-violet-400' },

  // 3. Merchant Analytics
  { value: 'matched_unique_merchant_count', label: '🏬 Matched Merchant Count (matched_unique_merchant_count)', icon: Store, color: 'text-pink-600 dark:text-pink-400' },
  { value: 'lifetime_unique_merchant_count', label: '🏬 Lifetime Merchant Count (lifetime_unique_merchant_count)', icon: Store, color: 'text-fuchsia-600 dark:text-fuchsia-400' },
  { value: 'primary_merchant', label: '🏪 Primary Merchant (primary_merchant)', icon: ShoppingBag, color: 'text-rose-600 dark:text-rose-400' },

  // 4. Location & Geographic Filters
  { value: 'matched_district_filters', label: '🗺️ Matched District (matched_district_filters)', icon: Compass, color: 'text-blue-500 dark:text-blue-400' },
  { value: 'matched_city_filters', label: '🏙️ Matched City (matched_city_filters)', icon: Building2, color: 'text-indigo-500 dark:text-indigo-400' },
  { value: 'matched_area_filters', label: '🏘️ Matched Area (matched_area_filters)', icon: MapPin, color: 'text-teal-500 dark:text-teal-400' },
  { value: 'matched_block_road_filters', label: '🛣️ Matched Block / Road (matched_block_road_filters)', icon: Navigation, color: 'text-amber-500 dark:text-amber-400' },
  { value: 'inferred_primary_area', label: '📍 Inferred Primary Area (inferred_primary_area)', icon: LocateFixed, color: 'text-emerald-500 dark:text-emerald-400' },

  // 5. Customer Segmentation
  { value: 'lifetime_frequency_segment', label: '📊 Frequency Segment (lifetime_frequency_segment)', icon: BarChart3, color: 'text-purple-500 dark:text-purple-400' },
  { value: 'lifetime_value_segment', label: '💎 Value Segment (lifetime_value_segment)', icon: Sparkles, color: 'text-yellow-500 dark:text-yellow-400' },
  { value: 'lifetime_primary_category', label: '🏷️ Primary Category (lifetime_primary_category)', icon: Tag, color: 'text-orange-500 dark:text-orange-400' },

  // 6. Generic Fields & Skip
  { value: 'email', label: '✉️ Email', icon: Mail, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'age', label: '🎂 Age', icon: Calendar, color: 'text-orange-600 dark:text-orange-400' },
  { value: 'skip', label: '🚫 skip', icon: AlertTriangle, color: 'text-rose-500 dark:text-rose-400' },
];

export function getAutoSuggestedField(columnName: string, sampleValues: any[] = []): string {
  const raw = columnName.toLowerCase().trim();
  const lk = raw.replace(/[\s_\.-]+/g, '');

  // 1. Phone / Mobile No
  if (
    raw === 'phone' ||
    ['phone', 'mobile', 'cell', 'contact', 'tel', 'msisdn', 'phonenumber', 'mobilenumber', 'contactno', 'cellphone', 'mobileno', 'number'].includes(lk)
  ) return 'phone';

  // 2. Customer Name
  if (
    raw === 'customer_name' ||
    ['customername', 'name', 'fullname', 'username', 'nickname', 'nick', 'contactname', 'person', 'client', 'title', 'buyer'].includes(lk)
  ) return 'name';

  // 3. Canonical Address
  if (
    raw === 'canonical_address' ||
    ['canonicaladdress', 'address', 'fulladdress', 'street', 'presentaddress', 'permanentaddress', 'shippingaddress', 'deliveryaddress'].includes(lk)
  ) return 'address';

  // 4. Gender
  if (raw === 'gender' || ['gender', 'sex'].includes(lk)) return 'gender';

  // 5. WhatsApp Status
  if (
    raw === 'whatsapp_status' ||
    ['whatsappstatus', 'whatsapp', 'wastatus', 'wa_status'].includes(lk)
  ) return 'whatsapp_status';

  // 6. Matched Order Count
  if (
    raw === 'matched_order_count' ||
    ['matchedordercount', 'matchedorders', 'matchedcount'].includes(lk)
  ) return 'matched_order_count';

  // 7. Lifetime Order Count
  if (
    raw === 'lifetime_order_count' ||
    ['lifetimeordercount', 'lifetimeorders', 'totalorders', 'ordercount'].includes(lk)
  ) return 'lifetime_order_count';

  // 8. Matched Net Order Amount BDT
  if (
    raw === 'matched_net_order_amount_bdt' ||
    ['matchednetorderamountbdt', 'matchedorderamount', 'matchedamount', 'matchedorderamountbdt', 'matchedspend'].includes(lk)
  ) return 'matched_net_order_amount_bdt';

  // 9. Lifetime Net Order Amount BDT
  if (
    raw === 'lifetime_net_order_amount_bdt' ||
    ['lifetimenetorderamountbdt', 'lifetimeorderamount', 'lifetimeamount', 'lifetimeorderamountbdt', 'lifetimespend', 'totalamount', 'orderamount'].includes(lk)
  ) return 'lifetime_net_order_amount_bdt';

  // 10. Prepaid Order Count
  if (
    raw === 'prepaid_order_count' ||
    ['prepaidordercount', 'prepaidorders', 'prepaidcount', 'prepaid'].includes(lk)
  ) return 'prepaid_order_count';

  // 11. Matched Unique Merchant Count
  if (
    raw === 'matched_unique_merchant_count' ||
    ['matcheduniquemerchantcount', 'matchedmerchants', 'matchedmerchantcount'].includes(lk)
  ) return 'matched_unique_merchant_count';

  // 12. Lifetime Unique Merchant Count
  if (
    raw === 'lifetime_unique_merchant_count' ||
    ['lifetimeuniquemerchantcount', 'lifetimemerchants', 'lifetimemerchantcount'].includes(lk)
  ) return 'lifetime_unique_merchant_count';

  // 13. Primary Merchant
  if (
    raw === 'primary_merchant' ||
    ['primarymerchant', 'merchant', 'store', 'shop', 'vendor', 'seller'].includes(lk)
  ) return 'primary_merchant';

  // 14. Matched District Filters
  if (
    raw === 'matched_district_filters' ||
    ['matcheddistrictfilters', 'matcheddistrict', 'district', 'districtname'].includes(lk)
  ) return 'matched_district_filters';

  // 15. Matched City Filters
  if (
    raw === 'matched_city_filters' ||
    ['matchedcityfilters', 'matchedcity', 'city', 'cityname'].includes(lk)
  ) return 'matched_city_filters';

  // 16. Matched Area Filters
  if (
    raw === 'matched_area_filters' ||
    ['matchedareafilters', 'matchedarea', 'area', 'areaname', 'thana', 'zone', 'subdistrict'].includes(lk)
  ) return 'matched_area_filters';

  // 17. Matched Block Road Filters
  if (
    raw === 'matched_block_road_filters' ||
    ['matchedblockroadfilters', 'matchedblockroad', 'blockroad', 'road', 'block', 'roadno'].includes(lk)
  ) return 'matched_block_road_filters';

  // 18. Inferred Primary Area
  if (
    raw === 'inferred_primary_area' ||
    ['inferredprimaryarea', 'inferredarea', 'primaryarea'].includes(lk)
  ) return 'inferred_primary_area';

  // 19. Lifetime Frequency Segment
  if (
    raw === 'lifetime_frequency_segment' ||
    ['lifetimefrequencysegment', 'frequencysegment', 'frequency'].includes(lk)
  ) return 'lifetime_frequency_segment';

  // 20. Lifetime Value Segment
  if (
    raw === 'lifetime_value_segment' ||
    ['lifetimevaluesegment', 'valuesegment', 'segment'].includes(lk)
  ) return 'lifetime_value_segment';

  // 21. Lifetime Primary Category
  if (
    raw === 'lifetime_primary_category' ||
    ['lifetimeprimarycategory', 'primarycategory', 'category', 'itemcategory'].includes(lk)
  ) return 'lifetime_primary_category';

  // 22. Email
  if (['email', 'mail', 'emailaddress', 'useremail', 'customeremail'].includes(lk)) return 'email';

  // 23. Age
  if (['age', 'years', 'userage', 'customerage'].includes(lk)) return 'age';

  // Sample inspection fallback
  for (const v of sampleValues) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;

    if (s.includes('@') && s.includes('.') && s.length >= 6) {
      return 'email';
    }

    const cleanPhone = s.replace(/[\s\+\-\(\)]/g, '');
    if (/^\d{10,15}$/.test(cleanPhone)) {
      if (
        cleanPhone.startsWith('01') ||
        cleanPhone.startsWith('8801') ||
        cleanPhone.startsWith('+8801')
      ) {
        return 'phone';
      }
    }
  }

  return 'skip';
}

interface ColumnMappingStudioProps {
  columnNames: string[];
  sampleRows: any[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function ColumnMappingStudio({
  columnNames,
  sampleRows,
  mapping,
  onMappingChange,
  isOpen,
  onToggleOpen,
}: ColumnMappingStudioProps) {
  const [isAiMappingLoading, setIsAiMappingLoading] = React.useState(false);
  const [aiRecommendations, setAiRecommendations] = React.useState<Record<string, { targetField: string; confidence: number; reasoning: string }>>({});

  const handleFieldSelect = (columnName: string, targetField: string) => {
    onMappingChange({
      ...mapping,
      [columnName]: targetField,
    });
  };

  const handleToggleSkip = (columnName: string) => {
    const current = mapping[columnName] || 'skip';
    if (current === 'skip') {
      const samples = sampleRows.map((r) => r[columnName]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      const suggested = getAutoSuggestedField(columnName, samples);
      handleFieldSelect(columnName, suggested === 'skip' ? 'name' : suggested);
    } else {
      handleFieldSelect(columnName, 'skip');
    }
  };

  const handleSkipAllNonKeys = () => {
    const updated: Record<string, string> = { ...mapping };
    columnNames.forEach((col) => {
      const current = updated[col] || 'skip';
      if (current !== 'phone' && current !== 'name' && current !== 'email') {
        updated[col] = 'skip';
      }
    });
    onMappingChange(updated);
  };

  const handleKeepAll = () => {
    const updated: Record<string, string> = { ...mapping };
    columnNames.forEach((col) => {
      if (updated[col] === 'skip') {
        const samples = sampleRows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
        const suggested = getAutoSuggestedField(col, samples);
        updated[col] = suggested === 'skip' ? 'name' : suggested;
      }
    });
    onMappingChange(updated);
  };

  const handleResetToAuto = () => {
    const autoMap: Record<string, string> = {};
    columnNames.forEach((col) => {
      const samples = sampleRows.map((r) => r[col]).filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
      autoMap[col] = getAutoSuggestedField(col, samples);
    });
    onMappingChange(autoMap);
  };

  const handleDeepSeekAutoMap = async () => {
    setIsAiMappingLoading(true);
    try {
      const res = await fetch('/api/ai/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columnNames,
          sampleRows: sampleRows.slice(0, 5),
        }),
      });

      if (!res.ok) throw new Error('AI Mapping API call failed');

      const data = await res.json();
      if (data.mappings) {
        setAiRecommendations(data.mappings);
        const updated: Record<string, string> = { ...mapping };
        Object.entries(data.mappings).forEach(([col, rec]: any) => {
          if (rec.targetField) {
            updated[col] = rec.targetField;
          }
        });
        onMappingChange(updated);
      }
    } catch (err) {
      console.warn('DeepSeek AI Auto-Map exception, fallback to rule-based:', err);
      handleResetToAuto();
    } finally {
      setIsAiMappingLoading(false);
    }
  };

  const phoneMappedColumn = columnNames.find((col) => mapping[col] === 'phone');
  const skippedColumnsCount = columnNames.filter((col) => mapping[col] === 'skip').length;
  const activeMappedCount = columnNames.length - skippedColumnsCount;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
      {/* Collapsible Header */}
      <div
        onClick={onToggleOpen}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-850 dark:to-slate-900 cursor-pointer select-none hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900 flex items-center justify-center shrink-0 shadow-xs">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Custom Column Mapping Studio
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-extrabold text-[10px] uppercase tracking-wider">
                {isOpen ? 'Customizing' : 'Active'}
              </span>
              {skippedColumnsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
                  {skippedColumnsCount} Skipped
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isOpen
                ? 'Review column connections. Use DeepSeek AI Auto-Map for semantic matching or 🚫 Skip to ignore.'
                : `Smart mapping active (${activeMappedCount} columns importing, ${skippedColumnsCount} skipped). Click to customize.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {phoneMappedColumn ? (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-[11px] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mobile No: &ldquo;{phoneMappedColumn}&rdquo;</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-[11px] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>No Mobile No Selected</span>
            </span>
          )}

          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 text-xs font-bold shadow-2xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isOpen ? 'Collapse ▴' : 'Customize ▾'}
          </button>
        </div>
      </div>

      {/* Expanded Mapping Table & Controls */}
      {isOpen && (
        <div className="p-4 sm:p-6 space-y-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-in fade-in duration-200">
          {/* Top Quick Actions Toolbar & Smart Upsert Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11.5px]">
                ⚡ Smart Upsert / Incremental Update System
              </span>
              <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                Records are matched by <strong>Mobile Number (phone)</strong>. Only mapped columns with non-empty values update existing contacts. <strong>🚫 Skip</strong> keeps existing database data 100% unchanged. New phone numbers create new contacts with zero duplicate entries.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Info className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="font-medium">
                Use DeepSeek AI for smart semantic recognition, or <strong>🚫 Skip</strong> to ignore columns.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
              {/* DeepSeek AI Auto-Map Button */}
              <button
                type="button"
                onClick={handleDeepSeekAutoMap}
                disabled={isAiMappingLoading}
                title="Use AI (GPT-4o) to semantically map messy column headers"
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 text-white hover:from-purple-700 hover:to-brand-700 text-[11px] font-extrabold flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isAiMappingLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isAiMappingLoading ? 'AI Mapping...' : '✨ Smart AI Auto-Map'}</span>
              </button>

              <button
                type="button"
                onClick={handleSkipAllNonKeys}
                title="Skip all non-essential columns, keeping only Mobile No, Name, and Email"
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <Ban className="w-3 h-3" />
                <span>Skip All Non-Keys</span>
              </button>

              <button
                type="button"
                onClick={handleKeepAll}
                title="Un-skip all columns and map them automatically"
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <Layers className="w-3 h-3 text-gray-500" />
                <span>Keep All</span>
              </button>

              <button
                type="button"
                onClick={handleResetToAuto}
                title="Reset all column mappings to rule-based auto-detect"
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900 hover:bg-brand-50 text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Rules</span>
              </button>
            </div>
          </div>

          {/* Mapping Grid / Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/90 dark:bg-slate-800/90 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[10px] font-bold border-b border-gray-200 dark:border-slate-700">
                  <th className="py-3 px-4 w-[28%]">Source File Column</th>
                  <th className="py-3 px-4 w-[28%]">Sample Values (First Rows)</th>
                  <th className="py-3 px-4 w-[44%]">Target System Mapping & Skip Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {columnNames.map((colName, idx) => {
                  const currentField = mapping[colName] || 'skip';
                  const isSkipped = currentField === 'skip';
                  const isPhoneKey = currentField === 'phone';

                  // Extract sample values for this column
                  const samples = sampleRows
                    .map((r) => r[colName])
                    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
                    .slice(0, 3);

                  return (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        isSkipped
                          ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-70 hover:opacity-90'
                          : isPhoneKey
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/50'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Source Column Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono text-[10px] flex items-center justify-center font-bold shrink-0 ${
                              isSkipped
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                                : isPhoneKey
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span
                              className={`font-mono text-xs font-bold block truncate ${
                                isSkipped
                                  ? 'text-gray-400 dark:text-gray-500 line-through'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {colName}
                            </span>
                            {isSkipped ? (
                              <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">
                                🚫 Skipped (Will Not Import)
                              </span>
                            ) : aiRecommendations[colName] ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-600 dark:text-purple-400"
                                title={aiRecommendations[colName].reasoning}
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                {aiRecommendations[colName].confidence}% DeepSeek Match
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Sample Values Preview */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {samples.length > 0 ? (
                            samples.map((sVal, sIdx) => (
                              <span
                                key={sIdx}
                                className={`px-2 py-0.5 rounded-md font-mono text-[11px] truncate max-w-[130px] border ${
                                  isSkipped
                                    ? 'bg-gray-50 dark:bg-slate-800/40 text-gray-400 border-gray-200/50'
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-slate-700'
                                }`}
                                title={String(sVal)}
                              >
                                {String(sVal)}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">
                              Empty in sample rows
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dropdown Selector + Dedicated Skip / Un-Skip Button */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={currentField}
                              onChange={(e) => handleFieldSelect(colName, e.target.value)}
                              className={`w-full py-2 pl-3 pr-8 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-2xs ${
                                currentField === 'phone'
                                  ? 'border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40'
                                  : currentField === 'skip'
                                  ? 'border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                                  : 'border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 bg-brand-50/40 dark:bg-brand-950/30'
                              }`}
                            >
                              {TARGET_SYSTEM_FIELDS.map((target) => (
                                <option
                                  key={target.value}
                                  value={target.value}
                                  className="text-gray-900 dark:text-white bg-white dark:bg-slate-900 font-medium py-1"
                                >
                                  {target.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 1-Click Fast Skip / Un-skip Toggle Button */}
                          {isSkipped ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSkip(colName)}
                              title="Click to Un-skip / Restore this column"
                              className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleSkip(colName)}
                              title="1-Click Skip: Click to ignore and skip this column during import"
                              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-gray-600 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-300 border border-gray-200 hover:border-rose-300 dark:border-slate-700 dark:hover:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95 group"
                            >
                              <Ban className="w-3.5 h-3.5 text-gray-400 group-hover:text-rose-500 transition-colors" />
                              <span>Skip</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live Mapping Summary Bar */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                <strong>{activeMappedCount}</strong> of <strong>{columnNames.length}</strong> columns will be imported (
                <strong>{skippedColumnsCount}</strong> skipped).
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
