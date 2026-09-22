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
    <div className="space-y-6 sm:space-y-8">
      {/* Metric Cards Row */}
      <MetricCards stats={stats} isLoading={isLoading} />

      {/* When no data is in DB, show clean Upload CTA */}
      {!isLoading && stats.totalRecords === 0 ? (
        <div className="p-10 sm:p-14 rounded-2xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              No dataset uploaded yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload your CSV or Excel business dataset to explore, search, filter and export records in real-time.
            </p>
          </div>
          <Link
            href="/data/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors"
          >
            <UploadCloud className="w-4 h-4" /> Upload your file <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Dataset Health Summary Card */}
          <DatasetSummaryCard
            dataset={dataset}
          />

          {/* Analytics Visualization Section with Multi-Tab Suite */}
          {stats.totalRecords > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Demographics &amp; performance
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Aggregated breakdown across demographics, revenue, locations and operators
                  </p>
                </div>

                <Link
                  href="/data/explorer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Open in Data Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <AnalyticsCharts charts={charts} topSpenders={topSpenders} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
