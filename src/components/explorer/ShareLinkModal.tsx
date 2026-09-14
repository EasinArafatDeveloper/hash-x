'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Copy,
  Check,
  Flame,
  Clock,
  KeyRound,
  ShieldCheck,
  EyeOff,
  Sparkles,
  ExternalLink,
  Users,
  Globe,
  Shuffle,
} from 'lucide-react';
import { FilterQueryState } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme/ThemeProvider';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterQueryState;
  totalFilteredCount: number;
}

const DOMAIN_OPTIONS = [
  { id: 'auto', label: 'Auto-Rotate / Random (Smart Cycling)', badge: 'Recommended', icon: Shuffle },
  { id: 'https://tempshr.click', label: 'tempshr.click', badge: 'Fast CDN', icon: Globe },
  { id: 'https://tempshr.xyz', label: 'tempshr.xyz', badge: 'Stealth', icon: Globe },
  { id: 'https://tempshr.lol', label: 'tempshr.lol', badge: 'Secure', icon: Globe },
];

export function ShareLinkModal({
  isOpen,
  onClose,
  filters,
  totalFilteredCount,
}: ShareLinkModalProps) {
  const { theme, colorTheme } = useTheme();
  const [title, setTitle] = useState('');
  const [targetDomain, setTargetDomain] = useState<string>('auto');
  const [isOneTime, setIsOneTime] = useState(true);
  const [maxViews, setMaxViews] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [enablePasscode, setEnablePasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [maskPhoneNumbers, setMaskPhoneNumbers] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{
    shareUrl: string;
    token: string;
    domainUsed?: string;
    expiresAt: string;
    isOneTime: boolean;
    hasPasscode: boolean;
    maskPhoneNumbers?: boolean;
    recordCount: number;
    theme?: string;
    themeMode?: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          targetDomain: targetDomain === 'auto' ? undefined : targetDomain,
          filters,
          isOneTime,
          maxViews: isOneTime ? 1 : maxViews,
          expiryHours,
          passcode: enablePasscode && passcode.trim() ? passcode.trim() : undefined,
          maskPhoneNumbers,
          theme: colorTheme,
          themeMode: theme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate secure share link');
      }

      setGeneratedLink(data);
      toast.success('Share link generated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error generating link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.shareUrl);
    setIsCopied(true);
    toast.success('Secure link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const resetForm = () => {
    setGeneratedLink(null);
    setTitle('');
    setTargetDomain('auto');
    setIsOneTime(true);
    setMaxViews(1);
    setExpiryHours(24);
    setEnablePasscode(false);
    setPasscode('');
    setMaskPhoneNumbers(false);
    setIsCopied(false);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
            className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-lg bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white tracking-tight">
                    Share Contacts Snapshot
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Share {totalFilteredCount.toLocaleString()} filtered contacts securely
                  </p>
                </div>
              </div>

              <button
                onClick={handleModalClose}
                aria-label="Close"
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {!generatedLink ? (
                <>
                  {/* Summary Box */}
                  <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-500/5 border border-brand-200 dark:border-brand-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                          Active Selection:
                        </span>
                        <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                          {totalFilteredCount.toLocaleString()} matching contacts snapshot
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase border border-emerald-200 dark:border-emerald-900/50">
                      Snapshot
                    </span>
                  </div>

                  {/* Title / Label */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                      <span>Snapshot Title (Optional)</span>
                      <span className="text-[10px] text-gray-400">For your audit logs</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. VIP Leads Snapshot, Marketing Cohort..."
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  {/* Multi-Domain Dynamic Rotation Selector */}
                  <div className="space-y-2">
                    <label className="font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-gray-400" /> Share Domain Selection:
                      </span>
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                        Multi-Domain Shield
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {DOMAIN_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTargetDomain(opt.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            targetDomain === opt.id
                              ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-400 dark:border-brand-700 ring-1 ring-brand-300 dark:ring-brand-800'
                              : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate">
                              {opt.label}
                            </span>
                            {targetDomain === opt.id && (
                              <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0 ml-1" />
                            )}
                          </div>
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                            {opt.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Burn After Read Options */}
                  <div className="space-y-2">
                    <label className="font-semibold text-gray-800 dark:text-gray-200">
                      Security & Self-Destruction Protocol:
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOneTime(true);
                          setMaxViews(1);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isOneTime
                            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-900'
                            : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1">
                            <Flame className="w-3 h-3" /> 1-Time View
                          </span>
                          {isOneTime && <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Self-destructs immediately after opening once.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsOneTime(false);
                          if (maxViews <= 1) setMaxViews(2);
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          !isOneTime
                            ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-300 dark:border-brand-700 ring-1 ring-brand-200 dark:ring-brand-900'
                            : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-brand-600 dark:text-brand-400 text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> Multi-View Limit
                          </span>
                          {!isOneTime && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Expires after exact number of views (e.g. 2, 3...).
                        </p>
                      </button>
                    </div>

                    {!isOneTime && (
                      <div className="p-3 rounded-lg bg-brand-50/60 dark:bg-brand-500/5 border border-brand-200 dark:border-brand-900/50 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                            Select Allowed View Count:
                          </span>
                          <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-500/10 px-2 py-0.5 rounded-md">
                            {maxViews} {maxViews === 1 ? 'View' : 'Views'}
                          </span>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {[2, 3, 5, 10].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setMaxViews(count)}
                              className={`py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
                                maxViews === count
                                  ? 'bg-brand-600 text-white border-brand-600'
                                  : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                              }`}
                            >
                              {count}x
                            </button>
                          ))}
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={maxViews}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setMaxViews(isNaN(val) || val < 1 ? 1 : Math.min(val, 100));
                              }}
                              title="Custom view count"
                              placeholder="Custom"
                              className={`w-full py-1.5 px-2 text-center rounded-lg font-mono text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-white/5 ${
                                ![2, 3, 5, 10].includes(maxViews)
                                  ? 'border-brand-400 text-brand-600 dark:text-brand-400'
                                  : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300'
                              }`}
                            />
                          </div>
                        </div>

                        <p className="text-[10px] text-brand-700 dark:text-brand-300 font-medium">
                          <strong>Exact Protection:</strong> Link will be accessible exactly <strong>{maxViews} times</strong>. On the <strong>{maxViews + 1}th</strong> attempt, it will immediately self-destruct and become inaccessible.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Auto Expiry Duration */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> Auto-Expiration Time
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: '1 Hour', hours: 1 },
                        { label: '24 Hours', hours: 24 },
                        { label: '3 Days', hours: 72 },
                        { label: '7 Days', hours: 168 },
                      ].map((opt) => (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => setExpiryHours(opt.hours)}
                          className={`py-2 px-1 rounded-lg text-center font-semibold text-[11px] border transition-all ${
                            expiryHours === opt.hours
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-gray-50 dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Passcode Protection */}
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enablePasscode}
                        onChange={(e) => setEnablePasscode(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300 dark:border-white/20"
                      />
                      <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Protect with Secret Passcode
                      </span>
                    </label>

                    {enablePasscode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1.5 pt-1"
                      >
                        <input
                          type="text"
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="Enter 4–8 character passcode / PIN..."
                          className="w-full px-3.5 py-2 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          * The recipient will be required to type this passcode before viewing any contact records.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Optional Phone Masking (Hide with ***) */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-900/50 space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={maskPhoneNumbers}
                        onChange={(e) => setMaskPhoneNumbers(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300 dark:border-white/20"
                      />
                      <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Mask Phone Numbers (Hide with ***)
                      </span>
                    </label>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 pl-6 leading-relaxed">
                      Partially hides numbers with asterisks (e.g. <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">0171****678</span>) so recipients cannot see full numbers.
                    </p>
                  </div>

                  {/* Active Safeguards Banner */}
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
                      <ShieldCheck className="w-4 h-4" /> Privacy & Security:
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                      <div className="flex items-center gap-1"><Check className="w-3 h-3" /> Encrypted Share Token</div>
                      <div className="flex items-center gap-1"><Check className="w-3 h-3" /> Auto-Expiration Timer</div>
                      <div className="flex items-center gap-1"><Check className="w-3 h-3" /> {maskPhoneNumbers ? 'Phone Numbers Masked (***)' : 'Full Numbers (Unmasked)'}</div>
                      <div className="flex items-center gap-1"><Check className="w-3 h-3" /> Non-Copyable Protected View</div>
                    </div>
                  </div>
                </>
              ) : (
                /* Generated Link Success Box */
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-center space-y-1.5 pt-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base">
                      Share Link Ready!
                    </h4>
                    <p className="text-xs text-gray-500">
                      {generatedLink.isOneTime
                        ? 'Single-Use: This link will expire after the first view.'
                        : `Expires in ${expiryHours} hours.`}
                    </p>
                  </div>

                  {/* Link Box */}
                  <div className="p-4 rounded-xl bg-gray-900 dark:bg-black/40 text-gray-100 border border-gray-800 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-mono flex items-center gap-1 text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-brand-400" /> Domain:{' '}
                        <strong className="text-brand-300">{generatedLink.domainUsed || 'tempshr'}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-semibold">
                          {generatedLink.recordCount} Records
                        </span>
                        {generatedLink.maskPhoneNumbers && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-semibold flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" /> Masked (***)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-gray-800 dark:border-white/10 font-mono text-xs text-emerald-400 break-all select-all leading-relaxed">
                      {generatedLink.shareUrl}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Share Link'}</span>
                      </button>

                      <a
                        href={generatedLink.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open link in new tab"
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                        title="Open in new tab (Note: Will burn if 1-time view is active!)"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
              {!generatedLink ? (
                <>
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || totalFilteredCount === 0}
                    className="flex-1 py-2.5 px-5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-card flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isGenerating ? (
                      <span>Generating Link...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Generate Share Link</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full py-2.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
                >
                  Done / Close
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
