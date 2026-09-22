'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Bell, UploadCloud, PanelLeftClose, PanelLeftOpen, Sparkles, CheckCheck, Zap, Shield, Database, Search } from 'lucide-react';
import { ThemeSelector } from '../theme/ThemeSelector';
import Link from 'next/link';

interface HeaderProps {
  onMobileMenuOpen: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAiCopilot?: () => void;
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Overview',
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
  '/trash': {
    title: 'Recycle Bin',
    subtitle: 'Deleted records stay here for 30 days before being permanently purged.',
  },
};

const SYSTEM_NOTIFICATIONS = [
  {
    id: 1,
    icon: Database,
    iconColor: 'text-brand-600 dark:text-brand-400',
    title: 'AI Copilot ready',
    message: 'Full database control via natural language is active.',
    time: 'Just now',
  },
  {
    id: 2,
    icon: Zap,
    iconColor: 'text-amber-600 dark:text-amber-400',
    title: 'Smart filters active',
    message: 'Multi-criteria live search enabled across all fields.',
    time: '2m ago',
  },
  {
    id: 3,
    icon: Shield,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'System secure',
    message: '2FA authentication and session tokens are valid.',
    time: '5m ago',
  },
];

export function Header({ onMobileMenuOpen, isCollapsed, onToggleCollapse, onOpenAiCopilot }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);

  const currentPage = PAGE_META[pathname] || {
    title: 'Morpheus',
    subtitle: 'Enterprise data management dashboard',
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/data/explorer?search=${encodeURIComponent(q)}` : '/data/explorer');
  };

  useEffect(() => {
    fetch('/api/activity')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLiveActivities(data.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

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
    <header className="sticky top-0 z-20 h-14 glass border-b border-gray-200 dark:border-white/10 px-4 lg:px-6 flex items-center gap-3 transition-colors">
      {/* Left: Mobile menu / collapse toggle / page title */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          aria-label="Open menu"
          className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}

        <div className="hidden md:block w-px h-5 bg-gray-200 dark:bg-white/10" />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {currentPage.title}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-pulse" aria-hidden="true" />
              Live
            </span>
          </div>
          <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
            {currentPage.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Quick search — jumps into Data Explorer with the query applied */}
      <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-sm mx-auto">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers, phone, tags…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/10 text-[13px] text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
          />
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0">
        {onOpenAiCopilot && (
          <button
            type="button"
            onClick={onOpenAiCopilot}
            aria-label="Open AI Copilot (Ctrl+K)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span className="hidden sm:inline">AI Copilot</span>
            <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[10px] font-mono text-gray-500 dark:text-gray-400">
              Ctrl+K
            </span>
          </button>
        )}

        {pathname !== '/data/upload' && (
          <Link
            href="/data/upload"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-900/60 text-[13px] font-medium hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Upload</span>
          </Link>
        )}

        <ThemeSelector variant="compact" />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications((v) => !v);
              setNotifRead(true);
            }}
            className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label={notifRead ? 'Notifications' : `Notifications (${SYSTEM_NOTIFICATIONS.length} unread)`}
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {!notifRead && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-600 rounded-full ring-2 ring-white dark:ring-[#0A0A0B] glow-pulse" aria-hidden="true" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 rounded-2xl shadow-cardHover z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">Notifications</span>
                  <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
                    {SYSTEM_NOTIFICATIONS.length}
                  </span>
                </div>
                <button
                  onClick={() => setNotifRead(true)}
                  className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {liveActivities.length > 0 ? (
                  liveActivities.map((act) => (
                    <div key={act._id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mt-0.5">
                        <Database className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{act.action}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed truncate">{act.description}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  SYSTEM_NOTIFICATIONS.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mt-0.5">
                          <Icon className={`w-3.5 h-3.5 ${n.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{n.title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">{n.time}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.06]">
                <Link
                  href="/activity"
                  onClick={() => setShowNotifications(false)}
                  className="text-[12px] text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 transition-colors"
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
