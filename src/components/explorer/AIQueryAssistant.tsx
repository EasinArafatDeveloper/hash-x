'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Send,
  Download,
  Eye,
  CheckCircle2,
  Trash2,
  X,
  Minimize2,
  ChevronUp,
  Zap,
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

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sequenceSteps?: string[];
  summaryBn?: string;
  recordsPreview?: Array<{
    name: string;
    phone: string;
    gender?: string;
    orderAmount: number;
    orderCount: number;
    location?: string;
    primaryMerchant?: string;
  }>;
  exportPayload?: any;
  exportLabel?: string;
  filterParams?: Record<string, any>;
  noResults?: boolean;
  matchingCount?: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  clarificationSearch?: string;
}

const QUICK_PROMPTS = [
  'Top 10 VIP customers by lifetime spend',
  'WhatsApp active female customers from Dhaka',
  'Customers with 5+ orders last 30 days',
];

// Animated typing dots for AI loading
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-1">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-purple-200/80 dark:border-purple-800/60 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"
            animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function AIQueryAssistant({
  onApplyAiFilter,
  onClearAiFilter,
  activeAiQueryText,
  activeSequenceSteps = [],
  activeSummaryBn,
  availableTags = [],
  totalMatchingRecords = 0,
}: AIQueryAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleDownloadExport = (exportPayload: any, label?: string) => {
    if (!exportPayload) return;
    const toastId = toast.loading('Preparing CSV download...');
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/export';
      form.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(exportPayload);
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      form.remove();
      setTimeout(() => toast.success('Download started!', { id: toastId }), 1200);
    } catch {
      toast.error('Download failed', { id: toastId });
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || promptInput).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          messages: messages.map((m) => ({
            role: m.sender === 'assistant' ? 'assistant' : 'user',
            content: m.text,
          })),
          availableTags,
        }),
      });

      if (!res.ok) throw new Error('AI Query failed');
      const data = await res.json();
      const r = data.result;

      if (r) {
        // Clarification needed — don't apply filter, just show the question
        if (r.needsClarification) {
          const clarMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: r.clarificationQuestion || `"${r.clarificationSearch}" দিয়ে কোন field এ খুঁজবো?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            needsClarification: true,
            clarificationQuestion: r.clarificationQuestion,
            clarificationOptions: r.clarificationOptions || ['শুধু নাম দিয়ে খুঁজবো', 'শুধু এলাকা/ঠিকানায় খুঁজবো', 'সব জায়গায় খুঁজবো'],
            clarificationSearch: r.clarificationSearch || r.search || '',
            sequenceSteps: r.sequenceSteps || [],
          };
          setMessages((prev) => [...prev, clarMsg]);
          return;
        }

        const filterPayload = {
          search: r.search || '',
          nameWise: r.searchField === 'name',
          tag: r.tag || 'All',
          gender: r.gender || 'All',
          numberStartsWith: r.numberStartsWith || '',
          minOrderAmount: r.minOrderAmount || '',
          maxOrderAmount: r.maxOrderAmount || '',
          minOrderCount: r.minOrderCount || '',
          maxOrderCount: r.maxOrderCount || '',
          merchant: r.merchant || '',
          maxActiveDays: r.maxActiveDays || '',
          minAge: r.minAge || '',
          maxAge: r.maxAge || '',
          sortBy: r.sortBy || 'createdAt',
          sortOrder: r.sortOrder || 'desc',
          limit: r.limit || 25,
          aiQueryText: textToSend,
          aiSequenceSteps: r.sequenceSteps || [],
          aiSummaryBn: r.summaryBn || '',
        };

        onApplyAiFilter(filterPayload);

        const aiResponse: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: r.reply || r.summaryBn || 'ডাটাবেজ থেকে ফিল্টার করে নিচে দেখানো হলো:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sequenceSteps: r.sequenceSteps || [],
          summaryBn: r.summaryBn || '',
          recordsPreview: r.recordsPreview || [],
          exportPayload: r.exportPayload || {
            search: r.search,
            tag: r.tag !== 'All' ? r.tag : undefined,
            gender: r.gender !== 'All' ? r.gender : undefined,
            minOrderAmount: r.minOrderAmount,
            minOrderCount: r.minOrderCount,
            merchant: r.merchant,
            sortBy: r.sortBy,
            sortOrder: r.sortOrder,
            limit: r.limit,
          },
          exportLabel: r.exportLabel || `Download CSV (${r.recordsPreview?.length || 0} rows)`,
          filterParams: filterPayload,
          matchingCount: r.matchingCount || 0,
          noResults: r.noResults === true || r.matchingCount === 0,
        };

        setMessages((prev) => [...prev, aiResponse]);
        if (r.matchingCount === 0) {
          toast.info('কোনো রেকর্ড পাওয়া যায়নি।');
        } else {
          toast.success(`${r.matchingCount} টি রেকর্ড পাওয়া গেছে!`);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'দুঃখিত, একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setPromptInput('');
    onClearAiFilter();
    toast.info('Chat cleared');
  };

  const unreadBadge = messages.filter((m) => m.sender === 'assistant').length;

  return (
    <>
      {/* ── Floating Launcher Button ─────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="launcher"
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white shadow-2xl shadow-purple-600/40 flex items-center justify-center cursor-pointer"
            title="Open AI Assistant"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl bg-purple-500 animate-ping opacity-20" />
            <Bot className="w-6 h-6 relative z-10" />
            {unreadBadge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                {unreadBadge}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-24px))] flex flex-col rounded-3xl shadow-2xl shadow-purple-900/30 overflow-hidden border border-purple-200/60 dark:border-purple-900/60"
            style={{ maxHeight: 'min(600px, calc(100vh - 100px))' }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">AI Data Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-pulse" />
                    <span className="text-[10px] font-semibold text-purple-200 uppercase tracking-wider">
                      DeepSeek · Live
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/15 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/15 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 px-3 py-4 space-y-4 min-h-0">
              {/* Empty state / welcome */}
              {messages.length === 0 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Welcome message */}
                  <div className="flex items-start gap-2.5 px-1">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/60 shadow-sm">
                      <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
                        আমি আপনার AI Data Assistant। Banglish বা English-এ যা জিজ্ঞেস করুন — আমি ডাটাবেজ থেকে ফিল্টার করে দেখাবো।
                      </p>
                    </div>
                  </div>

                  {/* Quick prompts */}
                  <div className="px-1 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">
                      Quick Suggestions
                    </p>
                    {QUICK_PROMPTS.map((prompt) => (
                      <motion.button
                        key={prompt}
                        type="button"
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/50 hover:border-purple-300 dark:hover:border-purple-700 text-xs text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center justify-between gap-2 group shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Zap className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="truncate">{prompt}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-purple-300 group-hover:text-purple-500 shrink-0 transition-colors" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Conversation messages */}
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'items-start gap-2.5'} px-1`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30 shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl shadow-sm ${
                      msg.sender === 'user'
                        ? 'px-3.5 py-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                        : 'px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-purple-100 dark:border-purple-900/60 text-gray-800 dark:text-gray-100 rounded-tl-sm space-y-2.5'
                    }`}
                  >
                    {/* Timestamp */}
                    <div className={`text-[9px] font-semibold mb-1 ${msg.sender === 'user' ? 'text-purple-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {msg.sender === 'user' ? 'You' : 'AI'} · {msg.timestamp}
                    </div>

                    {/* Message text */}
                    <p className="text-xs leading-relaxed whitespace-pre-line">{msg.text}</p>

                    {/* Clarification option buttons */}
                    {msg.needsClarification && msg.clarificationOptions && msg.sender === 'assistant' && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                          একটি option বেছে নিন:
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {msg.clarificationOptions.map((opt) => (
                            <motion.button
                              key={opt}
                              type="button"
                              whileHover={{ x: 3 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => {
                                const term = msg.clarificationSearch || '';
                                let followUp = '';
                                const optLower = opt.toLowerCase();
                                if (optLower.includes('নাম') || optLower.includes('name')) {
                                  followUp = `শুধু নাম field এ '${term}' খোঁজো`;
                                } else if (optLower.includes('এলাকা') || optLower.includes('ঠিকানা') || optLower.includes('address')) {
                                  followUp = `শুধু এলাকা বা ঠিকানা field এ '${term}' খোঁজো`;
                                } else {
                                  followUp = `সব field এ '${term}' খোঁজো`;
                                }
                                handleSendMessage(followUp);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 hover:border-purple-300 transition-all text-left"
                            >
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              {opt}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No-results state */}
                    {msg.noResults && msg.sender === 'assistant' && (
                      <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5">
                        <span className="text-lg leading-none">🔍</span>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            কোনো রেকর্ড পাওয়া যায়নি
                          </p>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                            ভিন্ন নাম, ফোন নম্বর বা অন্য keyword দিয়ে আবার চেষ্টা করুন।
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sequence steps */}
                    {!msg.noResults && msg.sequenceSteps && msg.sequenceSteps.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {msg.sequenceSteps.map((step, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {step}
                            </span>
                            {sIdx < (msg.sequenceSteps?.length || 0) - 1 && (
                              <ArrowRight className="w-2.5 h-2.5 text-purple-300" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {/* Records preview table */}
                    {!msg.noResults && msg.recordsPreview && msg.recordsPreview.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-purple-100 dark:border-purple-900/50">
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-900 dark:text-white">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Top {msg.recordsPreview.length} records
                          </span>
                          {msg.matchingCount && msg.matchingCount > 0 && (
                            <span className="text-[10px] font-mono text-purple-500 dark:text-purple-400">
                              {msg.matchingCount.toLocaleString()} total
                            </span>
                          )}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                          <table className="w-full text-left text-[10px]">
                            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                              <tr>
                                <th className="px-2 py-1.5">#</th>
                                <th className="px-2 py-1.5">Name</th>
                                <th className="px-2 py-1.5">Phone</th>
                                <th className="px-2 py-1.5 text-right">Spend</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {msg.recordsPreview.map((rec, rIdx) => (
                                <tr key={rIdx} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors">
                                  <td className="px-2 py-1.5 font-bold text-purple-500">#{rIdx + 1}</td>
                                  <td className="px-2 py-1.5 font-semibold text-gray-900 dark:text-white truncate max-w-[90px]">
                                    {rec.name || 'N/A'}
                                  </td>
                                  <td className="px-2 py-1.5 font-mono text-gray-500 dark:text-gray-400">
                                    {rec.phone}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                    ৳{(rec.orderAmount || 0).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadExport(msg.exportPayload, msg.exportLabel)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            Download CSV
                          </button>
                          {msg.filterParams && (
                            <button
                              type="button"
                              onClick={() => { onApplyAiFilter(msg.filterParams!); toast.success('Applied!'); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold transition-all cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              View in Explorer
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* AI Typing indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={chatBottomRef} />
            </div>

            {/* ── Fixed Input Bar (always at bottom) ───────────────── */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200/80 dark:border-slate-800 px-3 py-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-400 transition-all overflow-hidden">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={promptInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask anything in Banglish or English…"
                    disabled={isLoading}
                    className="w-full resize-none px-3.5 py-2.5 bg-transparent text-xs sm:text-[13px] font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none min-h-[42px] max-h-[120px] leading-relaxed"
                    style={{ height: 'auto' }}
                  />
                </div>

                {/* Send button */}
                <motion.button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !promptInput.trim()}
                  whileTap={{ scale: 0.9 }}
                  className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Send (Enter)"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
