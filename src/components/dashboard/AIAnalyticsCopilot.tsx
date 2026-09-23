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
  Maximize2,
  Minimize2,
  Trash2,
  Lightbulb,
  Download,
  SlidersHorizontal,
  Crown,
  TrendingUp,
  MapPin,
  MessageSquare,
  Store,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'chat' | 'data_query' | 'action_result';
  isStreaming?: boolean;
  exportPayload?: any;
  exportLabel?: string;
  explorerPath?: string;
  keyMetrics?: Array<{ label: string; value: string; subtext?: string }>;
  suggestedActions?: Array<{ label: string; path: string }>;
  followUpQuestions?: string[];
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    icon: Crown,
    title: 'টপ ৫ VIP কাস্টমার',
    prompt: 'টপ ৫ জন সর্বোচ্চ স্পেন্ড করা VIP কাস্টমার কারা এবং তাদের অর্ডার হিস্ট্রি কী?',
  },
  {
    icon: TrendingUp,
    title: 'জেন্ডার ও স্পেন্ড সামারি',
    prompt: 'আমাদের ডাটার জেন্ডার ব্রেকডাউন এবং মোট লাইফটাইম খরচের সামারি বলো',
  },
  {
    icon: MapPin,
    title: 'এরিয়া ও ডিস্ট্রিক্ট সেলস',
    prompt: 'কোন কোন ডিস্ট্রিক্ট ও এরিয়া থেকে সবচেয়ে বেশি কাস্টমার ও অর্ডার এসেছে?',
  },
  {
    icon: MessageSquare,
    title: 'হোয়াটসঅ্যাপ অ্যাক্টিভ ইউজার',
    prompt: 'হোয়াটসঅ্যাপে সক্রিয় কাস্টমার কতজন এবং তাদের মধ্যে VIP ক্রেতার হার কেমন?',
  },
  {
    icon: Store,
    title: 'মার্চেন্ট সেলস র‍্যাংকিং',
    prompt: 'BeautyBaaz সহ অন্যান্য মার্চেন্টদের অর্ডারের সংখ্যা ও সেলস কেমন?',
  },
  {
    icon: Smartphone,
    title: 'টেলিকম অপারেটর শেয়ার',
    prompt: 'Grameenphone, Robi ও Banglalink অপারেটরদের মার্কেট শেয়ার কেমন?',
  },
];

interface AIAnalyticsCopilotProps {
  totalRecords?: number;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

export function AIAnalyticsCopilot({
  totalRecords: initialTotalRecords,
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

  const [liveTotalRecords, setLiveTotalRecords] = useState<number>(initialTotalRecords || 0);

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveCount() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.totalRecords === 'number' && isMounted) {
            setLiveTotalRecords(data.totalRecords);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live total records for AI copilot:', err);
      }
    }
    fetchLiveCount();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof initialTotalRecords === 'number' && initialTotalRecords > 0) {
      setLiveTotalRecords(initialTotalRecords);
    }
  }, [initialTotalRecords]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `**হ্যালো! আমি আপনার AI Copilot।**\n\nআপনার ডাটাবেজের **${(liveTotalRecords || initialTotalRecords || 0).toLocaleString()} টি রিয়েল-টাইম কাস্টমার রেকর্ড** লাইভ সংযুক্ত আছে।\n\nযেকোনো ফিল্টার, কাস্টমার অ্যানালাইসিস বা সেলস রিপোর্ট জানতে বাংলায় বা ইংরেজিতে লিখুন!`,
      isStreaming: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Update welcome message dynamically when live count is loaded
  useEffect(() => {
    if (liveTotalRecords > 0) {
      setMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'welcome-msg') {
          return [
            {
              ...prev[0],
              content: `**হ্যালো! আমি আপনার AI Copilot।**\n\nআপনার ডাটাবেজের **${liveTotalRecords.toLocaleString()} টি রিয়েল-টাইম কাস্টমার রেকর্ড** লাইভ সংযুক্ত আছে।\n\nযেকোনো ফিল্টার, কাস্টমার অ্যানালাইসিস বা সেলস রিপোর্ট জানতে বাংলায় বা ইংরেজিতে লিখুন!`,
            },
          ];
        }
        return prev;
      });
    }
  }, [liveTotalRecords]);

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
          type: data.result.type,
          isStreaming: true, // Start typewriter streaming
          exportPayload: data.result.exportPayload,
          exportLabel: data.result.exportLabel,
          explorerPath: data.result.explorerPath,
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
          content: 'দুঃখিত, রিকোয়েস্ট প্রসেস করতে সামান্য সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
          isStreaming: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStreamingFinish = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isStreaming: false } : msg))
    );
  };

  const handleDownloadCSV = (payload: any, filenameLabel?: string) => {
    const toastId = toast.loading(`Preparing high-speed download for ${filenameLabel || 'dataset'}...`);
    try {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/export';
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload || {});
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
      form.remove();

      setTimeout(() => {
        toast.success(`Download started! CSV file saved successfully.`, { id: toastId });
      }, 1200);
    } catch (err: any) {
      console.error('Export download error:', err);
      toast.error('Failed to download CSV', { id: toastId });
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'reset-msg',
        role: 'assistant',
        content: 'চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে। নতুন কোনো অ্যানালিটিক্স বা ডেটা সম্পর্কে জানতে লিখুন!',
        isStreaming: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    toast.info('Chat history cleared');
  };

  return (
    <>
      {/* Floating Launcher Button at Bottom-Right — compact icon-only */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Copilot — ask anything about your dataset"
            title="AI Copilot"
            className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-brand hover:shadow-cardHover text-white shadow-brand border border-white/10 transition-all active:scale-95 cursor-pointer"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-brand-600 glow-pulse" />
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
              className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm pointer-events-auto sm:hidden"
            />

            {/* Chatbot Window Container */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className={`pointer-events-auto w-full sm:rounded-2xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-xl flex flex-col overflow-hidden transition-all duration-300 ${
                isExpanded
                  ? 'sm:w-[780px] h-[95vh] sm:h-[88vh]'
                  : 'sm:w-[520px] h-[88vh] sm:h-[700px]'
              }`}
            >
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-brand text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/10">
                    <Sparkles className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-brand-600 glow-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-tight">AI Copilot</h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/15 text-white border border-white/20 uppercase tracking-wide">
                        Live
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-white/80 font-medium">
                        {liveTotalRecords > 0 ? `${liveTotalRecords.toLocaleString()} records synced` : 'Connecting database...'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    aria-label="Clear chat history"
                    title="Clear history"
                    className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer hidden sm:block"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close AI Copilot"
                    className="p-1.5 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gray-50/50 dark:bg-white/[0.02]">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-brand shadow-brand text-white flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`space-y-2 max-w-[92%] ${msg.role === 'user' ? 'items-end' : 'w-full'}`}>
                      {/* Message Bubble with Streaming Typewriter and Markdown Rendering */}
                      <div
                        className={`p-4 rounded-xl text-xs sm:text-[13px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-brand text-white font-medium shadow-brand'
                            : msg.type === 'action_result'
                            ? 'bg-white dark:bg-white/5 text-gray-800 dark:text-gray-100 border border-emerald-200 dark:border-emerald-900/50 border-l-2 border-l-emerald-500 shadow-card space-y-3'
                            : 'bg-white dark:bg-white/5 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-white/10 shadow-card space-y-3'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          msg.content
                        ) : msg.isStreaming ? (
                          <StreamingTypewriter
                            fullText={msg.content}
                            onComplete={() => handleStreamingFinish(msg.id)}
                            onTick={scrollToBottom}
                          />
                        ) : (
                          <FormattedMarkdownContent content={msg.content} />
                        )}
                      </div>

                      {/* Action Buttons: Download CSV & Data Explorer View */}
                      {msg.role === 'assistant' && !msg.isStreaming && (msg.exportPayload || msg.explorerPath) && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap items-center gap-2 pt-0.5"
                        >
                          {msg.exportPayload && (
                            <button
                              type="button"
                              onClick={() => handleDownloadCSV(msg.exportPayload, msg.exportLabel)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download CSV</span>
                            </button>
                          )}

                          {msg.explorerPath && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                router.push(msg.explorerPath || '/data/explorer');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>Data Explorer</span>
                              <ArrowRight className="w-3 h-3 ml-0.5" />
                            </button>
                          )}
                        </motion.div>
                      )}

                      {/* Timestamp */}
                      <span className="block text-[9px] text-gray-400 px-1">
                        {msg.timestamp}
                      </span>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-xs text-brand-600 dark:text-brand-400 p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 w-fit"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="font-semibold">AI ভাবছে...</span>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Starter Prompts Ticker */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] overflow-x-auto scrollbar-none shrink-0">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                    <Lightbulb className="w-3 h-3" /> দ্রুত জানতে ক্লিক করুন:
                  </span>
                  <div className="flex gap-1.5">
                    {STARTER_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.prompt)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-brand-subtle dark:bg-gradient-brand-subtle-dark hover:shadow-brand border border-brand-200/70 dark:border-brand-900/60 text-brand-800 dark:text-brand-300 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer"
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white dark:bg-[#111113] border-t border-gray-200 dark:border-white/10 shrink-0">
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
                    placeholder="Ask AI: e.g. 'টপ ৫ জন কাস্টমার', 'কেরানীগঞ্জের মোট সেলস'..."
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    aria-label="Send message"
                    className="p-2.5 rounded-lg bg-gradient-brand shadow-brand text-white transition-all disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
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

/**
 * Real-time Streaming Typewriter Component
 */
function StreamingTypewriter({
  fullText,
  onComplete,
  onTick,
}: {
  fullText: string;
  onComplete: () => void;
  onTick?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!fullText) {
      setIsCompleted(true);
      onComplete();
      return;
    }

    // Split into words / token chunks for fast, natural streaming
    const words = fullText.split(/(\s+)/);
    let currentIndex = 0;
    let currentBuffer = '';

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        // Append 2 words at a time for smooth, speedy flow
        const nextWords = words.slice(currentIndex, currentIndex + 2).join('');
        currentBuffer += nextWords;
        setDisplayedText(currentBuffer);
        currentIndex += 2;
        if (onTick) onTick();
      } else {
        clearInterval(interval);
        setDisplayedText(fullText);
        setIsCompleted(true);
        onComplete();
      }
    }, 18);

    return () => clearInterval(interval);
  }, [fullText]);

  const handleSkip = () => {
    setDisplayedText(fullText);
    setIsCompleted(true);
    onComplete();
  };

  return (
    <div onClick={handleSkip} className="cursor-pointer select-text">
      <FormattedMarkdownContent content={displayedText} />
      {!isCompleted && (
        <span className="inline-block w-2 h-4 bg-brand-600 dark:bg-brand-400 animate-pulse ml-0.5 align-middle rounded-sm" />
      )}
    </div>
  );
}

/**
 * Rich Formatter for Markdown Text and Tables inside AI Bubble
 */
function FormattedMarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (key: string) => {
    if (tableBuffer.length > 0) {
      renderedElements.push(<MarkdownTable key={key} tableLines={[...tableBuffer]} />);
      tableBuffer = [];
      inTable = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table line detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    }

    if (inTable && !trimmed.startsWith('|')) {
      flushTable(`table-${idx}`);
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-xs font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider pt-2">
          {formatInlineMarkdown(trimmed.replace('### ', ''))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={idx} className="text-sm font-bold text-gray-900 dark:text-white pt-2 border-b border-gray-100 dark:border-white/10 pb-1">
          {formatInlineMarkdown(trimmed.replace('## ', ''))}
        </h3>
      );
      return;
    }

    // Bullets
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      renderedElements.push(
        <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
          <span className="text-brand-500 font-bold">•</span>
          <span className="text-gray-800 dark:text-gray-200">
            {formatInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}
          </span>
        </div>
      );
      return;
    }

    // Dividers
    if (trimmed === '---') {
      renderedElements.push(<hr key={idx} className="border-gray-200 dark:border-white/10 my-2" />);
      return;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <div key={idx} className="p-2.5 rounded-lg bg-brand-50/60 dark:bg-brand-500/5 border-l-2 border-brand-500 text-xs text-brand-900 dark:text-brand-200 italic my-1">
          {formatInlineMarkdown(trimmed.replace('> ', ''))}
        </div>
      );
      return;
    }

    // Normal paragraph
    if (trimmed) {
      renderedElements.push(
        <p key={idx} className="text-gray-800 dark:text-gray-200 leading-relaxed">
          {formatInlineMarkdown(trimmed)}
        </p>
      );
    }
  });

  if (inTable) {
    flushTable('table-end');
  }

  return <div className="space-y-2">{renderedElements}</div>;
}

/**
 * Parses inline markdown bold, code, and currencies
 */
function formatInlineMarkdown(text: string): React.ReactNode {
  if (!text) return '';

  // Match bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      const isAmount = boldText.includes('৳') || boldText.includes('BDT') || boldText.includes('লাখ');
      return (
        <strong
          key={i}
          className={isAmount ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-bold text-gray-900 dark:text-white'}
        >
          {boldText}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Rich Interactive Markdown Table Component with clean styling
 */
function MarkdownTable({ tableLines }: { tableLines: string[] }) {
  if (tableLines.length < 2) return null;

  // Filter out divider line (e.g. |---|---|)
  const rows = tableLines.filter((l) => !l.replace(/[\s|:-]/g, '').length === false);
  if (rows.length === 0) return null;

  const headerCells = rows[0]
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  const bodyRows = rows.slice(1).map((r) =>
    r
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 my-2.5">
      <table className="w-full text-left text-[11px] border-collapse bg-white dark:bg-[#111113]">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
            {headerCells.map((h, hIdx) => (
              <th key={hIdx} className="px-3 py-2 font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                  {formatInlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
