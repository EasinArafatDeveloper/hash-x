'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  FileSpreadsheet,
  FileText,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  ExternalLink,
  Layers,
  Calendar,
  User,
  HardDrive,
  Sparkles,
  Mail,
  MapPin,
  Phone,
  Image as ImageIcon,
  Tag,
  Circle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { IDatasetSummary, IMatchAuditItem } from '@/types';

interface DatasetAuditModalProps {
  dataset: IDatasetSummary;
  onClose: () => void;
}

export function DatasetAuditModal({ dataset, onClose }: DatasetAuditModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'updated' | 'new' | 'unchanged'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const auditSample: IMatchAuditItem[] = dataset.auditSample || [];
  const fieldSummary = dataset.fieldUpdatesSummary || {};

  const isExcel = dataset.filename?.endsWith('.xlsx') || dataset.filename?.endsWith('.xls');

  // Filter audit records based on active tab and search query
  const filteredAudit = auditSample.filter((item) => {
    if (activeTab === 'updated' && item.status !== 'updated') return false;
    if (activeTab === 'new' && item.status !== 'new') return false;
    if (activeTab === 'unchanged' && item.status !== 'unchanged') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchId = item.identifier?.toLowerCase().includes(q);
      const matchFields = item.updatedFields?.some((f) => f.toLowerCase().includes(q));
      if (!matchName && !matchId && !matchFields) return false;
    }

    return true;
  });

  const totalNew = dataset.newRecordsCount ?? dataset.totalRecords ?? 0;
  const totalUpdated = dataset.updatedRecordsCount ?? 0;
  const totalUnchanged = dataset.unchangedRecordsCount ?? 0;
  const totalSkipped = dataset.skippedRowsCount ?? 0;
  const totalRows = dataset.totalRowsInFile || (totalNew + totalUpdated + totalUnchanged + totalSkipped) || dataset.totalRecords;

  const hasFieldUpdates =
    (fieldSummary.emailUpdated || 0) > 0 ||
    (fieldSummary.locationUpdated || 0) > 0 ||
    (fieldSummary.nameUpdated || 0) > 0 ||
    (fieldSummary.avatarUpdated || 0) > 0 ||
    (fieldSummary.ageUpdated || 0) > 0 ||
    (fieldSummary.genderUpdated || 0) > 0 ||
    (fieldSummary.phoneUpdated || 0) > 0 ||
    (fieldSummary.tagsUpdated || 0) > 0 ||
    (fieldSummary.activeDaysUpdated || 0) > 0 ||
    (fieldSummary.customFieldsUpdated || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-4 bg-gray-50/60 dark:bg-white/[0.02]">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isExcel
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60'
            }`}>
              {isExcel ? <FileSpreadsheet className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  {dataset.filename}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {dataset.status || 'Ready'}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  {totalRows.toLocaleString()} Total Rows
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                  {dataset.fileSize || '1.2 MB'}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {dataset.uploadedAt ? new Date(dataset.uploadedAt).toLocaleString() : 'Recently'}
                </span>
                {dataset.uploadedBy && (
                  <>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {dataset.uploadedBy}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* New Records */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> New Records
                </span>
              </div>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                +{totalNew.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                Inserted into database
              </p>
            </div>

            {/* Matched & Updated */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-500/5 border border-blue-200/80 dark:border-blue-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Matched & Merged
                </span>
              </div>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-300">
                {totalUpdated.toLocaleString()}
              </p>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
                Existing contacts updated
              </p>
            </div>

            {/* Unchanged / Duplicate */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /> Unchanged
                </span>
              </div>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {totalUnchanged.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-500">
                Identical duplicate rows
              </p>
            </div>

            {/* Skipped */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/80 dark:border-amber-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Skipped Rows
                </span>
              </div>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300">
                {totalSkipped.toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                Empty rows ignored
              </p>
            </div>
          </div>

          {/* Specific Field Updates Breakdown */}
          {hasFieldUpdates && (
            <div className="p-4 rounded-xl bg-brand-50/40 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-900/40 space-y-2.5">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                Updated & Merged Columns Breakdown
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                {(fieldSummary.emailUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200/80 dark:border-blue-900/50">
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    +{fieldSummary.emailUpdated} Emails Added/Updated
                  </span>
                )}
                {(fieldSummary.locationUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-900/50">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    +{fieldSummary.locationUpdated} Locations Merged
                  </span>
                )}
                {(fieldSummary.avatarUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/80 dark:border-purple-900/50">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                    +{fieldSummary.avatarUpdated} Photos Added
                  </span>
                )}
                {(fieldSummary.nameUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-900/50">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    +{fieldSummary.nameUpdated} Names Improved
                  </span>
                )}
                {(fieldSummary.phoneUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-200/80 dark:border-cyan-900/50">
                    <Phone className="w-3.5 h-3.5 text-cyan-500" />
                    +{fieldSummary.phoneUpdated} Phones Merged
                  </span>
                )}
                {(fieldSummary.ageUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200/80 dark:border-amber-900/50">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    +{fieldSummary.ageUpdated} Ages Filled
                  </span>
                )}
                {(fieldSummary.tagsUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/80 dark:border-purple-900/50">
                    <Tag className="w-3.5 h-3.5 text-purple-500" />
                    +{fieldSummary.tagsUpdated} Tags Attached
                  </span>
                )}
                {(fieldSummary.customFieldsUpdated || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200/80 dark:border-rose-900/50">
                    <Tag className="w-3.5 h-3.5 text-rose-500" />
                    +{fieldSummary.customFieldsUpdated} Custom Fields Merged
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Row-by-Row Match & Ingestion Audit Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                Row-by-Row Ingestion Audit Log ({filteredAudit.length})
              </h4>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-[#111113] text-brand-600 dark:text-brand-400 shadow-card'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  All ({auditSample.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('updated')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'updated'
                      ? 'bg-white dark:bg-[#111113] text-blue-600 dark:text-blue-400 shadow-card'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Updated ({totalUpdated})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'new'
                      ? 'bg-white dark:bg-[#111113] text-emerald-600 dark:text-emerald-400 shadow-card'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  New ({totalNew})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unchanged')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'unchanged'
                      ? 'bg-white dark:bg-[#111113] text-gray-700 dark:text-gray-300 shadow-card'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  Unchanged ({totalUnchanged})
                </button>
              </div>
            </div>

            {/* Search Input for Audit Rows */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit entries by phone, name, or updated column..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Audit Rows Table */}
            {filteredAudit.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 text-xs text-gray-500">
                {auditSample.length === 0
                  ? 'Detailed audit tracking is active for all new uploads.'
                  : 'No audit records match the selected filter or search query.'}
              </div>
            ) : (
              <div className="border border-gray-200/80 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/90 dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-sm">
                        <th className="py-2.5 px-3 w-14">Row #</th>
                        <th className="py-2.5 px-3">Contact / Identifier</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3 w-28">Status</th>
                        <th className="py-2.5 px-3">Changes & Value Diffs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#111113]">
                      {filteredAudit.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-gray-400">
                            #{row.rowNumber || idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100">
                            {row.identifier || 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                            {row.name || 'Unnamed Contact'}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.status === 'new' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/50">
                                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                                New Lead
                              </span>
                            )}
                            {row.status === 'updated' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50">
                                <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                                Merged
                              </span>
                            )}
                            {row.status === 'unchanged' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
                                <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
                                Unchanged
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {row.changes && row.changes.length > 0 ? (
                              <div className="space-y-1">
                                {row.changes.map((c, cIdx) => (
                                  <div key={cIdx} className="text-[11px] flex items-center gap-1 flex-wrap">
                                    <span className="font-semibold text-gray-600 dark:text-gray-400">{c.field}:</span>
                                    <span className="text-gray-400 line-through truncate max-w-[90px]">{c.from}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[130px]">{c.to}</span>
                                  </div>
                                ))}
                              </div>
                            ) : row.updatedFields && row.updatedFields.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.updatedFields.map((f, fIdx) => (
                                  <span key={fIdx} className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">All data already identical</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5 transition-colors"
          >
            Close Report
          </button>

          <Link
            href={`/data/explorer`}
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-card flex items-center gap-1.5 transition-colors"
          >
            <span>Explore Records in Data Explorer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
