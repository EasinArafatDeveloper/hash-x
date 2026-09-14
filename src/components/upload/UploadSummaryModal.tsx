'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Database, ArrowRight, UserPlus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadSummaryModalProps {
  newCount: number;
  updatedCount: number;
  totalCount: number;
  skippedCount: number;
  filename: string;
  onReset: () => void;
}

export function UploadSummaryModal({
  newCount,
  updatedCount,
  totalCount,
  skippedCount,
  filename,
  onReset,
}: UploadSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm" />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-white/10 p-6 shadow-xl space-y-6"
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Smart Data Merge Complete!
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Processed <span className="font-bold text-gray-900 dark:text-white">{filename}</span> and merged with existing database.
          </p>
        </div>

        {/* Stats List */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] space-y-3 text-xs font-semibold">
          {/* New records */}
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" /> New Records Added
            </span>
            <span className="text-sm font-bold">+{newCount.toLocaleString()}</span>
          </div>

          {/* Updated records with missing fields */}
          <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Existing Records Updated & Merged
            </span>
            <span className="text-sm font-bold">{updatedCount.toLocaleString()}</span>
          </div>

          {/* Skipped rows if any */}
          {skippedCount > 0 && (
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Empty Rows Skipped
              </span>
              <span>{skippedCount.toLocaleString()}</span>
            </div>
          )}

          {/* Total in DB */}
          <div className="flex justify-between items-center text-gray-900 dark:text-white pt-2.5 border-t border-gray-200 dark:border-white/10">
            <span className="flex items-center gap-1.5 font-bold">
              <Database className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Total Active Records Now
            </span>
            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
              {totalCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onReset}
            className="w-1/3 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Upload Another
          </button>
          <Link
            href="/data/explorer"
            className="w-2/3 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-card flex items-center justify-center gap-1.5 transition-colors"
          >
            Explore Data <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
