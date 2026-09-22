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
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Data Explorer', href: '/data/explorer', icon: Database },
      { label: 'Upload Data', href: '/data/upload', icon: UploadCloud },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Saved Filters', href: '/saved-filters', icon: Bookmark },
      { label: 'Downloads', href: '/downloads', icon: Download },
      { label: 'Activity', href: '/activity', icon: Activity },
    ],
  },
  {
    title: 'System',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
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
      className={`flex flex-col h-full
        bg-white dark:bg-[#0A0A0B]
        border-r border-gray-200 dark:border-white/10
        shadow-card
        transition-all duration-200 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[248px]'}`}
    >
      {/* Brand header */}
      <div
        className={`h-14 flex items-center shrink-0 border-b border-gray-100 dark:border-white/[0.06] bg-gradient-brand-subtle dark:bg-gradient-brand-subtle-dark
        ${collapsed ? 'justify-center px-2' : 'px-4'}`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label="Morpheus — go to dashboard"
          title={collapsed ? 'Morpheus' : undefined}
          onClick={onMobileClose}
        >
          <MorpheusLogo variant={collapsed ? 'icon-only' : 'full'} size="md" />
        </Link>

        {/* Mobile close */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            aria-label="Close menu"
            className="md:hidden ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5 no-scrollbar" aria-label="Primary">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div className="px-2.5 mb-1.5">
                <span className="text-[10.5px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wider">
                  {section.title}
                </span>
              </div>
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
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-3 rounded-xl text-[13px] font-medium
                        transition-all duration-150 outline-none
                        focus-visible:ring-2 focus-visible:ring-brand-500
                        ${collapsed ? 'justify-center p-2.5' : 'px-2.5 py-2'}
                        ${
                          isActive
                            ? 'bg-gradient-brand text-white shadow-brand'
                            : 'text-gray-500 dark:text-white/55 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:translate-x-0.5'
                        }`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-white/40'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" aria-hidden="true" />
                      )}
                    </Link>

                    {/* Collapsed tooltip — shown on hover AND keyboard focus */}
                    {collapsed && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5
                          bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-medium rounded-md
                          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
                          transition-opacity duration-100 z-50 whitespace-nowrap"
                      >
                        {item.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI Copilot launcher */}
      <div className={`shrink-0 ${collapsed ? 'px-1.5 pb-2' : 'px-2.5 pb-2'}`}>
        <button
          type="button"
          onClick={() => {
            onOpenAiCopilot?.();
            onMobileClose?.();
          }}
          aria-label="Open AI Copilot (Ctrl+K)"
          title={collapsed ? 'AI Copilot' : undefined}
          className={`group w-full flex items-center rounded-xl transition-all
            bg-gradient-brand-subtle dark:bg-gradient-brand-subtle-dark
            border border-brand-200/70 dark:border-brand-800/60
            hover:shadow-brand hover:border-brand-300 dark:hover:border-brand-700
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
            ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'}`}
        >
          <span className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-brand text-white">
            <Sparkles className="w-[15px] h-[15px]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0A0A0B] glow-pulse" aria-hidden="true" />
          </span>
          {!collapsed && (
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[13px] font-semibold text-brand-700 dark:text-white">AI Copilot</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/70 dark:bg-white/10 text-brand-600 dark:text-brand-300">
                  Ctrl+K
                </span>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* User profile */}
      <div className={`shrink-0 border-t border-gray-100 dark:border-white/[0.06] ${collapsed ? 'p-2' : 'p-3'}`}>
        <UserProfileDropdown isCollapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-[68px]' : 'w-[248px]'
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
              className="fixed inset-0 bg-black/40"
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.2 }}
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
