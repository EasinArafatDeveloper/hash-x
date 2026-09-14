'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Download,
  RotateCcw,
  X,
  ChevronDown,
  Phone,
  Image as ImageIcon,
  Calendar,
  Users,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  Tag,
  Lock,
  Check,
  CalendarRange,
} from 'lucide-react';
import { FilterQueryState, IDatasetSummary } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';

interface FilterToolbarProps {
  filters: FilterQueryState;
  onApplyFilters: (updated: Partial<FilterQueryState>) => void;
  onResetFilters: () => void;
  onExportCSV: () => void;
  onShareLink?: () => void;
  isExporting?: boolean;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  totalFilteredCount?: number;
}

const TAG_PRESETS = [
  { label: 'iPhone User', value: 'iPhone User' },
  { label: 'WhatsApp Active', value: 'WhatsApp Active' },
  { label: 'Viber Contact', value: 'Viber Contact' },
  { label: 'VIP Client', value: 'VIP Client' },
  { label: 'Corporate Lead', value: 'Corporate Lead' },
];

const OPERATOR_PRESETS = [
  { label: 'All Operators', prefix: '' },
  { label: 'Grameenphone (88017/013)', prefix: '88017' },
  { label: 'Robi (88018)', prefix: '88018' },
  { label: 'Banglalink (88019/014)', prefix: '88019' },
  { label: 'Teletalk (88015)', prefix: '88015' },
  { label: 'Airtel (88016)', prefix: '88016' },
];

const ACTIVE_DAYS_PRESETS = [
  { label: 'Any active days', days: '' },
  { label: 'Highly active (≤ 3 days)', days: '3' },
  { label: 'Active this week (≤ 7 days)', days: '7' },
  { label: 'Active this month (≤ 30 days)', days: '30' },
  { label: 'Active recently (≤ 60 days)', days: '60' },
];

function QuickPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterToolbar({
  filters,
  onApplyFilters,
  onResetFilters,
  onExportCSV,
  onShareLink,
  isExporting,
  totalFilteredCount = 0,
}: FilterToolbarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [datasets, setDatasets] = useState<IDatasetSummary[]>([]);
  const [tagsList, setTagsList] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    fetch('/api/data/datasets', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDatasets(data || []))
      .catch((err) => console.error('Failed to load datasets for filter:', err));

    fetch('/api/data/tags', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((data) => setTagsList(data.tags || []))
      .catch((err) => console.error('Failed to load tags for filter:', err));
  }, []);

  useEffect(() => {
    setSearchQuery(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    if (searchQuery === (filters.search || '')) return;
    const timer = setTimeout(() => {
      onApplyFilters({ search: searchQuery, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, filters.search, onApplyFilters]);

  const activeFilterCount = [
    filters.search,
    filters.datasetId && filters.datasetId !== 'All',
    filters.tag && filters.tag !== 'All',
    filters.gender && filters.gender !== 'All',
    filters.avatarType && filters.avatarType !== 'All',
    filters.minAge || filters.maxAge,
    filters.numberStartsWith,
    filters.maxActiveDays,
    filters.lastOnlineFrom || filters.lastOnlineTo,
  ].filter(Boolean).length;

  const toggleSearchField = (fieldKey: keyof FilterQueryState) => {
    onApplyFilters({ [fieldKey]: !filters[fieldKey], page: 1 });
  };

  return (
    <div className="space-y-3">
      {/* Search + primary actions */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-card space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, location…"
              className="w-full pl-9 pr-9 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onApplyFilters({ search: '', page: 1 });
                }}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Uploaded file / dataset selector */}
          <div className="relative min-w-[200px] sm:w-60 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <select
              value={filters.datasetId || 'All'}
              onChange={(e) => {
                const selectedId = e.target.value;
                const found = datasets.find((d) => d._id === selectedId);
                onApplyFilters({ datasetId: selectedId, filename: found ? found.filename : '', page: 1 });
              }}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 truncate"
              title="Filter by specific uploaded file"
            >
              <option value="All">All uploaded files (combined)</option>
              {datasets.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.filename} ({(d.totalRecords || 0).toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                showAdvanced || activeFilterCount > 0
                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-900'
                  : 'bg-white dark:bg-transparent text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-semibold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                aria-label="Reset all filters"
                title="Reset all filters"
                className="p-2 rounded-lg bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export CSV</span>
              {totalFilteredCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-black/15 text-[10px]">{totalFilteredCount.toLocaleString()}</span>
              )}
            </button>

            {onShareLink && (
              <button
                type="button"
                onClick={onShareLink}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs transition-colors whitespace-nowrap"
                title="Generate a secure, expiring share link"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Share view</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1 shrink-0">
            Quick:
          </span>

          <QuickPill active={activeFilterCount === 0} onClick={onResetFilters}>All Records</QuickPill>

          {TAG_PRESETS.map((t) => (
            <QuickPill
              key={t.value}
              active={filters.tag === t.value}
              onClick={() => onApplyFilters({ tag: filters.tag === t.value ? 'All' : t.value, page: 1 })}
            >
              {t.label}
            </QuickPill>
          ))}

          <QuickPill
            active={filters.avatarType === 'With Avatar'}
            onClick={() => onApplyFilters({ avatarType: filters.avatarType === 'With Avatar' ? 'All' : 'With Avatar', page: 1 })}
          >
            <ImageIcon className="w-3 h-3" /> With Photo
          </QuickPill>

          <QuickPill
            active={filters.avatarType === 'Without Avatar'}
            onClick={() => onApplyFilters({ avatarType: filters.avatarType === 'Without Avatar' ? 'All' : 'Without Avatar', page: 1 })}
          >
            No Photo
          </QuickPill>

          <QuickPill
            active={filters.numberStartsWith === '88017'}
            onClick={() => onApplyFilters({ numberStartsWith: filters.numberStartsWith === '88017' ? '' : '88017', page: 1 })}
          >
            <Phone className="w-3 h-3" /> 88017 (GP)
          </QuickPill>

          <QuickPill
            active={filters.numberStartsWith === '88018'}
            onClick={() => onApplyFilters({ numberStartsWith: filters.numberStartsWith === '88018' ? '' : '88018', page: 1 })}
          >
            <Phone className="w-3 h-3" /> 88018 (Robi)
          </QuickPill>

          <QuickPill
            active={filters.numberStartsWith === '88019'}
            onClick={() => onApplyFilters({ numberStartsWith: filters.numberStartsWith === '88019' ? '' : '88019', page: 1 })}
          >
            <Phone className="w-3 h-3" /> 88019 (BL)
          </QuickPill>

          <QuickPill
            active={filters.maxActiveDays === '7'}
            onClick={() => onApplyFilters({ maxActiveDays: filters.maxActiveDays === '7' ? '' : '7', page: 1 })}
          >
            <Clock className="w-3 h-3" /> Active ≤ 7d
          </QuickPill>

          <QuickPill active={filters.gender === 'Male'} onClick={() => onApplyFilters({ gender: filters.gender === 'Male' ? 'All' : 'Male', page: 1 })}>
            Male
          </QuickPill>

          <QuickPill active={filters.gender === 'Female'} onClick={() => onApplyFilters({ gender: filters.gender === 'Female' ? 'All' : 'Female', page: 1 })}>
            Female
          </QuickPill>
        </div>
      </div>

      {/* Advanced filter panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-card space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Advanced filters</h4>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Reset all fields
                </button>
              </div>

              {/* Dataset scope */}
              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white text-xs">Dataset / uploaded file scope</h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Isolate records from one uploaded file</p>
                  </div>
                </div>
                <div className="w-full sm:w-64 shrink-0">
                  <select
                    value={filters.datasetId || 'All'}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = datasets.find((d) => d._id === selectedId);
                      onApplyFilters({ datasetId: selectedId, filename: found ? found.filename : '', page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 truncate"
                  >
                    <option value="All">All uploaded files (combined)</option>
                    {datasets.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.filename} ({(d.totalRecords || 0).toLocaleString()} rows)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tag scope */}
              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white text-xs">Tag & audience segment scope</h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Filter by attached audience tag</p>
                  </div>
                </div>
                <div className="w-full sm:w-64 shrink-0">
                  <select
                    value={filters.tag || 'All'}
                    onChange={(e) => onApplyFilters({ tag: e.target.value, page: 1 })}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 truncate"
                  >
                    <option value="All">All tags & audiences</option>
                    {tagsList.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} {t.count > 0 ? `(${t.count})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Demographics & operators grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Number starts with
                  </label>
                  <select
                    value={OPERATOR_PRESETS.some((p) => p.prefix === filters.numberStartsWith) ? filters.numberStartsWith : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') onApplyFilters({ numberStartsWith: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {OPERATOR_PRESETS.map((op) => (
                      <option key={op.prefix} value={op.prefix}>{op.label}</option>
                    ))}
                    <option value="custom">Custom prefix…</option>
                  </select>
                  <input
                    type="text"
                    value={filters.numberStartsWith || ''}
                    onChange={(e) => onApplyFilters({ numberStartsWith: e.target.value, page: 1 })}
                    placeholder="e.g. 88017, 017…"
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> Gender & avatar type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filters.gender || 'All'}
                      onChange={(e) => onApplyFilters({ gender: e.target.value, page: 1 })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="All">All genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      value={filters.avatarType || 'All'}
                      onChange={(e) => onApplyFilters({ avatarType: e.target.value, page: 1 })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="All">All avatars</option>
                      <option value="With Avatar">With photo</option>
                      <option value="Without Avatar">No photo</option>
                      <option value="Custom">Custom</option>
                      <option value="Initial">Initial</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Age range (years)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={filters.minAge || ''}
                      onChange={(e) => onApplyFilters({ minAge: e.target.value, page: 1 })}
                      placeholder="Min (e.g. 18)"
                      className="w-1/2 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-gray-400 text-xs">–</span>
                    <input
                      type="number"
                      value={filters.maxAge || ''}
                      onChange={(e) => onApplyFilters({ maxAge: e.target.value, page: 1 })}
                      placeholder="Max (e.g. 60)"
                      className="w-1/2 px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Active days (≤ max)
                  </label>
                  <select
                    value={ACTIVE_DAYS_PRESETS.some((p) => p.days === filters.maxActiveDays) ? filters.maxActiveDays : filters.maxActiveDays ? 'custom' : ''}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') onApplyFilters({ maxActiveDays: e.target.value, page: 1 });
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {ACTIVE_DAYS_PRESETS.map((p) => (
                      <option key={p.days} value={p.days}>{p.label}</option>
                    ))}
                    <option value="custom">Custom (type exact days)…</option>
                  </select>
                  <input
                    type="number"
                    value={filters.maxActiveDays || ''}
                    onChange={(e) => onApplyFilters({ maxActiveDays: e.target.value, page: 1 })}
                    placeholder="e.g. 10, 25, 75…"
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Date range & search targeting */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-white/10">
                <div className="lg:col-span-1 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <CalendarRange className="w-3.5 h-3.5 text-gray-400" /> Last online date range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.lastOnlineFrom || ''}
                      onChange={(e) => onApplyFilters({ lastOnlineFrom: e.target.value, page: 1 })}
                      className="w-1/2 px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-gray-400 text-xs">to</span>
                    <input
                      type="date"
                      value={filters.lastOnlineTo || ''}
                      onChange={(e) => onApplyFilters({ lastOnlineTo: e.target.value, page: 1 })}
                      className="w-1/2 px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Search targeting (when typing in search bar)
                  </label>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {[
                      { key: 'nameWise' as keyof FilterQueryState, label: 'Name / Nickname' },
                      { key: 'numberWise' as keyof FilterQueryState, label: 'Phone number' },
                      { key: 'tagWise' as keyof FilterQueryState, label: 'Tag / Label' },
                      { key: 'genderWise' as keyof FilterQueryState, label: 'Gender' },
                      { key: 'ageWise' as keyof FilterQueryState, label: 'Age' },
                      { key: 'lastOnlineWise' as keyof FilterQueryState, label: 'Last online' },
                      { key: 'avatarTypeWise' as keyof FilterQueryState, label: 'Avatar photo' },
                    ].map((target) => {
                      const isChecked = !!filters[target.key];
                      return (
                        <button
                          key={target.key}
                          type="button"
                          onClick={() => toggleSearchField(target.key)}
                          aria-pressed={isChecked}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors select-none ${
                            isChecked
                              ? 'bg-brand-600 text-white'
                              : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center ${isChecked ? 'bg-white/25' : 'border border-gray-300 dark:border-white/20'}`}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </span>
                          {target.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
