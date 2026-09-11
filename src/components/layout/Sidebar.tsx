'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  UploadCloud,
  Bookmark,
  Download,
  Activity,
  Settings,
  X,
  ChevronRight,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { MorpheusLogo } from '@/components/brand/MorpheusLogo';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAiCopilot?: () => void;
}

const NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      { label: 'Overview',      href: '/dashboard',     icon: LayoutDashboard, color: 'text-brand-500 dark:text-brand-400',     bg: 'bg-brand-50 dark:bg-brand-950/60' },
      { label: 'Data Explorer', href: '/data/explorer', icon: Database,         color: 'text-indigo-500 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-950/60' },
      { label: 'Upload Data',   href: '/data/upload',   icon: UploadCloud,      color: 'text-violet-500 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-950/60' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Saved Filters', href: '/filters/saved', icon: Bookmark,  color: 'text-amber-500 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/60' },
      { label: 'Downloads',     href: '/downloads',     icon: Download,  color: 'text-teal-500 dark:text-teal-400',     bg: 'bg-teal-50 dark:bg-teal-950/60' },
      { label: 'Activity',      href: '/activity',      icon: Activity,  color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-slate-800' },
    ],
  },
];

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
  onOpenAiCopilot,
}: SidebarProps) {
  const pathname = usePathname();

  const renderContent = (collapsed: boolean) => (
    <div
      className={`flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden
        bg-white/90 dark:bg-[#0a0e1a]/95 backdrop-blur-2xl
        border-r border-gray-200/50 dark:border-white/[0.06]
        ${collapsed ? 'w-[72px]' : 'w-[256px]'}`}
    >
      {/* Decorative ambient glow — top right */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-400/10 dark:bg-brand-600/15 blur-3xl pointer-events-none" />
      {/* Decorative ambient glow — bottom left */}
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent-400/10 dark:bg-accent-600/12 blur-3xl pointer-events-none" />

      {/* ── Brand Header ──────────────────────────────────────── */}
      <div className={`relative z-10 h-16 flex items-center shrink-0
        ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}
        border-b border-gray-100/80 dark:border-white/[0.05]`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group py-1 min-w-0"
          title={collapsed ? 'Morpheus' : undefined}
          onClick={onMobileClose}
        >
          <MorpheusLogo variant={collapsed ? 'icon-only' : 'full'} size="md" />
        </Link>

        {/* Desktop collapse toggle */}
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}

        {/* Collapsed expand button — floating on edge */}
        {onToggleCollapse && collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md items-center justify-center z-40 hover:border-brand-400 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          </button>
        )}

        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto py-4 px-2.5 space-y-5 no-scrollbar">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title}>
            {/* Section label */}
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 mb-2">
                <span className="text-[10px] font-black text-gray-400 dark:text-white/25 uppercase tracking-[0.12em]">
                  {section.title}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
              </div>
            )}
            {collapsed && sIdx > 0 && (
              <div className="mx-3 mb-3 h-px bg-gray-100 dark:bg-white/[0.06]" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={`relative flex items-center gap-3 rounded-xl text-xs font-semibold transition-all duration-200 outline-none
                        ${collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2.5'}
                        ${isActive
                          ? 'bg-gradient-to-r from-brand-600/10 via-brand-500/8 to-transparent dark:from-brand-500/20 dark:via-brand-500/10 dark:to-transparent text-brand-700 dark:text-brand-300'
                          : 'text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                        }`}
                    >
                      {/* Active left accent bar */}
                      {isActive && !collapsed && (
                        <motion.div
                          layoutId="sidebarActiveBar"
                          className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-brand-500 to-accent-500 shadow-[0_0_8px_rgba(var(--brand-glow-rgb),0.7)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}

                      {/* Icon with colored bg */}
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
                        ${isActive
                          ? `${item.bg} ${item.color} shadow-sm scale-105`
                          : 'bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-white/8 text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/60'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Label */}
                      {!collapsed && (
                        <span className={`truncate font-semibold transition-colors ${isActive ? 'text-brand-700 dark:text-brand-300 font-bold' : ''}`}>
                          {item.label}
                        </span>
                      )}

                      {/* Active dot for collapsed */}
                      {isActive && collapsed && (
                        <motion.div
                          layoutId="sidebarActiveDot"
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                    </Link>

                    {/* Tooltip for collapsed mode */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-slate-700" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── AI Personal Assistant Launcher Card ────────────────────── */}
      <div className={`relative z-10 shrink-0 px-2.5 pb-2 ${collapsed ? 'px-1.5' : 'px-2.5'}`}>
        <button
          type="button"
          onClick={() => {
            if (onOpenAiCopilot) onOpenAiCopilot();
            if (onMobileClose) onMobileClose();
          }}
          className={`w-full flex items-center rounded-2xl bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-brand-600/15 dark:from-purple-950/50 dark:to-indigo-950/40 border border-purple-300/60 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 hover:border-purple-400 dark:hover:border-purple-700 transition-all cursor-pointer group shadow-xs active:scale-[0.98] ${
            collapsed ? 'justify-center p-2.5' : 'p-3 gap-2.5'
          }`}
          title={collapsed ? 'AI Executive Copilot (Ctrl+J)' : undefined}
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/30 group-hover:scale-110 transition-transform">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          {!collapsed && (
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold truncate">AI Copilot</span>
                <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-purple-200/60 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                  Ctrl+J
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Live Data Assistant
              </p>
            </div>
          )}
        </button>
      </div>

      {/* ── User Profile ──────────────────────────────────────── */}
      <div className={`relative z-10 shrink-0 border-t border-gray-100/80 dark:border-white/[0.05]
        ${collapsed ? 'p-2' : 'p-3'}`}
      >
        <UserProfileDropdown isCollapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative z-10"
            >
              {renderContent(false)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
