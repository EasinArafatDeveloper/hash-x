'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, CheckCircle2, Eye, RefreshCw, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { IDatasetSummary } from '@/types';

interface DatasetSummaryCardProps {
  dataset: IDatasetSummary | null;
  onSeedDemo: () => void;
  isSeeding?: boolean;
}

export function DatasetSummaryCard({ dataset, onSeedDemo, isSeeding }: DatasetSummaryCardProps) {
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  return (
    <div className="p-6 rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Dataset Header Info */}
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {dataset?.filename || 'people-data-enterprise.xlsx'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {dataset?.status || 'Ready'}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {(dataset?.totalRecords || 2123).toLocaleString()} records · {dataset?.totalFields || 18} columns · {dataset?.fileSize || '1.4 MB'}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Last updated: {dataset?.uploadedAt ? new Date(dataset.uploadedAt).toLocaleString() : 'Today'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link
            href="/data/explorer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> View Data <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setConfirmingReplace(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 font-medium text-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" /> Replace Dataset
          </button>
          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-medium text-xs transition-colors disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            {isSeeding ? 'Seeding…' : 'Seed Demo (2,123)'}
          </button>
        </div>
      </div>

      {/* Replace-dataset confirmation — replacing the active dataset is
          destructive, so it gets the same explicit confirm step as a
          record delete. */}
      {confirmingReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setConfirmingReplace(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-white/10 shadow-cardHover p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Replace current dataset?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  You'll be taken to Upload Data. The new file will be merged with — or can replace — existing records.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmingReplace(false)}
                className="flex-1 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <Link
                href="/data/upload"
                onClick={() => setConfirmingReplace(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
              >
                Continue
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
