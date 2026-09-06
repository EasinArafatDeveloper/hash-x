'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  FileText,
  Trash2,
  Eye,
  Calendar,
  Layers,
  HardDrive,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { IDatasetSummary } from '@/types';
import { DatasetAuditModal } from './DatasetAuditModal';
import { DatasetDeleteModal } from './DatasetDeleteModal';

interface UploadHistoryProps {
  refreshKey?: number;
  onDatasetDeleted?: () => void;
}

export function UploadHistory({ refreshKey = 0, onDatasetDeleted }: UploadHistoryProps) {
  const [datasets, setDatasets] = useState<IDatasetSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [datasetToDelete, setDatasetToDelete] = useState<IDatasetSummary | null>(null);
  const [selectedAuditDataset, setSelectedAuditDataset] = useState<IDatasetSummary | null>(null);

  const fetchDatasets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data/datasets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDatasets(data || []);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets, refreshKey]);



  const getFileIcon = (filename: string) => {
    const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');
    if (isExcel) {
      return (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shrink-0">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Uploaded Files & Dataset History
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[11px] font-semibold">
                {datasets.length} {datasets.length === 1 ? 'File' : 'Files'}
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage your imported datasets and delete specific files to remove their associated data
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDatasets}
          disabled={isLoading}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Refresh History"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && datasets.length === 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 space-y-3">
          <div className="h-5 bg-gray-100 dark:bg-slate-800 rounded-lg w-1/3 animate-pulse" />
          <div className="h-16 bg-gray-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          <div className="h-16 bg-gray-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && datasets.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">No Uploaded Files Yet</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-0.5">
              Upload your first CSV or Excel dataset above to start exploring, searching, and managing your records.
            </p>
          </div>
        </div>
      )}

      {/* Datasets List */}
      {datasets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl shadow-card divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden">
          {datasets.map((item) => {
            const formattedDate = item.uploadedAt
              ? new Date(item.uploadedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recently';

            return (
              <div
                key={item._id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* Left: Icon & File Meta */}
                <div className="flex items-start space-x-3.5 min-w-0">
                  {getFileIcon(item.filename)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {item.filename}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {item.status || 'Ready'}
                      </span>
                    </div>

                    {/* Meta stats badges */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
                        <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        {(item.totalRecords || 0).toLocaleString()} Records
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                        {item.fileSize || '1.2 MB'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formattedDate}
                      </span>
                      {item.uploadedBy && (
                        <>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {item.uploadedBy}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedAuditDataset(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-900/60 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="View match history & field update breakdown"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    <span>Match Report</span>
                  </button>
                  <Link
                    href="/data/explorer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Explore
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDatasetToDelete(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Delete file and remove its records"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete File
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Dataset Purge & Delete Telemetry Modal */}
      <AnimatePresence>
        {datasetToDelete && (
          <DatasetDeleteModal
            dataset={datasetToDelete}
            onClose={() => setDatasetToDelete(null)}
            onDeleted={async () => {
              setDatasetToDelete(null);
              await fetchDatasets();
              if (onDatasetDeleted) onDatasetDeleted();
            }}
          />
        )}

        {/* Dataset Match & Audit Details Modal */}
        {selectedAuditDataset && (
          <DatasetAuditModal
            dataset={selectedAuditDataset}
            onClose={() => setSelectedAuditDataset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
