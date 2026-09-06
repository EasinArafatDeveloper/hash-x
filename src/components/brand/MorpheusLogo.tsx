'use client';

import React from 'react';

interface MorpheusLogoProps {
  variant?: 'full' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

export function MorpheusLogo({
  variant = 'full',
  size = 'md',
  className = '',
  showBadge = true,
}: MorpheusLogoProps) {
  // Size mappings
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const badgeSizes = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-1.5 py-0.5',
    lg: 'text-[11px] px-2 py-0.5',
    xl: 'text-xs px-2.5 py-1',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Sleek Futuristic Morpheus Glyph / Icon */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        {/* Glow ambient layer */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-accent-500 blur-[6px] opacity-40 group-hover:opacity-75 transition-opacity" />

        {/* Vector SVG Emblem */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
        >
          {/* Background Rounded Squircle */}
          <rect
            width="40"
            height="40"
            rx="11"
            className="fill-slate-900 dark:fill-slate-950 stroke-brand-500/30 dark:stroke-brand-400/40"
            strokeWidth="1.5"
          />

          {/* Futuristic faceted 'M' glyph */}
          <defs>
            <linearGradient id="morpheusGradPrimary" x1="6" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="0.5" stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="morpheusGradAccent" x1="12" y1="12" x2="28" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EC4899" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>

          {/* Left Wing */}
          <path
            d="M9 30V12L16 23L20 29L9 30Z"
            fill="url(#morpheusGradPrimary)"
            opacity="0.9"
          />

          {/* Right Wing */}
          <path
            d="M31 30V12L24 23L20 29L31 30Z"
            fill="url(#morpheusGradPrimary)"
            opacity="0.9"
          />

          {/* Central Peak Core */}
          <path
            d="M20 10L25 18L20 25L15 18L20 10Z"
            fill="url(#morpheusGradAccent)"
          />

          {/* Central Core Light Node */}
          <circle cx="20" cy="18" r="2.5" fill="#FFFFFF" className="animate-pulse" />
        </svg>
      </div>

      {/* Typography & Brand Name */}
      {variant !== 'icon-only' && (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-black tracking-wider uppercase font-sans ${textSizes[size]} bg-gradient-to-r from-gray-950 via-slate-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent`}
              >
                MORPHEUS
              </span>

              {showBadge && (
                <span
                  className={`rounded-full font-bold uppercase tracking-widest bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 ${badgeSizes[size]}`}
                >
                  DATA OS
                </span>
              )}
            </div>

            {size === 'lg' || size === 'xl' ? (
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase">
                Enterprise Intelligence
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
