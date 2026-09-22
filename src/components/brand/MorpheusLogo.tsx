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

  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Clean flat brand mark — icon only, no wordmark */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center rounded-xl bg-gradient-brand shadow-brand`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[60%] h-[60%]"
        >
          {/* Simple geometric peak mark */}
          <path
            d="M9 28V14L16 22.5L20 27L24 22.5L31 14V28"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
