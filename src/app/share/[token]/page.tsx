'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Eye,
  Sparkles,
  CameraOff,
  LayoutGrid,
  Table2,
  Tag,
  Users,
  X,
  Smartphone,
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

function getSafeDisplayName(name?: string, phone?: string): string {
  const rawName = (name || '').trim();
  const rawPhone = (phone || '').trim();
  const isPhoneMasked = rawPhone.includes('*');

  if (!rawName) {
    return rawPhone ? `User (${rawPhone})` : 'Verified Contact';
  }

  if (isPhoneMasked) {
    if (rawName.startsWith('User (') && rawName.endsWith(')')) {
      const inner = rawName.slice(6, -1).trim();
      return `User (${inner.includes('*') ? inner : rawPhone || '***'})`;
    }
    return rawName.replace(/\b(\+?88)?01\d{8,9}\b/g, (match) => {
      if (match.length <= 6) return '***';
      const isPlus = match.startsWith('+');
      const pLen = isPlus ? 5 : 4;
      const sLen = 3;
      return match.slice(0, pLen) + '******' + match.slice(-sLen);
    });
  }

  return rawName;
}

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

  // Permanent Touch Armor State (Always enforced - recipient cannot disable)
  const [activeHeldIndex, setActiveHeldIndex] = useState<number | null>(null);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  // Security violation states
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);
  const [isScreenshotAttempted, setIsScreenshotAttempted] = useState(false);
  const [securityReason, setSecurityReason] = useState<string>('');

  const hasFetchedRef = useRef(false);
  const autoHideTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});

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

  // Helper to trigger screenshot lockout & wipe clipboard
  const triggerScreenshotLock = useCallback((reason = 'Screenshot Attempt Blocked') => {
    setIsScreenshotAttempted(true);
    setSecurityReason(reason);
    setActiveHeldIndex(null);
    setRevealedIndices(new Set());
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('⚠️ CONFIDENTIAL - SCREENSHOT PROHIBITED BY SECURITY POLICY');
      }
    } catch {}
    if (typeof window !== 'undefined' && window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  // 3. Multi-Layer Mobile & Desktop Anti-Screenshot DRM Stack
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Mobile Multi-Touch / 3-Finger Gesture Trap
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 2) {
        if (e.touches.length >= 3) {
          e.preventDefault();
        }
        triggerScreenshotLock('Multi-Touch Screenshot Gesture Detected');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length >= 2) {
        e.preventDefault();
        triggerScreenshotLock('Gesture Capture Attempt Blocked');
      }
    };

    // Hardware Squeeze & Motion Jolt Interceptor
    let lastAcc = { x: 0, y: 0, z: 0, time: 0 };
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const now = Date.now();
      if (now - lastAcc.time > 80) {
        const dx = Math.abs((acc.x || 0) - lastAcc.x);
        const dy = Math.abs((acc.y || 0) - lastAcc.y);
        const dz = Math.abs((acc.z || 0) - lastAcc.z);
        const delta = dx + dy + dz;

        if (delta > 26) {
          triggerScreenshotLock('Hardware Squeeze / Physical Capture Sensed');
        }
        lastAcc = { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0, time: now };
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        e.code === 'PrintScreen' ||
        e.keyCode === 44 ||
        (e.altKey && (e.key === 'PrintScreen' || e.code === 'PrintScreen')) ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && ['s', 'S', '3', '4', '5'].includes(e.key))
      ) {
        e.preventDefault();
        triggerScreenshotLock('PrintScreen / Screen Grab Shortcut Blocked');
        return false;
      }

      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        return false;
      }

      if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }

      if (e.ctrlKey && ['s', 'S', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        triggerScreenshotLock('Screen Capture Key Released');
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

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState !== 'visible') {
        setIsWindowBlurred(true);
        setSecurityReason('Page Hidden / App Switcher Active');
        setActiveHeldIndex(null);
        setRevealedIndices(new Set());
      }
    };

    const handlePageHide = () => {
      setIsWindowBlurred(true);
      setSecurityReason('Page Transition / Window Suspended');
      setActiveHeldIndex(null);
    };

    const handleWindowBlur = () => {
      setIsWindowBlurred(true);
      setSecurityReason('Window Lost Focus (Privacy Guard)');
      setActiveHeldIndex(null);
    };

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
    window.addEventListener('selectstart', handleSelectStart);
    window.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('copy', handleCopyCut);
    window.addEventListener('cut', handleCopyCut);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', checkDevTools);

    if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('selectstart', handleSelectStart);
      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('copy', handleCopyCut);
      window.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', checkDevTools);
      if (typeof window !== 'undefined' && 'ondevicemotion' in window) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [triggerScreenshotLock]);

  // Touch Armor Peek / Hold Handler
  const handleToggleCardReveal = (index: number) => {
    setRevealedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        if (autoHideTimeoutsRef.current[index]) {
          clearTimeout(autoHideTimeoutsRef.current[index]);
        }
      } else {
        next.add(index);
        if (autoHideTimeoutsRef.current[index]) {
          clearTimeout(autoHideTimeoutsRef.current[index]);
        }
        autoHideTimeoutsRef.current[index] = setTimeout(() => {
          setRevealedIndices((curr) => {
            const updated = new Set(curr);
            updated.delete(index);
            return updated;
          });
        }, 3500);
      }
      return next;
    });
  };

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

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800 select-none font-sans">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-xl flex flex-col items-center gap-4 text-center max-w-sm w-full mx-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center animate-pulse shadow-inner">
            <Lock className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900">Loading Secure View...</h3>
            <p className="text-xs text-gray-500 mt-1">
              Verifying link access & Touch Armor DRM
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Burned / Expired Screen
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

  // Passcode Prompt Screen
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
      {/* 100% Solid Opaque Privacy Blackout Shield */}
      <AnimatePresence>
        {isShieldActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none backdrop-blur-3xl"
          >
            <div className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 text-white">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto shadow-inner">
                {isScreenshotAttempted ? (
                  <CameraOff className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-rose-500" />
                ) : isWindowBlurred ? (
                  <Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 animate-pulse" />
                ) : (
                  <EyeOff className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {isScreenshotAttempted
                    ? 'Screenshot Attempt Blocked!'
                    : isDevToolsDetected
                    ? 'Developer Tools Detected'
                    : 'Confidential View Protected'}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {isScreenshotAttempted
                    ? 'Hardware button and gesture screen capture are strictly guarded. Clipboard has been cleared.'
                    : isDevToolsDetected
                    ? 'Please close your browser developer tools to view this confidential data.'
                    : 'Screen capture protection is active. Tap below to resume secure viewing.'}
                </p>
                {securityReason && (
                  <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] text-slate-400 font-mono">
                    {securityReason}
                  </span>
                )}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsWindowBlurred(false);
                    setIsScreenshotAttempted(false);
                    setIsDevToolsDetected(false);
                    setSecurityReason('');
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  Resume Secure View
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global CSS Anti-Screenshot & Touch Protections */}
      <style jsx global>{`
        @media print {
          body, html {
            display: none !important;
            visibility: hidden !important;
          }
        }
        * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -khtml-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-user-drag: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        input, textarea {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
      `}</style>

      {/* Dynamic Repeating Forensic DRM Watermark Mesh Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-20 overflow-hidden select-none opacity-[0.045]"
        aria-hidden="true"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="security-watermark-grid"
              width="360"
              height="180"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-22)"
            >
              <text
                x="20"
                y="50"
                fill="#0f172a"
                fontSize="11"
                fontWeight="900"
                fontFamily="monospace"
                letterSpacing="1.5"
              >
                MORPHEUS DRM • CONFIDENTIAL
              </text>
              <text
                x="20"
                y="75"
                fill="#0f172a"
                fontSize="9"
                fontWeight="700"
                fontFamily="monospace"
              >
                {shareData.sessionWatermark || `#${token.slice(0, 8).toUpperCase()}`}
              </text>
              <text
                x="20"
                y="95"
                fill="#0f172a"
                fontSize="8"
                fontWeight="600"
                fontFamily="monospace"
              >
                DO NOT CAPTURE • {new Date().toISOString().slice(0, 10)}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#security-watermark-grid)" />
        </svg>
      </div>

      {/* Top Header Bar (100% Mobile Responsive) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white shadow-md shadow-brand-600/20 shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {shareData.title}
                </h1>
                {shareData.isOneTime || (shareData.maxViews && shareData.maxViews === 1) ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[9px] sm:text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs shrink-0">
                    <Flame className="w-3 h-3 text-rose-600" /> One-Time View
                  </span>
                ) : shareData.maxViews && shareData.maxViews > 1 ? (
                  <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-[9px] sm:text-[10px] font-extrabold uppercase flex items-center gap-1 shadow-2xs shrink-0">
                    <Users className="w-3 h-3 text-brand-600" /> View {shareData.viewCount || 1} of {shareData.maxViews}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span>Shared by: <strong className="text-gray-700 font-semibold">{shareData.createdBy}</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Total: <strong className="text-emerald-700 font-bold">{shareData.recordCount.toLocaleString()} Contacts</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Live Security Indicator (Permanent) */}
            <div className="w-full sm:w-auto px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] sm:text-[11px] text-emerald-800 flex items-center justify-center gap-1.5 font-semibold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Touch-Protected & Anti-Screenshot Active</span>
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
        className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-3.5 sm:space-y-4 z-10 transition-opacity duration-100"
      >
        {/* Notice & Control Toolbar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-800">
              👆 Touch & Hold phone numbers to reveal (Auto-blurs immediately on finger release).
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200/80 shadow-2xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-brand-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, tag..."
                className="w-full pl-8 pr-8 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white shadow-2xs transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* View Wrapper */}
        <div className="transition-all duration-150">
          {filteredRecords.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-white border border-gray-200 shadow-sm space-y-2">
              <Users className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-gray-500 text-xs font-medium">
                No contacts match your search query inside this shared view.
              </p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredRecords.map((record, index) => {
                const badge = STATUS_BADGES[record.status || 'Active'] || STATUS_BADGES.Active;
                const safeName = getSafeDisplayName(record.name, record.phone);
                const isRevealed =
                  activeHeldIndex === index ||
                  revealedIndices.has(index);

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: (index % 12) * 0.02 }}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
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

                      <div className="flex items-start gap-3">
                        {record.avatarUrl ? (
                          <img
                            src={record.avatarUrl}
                            alt=""
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl object-cover border border-gray-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-brand-600/20">
                            {safeName && !safeName.startsWith('User (') ? safeName.slice(0, 2).toUpperCase() : 'UC'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate group-hover:text-brand-600 transition-colors">
                            {safeName}
                          </h4>
                          {record.email ? (
                            <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{record.email}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400 mt-0.5">Verified Contact</p>
                          )}
                        </div>
                      </div>

                      {/* Touch Armor Interactive Phone Number Box (Permanent Protection) */}
                      <div
                        onTouchStart={() => setActiveHeldIndex(index)}
                        onTouchEnd={() => setActiveHeldIndex(null)}
                        onTouchCancel={() => setActiveHeldIndex(null)}
                        onMouseDown={() => setActiveHeldIndex(index)}
                        onMouseUp={() => setActiveHeldIndex(null)}
                        onMouseLeave={() => setActiveHeldIndex(null)}
                        onClick={() => handleToggleCardReveal(index)}
                        className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 select-none cursor-pointer transition-all ${
                          isRevealed
                            ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                            : 'bg-slate-100 border-slate-200 hover:bg-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isRevealed
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`font-mono font-bold text-xs select-none tracking-wide transition-all ${
                              isRevealed
                                ? 'text-emerald-700 blur-none'
                                : 'text-slate-400 blur-[3px] opacity-70'
                            }`}
                          >
                            {isRevealed ? record.phone : '• • • • • • • • • •'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-slate-500">
                          {isRevealed ? (
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[9px]">Visible</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="text-[9px]">Hold / Tap</span>
                            </span>
                          )}
                        </div>
                      </div>

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

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 gap-2">
                      <div className="flex items-center gap-1 truncate min-w-0">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {record.location || record.area || 'Location N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-medium text-gray-700 shrink-0 text-[10px] sm:text-[11px]">
                        <span>{record.gender || '–'}</span>
                        {record.age ? <span className="text-gray-400">({record.age}y)</span> : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/90 text-gray-600 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-3.5">#</th>
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
                      const safeName = getSafeDisplayName(record.name, record.phone);
                      const isRevealed =
                        activeHeldIndex === index ||
                        revealedIndices.has(index);

                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-3.5 text-gray-400 font-mono text-[11px]">
                            {index + 1}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {record.avatarUrl ? (
                                <img
                                  src={record.avatarUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0 border border-brand-200">
                                  {safeName && !safeName.startsWith('User (') ? safeName[0] : 'U'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 text-xs truncate">
                                  {safeName}
                                </div>
                                {record.email && (
                                  <div className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 text-gray-400 shrink-0" /> {record.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Table Phone Number Cell with Permanent Touch Armor */}
                          <td
                            className="py-3 px-4 font-mono font-bold text-emerald-700 select-none cursor-pointer"
                            onClick={() => handleToggleCardReveal(index)}
                          >
                            <div className="flex items-center gap-1.5 select-none">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span
                                className={`transition-all ${
                                  isRevealed ? 'blur-none text-emerald-700' : 'blur-[3px] text-slate-400'
                                }`}
                              >
                                {isRevealed ? record.phone : '• • • • • • • • • •'}
                              </span>
                            </div>
                          </td>

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

                          <td className="py-3 px-4 text-gray-700">
                            {record.location ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                <span>{record.location}</span>
                                {record.area && <span className="text-gray-400">({record.area})</span>}
                              </div>
                            ) : (
                              <span className="text-gray-300">–</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-gray-700">
                            <span>{record.gender || '–'}</span>
                            {record.age ? <span className="text-gray-400 ml-1">({record.age}y)</span> : null}
                          </td>

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
      <footer className="mt-auto py-3.5 sm:py-4 border-t border-gray-200 text-center text-gray-400 text-[11px] sm:text-xs bg-white/80">
        Morpheus Secure Contacts Gateway &bull; DRM & Anti-Screenshot Protected
      </footer>
    </div>
  );
}
