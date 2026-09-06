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
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { MorpheusLogo } from '@/components/brand/MorpheusLogo';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV_SECTIONS = [
  {
    title: 'MAIN',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Data Explorer', href: '/data/explorer', icon: Database },
      { label: 'Upload Data', href: '/data/upload', icon: UploadCloud },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Saved Filters', href: '/filters/saved', icon: Bookmark },
      { label: 'Downloads', href: '/downloads', icon: Download },
      { label: 'Activity', href: '/activity', icon: Activity },
    ],
  },
  {
    title: 'SYSTEM',
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
];

export function Sidebar({
  mobileOpen = false,
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const renderContent = (collapsed: boolean) => (
    <div
      className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        } border-b border-gray-100 dark:border-slate-800 shrink-0 relative`}
      >
        <Link
          href="/dashboard"
          className="flex items-center group py-1 overflow-hidden"
          title={collapsed ? 'Morpheus Platform' : undefined}
        >
          <MorpheusLogo
            variant={collapsed ? 'icon-only' : 'full'}
            size="md"
            showBadge={!collapsed}
          />
        </Link>

        {/* Desktop Collapse / Expand Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
              collapsed ? 'absolute -right-3 top-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-md z-40' : ''
            }`}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Mobile Close Button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6 no-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-1 pt-0.5">
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
                      className={`relative flex items-center ${
                        collapsed ? 'justify-center p-3' : 'space-x-3 px-3 py-2'
                      } rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-950/50 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {isActive && !collapsed && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-brand-600 to-accent-500 rounded-r-full shadow-sm shadow-brand-500/30"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>

                    {/* Floating Tooltip in Collapsed Mode */}
                    {collapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
        <UserProfileDropdown isCollapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left with dynamic width) */}
      <aside
        className={`hidden md:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out shadow-sm ${
          isCollapsed ? 'w-[72px]' : 'w-[250px]'
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer (Always full width menu when opened) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Sidebar Slide-in */}
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
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
