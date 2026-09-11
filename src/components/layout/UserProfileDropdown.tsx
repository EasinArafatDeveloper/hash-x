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
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  const handleSignOut = async () => {
    setOpen(false);
    await logout();
  };

  if (isCollapsed) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex justify-center p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
          title={`${displayName} — ${displayRole}`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white font-black text-xs shadow-md shadow-brand-500/25">
            {initials}
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -6, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 left-14 w-52 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50"
            >
              <div className="px-3 py-2.5 mb-1 border-b border-gray-100 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 mt-0.5">
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
        className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all border border-transparent hover:border-gray-200/80 dark:hover:border-white/[0.07] group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center text-white font-black text-xs shadow-md shadow-brand-500/25 shrink-0 ring-2 ring-white dark:ring-slate-900">
            {initials}
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-bold text-gray-900 dark:text-white/90 truncate leading-tight">
              {displayName}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-white/35 flex items-center gap-1 font-medium mt-0.5">
              <ShieldCheck className="w-2.5 h-2.5 text-brand-500 shrink-0" />
              {displayRole}
            </p>
          </div>
        </div>
        <ChevronUp
          className={`w-3.5 h-3.5 text-gray-300 dark:text-white/20 group-hover:text-gray-500 dark:group-hover:text-white/50 transition-all ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50"
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
        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 rounded-xl transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </div>
        My Profile
      </Link>
      <Link
        href="/settings"
        onClick={onClose}
        className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/8 rounded-xl transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </div>
        Security
      </Link>
      <div className="my-1 mx-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
      <button
        type="button"
        onClick={onSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
        </div>
        Sign Out
      </button>
    </>
  );
}
