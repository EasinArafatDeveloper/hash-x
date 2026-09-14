'use client';

import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  X,
  Check,
  Plus,
  Layers,
  Database,
  User,
  Phone,
  HelpCircle,
  TrendingUp,
  Tag,
  Info,
  Settings2,
  ListChecks,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AISmartTag } from '@/lib/deepseek';

interface AISmartTagDetailModalProps {
  tag: AISmartTag | null;
  isOpen: boolean;
  onClose: () => void;
  isSelected: boolean;
  onToggleSelect: (tagValue: string) => void;
}

export function AISmartTagDetailModal({
  tag,
  isOpen,
  onClose,
  isSelected,
  onToggleSelect,
}: AISmartTagDetailModalProps) {
  if (!isOpen || !tag) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
        {/* Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm transition-all"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-xl bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center text-base font-bold shrink-0">
                {tag.label.slice(0, 2) || 'AI'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {tag.label}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/50 uppercase tracking-wider">
                    AI Verified Logic
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Detailed AI detection criteria, evaluated columns & sample records
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Metric Summary Card */}
            <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-900/50 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider block">
                  Matched Records in Uploaded File
                </span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                  {tag.count.toLocaleString()} rows{' '}
                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 font-sans">
                    ({tag.percentage}% of file)
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleSelect(tag.tag)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-white dark:bg-white/5 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-500/10'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Selected for Ingestion</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Select this Tag</span>
                  </>
                )}
              </button>
            </div>

            {/* 1. Bengali Explanation Box */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-1.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                AI Detection Explanation (কিসের ওপর ভিত্তি করে AI এই ট্যাগ তৈরি করেছে):
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {tag.explanationBn || tag.reason}
              </p>
            </div>

            {/* 2. Technical Rule & Evaluated Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Rule Card */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <Settings2 className="w-3 h-3" /> Technical Rule / Condition
                </span>
                <span className="font-mono text-xs text-violet-700 dark:text-violet-300 font-semibold block break-words">
                  {tag.detectionRule || 'Dynamic pattern matching'}
                </span>
              </div>

              {/* Evaluated Columns Card */}
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <ListChecks className="w-3 h-3" /> Evaluated Column Headers
                </span>
                <div className="flex flex-wrap gap-1">
                  {(tag.analyzedColumns || ['raw_data']).map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Sample Matching Records Preview */}
            {tag.sampleMatchingRows && tag.sampleMatchingRows.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  Sample Records from Uploaded File Satisfying this Rule:
                </span>

                <div className="space-y-1.5">
                  {tag.sampleMatchingRows.map((sample, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-gray-900 dark:text-white block truncate">
                            {sample.name || 'Customer'}
                          </span>
                          <span className="font-mono text-[11px] text-gray-500 truncate block">
                            {sample.phone}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/50 block">
                          {sample.matchedValue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row Level Precision Note */}
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Smart Upsert Safety:</strong> During database ingestion, only records that strictly match these conditions will receive this tag. Records that do not meet the criteria remain untouched and clean.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleSelect(tag.tag);
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isSelected ? 'Keep Tag Selected' : 'Apply & Save Tag'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
