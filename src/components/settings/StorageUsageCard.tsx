'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HardDrive, RefreshCw, Trash2 } from 'lucide-react';

interface StorageStats {
  database: {
    name: string;
    dataSizeMB: number;
    storageSizeMB: number;
    indexSizeMB: number;
    totalSizeMB: number;
    limitMB: number | null;
    usedPercent: number | null;
  };
  trashRecycleBin: { recordCount: number; sizeMB: number };
  datasets: Array<{
    datasetId: string | null;
    filename: string;
    recordCount: number;
    sizeMB: number;
    percentOfRecords: number;
  }>;
  collections: Array<{ name: string; documentCount: number; storageSizeMB: number }>;
}

const COLLECTION_LABELS: Record<string, string> = {
  records: 'Customer records (your uploaded data)',
  datasets: 'Dataset metadata',
  activitylogs: 'Activity log',
  downloadhistories: 'Download history',
  ratelimitbuckets: 'Rate-limit tracking (auto-expires)',
  pendingactions: 'AI copilot pending confirmations (auto-expires)',
  users: 'User accounts',
  sharelinks: 'Share links',
  savedfilters: 'Saved filters',
};

interface StorageUsageCardProps {
  /** Auto-refresh on an interval — use while an upload is actively running so the numbers move live. */
  live?: boolean;
  pollIntervalMs?: number;
  className?: string;
}

/**
 * Live MongoDB storage usage — real numbers from the database (not
 * estimates), broken down per dataset. Shared between Settings (manual
 * refresh) and the Upload page (auto-refreshing while `live` is true, so
 * the numbers visibly climb as a file streams in).
 */
export function StorageUsageCard({ live = false, pollIntervalMs = 4000, className = '' }: StorageUsageCardProps) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/storage');
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setStats(data);
          setError(false);
        }
      } else if (mountedRef.current) {
        setError(true);
      }
    } catch {
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(fetchStats, pollIntervalMs);
    return () => clearInterval(interval);
  }, [live, pollIntervalMs, fetchStats]);

  if (error && !stats) {
    return null; // Non-admins (403) or a transient failure — fail quiet, this card is a nice-to-have.
  }

  return (
    <div className={`p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-brand-600" /> Database Storage Usage
          {live && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-pulse" /> Live
            </span>
          )}
        </h3>
        {!live && (
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
      </div>

      {isLoading && !stats ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-2.5 bg-gray-100 dark:bg-slate-800/60 rounded-full w-full" />
        </div>
      ) : stats ? (
        <>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {stats.database.totalSizeMB.toLocaleString()} MB
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {stats.database.limitMB
                  ? `of ${stats.database.limitMB.toLocaleString()} MB (${stats.database.usedPercent}%)`
                  : 'used (no plan limit configured)'}
              </span>
            </div>
            {stats.database.limitMB && (
              <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (stats.database.usedPercent || 0) > 90
                      ? 'bg-rose-500'
                      : (stats.database.usedPercent || 0) > 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, stats.database.usedPercent || 0)}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-gray-400">
              On disk (compressed): {stats.database.storageSizeMB.toLocaleString()} MB data + {stats.database.indexSizeMB.toLocaleString()} MB indexes · database &quot;{stats.database.name}&quot;
            </p>
            <p className="text-[11px] text-gray-400">
              Logical size (uncompressed): {stats.database.dataSizeMB.toLocaleString()} MB — this is what the dataset breakdown below measures.
            </p>
          </div>

          {stats.collections.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Storage by Collection (on disk)
              </p>
              <p className="text-[10px] text-gray-400 -mt-1">
                The on-disk total above covers this whole database, not just your uploaded records — this is where
                every megabyte of it actually is.
              </p>
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {stats.collections.map((c) => (
                  <div key={c.name} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {COLLECTION_LABELS[c.name] || c.name}
                      </p>
                      <p className="text-[11px] text-gray-400">{c.documentCount.toLocaleString()} documents</p>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white shrink-0 ml-3">{c.storageSizeMB.toLocaleString()} MB</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.datasets.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Storage by Dataset
                </p>
                <p className="text-[10px] text-gray-400">logical size, not on-disk</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {stats.datasets.map((d) => (
                  <div key={d.datasetId || 'unlinked'} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{d.filename}</p>
                      <p className="text-[11px] text-gray-400">{d.recordCount.toLocaleString()} records</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-gray-900 dark:text-white">{d.sizeMB.toLocaleString()} MB</p>
                      <p className="text-[11px] text-gray-400">{d.percentOfRecords}% of logical data</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                These are raw, uncompressed per-record sizes — they won&apos;t add up to exactly the on-disk number above
                (MongoDB compresses data on disk, but a large delete-then-restore also temporarily grows on-disk size until
                the freed space is reclaimed — that&apos;s normal, not lost data).
              </p>
            </div>
          )}

          {stats.trashRecycleBin.recordCount > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
              <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Recycle Bin
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {stats.trashRecycleBin.recordCount.toLocaleString()} records · {stats.trashRecycleBin.sizeMB.toLocaleString()} MB
              </span>
            </div>
          )}

          {!stats.database.limitMB && !live && (
            <p className="text-[11px] text-gray-400">
              Tip: set <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-800 font-mono">MONGODB_STORAGE_LIMIT_MB</code> in your environment (e.g. 512 for an Atlas M0 cluster) to show a used/limit progress bar.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400">Failed to load storage usage.</p>
      )}
    </div>
  );
}
