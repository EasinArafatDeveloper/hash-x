'use client';

import React, { useState } from 'react';
import { IRecord } from '@/types';
import { Phone, MapPin, Calendar, ArrowRight, Image as ImageIcon, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardViewProps {
  records: IRecord[];
  onSelectRecord: (record: IRecord) => void;
  isLoading?: boolean;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; dot: string }> = {
  Active: {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    text: 'Active',
    dot: 'bg-emerald-500',
  },
  Inactive: {
    bg: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400 border-gray-200 dark:border-slate-700',
    text: 'Inactive',
    dot: 'bg-gray-400',
  },
  Pending: {
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    text: 'Pending',
    dot: 'bg-amber-500',
  },
  Suspended: {
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900',
    text: 'Suspended',
    dot: 'bg-rose-500',
  },
};

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

function UserAvatar({ record }: { record: IRecord }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl =
    (record.avatarBase64 && record.avatarBase64.startsWith('data:image/'))
      ? record.avatarBase64
      : record._id
      ? `/api/avatar/${record._id}`
      : record.avatarUrl || (record.avatarType?.startsWith('http') ? record.avatarType : '');

  const initials = record.name
    ? record.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  if (avatarUrl && !imgError) {
    return (
      <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-2 ring-brand-500/20 bg-gray-100 dark:bg-slate-800">
        <img
          src={avatarUrl}
          alt={record.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
      {initials}
    </div>
  );
}

export function CardView({ records, onSelectRecord, isLoading }: CardViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 animate-pulse space-y-4"
          >
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded" />
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {records.map((record, idx) => {
        const badge = STATUS_BADGES[record.status] || STATUS_BADGES.Active;
        const hasAvatar = !!(record.avatarUrl || (record.avatarType && record.avatarType !== 'Without Avatar' && !record.avatarType.startsWith('http')));

        const cf = record.customFields || {};
        const spend =
          record.orderAmount ||
          parseFloat(String(cf.lifetime_net_order_amount_bdt || cf.matched_net_order_amount_bdt || cf['Lifetime Order Amount BDT'] || '0').replace(/[^0-9.-]+/g, '')) ||
          0;
        const orders =
          record.orderCount ||
          parseInt(String(cf.lifetime_order_count || cf.matched_order_count || cf['Lifetime Order Count'] || '0').replace(/[^0-9.-]+/g, ''), 10) ||
          0;
        const merchant = cleanVal(cf.primary_merchant || cf['Primary Merchant'] || '');
        const address =
          record.address ||
          cleanVal(cf.canonical_address || cf['Canonical Address'] || cf['full_address'] || record.location || record.area || '');

        return (
          <motion.div
            key={record._id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: (idx % 12) * 0.03 }}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800/80 shadow-card hover:shadow-cardHover transition-all duration-200 flex flex-col justify-between group hover:border-purple-300 dark:hover:border-purple-800"
          >
            <div>
              {/* Card Top Row: Avatar Image & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                  <UserAvatar record={record} />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {record.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-gray-400 shrink-0" /> {record.phone}
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${badge.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {record.status}
                </span>
              </div>

              {/* Commercial Metrics Banner (Spend & Orders) */}
              {(spend > 0 || orders > 0 || merchant) && (
                <div className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block tracking-wider">
                      Lifetime Spend
                    </span>
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-200 font-mono text-xs">
                      {spend > 0 ? `৳${spend.toLocaleString()} BDT` : 'N/A'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block tracking-wider">
                      Orders Placed
                    </span>
                    <span className="font-bold text-teal-800 dark:text-teal-200 text-xs">
                      {orders > 0 ? `${orders} orders` : '1 order'}
                    </span>
                  </div>
                </div>
              )}

              {/* Tag Badges */}
              {((record.tags && record.tags.length > 0) || record.category || merchant) && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {record.tags && record.tags.length > 0 ? (
                    record.tags.map((tag, tIdx) => {
                      const isVip = tag.toLowerCase().includes('vip');
                      const isWa = tag.toLowerCase().includes('whatsapp');
                      const isHot = tag.toLowerCase().includes('hot') || tag.toLowerCase().includes('frequent');
                      const isGeo = tag.toLowerCase().includes('zone') || tag.toLowerCase().includes('area');

                      return (
                        <span
                          key={tIdx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isVip
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : isWa
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : isHot
                              ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : isGeo
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/60'
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5 opacity-75" />
                          {tag}
                        </span>
                      );
                    })
                  ) : record.category ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-900/60">
                      <Tag className="w-2.5 h-2.5 text-purple-500" />
                      {record.category}
                    </span>
                  ) : null}

                  {merchant && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      🏪 {merchant}
                    </span>
                  )}
                </div>
              )}

              {/* Data Grid Section */}
              <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 dark:text-gray-500 font-medium text-[11px]">Gender</span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{record.gender || 'Other'}</p>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 font-medium text-[11px]">Avatar Photo</span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasAvatar ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {hasAvatar ? 'With Photo' : 'No Photo'}
                  </p>
                </div>
                <div className="col-span-2 mt-0.5">
                  <span className="text-gray-400 dark:text-gray-500 font-medium text-[11px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" /> Location / Address
                  </span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 truncate text-[11px]" title={address}>
                    {address || cleanVal(record.location) || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Card Action */}
            <div className="mt-4 pt-3 flex items-center justify-between text-xs border-t border-gray-50 dark:border-slate-800/50">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Recent'}
              </span>
              <button
                type="button"
                onClick={() => onSelectRecord(record)}
                className="inline-flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
              >
                View Details <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
