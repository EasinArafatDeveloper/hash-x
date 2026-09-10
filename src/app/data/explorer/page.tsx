'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FilterToolbar } from '@/components/explorer/FilterToolbar';
import { ActiveFilterChips } from '@/components/explorer/ActiveFilterChips';
import { CardView } from '@/components/explorer/CardView';
import { TableView } from '@/components/explorer/TableView';
import { RecordDetailDrawer } from '@/components/explorer/RecordDetailDrawer';
import { ShareLinkModal } from '@/components/explorer/ShareLinkModal';
import { Pagination } from '@/components/explorer/Pagination';
import { AIQueryAssistant } from '@/components/explorer/AIQueryAssistant';
import { FilterQueryState, IRecord, PaginationResponse } from '@/types';
import { LayoutGrid, Table2, Database, Bookmark, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_FILTERS: FilterQueryState = {
  search: '',
  datasetId: 'All',
  tag: 'All',
  gender: 'All',
  minAge: '',
  maxAge: '',
  avatarType: 'All',
  numberStartsWith: '',
  maxActiveDays: '',
  lastOnlineFrom: '',
  lastOnlineTo: '',
  minOrderAmount: '',
  maxOrderAmount: '',
  minOrderCount: '',
  maxOrderCount: '',
  merchant: '',
  aiQueryText: '',
  aiSequenceSteps: [],
  aiSummaryBn: '',
  nameWise: false,
  numberWise: false,
  tagWise: false,
  genderWise: false,
  ageWise: false,
  lastOnlineWise: false,
  avatarTypeWise: false,
  viewMode: 'cards',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 25,
};

type ViewMode = 'cards' | 'table';

export default function DataExplorerPage() {
  const [filters, setFilters] = useState<FilterQueryState>(DEFAULT_FILTERS);
  const [data, setData] = useState<PaginationResponse<IRecord> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedRecord, setSelectedRecord] = useState<IRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch available tags for AI suggestion engine
  useEffect(() => {
    fetch('/api/data/tags', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((json) => {
        if (json.tags && Array.isArray(json.tags)) {
          setAvailableTags(json.tags.map((t: any) => t.name || t));
        }
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async (currentFilters: FilterQueryState) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.datasetId && currentFilters.datasetId !== 'All') params.set('datasetId', currentFilters.datasetId);
      if (currentFilters.tag && currentFilters.tag !== 'All') params.set('tag', currentFilters.tag);
      if (currentFilters.gender && currentFilters.gender !== 'All') params.set('gender', currentFilters.gender);
      if (currentFilters.minAge) params.set('minAge', String(currentFilters.minAge));
      if (currentFilters.maxAge) params.set('maxAge', String(currentFilters.maxAge));
      if (currentFilters.avatarType && currentFilters.avatarType !== 'All') params.set('avatarType', currentFilters.avatarType);
      if (currentFilters.numberStartsWith) params.set('numberStartsWith', currentFilters.numberStartsWith);
      if (currentFilters.maxActiveDays) params.set('maxActiveDays', String(currentFilters.maxActiveDays));
      if (currentFilters.lastOnlineFrom) params.set('lastOnlineFrom', currentFilters.lastOnlineFrom);
      if (currentFilters.lastOnlineTo) params.set('lastOnlineTo', currentFilters.lastOnlineTo);

      if (currentFilters.minOrderAmount) params.set('minOrderAmount', String(currentFilters.minOrderAmount));
      if (currentFilters.maxOrderAmount) params.set('maxOrderAmount', String(currentFilters.maxOrderAmount));
      if (currentFilters.minOrderCount) params.set('minOrderCount', String(currentFilters.minOrderCount));
      if (currentFilters.maxOrderCount) params.set('maxOrderCount', String(currentFilters.maxOrderCount));
      if (currentFilters.merchant && currentFilters.merchant !== 'All') params.set('merchant', currentFilters.merchant);

      if (currentFilters.nameWise) params.set('nameWise', 'true');
      if (currentFilters.numberWise) params.set('numberWise', 'true');
      if (currentFilters.tagWise) params.set('tagWise', 'true');
      if (currentFilters.genderWise) params.set('genderWise', 'true');
      if (currentFilters.ageWise) params.set('ageWise', 'true');
      if (currentFilters.lastOnlineWise) params.set('lastOnlineWise', 'true');
      if (currentFilters.avatarTypeWise) params.set('avatarTypeWise', 'true');

      if (currentFilters.sortBy) params.set('sortBy', currentFilters.sortBy);
      if (currentFilters.sortOrder) params.set('sortOrder', currentFilters.sortOrder);
      params.set('page', String(currentFilters.page || 1));
      params.set('limit', String(currentFilters.limit || 25));

      const res = await fetch(`/api/data?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed to fetch records');
      const result: PaginationResponse<IRecord> = await res.json();
      setData(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Fetch error:', err);
        toast.error('Failed to load records.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(filters);
  }, [
    filters.search,
    filters.datasetId,
    filters.tag,
    filters.gender,
    filters.minAge,
    filters.maxAge,
    filters.avatarType,
    filters.numberStartsWith,
    filters.maxActiveDays,
    filters.lastOnlineFrom,
    filters.lastOnlineTo,
    filters.minOrderAmount,
    filters.maxOrderAmount,
    filters.minOrderCount,
    filters.maxOrderCount,
    filters.merchant,
    filters.nameWise,
    filters.numberWise,
    filters.tagWise,
    filters.genderWise,
    filters.ageWise,
    filters.lastOnlineWise,
    filters.avatarTypeWise,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit,
    fetchData,
  ]);

  const handleApplyFilters = useCallback((updated: Partial<FilterQueryState>) => {
    setFilters((prev) => ({ ...prev, ...updated, page: 1 }));
  }, []);

  const handleApplyAiFilter = useCallback((aiFilters: Partial<FilterQueryState>) => {
    setFilters((prev) => ({
      ...prev,
      ...aiFilters,
      page: 1,
    }));
  }, []);

  const handleClearAiFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      search: '',
      tag: 'All',
      gender: 'All',
      numberStartsWith: '',
      minOrderAmount: '',
      maxOrderAmount: '',
      minOrderCount: '',
      maxOrderCount: '',
      merchant: '',
      maxActiveDays: '',
      minAge: '',
      maxAge: '',
      aiQueryText: '',
      aiSequenceSteps: [],
      aiSummaryBn: '',
      page: 1,
    }));
    toast.info('Cleared AI filter sequence');
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    toast.success('All filters reset');
  }, []);

  const handleRemoveFilter = useCallback((key: keyof FilterQueryState) => {
    setFilters((prev) => {
      const resetValues: Partial<FilterQueryState> = {
        search: key === 'search' ? '' : prev.search,
        datasetId: key === 'datasetId' ? 'All' : prev.datasetId,
        tag: key === 'tag' ? 'All' : prev.tag,
        gender: key === 'gender' ? 'All' : prev.gender,
        minAge: key === 'minAge' ? '' : prev.minAge,
        maxAge: key === 'maxAge' ? '' : prev.maxAge,
        avatarType: key === 'avatarType' ? 'All' : prev.avatarType,
        numberStartsWith: key === 'numberStartsWith' ? '' : prev.numberStartsWith,
        maxActiveDays: key === 'maxActiveDays' ? '' : prev.maxActiveDays,
        lastOnlineFrom: key === 'lastOnlineFrom' ? '' : prev.lastOnlineFrom,
        lastOnlineTo: key === 'lastOnlineTo' || key === 'lastOnlineFrom' ? '' : prev.lastOnlineTo,
        merchant: key === 'merchant' ? '' : prev.merchant,
        minOrderAmount: key === 'minOrderAmount' ? '' : prev.minOrderAmount,
        maxOrderAmount: key === 'maxOrderAmount' ? '' : prev.maxOrderAmount,
        minOrderCount: key === 'minOrderCount' ? '' : prev.minOrderCount,
        maxOrderCount: key === 'maxOrderCount' ? '' : prev.maxOrderCount,
        page: 1,
      };
      return { ...prev, ...resetValues };
    });
  }, []);

  const handleSortChange = useCallback((field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  }, []);

  const handleExportCSV = () => {
    setIsExporting(true);
    const countStr = data?.pagination?.total ? data.pagination.total.toLocaleString() : 'all';
    const toastId = toast.loading(`Starting high-speed export for ${countStr} records...`);

    try {
      const payload = {
        search: filters.search,
        datasetId: filters.datasetId !== 'All' ? filters.datasetId : undefined,
        tag: filters.tag !== 'All' ? filters.tag : undefined,
        gender: filters.gender !== 'All' ? filters.gender : undefined,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        avatarType: filters.avatarType !== 'All' ? filters.avatarType : undefined,
        numberStartsWith: filters.numberStartsWith,
        maxActiveDays: filters.maxActiveDays,
        lastOnlineFrom: filters.lastOnlineFrom,
        lastOnlineTo: filters.lastOnlineTo,
        minOrderAmount: filters.minOrderAmount,
        maxOrderAmount: filters.maxOrderAmount,
        minOrderCount: filters.minOrderCount,
        maxOrderCount: filters.maxOrderCount,
        merchant: filters.merchant,
        nameWise: filters.nameWise,
        numberWise: filters.numberWise,
        tagWise: filters.tagWise,
        genderWise: filters.genderWise,
        ageWise: filters.ageWise,
        lastOnlineWise: filters.lastOnlineWise,
        avatarTypeWise: filters.avatarTypeWise,
      };

      // Native Hidden Form Submission for 100% Reliable, Zero-Timeout Browser Download Stream
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/export';
      form.style.display = 'none';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'payload';
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
      form.remove();

      setTimeout(() => {
        toast.success(`Download initiated! Streaming ${countStr} records directly to your computer.`, { id: toastId });
        setIsExporting(false);
      }, 1500);
    } catch (err: any) {
      console.error('Export CSV error:', err);
      toast.error(err.message || 'Export failed. Please try again.', { id: toastId });
      setIsExporting(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter preset name');
      return;
    }
    setIsSavingFilter(true);
    try {
      const res = await fetch('/api/saved-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: filterName.trim(), filters }),
      });
      if (!res.ok) throw new Error('Failed to save filter');
      toast.success(`Filter preset "${filterName}" saved!`);
      setShowSaveModal(false);
      setFilterName('');
    } catch (err) {
      toast.error('Failed to save filter preset');
    } finally {
      setIsSavingFilter(false);
    }
  };

  const totalRecords = data?.summaryStats?.totalRecords || 0;
  const filteredRecords = data?.pagination?.total || 0;
  const records: IRecord[] = (data?.data || []) as IRecord[];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Header Row with Results Count, View Toggle & Save Preset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
            <Database className="w-5 h-5" />
          </div>
          <div>
            {isLoading && !data ? (
              <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-48 animate-pulse" />
            ) : (
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                <span className="text-brand-600 dark:text-brand-400">
                  {filteredRecords.toLocaleString()}
                </span>{' '}
                matching records
                {filteredRecords !== totalRecords && (
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {' '}of {totalRecords.toLocaleString()} total
                  </span>
                )}
              </h3>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Card / Table View Toggle */}
          <div className="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
          </div>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-sm transition-colors"
          >
            <Bookmark className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="hidden sm:inline">Save Preset</span>
          </button>
        </div>
      </div>

      {/* DeepSeek AI Natural Language Query & Sequence Assistant */}
      <AIQueryAssistant
        onApplyAiFilter={handleApplyAiFilter}
        onClearAiFilter={handleClearAiFilter}
        activeAiQueryText={filters.aiQueryText}
        activeSequenceSteps={filters.aiSequenceSteps}
        activeSummaryBn={filters.aiSummaryBn}
        availableTags={availableTags}
        totalMatchingRecords={filteredRecords}
      />

      {/* Smart Omnibar & Advanced Filtering Studio */}
      <FilterToolbar
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        onExportCSV={handleExportCSV}
        onShareLink={() => setIsShareModalOpen(true)}
        isExporting={isExporting}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalFilteredCount={filteredRecords}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleResetFilters}
      />

      {/* Empty State */}
      {!isLoading && records.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <Database className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">No matching records</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Try changing your filters or search query to find records.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Data View */}
      {(isLoading || records.length > 0) && (
        <>
          {viewMode === 'cards' ? (
            <CardView
              records={records}
              onSelectRecord={setSelectedRecord}
              isLoading={isLoading && !data}
            />
          ) : (
            <TableView
              records={records}
              onSelectRecord={setSelectedRecord}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortChange={handleSortChange}
              isLoading={isLoading && !data}
            />
          )}

          {/* Pagination */}
          {pagination && !isLoading && (
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setFilters((prev) => ({ ...prev, page: newPage }))}
              onLimitChange={(newLimit) => setFilters((prev) => ({ ...prev, limit: newLimit, page: 1 }))}
            />
          )}
        </>
      )}

      {/* Record Detail Slide-Over Drawer */}
      {selectedRecord && (
        <RecordDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Secure One-Time Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        filters={filters}
        totalFilteredCount={filteredRecords}
      />

      {/* Save Filter Name Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Save Filter Preset</h3>
                <button onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Name this filter combination so you can quickly re-apply it from the Saved Filters page.
              </p>
              <input
                autoFocus
                type="text"
                placeholder="e.g. 88017 Active Users"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFilter}
                  disabled={isSavingFilter}
                  className="w-1/2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 disabled:opacity-60"
                >
                  {isSavingFilter ? 'Saving...' : 'Save Preset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
