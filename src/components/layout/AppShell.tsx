'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AIAnalyticsCopilot } from '@/components/dashboard/AIAnalyticsCopilot';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);

  // Load user's collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Global Keyboard Shortcut: Ctrl + J or Cmd + J to toggle AI Executive Copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setIsAiCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {
        // Ignore
      }
      return next;
    });
  };

  // If on login or public share/vault page, render full screen without dashboard shell
  if (pathname === '/login' || pathname?.startsWith('/share') || pathname?.startsWith('/v/')) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onOpenAiCopilot={() => setIsAiCopilotOpen(true)}
      />
      <div
        className={`flex-1 ${
          isCollapsed ? 'md:pl-[72px]' : 'md:pl-[250px]'
        } flex flex-col min-w-0 transition-all duration-300 ease-in-out`}
      >
        <Header
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onOpenAiCopilot={() => setIsAiCopilotOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-8">
          {children}
        </main>
      </div>

      {/* Global AI Executive Personal Assistant */}
      <AIAnalyticsCopilot
        isOpen={isAiCopilotOpen}
        onClose={() => setIsAiCopilotOpen(false)}
        onOpen={() => setIsAiCopilotOpen(true)}
      />
    </div>
  );
}
