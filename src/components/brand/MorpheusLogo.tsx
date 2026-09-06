'use client';

import React from 'react';

interface MorpheusLogoProps {
  variant?: 'full' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  textColor?: 'auto' | 'white' | 'emerald';
  className?: string;
}

export function MorpheusLogo({
  variant = 'full',
  size = 'md',
  textColor = 'auto',
  className = '',
}: MorpheusLogoProps) {
  // Size mappings
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
    xl: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Compute text color classes
  const getTextClass = () => {
    if (textColor === 'white') {
      return 'text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]';
    }
    if (textColor === 'emerald') {
      return 'text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]';
    }
    // auto: adapt between light and dark mode cleanly
    return 'text-gray-900 dark:text-white';
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Sleek Futuristic Morpheus Glyph / Icon */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        {/* Glow ambient layer */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-accent-500 blur-[6px] opacity-50 group-hover:opacity-85 transition-opacity" />

        {/* Vector SVG Emblem */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
        >
          {/* Background Rounded Squircle */}
          <rect
            width="40"
            height="40"
            rx="11"
            className="fill-slate-900 stroke-brand-500/40"
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

      {/* Pure Typography & Clean Brand Name ONLY */}
      {variant !== 'icon-only' && (
        <span
          className={`font-black tracking-widest uppercase font-sans ${textSizes[size]} ${getTextClass()}`}
        >
          MORPHEUS
        </span>
      )}
    </div>
  );
}
