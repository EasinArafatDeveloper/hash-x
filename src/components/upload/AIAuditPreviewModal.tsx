'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
  X,
  PlusCircle,
  HelpCircle,
  TrendingUp,
  Plus,
  Tag,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAuditSummary } from '@/lib/deepseek';

interface AIAuditPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  auditSummary: AIAuditSummary | null;
  isLoading: boolean;
  totalRowsInFile: number;
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
}

export function AIAuditPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  auditSummary,
  isLoading,
  totalRowsInFile,
  selectedTags = [],
  onToggleTag,
}: AIAuditPreviewModalProps) {
  const [customTagInput, setCustomTagInput] = useState('');

  if (!isOpen) return null;

  const score = auditSummary?.qualityScore || 95;
  const decisions = auditSummary?.decisions || {
    create: 0,
    update: 0,
    keep: 0,
    skip: 0,
    flagForReview: 0,
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customTagInput.trim();
    if (trimmed && onToggleTag) {
      if (!selectedTags.includes(trimmed)) {
        onToggleTag(trimmed);
      }
      setCustomTagInput('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
        {/* Dark Blurred Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm transition-all"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    GPT-4o Ingestion Audit & Summary
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/50 uppercase tracking-wider">
                    GPT-4o Live
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Pre-ingestion analysis, dataset profile & tag permissions for {totalRowsInFile.toLocaleString()} rows
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
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {isLoading ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center animate-spin">
                  <RefreshCw className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    GPT-4o Analyzing Ingestion Dataset...
                  </h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Analyzing duplicate mobile numbers, data cohort profiles, and generating executive summary
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. EXECUTIVE AI DATASET SUMMARY */}
                {auditSummary?.datasetProfile && (
                  <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-500/5 border border-violet-200/80 dark:border-violet-900/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-violet-950 dark:text-violet-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        <span>Executive AI Dataset Profile</span>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-violet-600 text-white font-bold text-[10px]">
                        {auditSummary.datasetProfile}
                      </span>
                    </div>
                    {auditSummary.summaryBn && (
                      <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed bg-white/70 dark:bg-white/5 p-3 rounded-lg border border-violet-100 dark:border-violet-900/40 font-medium">
                        {auditSummary.summaryBn}
                      </p>
                    )}
                  </div>
                )}

                {/* 2. USER-CONTROLLED TAG PERMISSIONS (Strict Permission Safeguard) */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">
                        Approved Tags for this Ingestion
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        শুধুমাত্র আপনার অনুমোদিত ট্যাগগুলো ডেটাসেটে যুক্ত হবে। কোনো অনাকাঙ্ক্ষিত বা অটো-ট্যাগ যোগ হবে না।
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/50">
                      {selectedTags.length} Approved
                    </span>
                  </div>

                  {/* Current Active Tags */}
                  <div className="flex flex-wrap gap-1.5 min-h-[30px] items-center p-2 rounded-lg bg-white dark:bg-[#111113] border border-gray-200/80 dark:border-white/10">
                    {selectedTags.length > 0 ? (
                      selectedTags.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-900/50"
                        >
                          <Tag className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                          <span>{t}</span>
                          {onToggleTag && (
                            <button
                              type="button"
                              onClick={() => onToggleTag(t)}
                              aria-label={`Remove tag ${t}`}
                              className="p-0.5 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-full transition-colors cursor-pointer"
                              title="Remove tag"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic px-1">
                        কোনো ট্যাগ সিলেক্ট করা নেই (Clean Ingestion — জিরো ট্যাগ যুক্ত হবে)
                      </span>
                    )}
                  </div>

                  {/* Custom Tag Input */}
                  {onToggleTag && (
                    <form onSubmit={handleAddCustomTag} className="flex items-center gap-2 pt-1">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          placeholder="Add custom tag (e.g. Dhaka Wholesale, Eid Campaign)..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#111113] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!customTagInput.trim()}
                        className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Tag</span>
                      </button>
                    </form>
                  )}

                  {/* AI Recommended Tags (User can click + to approve) */}
                  {auditSummary?.suggestedTags && auditSummary.suggestedTags.length > 0 && onToggleTag && (
                    <div className="pt-2 border-t border-gray-200/60 dark:border-white/10 space-y-1.5">
                      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Recommended Tags (ক্লিক করে অনুমোদন করুন):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {auditSummary.suggestedTags.map((st, sIdx) => {
                          const isAttached = selectedTags.includes(st.tag);
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => onToggleTag(st.tag)}
                              title={st.reason}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                isAttached
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'bg-white dark:bg-[#111113] text-gray-700 dark:text-gray-300 border-dashed border-gray-300 dark:border-white/10 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-500/5'
                              }`}
                            >
                              {isAttached ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              <span>{st.label || st.tag}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Score & Quality Banner */}
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200/80 dark:border-emerald-900/50 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        Dataset Health & Sync Readiness
                      </span>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        {score >= 90
                          ? 'Zero severe conflicts. Safe for automatic incremental synchronization.'
                          : 'Some potential anomalies detected. Review flagged items before final import.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                      {score}%
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold uppercase">
                      Quality Score
                    </span>
                  </div>
                </div>

                {/* 4. 5 Decision Breakdown Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Smart Ingestion Lifecycle Decisions
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* CREATE */}
                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900/50 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                        <PlusCircle className="w-3.5 h-3.5" /> CREATE
                      </div>
                      <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100 block">
                        {decisions.create}
                      </span>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 block leading-tight">
                        New contacts to insert
                      </span>
                    </div>

                    {/* UPDATE */}
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-900/50 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                        <RefreshCw className="w-3.5 h-3.5" /> UPDATE
                      </div>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100 block">
                        {decisions.update}
                      </span>
                      <span className="text-[10px] text-blue-700/80 dark:text-blue-400 block leading-tight">
                        Existing matched contacts
                      </span>
                    </div>

                    {/* KEEP */}
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> KEEP
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100 block">
                        {decisions.keep}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block leading-tight">
                        Unchanged DB values
                      </span>
                    </div>

                    {/* SKIP */}
                    <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-900/50 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                        <Layers className="w-3.5 h-3.5" /> SKIP
                      </div>
                      <span className="text-lg font-bold text-rose-900 dark:text-rose-100 block">
                        {decisions.skip}
                      </span>
                      <span className="text-[10px] text-rose-700/80 dark:text-rose-400 block leading-tight">
                        Skipped columns preserved
                      </span>
                    </div>

                    {/* FLAG FOR REVIEW */}
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1 col-span-2 sm:col-span-2">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> FLAG FOR REVIEW
                      </div>
                      <span className="text-lg font-bold text-amber-900 dark:text-amber-100 block">
                        {decisions.flagForReview}
                      </span>
                      <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block leading-tight">
                        {decisions.flagForReview === 0
                          ? 'Zero format anomalies'
                          : 'Potential anomalies (e.g. malformed phone numbers)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. AI Insights Card */}
                {auditSummary?.aiInsights && auditSummary.aiInsights.length > 0 && (
                  <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-500/5 border border-violet-200/80 dark:border-violet-900/50 space-y-2">
                    <span className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> GPT-4o Insights
                    </span>
                    <ul className="space-y-1 text-xs text-violet-950 dark:text-violet-300">
                      {auditSummary.aiInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-violet-500 font-bold mt-0.5">&bull;</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 6. Evaluated Sample Rows List */}
                {auditSummary?.sampleItems && auditSummary.sampleItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      Sample Evaluated Records
                    </span>
                    <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 text-xs">
                      {auditSummary.sampleItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white dark:bg-[#111113] flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {item.name}
                              </span>
                              <span className="font-mono text-[11px] text-gray-500">
                                {item.phone}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {item.reason}
                            </p>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0 ${
                              item.decision === 'CREATE'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : item.decision === 'UPDATE'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                                : item.decision === 'KEEP'
                                ? 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                            }`}
                          >
                            {item.decision.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Adjust Mapping
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-card flex items-center gap-2 transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <span>Confirm & Ingest Data ({selectedTags.length} tags)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
