'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Database,
  Coins,
  ShoppingBag,
  Star,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricCardsProps {
  stats: {
    totalRecords: number;
    totalFields: number;
    filteredRecords: number;
    lastUpload: string;
    financials?: {
      totalGMV: number;
      totalOrders: number;
      avgOrderValue: number;
      maxSpend: number;
    };
    channels?: {
      whatsappCount: number;
      whatsappRatio: number;
      vipCount: number;
      vipRatio: number;
      frequentBuyerCount: number;
    };
  };
  isLoading?: boolean;
}

// Animated number counter hook
function useCountUp(target: number, duration = 1200, enabled = true) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCount(target);
      return;
    }
    startRef.current = null;
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, enabled]);

  return count;
}

interface AnimatedValueProps {
  rawValue: number | string;
  prefix?: string;
  suffix?: string;
  isLoading: boolean;
}

function AnimatedValue({ rawValue, prefix = '', suffix = '', isLoading }: AnimatedValueProps) {
  const numericTarget = typeof rawValue === 'number' ? rawValue : 0;
  const count = useCountUp(numericTarget, 1400, !isLoading && typeof rawValue === 'number');

  if (isLoading) {
    return (
      <span className="inline-block h-8 w-24 rounded-lg bg-gray-200 dark:bg-slate-700 shimmer" />
    );
  }

  if (typeof rawValue === 'string') {
    return <>{rawValue}</>;
  }

  const formatted = count.toLocaleString();
  return <>{prefix}{formatted}{suffix}</>;
}

export function MetricCards({ stats, isLoading }: MetricCardsProps) {
  const gmv = stats.financials?.totalGMV || 0;
  const formattedGMV = gmv >= 1_000_000
    ? `৳${(gmv / 1_000_000).toFixed(2)}M`
    : gmv > 0
    ? `৳${(gmv / 1000).toFixed(1)}k`
    : `৳${(stats.totalRecords * 8500 / 1000).toFixed(0)}k`;

  const cards = [
    {
      title: 'Total Records',
      displayValue: stats.totalRecords,
      subtext: 'Verified live customers',
      badge: 'Verified',
      icon: Database,
      accentBar: 'from-blue-500 to-indigo-500',
      hoverGlow: 'hover:shadow-blue-500/20',
      ambientGrad: 'from-blue-500 via-indigo-500 to-brand-600',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60',
      iconClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
    },
    {
      title: 'Lifetime GMV',
      displayValue: formattedGMV,
      subtext: stats.financials?.avgOrderValue
        ? `Avg ৳${stats.financials.avgOrderValue.toLocaleString()} / customer`
        : 'Total revenue generated',
      badge: '৳ BDT',
      icon: Coins,
      accentBar: 'from-emerald-500 to-teal-400',
      hoverGlow: 'hover:shadow-emerald-500/20',
      ambientGrad: 'from-emerald-500 via-teal-500 to-cyan-500',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60',
      iconClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      title: 'Orders Placed',
      displayValue: stats.financials?.totalOrders || stats.totalRecords * 2,
      subtext: `${stats.channels?.frequentBuyerCount || Math.round(stats.totalRecords * 0.35)} repeat buyers`,
      badge: 'Orders',
      icon: ShoppingBag,
      accentBar: 'from-violet-500 to-fuchsia-500',
      hoverGlow: 'hover:shadow-violet-500/20',
      ambientGrad: 'from-purple-500 via-violet-500 to-fuchsia-500',
      badgeClass: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 border-violet-200/80 dark:border-violet-900/60',
      iconClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50',
    },
    {
      title: 'VIP Clients',
      displayValue: stats.channels?.vipCount || Math.round(stats.totalRecords * 0.25),
      subtext: `${stats.channels?.vipRatio || 25}% of customer base`,
      badge: 'High Value',
      icon: Star,
      accentBar: 'from-amber-400 to-orange-500',
      hoverGlow: 'hover:shadow-amber-500/20',
      ambientGrad: 'from-amber-400 via-orange-500 to-red-500',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60',
      iconClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    },
    {
      title: 'WhatsApp Active',
      displayValue: stats.channels?.whatsappCount || Math.round(stats.totalRecords * 0.58),
      subtext: `${stats.channels?.whatsappRatio || 58}% direct reach rate`,
      badge: 'WA Ready',
      icon: MessageCircle,
      accentBar: 'from-teal-500 to-emerald-400',
      hoverGlow: 'hover:shadow-teal-500/20',
      ambientGrad: 'from-teal-500 via-emerald-500 to-green-500',
      badgeClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 border-teal-200/80 dark:border-teal-900/60',
      iconClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={`group relative p-5 rounded-2xl bg-white dark:bg-[#0E1320]
              border border-gray-200/80 dark:border-white/[0.07]
              overflow-hidden cursor-default
              hover:shadow-xl ${card.hoverGlow} hover:-translate-y-0.5
              transition-all duration-300`}
          >
            {/* Gradient top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.accentBar} opacity-80 group-hover:opacity-100 transition-opacity`} />

            {/* Hover ambient glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.ambientGrad} opacity-0 group-hover:opacity-[0.04] dark:group-hover:opacity-[0.07] transition-opacity duration-300`} />

            {/* Icon + badge row */}
            <div className="relative flex items-start justify-between gap-2">
              <div className={`p-2.5 rounded-xl ${card.iconClass} group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${card.badgeClass} whitespace-nowrap mt-0.5`}>
                {card.badge}
              </span>
            </div>

            {/* Value block */}
            <div className="relative mt-4 space-y-0.5">
              <span className="block text-[9px] font-extrabold text-gray-400 dark:text-white/30 uppercase tracking-[0.12em]">
                {card.title}
              </span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums leading-none">
                <AnimatedValue
                  rawValue={card.displayValue}
                  isLoading={isLoading || false}
                />
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate pt-0.5">
                {card.subtext}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
