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
  Sparkles,
  Bot,
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
      { label: 'Saved Filters', href: '/saved-filters', icon: Bookmark,  color: 'text-amber-500 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/60' },
      { label: 'Downloads',     href: '/downloads',     icon: Download,  color: 'text-teal-500 dark:text-teal-400',       bg: 'bg-teal-50 dark:bg-teal-950/60' },
      { label: 'Activity',      href: '/activity',      icon: Activity,  color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/60' },
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
      className={`flex flex-col h-full relative overflow-hidden
        bg-white dark:bg-[#0A0E1A]
        border-r border-gray-200/60 dark:border-white/[0.06]
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[256px]'}`}
    >
      {/* Ambient glow blobs */}
      <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-brand-400/8 dark:bg-brand-600/12 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full bg-violet-400/8 dark:bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* ── Brand header ── */}
      <div className={`relative z-10 h-16 flex items-center shrink-0 border-b border-gray-100/80 dark:border-white/[0.05]
        ${collapsed ? 'justify-center px-2' : 'px-4'}`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 min-w-0"
          title={collapsed ? 'Morpheus' : undefined}
          onClick={onMobileClose}
        >
          <MorpheusLogo variant={collapsed ? 'icon-only' : 'full'} size="md" />
        </Link>

        {/* Collapsed expand chip on edge */}
        {onToggleCollapse && collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md items-center justify-center z-40 hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
          </button>
        )}

        {/* Mobile close */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="relative z-10 flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.title}>
            {/* Section label */}
            {!collapsed ? (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className="text-[9px] font-black text-gray-300 dark:text-white/20 uppercase tracking-[0.15em]">
                  {section.title}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
              </div>
            ) : sIdx > 0 ? (
              <div className="mx-3 mb-3 h-px bg-gray-100 dark:bg-white/[0.06]" />
            ) : null}

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
                      className={`relative flex items-center gap-3 rounded-xl text-[11px] font-semibold transition-all duration-200 outline-none
                        ${collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2'}
                        ${isActive
                          ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                          : 'text-gray-500 dark:text-white/45 hover:text-gray-800 dark:hover:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                        }`}
                    >
                      {/* Active left accent bar */}
                      {isActive && !collapsed && (
                        <motion.div
                          layoutId="sidebarActiveBar"
                          className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-gradient-to-b from-brand-500 to-violet-500"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}

                      {/* Icon */}
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
                        ${isActive
                          ? `${item.bg} ${item.color} shadow-sm`
                          : 'bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-white/[0.07] text-gray-400 dark:text-white/25 group-hover:text-gray-600 dark:group-hover:text-white/55'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Label */}
                      {!collapsed && (
                        <span className={`truncate transition-colors ${isActive ? 'font-bold' : 'font-medium'}`}>
                          {item.label}
                        </span>
                      )}

                      {/* Active dot (collapsed mode) */}
                      {isActive && collapsed && (
                        <motion.div
                          layoutId="sidebarActiveDot"
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>

                    {/* Tooltip (collapsed only) */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-[11px] font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
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

      {/* ── AI Copilot launcher ── */}
      <div className={`relative z-10 shrink-0 ${collapsed ? 'px-1.5 pb-2' : 'px-2.5 pb-2'}`}>
        <button
          type="button"
          onClick={() => {
            onOpenAiCopilot?.();
            onMobileClose?.();
          }}
          title={collapsed ? 'AI Copilot (Ctrl+J)' : undefined}
          className={`group w-full flex items-center rounded-2xl transition-all active:scale-[0.98] cursor-pointer
            bg-gradient-to-br from-violet-500/10 via-indigo-500/8 to-brand-500/10
            dark:from-violet-950/60 dark:via-indigo-950/40 dark:to-brand-950/50
            border border-violet-200/60 dark:border-violet-800/40
            hover:border-violet-300 dark:hover:border-violet-700/60
            hover:shadow-md hover:shadow-violet-500/10
            ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 p-3'}`}
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-violet-600/30 group-hover:scale-105 transition-transform">
            <Bot className="w-3.5 h-3.5" />
          </div>
          {!collapsed && (
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-violet-800 dark:text-violet-200 truncate">AI Copilot</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 shrink-0">
                  Ctrl+J
                </span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                Live Data Assistant
              </p>
            </div>
          )}
        </button>
      </div>

      {/* ── User profile ── */}
      <div className={`relative z-10 shrink-0 border-t border-gray-100/80 dark:border-white/[0.05] ${collapsed ? 'p-2' : 'p-3'}`}>
        <UserProfileDropdown isCollapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile drawer */}
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
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
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
