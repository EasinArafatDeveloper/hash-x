'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { DatasetSummaryCard } from '@/components/dashboard/DatasetSummaryCard';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { IDatasetSummary } from '@/types';
import {
  UploadCloud,
  Database,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';

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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
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
    </div>
  );
}