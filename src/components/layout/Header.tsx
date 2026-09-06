'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon, Bell, HelpCircle, UploadCloud, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeSelector } from '../theme/ThemeSelector';
import Link from 'next/link';

interface HeaderProps {
  onMobileMenuOpen: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
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
    subtitle: 'Import CSV or Excel files with multi-stage validation.',
  },
  '/saved-filters': {
    title: 'Saved Filters',
    subtitle: 'Access and re-apply your custom filter combinations.',
  },
  '/downloads': {
    title: 'Export History',
    subtitle: 'View and re-download previously generated CSV datasets.',
  },
  '/activity': {
    title: 'System Activity',
    subtitle: 'Audit log of dataset updates, exports and system events.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Configure your data preferences and system options.',
  },
};

export function Header({ onMobileMenuOpen, isCollapsed, onToggleCollapse }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  const currentPage = PAGE_META[pathname] || {
    title: 'Morpheus Intelligence',
    subtitle: 'Enterprise Data Management Dashboard',
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile Hamburger / Desktop Collapse Toggle & Page Titles */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open Mobile Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse to Mini Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div>
          <h2 className="text-base lg:text-lg font-bold text-gray-900 dark:text-white leading-tight">
            {currentPage.title}
          </h2>
          <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 font-medium">
            {currentPage.subtitle}
          </p>
        </div>
      </div>

      {/* Right Action Icons & Theme Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick Upload Action */}
        {pathname !== '/data/upload' && (
          <Link
            href="/data/upload"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900 text-xs font-semibold hover:bg-brand-100 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Upload Data
          </Link>
        )}

        {/* Theme & Palette Selector */}
        <ThemeSelector variant="compact" />

        {/* Notification Bell with Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-xs font-bold text-gray-900 dark:text-white">Recent Alerts</span>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold cursor-pointer">Mark read</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-[11px]">System Ready</p>
                  <p className="text-gray-500 text-[10px]">Database indexed with 2,124 records.</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800/60">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-[11px]">Smart Filters Enabled</p>
                  <p className="text-gray-500 text-[10px]">Multi-criteria live search is active.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
