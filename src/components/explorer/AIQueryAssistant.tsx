'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  X,
  RefreshCw,
  Bot,
  Send,
  Download,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  User,
  Phone,
  ShoppingBag,
  Coins,
  MapPin,
  Trash2,
  Layers,
  ArrowUpDown,
  Filter,
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
  matchingCount?: number;
}

const QUICK_AI_PROMPTS = [
  {
    label: '⭐ Top 10 VIP & High Orders (১০ জন টপ বায়ার)',
    prompt: 'amake tume top 10 vip and high order korsa ay rkomer 10 joner list dau',
  },
  {
    label: '💬 WhatsApp Active Female Shoppers',
    prompt: 'Female customers with WhatsApp Active status and spend > 5000',
  },
  {
    label: '🛍️ BeautyBaaz Frequent Buyers',
    prompt: 'BeautyBaaz store theke 3 er besi order korsa emon top 10 buyer list dao',
  },
  {
    label: '💰 Dhaka High Spenders (৳10k+)',
    prompt: 'Dhaka and Keraniganj VIP high spenders sorted by highest amount',
  },
  {
    label: '📞 Grameenphone 017 High Orders',
    prompt: 'GP 017 numbers with high order count and lifetime spend',
  },
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize with initial message if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: '👋 আসসালামু আলাইকুম! আমি আপনার **Morpheus AI Data Copilot**। আপনি বাংলা, English বা Banglish-এ যেকোনো রিকোয়েস্ট করতে পারেন।\n\nউদাহরণ:\n- *"amake tume top 10 vip and high order korsa ay rkomer 10 joner list dau"*\n- *"Dhaka female VIP with WhatsApp"*\n- *"BeautyBaaz er highest spender 10 buyer"*',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, []);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 1) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleDownloadExport = (exportPayload: any, label?: string) => {
    if (!exportPayload) return;
    const toastId = toast.loading(`Preparing instant CSV download...`);
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

      setTimeout(() => {
        toast.success(`Download started! Your sorted CSV is downloading.`, { id: toastId });
      }, 1200);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Download failed. Please try again.', { id: toastId });
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
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          messages: messages.map((m) => ({ role: m.sender === 'assistant' ? 'assistant' : 'user', content: m.text })),
          availableTags,
        }),
      });

      if (!res.ok) throw new Error('AI Query parsing failed');

      const data = await res.json();
      const r = data.result;

      if (r) {
        const filterPayload = {
          search: r.search || '',
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
          limit: r.limit || (r.recordsPreview ? r.recordsPreview.length : 25),
          aiQueryText: textToSend,
          aiSequenceSteps: r.sequenceSteps || [],
          aiSummaryBn: r.summaryBn || '',
        };

        // Automatically apply to main Data Explorer
        onApplyAiFilter(filterPayload);

        const aiResponse: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: r.reply || r.summaryBn || 'আপনার রিকোয়েস্ট অনুযায়ী ডাটাবেজ ফিল্টার ও সর্ট করে নিচের তালিকায় সাজানো হয়েছে:',
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
            customFilename: `Sorted_${r.sortBy || 'Records'}`,
          },
          exportLabel: r.exportLabel || `Download Sorted CSV (${r.recordsPreview?.length || 0} rows)`,
          filterParams: filterPayload,
          matchingCount: r.matchingCount || 0,
        };

        setMessages((prev) => [...prev, aiResponse]);
        toast.success(`AI Query executed & Explorer synchronized!`);
      }
    } catch (err: any) {
      console.error('AI Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'দুঃখিত, কোনো ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা সাধারণ ফিল্টার ব্যবহার করুন।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      toast.error('Could not process AI chat request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: '👋 চ্যাট হিস্ট্রি রিসেট করা হয়েছে। আপনি যেকোনো নতুন কুয়েরি করতে পারেন!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setPromptInput('');
    onClearAiFilter();
    toast.info('Chat history and AI filters cleared');
  };

  return (
    <div className="rounded-3xl bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-brand-900/10 dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-200/80 dark:border-purple-900/60 shadow-md p-4 sm:p-5 space-y-3.5 transition-all">
      {/* Header Bar with Expand/Collapse & Reset Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 shrink-0">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>DeepSeek AI Free-Form Conversational Assistant</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wider">
                Full AI Chat
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Type naturally in Bangla, English or Banglish. Ask for top sorted lists, VIPs, spenders, or specific store buyers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-600 dark:text-gray-300 hover:text-rose-600 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear Chat History"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Chat</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-800/50 text-purple-800 dark:text-purple-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Collapse Chat</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Open Chat ({messages.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QUICK SUGGESTION PILLS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Try these conversational prompts:</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AI_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPromptInput(item.prompt);
                handleSendMessage(item.prompt);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/90 dark:bg-slate-800/90 text-gray-700 dark:text-gray-200 border border-purple-100 dark:border-purple-900/60 hover:border-purple-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50/60 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONVERSATION THREAD CONTAINER */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3 pt-1"
          >
            {/* Messages Scroll Area */}
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-purple-900">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  } space-y-1.5`}
                >
                  {/* Sender Badge & Time */}
                  <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                    <span>{msg.sender === 'user' ? 'You' : 'DeepSeek AI Copilot'}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[95%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-tr-xs'
                        : 'bg-white dark:bg-slate-850 text-gray-800 dark:text-gray-100 border border-purple-200 dark:border-purple-800/70 rounded-tl-xs space-y-3'
                    }`}
                  >
                    {/* Message Text Content */}
                    <div className="whitespace-pre-line font-normal">
                      {msg.text}
                    </div>

                    {/* Sequence Steps (if any) */}
                    {msg.sequenceSteps && msg.sequenceSteps.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-purple-100 dark:border-purple-900/60">
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                          Applied Filtering & Sort Sequence:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {msg.sequenceSteps.map((step, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800"
                            >
                              <span>{step}</span>
                              {sIdx < (msg.sequenceSteps?.length || 0) - 1 && (
                                <ArrowRight className="w-3 h-3 text-purple-400 ml-1" />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Records Preview Table (Top 10 / Filtered List) */}
                    {msg.recordsPreview && msg.recordsPreview.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-purple-100 dark:border-purple-900/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Top {msg.recordsPreview.length} Live Database Records:</span>
                          </span>
                          {msg.matchingCount !== undefined && msg.matchingCount > 0 && (
                            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                              {msg.matchingCount.toLocaleString()} total matches
                            </span>
                          )}
                        </div>

                        {/* Mini Table */}
                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-750 bg-gray-50/50 dark:bg-slate-900/50">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 uppercase font-semibold text-[9px] tracking-wider">
                              <tr>
                                <th className="px-2.5 py-1.5">#</th>
                                <th className="px-2.5 py-1.5">Customer Name</th>
                                <th className="px-2.5 py-1.5">Phone</th>
                                <th className="px-2.5 py-1.5 text-center">Orders</th>
                                <th className="px-2.5 py-1.5 text-right">Lifetime Spend</th>
                                <th className="px-2.5 py-1.5">Location / Store</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/60 dark:divide-slate-800">
                              {msg.recordsPreview.map((rec, rIdx) => (
                                <tr key={rIdx} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors">
                                  <td className="px-2.5 py-1.5 font-bold text-purple-600 dark:text-purple-400">
                                    #{rIdx + 1}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                                    {rec.name || 'Unnamed Client'}
                                  </td>
                                  <td className="px-2.5 py-1.5 font-mono text-gray-600 dark:text-gray-300">
                                    {rec.phone}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                    {rec.orderCount || 0}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                    ৳{(rec.orderAmount || 0).toLocaleString()}
                                  </td>
                                  <td className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                                    {rec.location || rec.primaryMerchant || 'Dhaka'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Action Buttons: 1-Click CSV Download & Apply to Explorer */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadExport(msg.exportPayload, msg.exportLabel)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>📥 {msg.exportLabel || 'Download Sorted CSV'}</span>
                          </button>

                          {msg.filterParams && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyAiFilter(msg.filterParams!);
                                toast.success('Applied to Data Explorer view!');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View All Matches in Explorer</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-y-1.5">
                  <div className="bg-white dark:bg-slate-850 text-gray-800 dark:text-gray-100 border border-purple-200 dark:border-purple-800/70 rounded-2xl rounded-tl-xs p-3.5 text-xs flex items-center gap-2 shadow-sm">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                      DeepSeek AI is analyzing your prompt, sorting database records, and preparing preview...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar inside Chat Card */}
            <div className="relative flex items-center gap-2 pt-1 border-t border-purple-200/60 dark:border-purple-900/40">
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
                      handleSendMessage();
                    }
                  }}
                  placeholder="✨ টাইপ করুন: 'amake tume top 10 vip and high order korsa ay rkomer 10 joner list dau'..."
                  className="w-full pl-10 pr-24 py-3 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 rounded-2xl text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !promptInput.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isLoading ? 'Thinking...' : 'Send'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
