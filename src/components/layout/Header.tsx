'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Bell, UploadCloud, PanelLeftClose, PanelLeftOpen, Sparkles, CheckCheck, Zap, Shield, Database } from 'lucide-react';
import { ThemeSelector } from '../theme/ThemeSelector';
import Link from 'next/link';

interface HeaderProps {
  onMobileMenuOpen: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAiCopilot?: () => void;
}

const PAGE_META: Record<string, { title: string; subtitle: string; icon?: string }> = {
  '/dashboard': {
    title: 'Data Overview',
    subtitle: 'Monitor, explore and manage your business dataset.',
  },
  '/data/explorer': {
    title: 'Data Explorer',
    subtitle: 'Search, filter and export your dataset with real-time analytics.',
  },
  '/data/upload': {
    title: 'Upload Data',
    subtitle: 'Import CSV or Excel files with AI-powered validation.',
  },
  '/saved-filters': {
    title: 'Saved Filters',
    subtitle: 'Access and re-apply your custom filter combinations.',
  },
  '/downloads': {
    title: 'Export History',
    subtitle: 'View and re-download previously generated CSV exports.',
  },
  '/activity': {
    title: 'Activity Log',
    subtitle: 'Audit trail of dataset updates, exports and system events.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Configure your data preferences and system options.',
  },
};

const SYSTEM_NOTIFICATIONS = [
  {
    id: 1,
    icon: Database,
    iconColor: 'text-brand-500',
    iconBg: 'bg-brand-50 dark:bg-brand-950/60',
    title: 'AI Copilot Ready',
    message: 'Full database control via natural language is active.',
    time: 'Just now',
  },
  {
    id: 2,
    icon: Zap,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/60',
    title: 'Smart Filters Active',
    message: 'Multi-criteria live search enabled across all fields.',
    time: '2m ago',
  },
  {
    id: 3,
    icon: Shield,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    title: 'System Secure',
    message: '2FA authentication and session tokens are valid.',
    time: '5m ago',
  },
];

export function Header({ onMobileMenuOpen, isCollapsed, onToggleCollapse, onOpenAiCopilot }: HeaderProps) {
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const currentPage = PAGE_META[pathname] || {
    title: 'Morpheus Intelligence',
    subtitle: 'Enterprise Data Management Dashboard',
  };

  // Close notification popover on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-[#080C14]/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/[0.06] px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile menu / collapse toggle / page title */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop sidebar collapse toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed
              ? <PanelLeftOpen className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              : <PanelLeftClose className="w-4 h-4" />
            }
          </button>
        )}

        {/* Divider */}
        <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-white/10" />

        {/* Page title + subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm lg:text-base font-bold text-gray-900 dark:text-white truncate leading-tight">
              {currentPage.title}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
            {currentPage.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

        {/* AI Copilot button */}
        {onOpenAiCopilot && (
          <button
            type="button"
            onClick={onOpenAiCopilot}
            title="AI Personal Assistant (Ctrl+J)"
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-[11px] font-bold shadow-sm shadow-violet-600/20 hover:shadow-violet-600/40 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:animate-pulse" />
            <span className="hidden sm:inline">AI Copilot</span>
            <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-mono">Ctrl+J</span>
          </button>
        )}

        {/* Quick upload shortcut */}
        {pathname !== '/data/upload' && (
          <Link
            href="/data/upload"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200/80 dark:border-brand-900/60 text-[11px] font-semibold hover:bg-brand-100 dark:hover:bg-brand-950/80 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Upload</span>
          </Link>
        )}

        {/* Theme selector */}
        <ThemeSelector variant="compact" />

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications((v) => !v);
              setNotifRead(true);
            }}
            className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {!notifRead && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white dark:ring-[#080C14]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#0E1320] border border-gray-200/80 dark:border-white/[0.08] rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white">Notifications</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[9px] font-bold">
                    {SYSTEM_NOTIFICATIONS.length}
                  </span>
                </div>
                <button
                  onClick={() => setNotifRead(true)}
                  className="flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  All read
                </button>
              </div>

              {/* Notification list */}
              <div className="divide-y divide-gray-100/80 dark:divide-white/[0.04]">
                {SYSTEM_NOTIFICATIONS.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <div className={`shrink-0 w-7 h-7 rounded-lg ${n.iconBg} flex items-center justify-center mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${n.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                      <span className="shrink-0 text-[9px] text-gray-400 dark:text-gray-600 mt-0.5">{n.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
                <Link
                  href="/activity"
                  onClick={() => setShowNotifications(false)}
                  className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 transition-colors"
                >
                  View full activity log →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
