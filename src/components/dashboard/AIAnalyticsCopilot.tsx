'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Users,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Trash2,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  keyMetrics?: Array<{ label: string; value: string; subtext?: string }>;
  suggestedActions?: Array<{ label: string; path: string }>;
  followUpQuestions?: string[];
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    icon: '📊',
    title: 'জেন্ডার ও স্পেন্ড সামারি',
    prompt: 'আমাদের ডাটার জেন্ডার ব্রেকডাউন এবং মোট লাইফটাইম খরচের সামারি বলো',
  },
  {
    icon: '👑',
    title: 'টপ ৫ VIP কাস্টমার',
    prompt: 'টপ ৫ জন সর্বোচ্চ স্পেন্ড করা VIP কাস্টমার কারা এবং তাদের অর্ডার হিস্ট্রি কী?',
  },
  {
    icon: '📍',
    title: 'এরিয়া ও ডিস্ট্রিক্ট সেলস',
    prompt: 'কোন কোন ডিস্ট্রিক্ট ও এরিয়া থেকে সবচেয়ে বেশি কাস্টমার ও অর্ডার এসেছে?',
  },
  {
    icon: '💬',
    title: 'হোয়াটসঅ্যাপ অ্যাক্টিভ ইউজার',
    prompt: 'হোয়াটসঅ্যাপে সক্রিয় কাস্টমার কতজন এবং তাদের মধ্যে VIP ক্রেতার হার কেমন?',
  },
  {
    icon: '🏪',
    title: 'মার্চেন্ট সেলস র‍্যাংকিং',
    prompt: 'BeautyBaaz সহ অন্যান্য মার্চেন্টদের অর্ডারের সংখ্যা ও সেলস কেমন?',
  },
  {
    icon: '📱',
    title: 'টেলিকম অপারেটর শেয়ার',
    prompt: 'Grameenphone, Robi ও Banglalink অপারেটরদের মার্কেট শেয়ার কেমন?',
  },
];

interface AIAnalyticsCopilotProps {
  totalRecords?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

export function AIAnalyticsCopilot({
  totalRecords = 2361,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
}: AIAnalyticsCopilotProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (controlledIsOpen !== undefined) {
      if (open && controlledOnOpen) controlledOnOpen();
      if (!open && controlledOnClose) controlledOnClose();
    } else {
      setInternalIsOpen(open);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `👋 **হ্যালো! আমি Morpheus AI Analytics Copilot.**\n\nআপনার ডাটাবেজের **${totalRecords.toLocaleString()} টি রিয়েল-টাইম রেকর্ডের** সম্পূর্ণ তথ্য আমার কাছে লাইভ সংযুক্ত আছে।\n\nআপনি বাংলায় বা ইংরেজিতে যেকোনো প্রশ্ন করতে পারেন—যেমন: *টপ স্পেন্ডার কারা, কোন এলাকার সেলস বেশি, ফিমেল ক্রেতার সংখ্যা কত, বা হোয়াটসঅ্যাপ সক্রিয় ইউজারদের ডেটা ফিল্টার করা।*`,
      followUpQuestions: [
        'আমাদের ডাটার জেন্ডার ও স্পেন্ড হিসাব কেমন?',
        'টপ ৫ জন সর্বোচ্চ খরচ করা VIP কাস্টমার কারা?',
        'কোন এলাকায় সবচেয়ে বেশি অর্ডার ডেলিভারি হয়েছে?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/analytics-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (data.result) {
        const assistantMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.result.reply || 'Here is the analysis based on your live dataset.',
          keyMetrics: data.result.keyMetrics,
          suggestedActions: data.result.suggestedActions,
          followUpQuestions: data.result.followUpQuestions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid AI response');
      }
    } catch (err: any) {
      console.error('AI chat error:', err);
      toast.error('AI response error. Please try again.');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ দুঃখিত, রিকোয়েস্ট প্রসেস করতে সামান্য সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'reset-msg',
        role: 'assistant',
        content: '🧹 চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে। নতুন কোনো অ্যানালিটিক্স বা ডেটা সম্পর্কে জানতে লিখুন!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.info('Chat history cleared');
  };

  return (
    <>
      {/* Floating Launcher Button at Bottom-Right */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-700 hover:to-brand-700 text-white shadow-2xl shadow-purple-600/40 border border-white/20 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-purple-600 animate-ping" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-black tracking-wide uppercase leading-tight">
                AI Data Copilot
              </span>
              <span className="block text-[10px] text-purple-200 font-medium leading-none">
                Ask anything about dataset
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-over Copilot Drawer / Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-6 pointer-events-none">
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs pointer-events-auto sm:hidden"
            />

            {/* Chatbot Window Container */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className={`pointer-events-auto w-full sm:rounded-3xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/60 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                isExpanded
                  ? 'sm:w-[700px] h-[95vh] sm:h-[85vh]'
                  : 'sm:w-[460px] h-[85vh] sm:h-[650px]'
              }`}
            >
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-brand-700 text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight">Morpheus AI Copilot</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/20 text-white border border-white/30 uppercase">
                        DeepSeek Live
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] text-purple-100 font-medium">
                        {totalRecords.toLocaleString()} records synced
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    title="Clear history"
                    className="p-1.5 rounded-lg hover:bg-white/15 text-purple-100 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-purple-100 hover:text-white transition-colors cursor-pointer hidden sm:block"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-purple-100 hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`space-y-2.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-tr-xs'
                            : 'bg-white dark:bg-slate-850 text-gray-800 dark:text-gray-100 border border-gray-200/80 dark:border-slate-800 rounded-tl-xs whitespace-pre-wrap'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Embedded Mini Metric Badges (if any) */}
                      {msg.keyMetrics && msg.keyMetrics.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {msg.keyMetrics.map((met, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-900/50 text-left shadow-2xs"
                            >
                              <span className="block text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                                {met.label}
                              </span>
                              <span className="block text-sm font-black text-gray-900 dark:text-white mt-0.5">
                                {met.value}
                              </span>
                              {met.subtext && (
                                <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                                  {met.subtext}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Shortcuts (e.g. View in Data Explorer) */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestedActions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                router.push(act.path);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                            >
                              <span>{act.label}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Suggested Follow-up Questions */}
                      {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                        <div className="space-y-1.5 pt-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-500" /> সম্পর্কিত প্রশ্ন:
                          </span>
                          <div className="flex flex-col gap-1">
                            {msg.followUpQuestions.map((fq, fIdx) => (
                              <button
                                key={fIdx}
                                type="button"
                                onClick={() => handleSendMessage(fq)}
                                className="text-left text-[11px] font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:bg-purple-50 dark:hover:bg-purple-950/40 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40 transition-colors flex items-center justify-between group cursor-pointer"
                              >
                                <span>{fq}</span>
                                <ChevronRight className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timestamp */}
                      <span className="block text-[9px] text-gray-400 px-1">
                        {msg.timestamp}
                      </span>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-xl bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 p-3 rounded-2xl bg-white dark:bg-slate-850 border border-purple-200 dark:border-purple-900/40 w-fit"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="font-semibold">AI অ্যানালিটিক্স প্রসেস করছে...</span>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Starter Prompts Ticker */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-purple-100 dark:border-purple-900/40 bg-white/70 dark:bg-slate-900/70 overflow-x-auto scrollbar-none shrink-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    💡 দ্রুত জানতে ক্লিক করুন:
                  </span>
                  <div className="flex gap-1.5">
                    {STARTER_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.prompt)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/60 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <span>{item.icon}</span>
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="✨ Ask AI: e.g. 'টপ ৫ জন কাস্টমার', 'কেরানীগঞ্জের মোট সেলস'..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all shadow-md shadow-purple-600/30 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
