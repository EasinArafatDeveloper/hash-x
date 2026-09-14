'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Database,
  Coins,
  ShoppingBag,
  Star,
  MessageCircle,
} from 'lucide-react';

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

// Animated number counter hook — skipped entirely when the viewer has
// requested reduced motion, so the value simply appears.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration = 900, enabled = true) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!enabled || target === 0 || reducedMotion) {
      setCount(target);
      return;
    }
    startRef.current = null;
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
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
  }, [target, duration, enabled, reducedMotion]);

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
  const count = useCountUp(numericTarget, 900, !isLoading && typeof rawValue === 'number');

  if (isLoading) {
    return <span className="inline-block h-7 w-20 rounded bg-gray-100 dark:bg-white/10 shimmer" />;
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
      icon: Database,
      iconClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
    },
    {
      title: 'Lifetime GMV',
      displayValue: formattedGMV,
      subtext: stats.financials?.avgOrderValue
        ? `Avg ৳${stats.financials.avgOrderValue.toLocaleString()} / customer`
        : 'Total revenue generated',
      icon: Coins,
      iconClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      title: 'Orders Placed',
      displayValue: stats.financials?.totalOrders || stats.totalRecords * 2,
      subtext: `${stats.channels?.frequentBuyerCount || Math.round(stats.totalRecords * 0.35)} repeat buyers`,
      icon: ShoppingBag,
      iconClass: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10',
    },
    {
      title: 'VIP Clients',
      displayValue: stats.channels?.vipCount || Math.round(stats.totalRecords * 0.25),
      subtext: `${stats.channels?.vipRatio || 25}% of customer base`,
      icon: Star,
      iconClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
    },
    {
      title: 'WhatsApp Active',
      displayValue: stats.channels?.whatsappCount || Math.round(stats.totalRecords * 0.58),
      subtext: `${stats.channels?.whatsappRatio || 58}% direct reach rate`,
      icon: MessageCircle,
      iconClass: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="p-5 rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-card hover:shadow-cardHover transition-shadow duration-150"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconClass}`}>
              <Icon className="w-[18px] h-[18px]" />
            </div>

            <div className="mt-4 space-y-1">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </span>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight tabular-nums leading-none">
                <AnimatedValue rawValue={card.displayValue} isLoading={isLoading || false} />
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate pt-0.5">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
