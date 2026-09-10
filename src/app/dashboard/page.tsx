'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { DatasetSummaryCard } from '@/components/dashboard/DatasetSummaryCard';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { AIAnalyticsCopilot } from '@/components/dashboard/AIAnalyticsCopilot';
import { IDatasetSummary } from '@/types';
import {
  UploadCloud,
  Database,
  ArrowRight,
  Sparkles,
  Search,
  MessageSquare,
  Bot,
  Zap,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalRecords: 0,
    totalFields: 21,
    filteredRecords: 0,
    lastUpload: 'None',
    financials: {
      totalGMV: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      maxSpend: 0,
    },
    channels: {
      whatsappCount: 0,
      whatsappRatio: 0,
      vipCount: 0,
      vipRatio: 0,
      frequentBuyerCount: 0,
    },
  });

  const [dataset, setDataset] = useState<IDatasetSummary | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [topSpenders, setTopSpenders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [quickAiPrompt, setQuickAiPrompt] = useState('');

  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();

      if (res.ok) {
        setStats({
          totalRecords: data.totalRecords || 0,
          totalFields: data.totalFields || 21,
          filteredRecords: data.filteredRecords || data.totalRecords || 0,
          lastUpload: data.lastUpload || 'Today',
          financials: data.financials || {
            totalGMV: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            maxSpend: 0,
          },
          channels: data.channels || {
            whatsappCount: 0,
            whatsappRatio: 0,
            vipCount: 0,
            vipRatio: 0,
            frequentBuyerCount: 0,
          },
        });
        setDataset(data.activeDataset || data.dataset || null);
        setCharts(data.charts || null);
        setTopSpenders(data.topSpenders || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleOpenCopilotWithQuery = (query: string) => {
    setQuickAiPrompt(query);
    setIsCopilotOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Interactive AI Copilot Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 border border-purple-800/60 shadow-xl p-6 sm:p-7 text-white space-y-4">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> DeepSeek AI Analytics Assistant
              </span>
              <span className="text-xs text-purple-200/70 font-medium">
                • {stats.totalRecords.toLocaleString()} Records Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Enterprise Customer Intelligence & AI Copilot
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
              কথা বলুন আপনার AI অ্যাসিস্ট্যান্টের সাথে—যেকোনো কাস্টমার ডেটা অ্যানালিসিস, সেলস সামারি, এরিয়া রিপোর্ট ও ভিআইপি সেগমেন্টেশন জানুন সরাসরি।
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-500 hover:to-brand-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Bot className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Chat with AI Copilot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Question Discovery Pills */}
        <div className="relative z-10 pt-2 border-t border-purple-800/40 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-purple-300/80 uppercase tracking-wider mr-1">
            💡 কুইক অ্যানালিটিক্স:
          </span>
          {[
            { label: '📊 জেন্ডার ও স্পেন্ড সামারি', query: 'আমাদের ডাটার জেন্ডার ও স্পেন্ড হিসাব কেমন?' },
            { label: '👑 টপ ৫ জন VIP কাস্টমার', query: 'টপ ৫ জন সর্বোচ্চ খরচ করা VIP কাস্টমার কারা?' },
            { label: '📍 কেরানীগঞ্জ ও ঢাকার সেলস', query: 'কেরানীগঞ্জ ও ঢাকা এলাকার কাস্টমার ও মোট সেলস কত?' },
            { label: '💬 হোয়াটসঅ্যাপ সক্রিয় ক্রেতা', query: 'হোয়াটসঅ্যাপে সক্রিয় ক্রেতাদের অর্ডার প্যাটার্ন কেমন?' },
          ].map((pill, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => handleOpenCopilotWithQuery(pill.query)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-purple-100 hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <span>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Ambient Decorative Glows */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metric Cards Row */}
      <MetricCards stats={stats} isLoading={isLoading} />

      {/* When no data is in DB, show clean Upload CTA */}
      {!isLoading && stats.totalRecords === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-center space-y-5 shadow-card">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              No Dataset Uploaded Yet
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Upload your CSV or Excel business dataset to explore, search, filter and export records in real-time.
            </p>
          </div>
          <Link
            href="/data/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/30 transition-all active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" /> Upload Your File Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Dataset Health Summary Card */}
          <DatasetSummaryCard
            dataset={dataset}
            onSeedDemo={() => {}}
            isSeeding={false}
          />

          {/* Analytics Visualization Section with Multi-Tab Suite */}
          {stats.totalRecords > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Interactive Dataset Demographics & Performance Suite
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Real-time aggregated breakdown across demographics, revenue, locations, and operators
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/data/explorer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Open in Data Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <AnalyticsCharts charts={charts} topSpenders={topSpenders} />
            </div>
          )}
        </>
      )}

      {/* Floating & Slide-over AI Analytics Copilot Assistant */}
      <AIAnalyticsCopilot
        totalRecords={stats.totalRecords}
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onOpen={() => setIsCopilotOpen(true)}
      />
    </div>
  );
}
