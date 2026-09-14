'use client';

import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { FilterQueryState } from '@/types';

interface ActiveFilterChipsProps {
  filters: FilterQueryState;
  onRemoveFilter: (key: keyof FilterQueryState) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ filters, onRemoveFilter, onClearAll }: ActiveFilterChipsProps) {
  const activeChips: { key: keyof FilterQueryState; label: string }[] = [];

  if (filters.search) {
    activeChips.push({ key: 'search', label: `Search: "${filters.search}"` });
  }

  if (filters.datasetId && filters.datasetId !== 'All') {
    activeChips.push({ key: 'datasetId', label: `File: ${filters.filename || 'Selected file'}` });
  }

  if (filters.tag && filters.tag !== 'All') {
    activeChips.push({ key: 'tag', label: `Tag: ${filters.tag}` });
  }

  if (filters.gender && filters.gender !== 'All') {
    activeChips.push({ key: 'gender', label: `Gender: ${filters.gender}` });
  }

  if (filters.avatarType && filters.avatarType !== 'All') {
    activeChips.push({ key: 'avatarType', label: `Avatar: ${filters.avatarType}` });
  }

  if (filters.minAge || filters.maxAge) {
    const min = filters.minAge || '18';
    const max = filters.maxAge || '65';
    activeChips.push({ key: 'minAge', label: `Age: ${min}–${max}` });
  }

  if (filters.merchant && filters.merchant !== 'All') {
    activeChips.push({ key: 'merchant', label: `Merchant: ${filters.merchant}` });
  }

  if (filters.minOrderAmount || filters.maxOrderAmount) {
    const min = filters.minOrderAmount ? `৳${Number(filters.minOrderAmount).toLocaleString()}` : '৳0';
    const max = filters.maxOrderAmount ? `৳${Number(filters.maxOrderAmount).toLocaleString()}` : '৳∞';
    activeChips.push({ key: 'minOrderAmount', label: `Spend: ${min}–${max}` });
  }

  if (filters.minOrderCount || filters.maxOrderCount) {
    const min = filters.minOrderCount || '0';
    const max = filters.maxOrderCount || '∞';
    activeChips.push({ key: 'minOrderCount', label: `Orders: ${min}–${max}` });
  }

  if (filters.numberStartsWith) {
    activeChips.push({ key: 'numberStartsWith', label: `Starts with: ${filters.numberStartsWith}` });
  }

  if (filters.maxActiveDays) {
    activeChips.push({ key: 'maxActiveDays', label: `Active days ≤ ${filters.maxActiveDays}` });
  }

  if (filters.lastOnlineFrom || filters.lastOnlineTo) {
    activeChips.push({
      key: 'lastOnlineFrom',
      label: `Online: ${filters.lastOnlineFrom || 'start'} to ${filters.lastOnlineTo || 'now'}`,
    });
  }

  if (activeChips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">
        Active filters ({activeChips.length}):
      </span>

      {activeChips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemoveFilter(chip.key)}
            aria-label={`Remove filter: ${chip.label}`}
            className="p-0.5 rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-500/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors"
      >
        <RotateCcw className="w-3 h-3" /> Clear all
      </button>
    </div>
  );
}
