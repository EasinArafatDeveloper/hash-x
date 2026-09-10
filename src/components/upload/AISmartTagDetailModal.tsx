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
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-all"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/25 shrink-0">
                {tag.label.slice(0, 2) || '🏷️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {tag.label}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
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
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Metric Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200/70 dark:border-purple-900/50 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                  Matched Records in Uploaded File
                </span>
                <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                  {tag.count.toLocaleString()} rows{' '}
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 font-sans">
                    ({tag.percentage}% of file)
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleSelect(tag.tag)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-purple-600/25 hover:bg-purple-700'
                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-50'
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
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                AI Detection Explanation (কিসের ওপর ভিত্তি করে AI এই ট্যাগ তৈরি করেছে):
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {tag.explanationBn || tag.reason}
              </p>
            </div>

            {/* 2. Technical Rule & Evaluated Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Rule Card */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  ⚙️ Technical Rule / Condition
                </span>
                <span className="font-mono text-xs text-purple-700 dark:text-purple-300 font-semibold block break-words">
                  {tag.detectionRule || 'Dynamic pattern matching'}
                </span>
              </div>

              {/* Evaluated Columns Card */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/80 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  📋 Evaluated Column Headers
                </span>
                <div className="flex flex-wrap gap-1">
                  {(tag.analyzedColumns || ['raw_data']).map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-600"
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
                  <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Sample Records from Uploaded File Satisfying this Rule:
                </span>

                <div className="space-y-1.5">
                  {tag.sampleMatchingRows.map((sample, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/70 shadow-xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
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
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 block">
                          {sample.matchedValue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row Level Precision Note */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Smart Upsert Safety:</strong> During database ingestion, only records that strictly match these conditions will receive this tag. Records that do not meet the criteria remain untouched and clean.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-850/80 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleSelect(tag.tag);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25 cursor-pointer"
            >
              {isSelected ? '✓ Keep Tag Selected' : '+ Apply & Save Tag'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
