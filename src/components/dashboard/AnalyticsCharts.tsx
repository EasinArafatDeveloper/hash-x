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
  AreaChart,
  Area,
} from 'recharts';
import {
  Users,
  MapPin,
  Smartphone,
  Store,
  Trophy,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const GENDER_COLORS: Record<string, string> = {
  Male: '#6366F1',
  Female: '#EC4899',
  Other: '#10B981',
};

const OPERATOR_COLORS = ['#0EA5E9', '#EF4444', '#F97316', '#EC4899', '#10B981', '#8B5CF6'];

export function AnalyticsCharts({ charts, topSpenders = [] }: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<'demographics' | 'locations' | 'telecom' | 'merchants' | 'spenders'>('demographics');

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
    { name: 'Grameenphone (017/013)', value: 1050, color: '#0EA5E9' },
    { name: 'Robi (018)', value: 620, color: '#EF4444' },
    { name: 'Banglalink (019/014)', value: 480, color: '#F97316' },
    { name: 'Airtel (016)', value: 140, color: '#EC4899' },
    { name: 'Teletalk (015)', value: 71, color: '#10B981' },
  ];

  const merchantData = charts?.merchants || [
    { name: "Emotion 'B a z a a r'", value: 1820, spend: 18450000 },
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

  const tabs = [
    { id: 'demographics', label: '👥 Demographics', count: `${genderData.length} Genders` },
    { id: 'locations', label: '📍 Districts & Areas', count: `${locationData.length} Locations` },
    { id: 'telecom', label: '📱 Telecom Operators', count: `${operatorData.length} Carriers` },
    { id: 'merchants', label: '🏪 Stores & Merchants', count: `${merchantData.length} Stores` },
    { id: 'spenders', label: '👑 Top Spenders', count: `${topSpenders.length || 5} VIPs` },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none p-1.5 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200/60 dark:border-slate-700/60">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-200/60 dark:border-purple-900/60'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] opacity-70 px-1.5 py-0.5 rounded-md bg-gray-200/60 dark:bg-slate-800 font-medium">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Demographics */}
      {activeTab === 'demographics' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Gender Doughnut */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Gender Breakdown & Distribution
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Live percentage split of customer base</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {totalGenderCount.toLocaleString()} Total
              </span>
            </div>

            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {genderData.map((entry) => (
                      <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {genderData.map((g) => {
                const pct = Math.round((g.value / totalGenderCount) * 100);
                return (
                  <div
                    key={g.name}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-850 border border-gray-100 dark:border-slate-800 text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: GENDER_COLORS[g.name] || '#6366F1' }}
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {g.name}
                      </span>
                    </div>
                    <span className="block text-lg font-black text-gray-900 dark:text-white mt-1">
                      {g.value.toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-gray-500 font-medium">
                      {pct}% of users
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Age Demographics */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Age Demographics
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Purchaser age distribution groups</p>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 2: Geographic & Locations */}
      {activeTab === 'locations' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Top Districts & Location Concentrations
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Customer density mapped by verified address and district</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {locationData.map((loc, lIdx) => (
              <Link
                key={lIdx}
                href={`/data/explorer?search=${encodeURIComponent(loc.name)}`}
                className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 hover:border-purple-400 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white capitalize">
                    {loc.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="block text-base font-black text-purple-700 dark:text-purple-300 mt-1">
                  {loc.value.toLocaleString()}
                </span>
                <span className="block text-[10px] text-gray-500 font-medium">Click to filter</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab 3: Telecom Operators */}
      {activeTab === 'telecom' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Telecom Carrier Market Share
            </h3>
            <p className="text-xs text-gray-500">Breakdown of mobile numbers by telecom operator</p>

            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operatorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {operatorData.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.color || OPERATOR_COLORS[idx % OPERATOR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Operator Details & SMS Targeting
            </h3>
            <p className="text-xs text-gray-500">Target campaigns by specific prefix</p>

            <div className="space-y-2.5 pt-2">
              {operatorData.map((op, oIdx) => (
                <div
                  key={oIdx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-slate-850 border border-gray-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: op.color || OPERATOR_COLORS[oIdx % OPERATOR_COLORS.length] }}
                    />
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {op.name}
                    </span>
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                    {op.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab 4: Stores & Merchants */}
      {activeTab === 'merchants' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Store & Merchant Order Volume
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Top shopping outlets where customers placed orders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {merchantData.map((m, mIdx) => (
              <div
                key={mIdx}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/40 dark:from-slate-850 dark:to-purple-950/30 border border-purple-200/60 dark:border-purple-900/50 space-y-3"
              >
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Store className="w-4 h-4" />
                  <span className="text-xs font-bold truncate">{m.name}</span>
                </div>
                <div>
                  <span className="block text-xl font-black text-gray-900 dark:text-white">
                    {m.value.toLocaleString()} Orders
                  </span>
                  {m.spend && (
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ৳{Number(m.spend).toLocaleString()} BDT Volume
                    </span>
                  )}
                </div>
                <Link
                  href={`/data/explorer?search=${encodeURIComponent(m.name)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <span>Filter Store Records</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab 5: Top 5 VIP Spenders Leaderboard */}
      {activeTab === 'spenders' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Top VIP Lifetime Spenders Leaderboard
                </h3>
                <p className="text-xs text-gray-500">Highest grossing customer profiles in current dataset</p>
              </div>
            </div>

            <Link
              href="/data/explorer?minOrderAmount=10000&sortBy=orderAmount&sortOrder=desc"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>View All VIPs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {topSpenders.map((cust, cIdx) => (
              <div
                key={cIdx}
                className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/50 via-white to-purple-50/30 dark:from-slate-850 dark:via-slate-850 dark:to-purple-950/30 border border-amber-200/70 dark:border-amber-900/50 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      #{cIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[140px]">
                      {cust.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    VIP
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">
                      Lifetime Spend
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ৳{(cust.orderAmount || 23280).toLocaleString()} BDT
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold">
                      Orders
                    </span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {cust.orderCount || 11} orders
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 pt-1 flex items-center justify-between">
                  <span className="font-mono">{cust.phone}</span>
                  <span className="capitalize">{cust.location || 'Keraniganj'}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
