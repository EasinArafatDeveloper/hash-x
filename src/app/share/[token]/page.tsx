'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Lock,
  Flame,
  ShieldCheck,
  ShieldAlert,
  Search,
  Clock,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  EyeOff,
  Sparkles,
  CameraOff,
  LayoutGrid,
  Table2,
  Tag,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SharedRecord {
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  location?: string;
  area?: string;
  avatarUrl?: string;
  avatarType?: string;
  status?: string;
  activeDays?: number;
  tags?: string[];
  category?: string;
  customFields?: Record<string, any>;
}

interface ShareData {
  title: string;
  recordCount: number;
  records: SharedRecord[];
  isBurned: boolean;
  isOneTime: boolean;
  viewCount?: number;
  maxViews?: number;
  expiresAt: string;
  createdBy: string;
  sessionWatermark: string;
  accessedAt: string;
}

const STATUS_BADGES: Record<string, { bg: string; dot: string }> = {
  Active: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Inactive: {
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  },
  Pending: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  Suspended: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

export default function SecureSharePage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    statusType?: 'NOT_FOUND' | 'EXPIRED' | 'BURNED' | 'ERROR';
  } | null>(null);

  // Passcode state
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Loaded data
  const [shareData, setShareData] = useState<ShareData | null>(null);

  // View mode toggle: 'cards' | 'table' (Defaults to cards)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Local search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Security violation states
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);
  const [isScreenshotAttempted, setIsScreenshotAttempted] = useState(false);

  const hasFetchedRef = useRef(false);

  // 1. Initial Link Load
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    async function loadShareLink() {
      setIsLoading(true);
      setErrorInfo(null);
      try {
        const res = await fetch(`/api/share/${token}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.theme) {
          const root = document.documentElement;
          root.classList.remove(
            'theme-indigo',
            'theme-emerald',
            'theme-cyberpunk',
            'theme-ocean',
            'theme-amber',
            'theme-monochrome'
          );
          root.classList.add(`theme-${data.theme}`);
        }

        if (res.status === 410) {
          setErrorInfo({
            message: data.error || 'This link is no longer available.',
            statusType: data.statusType || 'BURNED',
          });
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          setErrorInfo({
            message: data.error || 'Unable to access shared link.',
            statusType: data.statusType || 'NOT_FOUND',
          });
          setIsLoading(false);
          return;
        }

        if (data.requiresPasscode) {
          setRequiresPasscode(true);
          setIsLoading(false);
          return;
        }

        setShareData(data);
      } catch {
        setErrorInfo({
          message: 'Network error or unable to load shared link.',
          statusType: 'ERROR',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadShareLink();
  }, [token]);

  // 2. Passcode Unlock Submit
  const handleUnlockPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setPasscodeError('Please enter the passcode.');
      return;
    }

    setIsUnlocking(true);
    setPasscodeError('');
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();

      if (data.theme) {
        const root = document.documentElement;
        root.classList.remove(
          'theme-indigo',
          'theme-emerald',
          'theme-cyberpunk',
          'theme-ocean',
          'theme-amber',
          'theme-monochrome'
        );
        root.classList.add(`theme-${data.theme}`);
      }

      if (res.status === 410) {
        setRequiresPasscode(false);
        setErrorInfo({
          message:
            data.error ||
            'Maximum failed passcode attempts reached. This link has expired.',
          statusType: data.statusType || 'BURNED',
        });
        return;
      }

      if (!res.ok) {
        setPasscodeError(data.error || 'Incorrect passcode. Access denied.');
        return;
      }

      setRequiresPasscode(false);
      setShareData(data);
    } catch {
      setPasscodeError('Error connecting to server. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // 3. Ultra-Hardened Security Stack: Anti-Screenshot, Anti-Inspect, Clipboard Wiper, Privacy Blurs
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const triggerScreenshotLock = () => {
      setIsScreenshotAttempted(true);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('⚠️ CONFIDENTIAL - SCREENSHOT PROHIBITED BY SECURITY POLICY');
        }
      } catch {}
      setTimeout(() => {
        setIsScreenshotAttempted(false);
      }, 4000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Intercept PrintScreen Key & Screenshot Combinations (Win+Shift+S, Cmd+Shift+3/4)
      if (
        e.key === 'PrintScreen' ||
        e.code === 'PrintScreen' ||
        e.keyCode === 44 ||
        (e.altKey && (e.key === 'PrintScreen' || e.code === 'PrintScreen')) ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key))
      ) {
        e.preventDefault();
        triggerScreenshotLock();
        return false;
      }

      // 2. Block F12 (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      // 3. Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        return false;
      }

      // 4. Block Ctrl+U (View Source)
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }

      // 5. Block Ctrl+S (Save Page) & Ctrl+P (Print)
      if (e.ctrlKey && ['s', 'S', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        triggerScreenshotLock();
      }
    };

    const handleCopyCut = (e: ClipboardEvent) => {
      e.preventDefault();
      try {
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', '⚠️ CONFIDENTIAL - COPYING DISABLED');
        }
      } catch {}
      return false;
    };

    const handleFocusChange = () => {
      if (document.hidden) {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    };

    const handleWindowBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
      setIsScreenshotAttempted(false);
    };

    // DevTools resize detection
    const checkDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        setIsDevToolsDetected(true);
      } else {
        setIsDevToolsDetected(false);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    document.addEventListener('visibilitychange', handleFocusChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('resize', checkDevTools);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('copy', handleCopyCut);
      window.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('visibilitychange', handleFocusChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('resize', checkDevTools);
    };
  }, []);

  // Filtered records by local search
  const filteredRecords = useMemo(() => {
    if (!shareData?.records) return [];
    if (!searchTerm.trim()) return shareData.records;
    const term = searchTerm.toLowerCase().trim();
    return shareData.records.filter((r) => {
      return (
        r.name?.toLowerCase().includes(term) ||
        r.phone?.toLowerCase().includes(term) ||
        r.email?.toLowerCase().includes(term) ||
        r.location?.toLowerCase().includes(term) ||
        r.tags?.some((t) => t.toLowerCase().includes(term))
      );
    });
  }, [shareData, searchTerm]);

  // Loading Screen (White Theme)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 select-none font-sans">
        <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-xl flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center animate-pulse shadow-inner">
            <Lock className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900">Loading Shared Contacts...</h3>
            <p className="text-xs text-gray-500 mt-1">
              Verifying link access
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Burned / Expired Screen (White Theme)
  if (errorInfo) {
    const isBurned = errorInfo.statusType === 'BURNED';
    const isExpired = errorInfo.statusType === 'EXPIRED';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none font-sans">
        <style jsx global>{`
          @media print {
            body {
              display: none !important;
            }
          }
        `}</style>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-2xl text-center space-y-5"
        >
          <div
            className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md ${
              isBurned
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : isExpired
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isBurned ? (
              <Flame className="w-8 h-8 animate-bounce text-rose-600" />
            ) : isExpired ? (
              <Clock className="w-8 h-8 text-amber-600" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-gray-600" />
            )}
          </div>

          <div className="space-y-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                isBurned
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {isBurned ? 'Link Expired' : 'Expired'}
            </span>

            <h2 className="text-xl font-extrabold text-gray-900">
              {isBurned
                ? 'This Link Has Expired'
                : isExpired
                ? 'This Link Has Expired'
                : 'Access Unavailable'}
            </h2>

            <p className="text-xs text-gray-600 leading-relaxed">
              {errorInfo.message}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Passcode Prompt Screen (White Theme)
  if (requiresPasscode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 select-none font-sans">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-2xl text-center space-y-5"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200 flex items-center justify-center mx-auto shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Passcode Protected View</h2>
            <p className="text-xs text-gray-500 mt-1">
              Enter the passcode provided by the sender to unlock this data.
            </p>
          </div>

          <form onSubmit={handleUnlockPasscode} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPasscodeError('');
                }}
                placeholder="Enter passcode..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-center font-mono text-base text-gray-900 tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
                autoFocus
              />
              {passcodeError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">{passcodeError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-700 hover:to-accent-600 text-white font-bold text-xs shadow-lg shadow-brand-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock & View Contacts'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!shareData) return null;

  const isShieldActive = isWindowBlurred || isDevToolsDetected || isScreenshotAttempted;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col select-none relative overflow-x-hidden font-sans">
      {/* 100% Solid Opaque Privacy Blackout Shield (Zero-Transparency - No bleed through on screenshot) */}
      <AnimatePresence>
        {isShieldActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-w-md space-y-4 text-white">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto shadow-inner">
                {isScreenshotAttempted ? (
                  <CameraOff className="w-8 h-8 animate-pulse text-rose-500" />
                ) : (
                  <EyeOff className="w-8 h-8 text-amber-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {isScreenshotAttempted
                    ? 'Screenshot Attempt Blocked!'
                    : isDevToolsDetected
                    ? 'Developer Tools Detected'
                    : 'Confidential Data Hidden (Privacy Guard)'}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {isScreenshotAttempted
                    ? 'Screen capturing is strictly prohibited on this secure gateway. Clipboard has been cleared.'
                    : isDevToolsDetected
                    ? 'Please close your browser developer tools to view this confidential data.'
                    : 'Click anywhere inside this window to resume viewing.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWindowBlurred(false);
                  setIsScreenshotAttempted(false);
                }}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-all active:scale-95"
              >
                Resume Viewing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anti-print CSS */}
      <style jsx global>{`
        @media print {
          body {
            display: none !important;
          }
        }
        * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
      `}</style>

      {/* Top Header Bar (White Theme) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white shadow-md shadow-brand-600/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-gray-900 tracking-tight">
                  {shareData.title}
                </h1>
                {shareData.isOneTime || (shareData.maxViews && shareData.maxViews === 1) ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase flex items-center gap-1 shadow-xs">
                    <Flame className="w-3 h-3 text-rose-600" /> One-Time View
                  </span>
                ) : shareData.maxViews && shareData.maxViews > 1 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-xs">
                    <Users className="w-3 h-3 text-brand-600" /> View {shareData.viewCount || 1} of {shareData.maxViews}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                <span>Shared by: <strong className="text-gray-700 font-semibold">{shareData.createdBy}</strong></span>
                <span>•</span>
                <span>Total: <strong className="text-emerald-700 font-bold">{shareData.recordCount.toLocaleString()} Contacts</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5 font-medium shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Anti-Screenshot & Anti-Leak Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          visibility: isShieldActive ? 'hidden' : 'visible',
          opacity: isShieldActive ? 0 : 1,
        }}
        className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4 z-10 transition-opacity duration-100"
      >
        {/* Notice & Control Toolbar (View Toggle + Search) */}
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-800">
              {shareData.isOneTime || (shareData.maxViews && shareData.maxViews === 1)
                ? '🔥 Single-Use: Snapshot will self-destruct once page is closed/reloaded.'
                : shareData.maxViews && shareData.maxViews > 1
                ? `👥 Active View ${shareData.viewCount || 1}/${shareData.maxViews} (${Math.max(0, (shareData.maxViews || 0) - (shareData.viewCount || 0))} view${(shareData.maxViews || 0) - (shareData.viewCount || 0) === 1 ? '' : 's'} remaining before burning)`
                : `Showing ${filteredRecords.length} of ${shareData.recordCount} contacts`}
            </span>
          </div>

          {/* Right Action Bar: Toggle Switch + Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cards vs Table View Toggle Pill */}
            <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-brand-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-brand-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Local Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* View Wrapper */}
        <div className="transition-all duration-150">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
              <Users className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-gray-500 text-xs font-medium">
                No contacts match your search query inside this shared view.
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            /* 2-Column Responsive Secure Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((record, index) => {
                const badge = STATUS_BADGES[record.status || 'Active'] || STATUS_BADGES.Active;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: (index % 10) * 0.02 }}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Index & Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-mono text-[10px] font-bold">
                          #{index + 1}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {record.status || 'Active'}
                        </span>
                      </div>

                      {/* Contact Profile Row */}
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {record.avatarUrl ? (
                          <img
                            src={record.avatarUrl}
                            alt=""
                            className="w-11 h-11 rounded-2xl object-cover border border-gray-200 shrink-0 shadow-xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/20">
                            {record.name ? record.name.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                        )}

                        {/* Name & Email */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-brand-600 transition-colors">
                            {record.name || 'Unnamed Contact'}
                          </h4>
                          {record.email ? (
                            <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              {record.email}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400 mt-0.5">Verified Contact</p>
                          )}
                        </div>
                      </div>

                      {/* Phone Display (Protected / Non-copyable) */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 select-none pointer-events-none">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono font-bold text-xs text-emerald-700 select-none">
                          {record.phone}
                        </span>
                      </div>

                      {/* Tags / Segments */}
                      {((record.tags && record.tags.length > 0) || record.category) && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {record.tags && record.tags.length > 0 ? (
                            record.tags.map((t, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold"
                              >
                                <Tag className="w-2.5 h-2.5 text-purple-500" />
                                {t}
                              </span>
                            ))
                          ) : record.category ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5 text-purple-500" />
                              {record.category}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Location & Demographics */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {record.location || record.area || 'Location N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-gray-700 shrink-0">
                        <span>{record.gender || '–'}</span>
                        {record.age ? <span className="text-gray-400">({record.age}y)</span> : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/90 text-gray-600 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Tags & Segment</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Demographics</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecords.map((record, index) => {
                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Index */}
                          <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          {/* Contact Name & Email */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {record.avatarUrl ? (
                                <img
                                  src={record.avatarUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 shadow-xs"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0 border border-brand-200">
                                  {record.name?.[0] || 'U'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-gray-900 text-xs">
                                  {record.name || 'Unnamed Contact'}
                                </div>
                                {record.email && (
                                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-gray-400" /> {record.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Phone (Protected / Non-copyable) */}
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700 select-none">
                            <div className="flex items-center gap-1.5 select-none pointer-events-none">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span className="select-none">{record.phone}</span>
                            </div>
                          </td>

                          {/* Tags */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {record.tags && record.tags.length > 0 ? (
                                record.tags.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold"
                                  >
                                    {t}
                                  </span>
                                ))
                              ) : record.category ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">
                                  {record.category}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-[11px]">–</span>
                              )}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-3 px-4 text-gray-700">
                            {record.location ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{record.location}</span>
                                {record.area && <span className="text-gray-400">({record.area})</span>}
                              </div>
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>

                          {/* Demographics */}
                          <td className="py-3 px-4 text-gray-700">
                            <span>{record.gender || '–'}</span>
                            {record.age ? <span className="text-gray-400 ml-1">({record.age}y)</span> : null}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                record.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {record.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-4 border-t border-gray-200 text-center text-gray-400 text-xs bg-white/80">
        Contacts Snapshot &bull; Confidential View
      </footer>
    </div>
  );
}
