'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IRecord } from '@/types';
import {
  X,
  User,
  MapPin,
  Activity,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Check,
  Tag,
  ShoppingBag,
  Package,
  DollarSign,
  CreditCard,
  Store,
  Compass,
  Building2,
  Navigation,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface RecordDetailDrawerProps {
  record: IRecord | null;
  onClose: () => void;
}

function cleanVal(v: any): string {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (!s || s === '[]' || s === '[""]' || s === "['']" || s === 'null' || s === 'undefined') return '';
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean).join(', ');
      }
    } catch {
      return s.replace(/^\[\s*["']?/, '').replace(/["']?\s*\]$/, '').replace(/["']/g, '').trim();
    }
  }
  return s;
}

export function RecordDetailDrawer({ record, onClose }: RecordDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (record) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [record]);

  if (!mounted || !record) return null;

  const hasAvatarData = Boolean(
    (record.avatarBase64 && record.avatarBase64.startsWith('data:image/')) ||
    (record.avatarUrl && (record.avatarUrl.startsWith('http://') || record.avatarUrl.startsWith('https://') || record.avatarUrl.startsWith('data:image/'))) ||
    (record.avatarType && record.avatarType.startsWith('http')) ||
    (record.avatarType === 'With Avatar')
  );

  const avatarUrl = hasAvatarData
    ? (record.avatarBase64 && record.avatarBase64.startsWith('data:image/'))
      ? record.avatarBase64
      : record._id
      ? `/api/avatar/${record._id}`
      : record.avatarUrl || (record.avatarType?.startsWith('http') ? record.avatarType : '')
    : '';

  const initials = record.name
    ? record.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handleCopyPhone = () => {
    if (record.phone) {
      navigator.clipboard.writeText(record.phone);
      setCopied(true);
      toast.success(`Copied ${record.phone} to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cf = record.customFields || {};

  // Extract 21 Business Fields
  const address =
    record.address ||
    cf.address ||
    cf.canonical_address ||
    cf['Canonical Address'] ||
    cf['full_address'] ||
    '';

  const orderAmount =
    record.orderAmount ||
    cf.orderAmount ||
    cf.lifetime_net_order_amount_bdt ||
    cf['Lifetime Order Amount BDT'] ||
    cf['Order Amount'] ||
    0;

  const orderCount =
    record.orderCount ||
    cf.orderCount ||
    cf.lifetime_order_count ||
    cf['Lifetime Order Count'] ||
    cf['Order Count'] ||
    0;

  const matchedOrderCount =
    cf.matched_order_count ||
    cf['Matched Order Count'] ||
    cf.matched_orders ||
    0;

  const matchedOrderAmount =
    cf.matched_net_order_amount_bdt ||
    cf['Matched Order Amount BDT'] ||
    cf.matched_amount ||
    0;

  const prepaidOrderCount =
    cf.prepaid_order_count ||
    cf['Prepaid Order Count'] ||
    0;

  const primaryMerchant = cleanVal(
    cf.primary_merchant ||
    cf['Primary Merchant'] ||
    cf.merchant ||
    ''
  );

  const matchedMerchantCount =
    cf.matched_unique_merchant_count ||
    cf['Matched Unique Merchant Count'] ||
    0;

  const lifetimeMerchantCount =
    cf.lifetime_unique_merchant_count ||
    cf['Lifetime Unique Merchant Count'] ||
    0;

  const matchedDistrict = cleanVal(
    cf.matched_district_filters ||
    cf['Matched District'] ||
    cf.district ||
    ''
  );

  const matchedCity = cleanVal(
    cf.matched_city_filters ||
    cf['Matched City'] ||
    cf.city ||
    ''
  );

  const matchedArea = cleanVal(
    cf.matched_area_filters ||
    cf['Matched Area'] ||
    record.area ||
    cf.area ||
    ''
  );

  const matchedBlockRoad = cleanVal(
    cf.matched_block_road_filters ||
    cf['Matched Block / Road'] ||
    ''
  );

  const inferredPrimaryArea = cleanVal(
    cf.inferred_primary_area ||
    cf['Inferred Primary Area'] ||
    ''
  );

  const whatsappStatus = cleanVal(
    cf.whatsapp_status ||
    cf['WhatsApp Status'] ||
    cf.whatsapp ||
    ''
  );

  const freqSegment = cleanVal(
    cf.lifetime_frequency_segment ||
    cf['Frequency Segment'] ||
    cf.frequency_segment ||
    ''
  );

  const valueSegment = cleanVal(
    cf.lifetime_value_segment ||
    cf['Value Segment'] ||
    cf.value_segment ||
    ''
  );

  const primaryCategory = cleanVal(
    record.category ||
    cf.lifetime_primary_category ||
    cf['Primary Category'] ||
    cf.category ||
    ''
  );

  const locationDisplay =
    cleanVal(record.location) ||
    matchedCity ||
    matchedDistrict ||
    inferredPrimaryArea ||
    matchedArea ||
    'Not specified';

  // Extract other remaining raw attributes (not duplicated in 21 standard cards)
  const knownKeys = new Set([
    'customer_name', 'Customer Name',
    'canonical_address', 'Canonical Address',
    'gender', 'Gender',
    'whatsapp_status', 'WhatsApp Status',
    'matched_order_count', 'Matched Order Count',
    'lifetime_order_count', 'Lifetime Order Count', 'Order Count', 'orderCount',
    'matched_net_order_amount_bdt', 'Matched Order Amount BDT',
    'lifetime_net_order_amount_bdt', 'Lifetime Order Amount BDT', 'Order Amount', 'orderAmount',
    'prepaid_order_count', 'Prepaid Order Count',
    'matched_unique_merchant_count', 'Matched Unique Merchant Count',
    'lifetime_unique_merchant_count', 'Lifetime Unique Merchant Count',
    'primary_merchant', 'Primary Merchant',
    'matched_district_filters', 'Matched District',
    'matched_city_filters', 'Matched City',
    'matched_area_filters', 'Matched Area',
    'matched_block_road_filters', 'Matched Block / Road',
    'inferred_primary_area', 'Inferred Primary Area',
    'lifetime_frequency_segment', 'Frequency Segment',
    'lifetime_value_segment', 'Value Segment',
    'lifetime_primary_category', 'Primary Category',
    'Tags / Labels',
  ]);

  const rawEntries = Object.entries(cf).filter(([k, v]) => !knownKeys.has(k) && v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '[]');

  const drawerContent = (
    <div className="fixed inset-0 z-[99999] flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm transition-all"
      />

      {/* Slide-over Full Height Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full sm:w-[540px] bg-white dark:bg-[#111113] h-full border-l border-gray-200 dark:border-white/10 shadow-xl flex flex-col overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="pt-5 pb-4 px-6 border-b border-gray-100 dark:border-white/10 bg-white/95 dark:bg-[#111113]/95 backdrop-blur flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            {avatarUrl && !imgError ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-1 ring-gray-200 dark:ring-white/10 bg-gray-100 dark:bg-white/5">
                <img
                  src={avatarUrl}
                  alt={record.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-base flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                {record.name}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {record.status} Member
                </span>
                {record.gender && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                    {record.gender}
                  </span>
                )}
                {whatsappStatus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-900/60">
                    <MessageSquare className="w-2.5 h-2.5" /> WA: {whatsappStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Full Profile Photo Preview Box if available */}
          {avatarUrl && !imgError && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-600" /> Profile Picture
                </span>
                <a
                  href={avatarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Open High-Res <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="w-full h-44 rounded-lg overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center border border-gray-200 dark:border-white/10">
                <img
                  src={avatarUrl}
                  alt={record.name}
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {/* 2. Canonical Address Highlight Card */}
          {address && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Canonical Delivery Address
                </span>
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed font-medium bg-white dark:bg-[#111113] p-3 rounded-lg border border-gray-200 dark:border-white/10">
                {address}
              </p>
            </div>
          )}

          {/* 3. Order Spending & Commercial Metrics Card */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-gray-400" /> Order & Spending Insights
            </h4>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/10">
                  <span className="text-[11px] text-gray-500 block flex items-center gap-1">
                    <Package className="w-3 h-3 text-gray-400" /> Lifetime Orders
                  </span>
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 block">
                    {orderCount} <span className="text-xs font-normal text-gray-400">orders</span>
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/10">
                  <span className="text-[11px] text-gray-500 block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-gray-400" /> Lifetime Spending
                  </span>
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5 block">
                    ৳{Number(orderAmount).toLocaleString()} <span className="text-xs font-normal text-gray-400">BDT</span>
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/10">
                  <span className="text-[11px] text-gray-500 block flex items-center gap-1">
                    <Package className="w-3 h-3 text-gray-400" /> Matched Orders
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 block">
                    {matchedOrderCount} <span className="text-xs font-normal text-gray-400">orders</span>
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/10">
                  <span className="text-[11px] text-gray-500 block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-gray-400" /> Matched Spend
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-0.5 block">
                    ৳{Number(matchedOrderAmount).toLocaleString()} <span className="text-xs font-normal text-gray-400">BDT</span>
                  </span>
                </div>
              </div>

              {prepaidOrderCount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-200/70 dark:border-white/10">
                  <span className="text-gray-500 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Prepaid Orders
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {prepaidOrderCount} orders
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Merchant Analytics Card */}
          {(primaryMerchant || lifetimeMerchantCount > 0 || matchedMerchantCount > 0) && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-gray-400" /> Merchant Analytics
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2.5 text-xs">
                {primaryMerchant && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Primary Merchant</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100 text-right">
                      {primaryMerchant}
                    </span>
                  </div>
                )}
                {lifetimeMerchantCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Lifetime Unique Merchants</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {lifetimeMerchantCount} merchants
                    </span>
                  </div>
                )}
                {matchedMerchantCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Matched Unique Merchants</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {matchedMerchantCount} merchants
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Personal Information Card */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" /> Personal & Contact Info
            </h4>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2.5 text-xs">
              {/* Phone */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Phone / Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 text-xs sm:text-sm">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {record.phone}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    aria-label="Copy phone number"
                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="Copy phone"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Email Address</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                  {record.email ? (
                    <>
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {record.email}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Not provided</span>
                  )}
                </span>
              </div>

              {/* Age & Gender */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Age & Gender</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {record.age > 0 ? `${record.age} years` : 'N/A'} &bull; {record.gender}
                </span>
              </div>

              {/* Location */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Location / City</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {locationDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Geographic Filters Breakdown Card */}
          {(matchedCity || matchedDistrict || matchedArea || matchedBlockRoad || inferredPrimaryArea) && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-gray-400" /> Geographic Breakdown
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2 text-xs">
                {matchedCity && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-400" /> Matched City
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                      {matchedCity}
                    </span>
                  </div>
                )}
                {matchedDistrict && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-gray-400" /> Matched District
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                      {matchedDistrict}
                    </span>
                  </div>
                )}
                {matchedArea && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" /> Matched Area
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {matchedArea}
                    </span>
                  </div>
                )}
                {matchedBlockRoad && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-gray-400" /> Matched Block / Road
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {matchedBlockRoad}
                    </span>
                  </div>
                )}
                {inferredPrimaryArea && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Inferred Primary Area</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {inferredPrimaryArea}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. Segmentation & Categories Card */}
          {(freqSegment || valueSegment || primaryCategory || whatsappStatus) && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-400" /> Customer Segmentation
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2 text-xs">
                {freqSegment && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Frequency Segment</span>
                    <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 font-bold text-[11px]">
                      {freqSegment}
                    </span>
                  </div>
                )}
                {valueSegment && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Value Segment</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 font-bold text-[11px]">
                      {valueSegment}
                    </span>
                  </div>
                )}
                {primaryCategory && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Primary Category</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {primaryCategory}
                    </span>
                  </div>
                )}
                {whatsappStatus && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">WhatsApp Status</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                      {whatsappStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. Attached Tags & Audience Notes */}
          {((record.tags && record.tags.length > 0) || primaryCategory) && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" /> Attached Tags & Audience Notes
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex flex-wrap gap-2">
                {record.tags && record.tags.length > 0 ? (
                  record.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200/80 dark:border-brand-900/60"
                    >
                      <Tag className="w-3 h-3" />
                      {cleanVal(tag)}
                    </span>
                  ))
                ) : primaryCategory ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 border border-brand-200/80 dark:border-brand-900/60">
                    <Tag className="w-3 h-3" />
                    {primaryCategory}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* 9. Activity & Online Details Card */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-gray-400" /> Activity & Online Metrics
            </h4>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Account Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {record.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Active Days (≤)</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {record.activeDays > 0 ? `${record.activeDays} days` : '0 days'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Last Online Time</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {record.lastActive ? new Date(record.lastActive).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* 10. Additional Raw Attributes / Metadata */}
          {rawEntries.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" /> Other Custom Attributes
              </h4>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2 text-xs">
                {rawEntries.map(([k, v]) => (
                  <div key={k} className="flex justify-between items-start gap-3">
                    <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-right truncate max-w-[240px]">
                      {cleanVal(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-white/95 dark:bg-[#111113]/95 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyPhone}
            className="w-1/2 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Number</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-card transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
