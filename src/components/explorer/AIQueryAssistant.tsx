'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  ArrowRight,
  X,
  RefreshCw,
  Zap,
  TrendingUp,
  ShieldCheck,
  Bot,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AIQueryAssistantProps {
  onApplyAiFilter: (filters: Record<string, any>) => void;
  onClearAiFilter: () => void;
  activeAiQueryText?: string;
  activeSequenceSteps?: string[];
  activeSummaryBn?: string;
  availableTags?: string[];
  totalMatchingRecords?: number;
}

const QUICK_AI_PROMPTS = [
  { label: '⭐ Dhaka & Keraniganj VIP (৳10k+)', prompt: 'Dhaka and Keraniganj VIP customers with spend >= 10000' },
  { label: '💬 WhatsApp Active Female Shoppers', prompt: 'Female customers with WhatsApp Active status' },
  { label: '🛍️ BeautyBaaz Frequent Buyers', prompt: 'Frequent buyers who ordered from BeautyBaaz store' },
  { label: '🔥 Top Buyers (3+ Orders)', prompt: 'Hot leads with 3 or more lifetime orders' },
  { label: '⚡ Active This Week (≤ 7 Days)', prompt: 'Active leads with active days <= 7' },
  { label: '📞 Grameenphone VIPs', prompt: 'Grameenphone 017 numbers with high spend' },
];

export function AIQueryAssistant({
  onApplyAiFilter,
  onClearAiFilter,
  activeAiQueryText,
  activeSequenceSteps = [],
  activeSummaryBn,
  availableTags = [],
  totalMatchingRecords = 0,
}: AIQueryAssistantProps) {
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleExecuteAiQuery = async (queryText?: string) => {
    const targetQuery = queryText || promptInput;
    if (!targetQuery.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetQuery,
          availableTags,
        }),
      });

      if (!res.ok) throw new Error('AI Query parsing failed');

      const data = await res.json();
      if (data.result) {
        onApplyAiFilter({
          search: data.result.search || '',
          tag: data.result.tag || 'All',
          gender: data.result.gender || 'All',
          numberStartsWith: data.result.numberStartsWith || '',
          minOrderAmount: data.result.minOrderAmount || '',
          maxOrderAmount: data.result.maxOrderAmount || '',
          minOrderCount: data.result.minOrderCount || '',
          maxOrderCount: data.result.maxOrderCount || '',
          merchant: data.result.merchant || '',
          maxActiveDays: data.result.maxActiveDays || '',
          minAge: data.result.minAge || '',
          maxAge: data.result.maxAge || '',
          sortBy: data.result.sortBy || 'createdAt',
          sortOrder: data.result.sortOrder || 'desc',
          aiQueryText: targetQuery,
          aiSequenceSteps: data.result.sequenceSteps || [],
          aiSummaryBn: data.result.summaryBn || '',
        });
        setPromptInput(targetQuery);
        toast.success(`DeepSeek AI applied filter sequence!`);
      }
    } catch (err: any) {
      console.error('AI Query error:', err);
      toast.error('Could not parse AI prompt. Using standard search.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPromptInput('');
    onClearAiFilter();
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-brand-900/10 dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-900/60 shadow-sm p-4 sm:p-5 space-y-3.5 transition-all">
      {/* Header & Mode Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                DeepSeek AI Natural Language Query & Sequence Finder
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                AI Powered
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Ask in English or Bengali. AI automatically analyzes, filters, sorts, and executes the optimal query sequence.
            </p>
          </div>
        </div>

        {activeAiQueryText && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear AI Sequence</span>
          </button>
        )}
      </div>

      {/* AI Prompt Input Bar */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-600 dark:text-purple-400">
            <Bot className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleExecuteAiQuery();
              }
            }}
            placeholder="✨ Ask AI: e.g. 'Dhaka female VIP with WhatsApp', 'কেরানীগঞ্জের টপ বায়ার', 'Spend > 10k', 'BeautyBaaz orders'..."
            className="w-full pl-10 pr-24 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 rounded-2xl text-xs font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
          />
          <button
            type="button"
            onClick={() => handleExecuteAiQuery()}
            disabled={isLoading || !promptInput.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? 'Reasoning...' : 'Ask AI'}</span>
          </button>
        </div>
      </div>

      {/* Quick Prompt Sequence Pills */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
          💡 Quick AI Sequence Prompts:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AI_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPromptInput(item.prompt);
                handleExecuteAiQuery(item.prompt);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-300 border border-purple-100 dark:border-purple-900/60 hover:border-purple-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50/50 shadow-xs transition-all cursor-pointer"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE AI SEQUENCE BREADCRUMB & EXPLANATION */}
      {activeAiQueryText && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-850/95 border border-purple-300 dark:border-purple-800 shadow-sm space-y-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider shrink-0">
                Active AI Sequence
              </span>
              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                "{activeAiQueryText}"
              </span>
            </div>

            <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 font-mono shrink-0">
              🎯 {totalMatchingRecords.toLocaleString()} matching records found
            </span>
          </div>

          {/* Sequence Step Chips */}
          {activeSequenceSteps.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {activeSequenceSteps.map((step, sIdx) => (
                <span
                  key={sIdx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800"
                >
                  <span>{step}</span>
                  {sIdx < activeSequenceSteps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-purple-400 ml-1" />
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Bengali Summary */}
          {activeSummaryBn && (
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium pt-1">
              💬 {activeSummaryBn}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
