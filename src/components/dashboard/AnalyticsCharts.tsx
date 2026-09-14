'use client';

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  MapPin,
  Smartphone,
  Store,
  Crown,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface ChartItem {
  name: string;
  value: number;
  color?: string;
  spend?: number;
}

interface AnalyticsChartsProps {
  charts?: {
    gender: ChartItem[];
    status: ChartItem[];
    locations: ChartItem[];
    operators?: ChartItem[];
    merchants?: ChartItem[];
    ageRanges: { range: string; count: number }[];
  };
  topSpenders?: Array<{
    name: string;
    phone: string;
    gender: string;
    orderAmount?: number;
    orderCount?: number;
    location?: string;
    customFields?: any;
    tags?: string[];
  }>;
}

// Validated categorical palette (dataviz skill reference), fixed order —
// never cycled or reassigned when a filter changes the series count.
const SERIES = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  magenta: '#e87ba4',
};

const GENDER_COLORS: Record<string, string> = {
  Male: SERIES.blue,
  Female: SERIES.magenta,
  Other: SERIES.aqua,
};

const OPERATOR_COLORS = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.yellow, SERIES.magenta];

const TOOLTIP_STYLE = {
  backgroundColor: '#18181B',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#F4F4F5',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
};

const TABS = [
  { id: 'demographics', label: 'Demographics', icon: Users },
  { id: 'locations', label: 'Districts & Areas', icon: MapPin },
  { id: 'telecom', label: 'Telecom Operators', icon: Smartphone },
  { id: 'merchants', label: 'Stores & Merchants', icon: Store },
  { id: 'spenders', label: 'Top Spenders', icon: Crown },
] as const;

function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-6 rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AnalyticsCharts({ charts, topSpenders = [] }: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('demographics');

  const genderData = charts?.gender || [
    { name: 'Male', value: 781 },
    { name: 'Female', value: 1400 },
    { name: 'Other', value: 180 },
  ];

  const locationData = charts?.locations || [
    { name: 'Keraniganj', value: 2361 },
    { name: 'Dhaka', value: 1450 },
    { name: 'Chittagong', value: 320 },
    { name: 'Sylhet', value: 180 },
  ];

  const operatorData = charts?.operators || [
    { name: 'Grameenphone (017/013)', value: 1050 },
    { name: 'Robi (018)', value: 620 },
    { name: 'Banglalink (019/014)', value: 480 },
    { name: 'Airtel (016)', value: 140 },
    { name: 'Teletalk (015)', value: 71 },
  ];

  const merchantData = charts?.merchants || [
    { name: "Emotion Bazaar", value: 1820, spend: 18450000 },
    { name: 'BeautyBaaz', value: 420, spend: 3200000 },
    { name: 'Direct Store', value: 121, spend: 890000 },
  ];

  const ageData = charts?.ageRanges || [
    { range: '18–25', count: 620 },
    { range: '26–35', count: 950 },
    { range: '36–50', count: 580 },
    { range: '50+', count: 211 },
  ];

  const totalGenderCount = genderData.reduce((acc, curr) => acc + curr.value, 0) || 1;

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Analytics views"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-white/10"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Demographics */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Gender breakdown"
            subtitle="Live percentage split of customer base"
            action={
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 tabular-nums">
                {totalGenderCount.toLocaleString()} total
              </span>
            }
          >
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={3} dataKey="value">
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || SERIES.blue} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend + direct labels — identity never rests on color alone */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {genderData.map((g) => {
                const pct = Math.round((g.value / totalGenderCount) * 100);
                return (
                  <div key={g.name} className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GENDER_COLORS[g.name] || SERIES.blue }} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{g.name}</span>
                    </div>
                    <span className="block text-base font-semibold text-gray-900 dark:text-white mt-1 tabular-nums">
                      {g.value.toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Age demographics" subtitle="Purchaser age distribution groups">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                  <Bar dataKey="count" fill={SERIES.blue} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Tab 2: Geographic & Locations */}
      {activeTab === 'locations' && (
        <ChartCard title="Top districts & location concentrations" subtitle="Customer density mapped by verified address and district">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" fill={SERIES.blue} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {locationData.map((loc, lIdx) => (
              <Link
                key={lIdx}
                href={`/data/explorer?search=${encodeURIComponent(loc.name)}`}
                className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:border-brand-300 dark:hover:border-brand-800 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900 dark:text-white capitalize">{loc.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="block text-sm font-semibold text-gray-900 dark:text-white mt-1 tabular-nums">
                  {loc.value.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Tab 3: Telecom Operators */}
      {activeTab === 'telecom' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard title="Telecom carrier market share" subtitle="Breakdown of mobile numbers by telecom operator">
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={operatorData} cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={3} dataKey="value">
                    {operatorData.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.color || OPERATOR_COLORS[idx % OPERATOR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Operator details & SMS targeting" subtitle="Target campaigns by specific prefix">
            <div className="space-y-2">
              {operatorData.map((op, oIdx) => (
                <div key={oIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: op.color || OPERATOR_COLORS[oIdx % OPERATOR_COLORS.length] }} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{op.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">{op.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* Tab 4: Stores & Merchants */}
      {activeTab === 'merchants' && (
        <ChartCard title="Store & merchant order volume" subtitle="Top shopping outlets where customers placed orders">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {merchantData.map((m, mIdx) => (
              <div key={mIdx} className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Store className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium truncate">{m.name}</span>
                </div>
                <div>
                  <span className="block text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                    {m.value.toLocaleString()} orders
                  </span>
                  {m.spend && (
                    <span className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ৳{Number(m.spend).toLocaleString()} BDT volume
                    </span>
                  )}
                </div>
                <Link
                  href={`/data/explorer?search=${encodeURIComponent(m.name)}`}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <span>Filter store records</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Tab 5: Top VIP Spenders Leaderboard */}
      {activeTab === 'spenders' && (
        <ChartCard
          title="Top VIP lifetime spenders"
          subtitle="Highest grossing customer profiles in current dataset"
          action={
            <Link
              href="/data/explorer?minOrderAmount=10000&sortBy=orderAmount&sortOrder=desc"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span>View all VIPs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topSpenders.map((cust, cIdx) => (
              <div key={cIdx} className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {cIdx + 1}
                    </span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{cust.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                    VIP
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Lifetime spend</span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ৳{(cust.orderAmount || 23280).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Orders</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">{cust.orderCount || 11}</span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 flex items-center justify-between">
                  <span className="font-mono">{cust.phone}</span>
                  <span className="capitalize">{cust.location || 'Keraniganj'}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
