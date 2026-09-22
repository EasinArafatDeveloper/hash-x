'use client';

import React, { useState } from 'react';
import { Settings, LogOut, ShieldCheck, ChevronUp, User, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfileDropdownProps {
  isCollapsed?: boolean;
}

export function UserProfileDropdown({ isCollapsed = false }: UserProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const displayName = user?.name || 'Administrator';
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin';
  const initials =
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AD';

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
  };

  const avatar = (
    <div className="relative w-8 h-8 rounded-lg bg-gradient-brand shadow-brand flex items-center justify-center text-white font-semibold text-xs shrink-0">
      {initials}
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0A0A0B]" aria-hidden="true" />
    </div>
  );

  if (isCollapsed) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={`Account menu — ${displayName}, ${displayRole}`}
          aria-expanded={open}
          className="w-full flex justify-center p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          title={`${displayName} — ${displayRole}`}
        >
          {avatar}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-0 left-14 w-52 bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/10 rounded-xl shadow-cardHover p-1.5 z-50"
            >
              <div className="px-3 py-2.5 mb-1 border-b border-gray-100 dark:border-white/[0.06]">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3" /> {displayRole}
                </p>
              </div>
              <DropdownItems onClose={() => setOpen(false)} onSignOut={handleSignOut} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Account menu — ${displayName}, ${displayRole}`}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {avatar}
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{displayRole}</p>
          </div>
        </div>
        <ChevronUp
          className={`w-3.5 h-3.5 text-gray-300 dark:text-white/25 group-hover:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#141416] border border-gray-200 dark:border-white/10 rounded-xl shadow-cardHover p-1.5 z-50"
          >
            <DropdownItems onClose={() => setOpen(false)} onSignOut={handleSignOut} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownItems({ onClose, onSignOut }: { onClose: () => void; onSignOut: () => void }) {
  return (
    <>
      <Link
        href="/settings"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 rounded-lg transition-colors"
      >
        <User className="w-4 h-4 text-gray-400" />
        My Profile
      </Link>
      <Link
        href="/settings"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 rounded-lg transition-colors"
      >
        <Shield className="w-4 h-4 text-gray-400" />
        Security
      </Link>
      <div className="my-1 mx-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
      <button
        type="button"
        onClick={onSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </>
  );
}
