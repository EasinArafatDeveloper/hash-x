'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, RotateCcw, ShieldAlert, ChevronDown, ChevronRight, XCircle, FileStack } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthContext';

interface TrashBatch {
  batchId: string;
  label: string;
  count: number;
  deletedAt: string;
  sample: Array<{ name?: string; phone?: string }>;
}

interface TrashRecord {
  _id: string;
  name?: string;
  phone?: string;
  location?: string;
  orderCount?: number;
  orderAmount?: number;
  deletedAt: string;
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function TrashPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<TrashBatch[]>([]);
  const [totalTrashedRecords, setTotalTrashedRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyBatchId, setBusyBatchId] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data/trash?limit=100');
      if (!res.ok) throw new Error('Failed to load recycle bin');
      const data = await res.json();
      setBatches(Array.isArray(data.batches) ? data.batches : []);
      setTotalTrashedRecords(data.totalTrashedRecords || 0);
    } catch {
      toast.error('Failed to load recycle bin');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestoreBatch = async (batch: TrashBatch) => {
    setBusyBatchId(batch.batchId);
    try {
      const res = await fetch(`/api/data/trash/batch/${batch.batchId}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore');
      toast.success(`Restored ${data.restoredCount.toLocaleString()} record(s) from "${batch.label || 'this batch'}"`);
      setBatches((prev) => prev.filter((b) => b.batchId !== batch.batchId));
      setTotalTrashedRecords((prev) => Math.max(0, prev - batch.count));
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore batch');
    } finally {
      setBusyBatchId(null);
    }
  };

  const handlePurgeBatch = async (batch: TrashBatch) => {
    if (!confirm(`Permanently delete all ${batch.count.toLocaleString()} record(s) in "${batch.label || 'this batch'}"? This cannot be undone.`)) {
      return;
    }
    setBusyBatchId(batch.batchId);
    try {
      const res = await fetch(`/api/data/trash/batch/${batch.batchId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to permanently delete');
      toast.success(`Permanently deleted ${data.purgedCount.toLocaleString()} record(s)`);
      setBatches((prev) => prev.filter((b) => b.batchId !== batch.batchId));
      setTotalTrashedRecords((prev) => Math.max(0, prev - batch.count));
    } catch (err: any) {
      toast.error(err.message || 'Failed to permanently delete batch');
    } finally {
      setBusyBatchId(null);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="text-center py-24 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-gray-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Admins only</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Only administrators can view and restore deleted records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-medium">
          Deleted records stay here for 30 days before being permanently purged — restore a whole batch at once, or
          expand it to manage individual records.
        </p>
        <button
          onClick={fetchTrash}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-800/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && batches.length === 0 && (
        <div className="text-center py-24 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Recycle bin is empty</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Deleted records will show up here for 30 days.</p>
          </div>
        </div>
      )}

      {!isLoading && batches.length > 0 && (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.batchId}
              className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                <button
                  onClick={() => setExpandedBatchId((prev) => (prev === batch.batchId ? null : batch.batchId))}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  aria-label="Expand batch"
                >
                  {expandedBatchId === batch.batchId ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 shrink-0">
                  <FileStack className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {batch.label || 'Deleted records'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {batch.count.toLocaleString()} record{batch.count === 1 ? '' : 's'} · deleted {formatDate(batch.deletedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestoreBatch(batch)}
                    disabled={busyBatchId === batch.batchId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${busyBatchId === batch.batchId ? 'animate-spin' : ''}`} />
                    Restore All
                  </button>
                  <button
                    onClick={() => handlePurgeBatch(batch)}
                    disabled={busyBatchId === batch.batchId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Delete Permanently
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedBatchId === batch.batchId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-100 dark:border-slate-800"
                  >
                    <BatchRecordList batch={batch} onRecordRestored={fetchTrash} onRecordPurged={fetchTrash} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {totalTrashedRecords > 0 && (
        <p className="text-center text-[11px] text-gray-400">
          {totalTrashedRecords.toLocaleString()} record(s) total in the recycle bin.
        </p>
      )}
    </div>
  );
}

function BatchRecordList({
  batch,
  onRecordRestored,
  onRecordPurged,
}: {
  batch: TrashBatch;
  onRecordRestored: () => void;
  onRecordPurged: () => void;
}) {
  const [records, setRecords] = useState<TrashRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/data/trash/batch/${batch.batchId}?limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRecords(Array.isArray(data.records) ? data.records : []);
      })
      .catch(() => toast.error('Failed to load records in this batch'))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [batch.batchId]);

  const handleRestoreOne = async (id: string, name: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/data/trash/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore');
      toast.success(`"${name}" restored`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      onRecordRestored();
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore record');
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeOne = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/data/trash/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to permanently delete');
      toast.success(`"${name}" permanently deleted`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      onRecordPurged();
    } catch (err: any) {
      toast.error(err.message || 'Failed to permanently delete record');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-xs text-gray-400">Loading records…</div>;
  }

  if (records.length === 0) {
    return <div className="p-4 text-center text-xs text-gray-400">No records to show.</div>;
  }

  return (
    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
      {records.map((r) => (
        <div key={r._id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-gray-800 dark:text-gray-200">{r.name || 'Unnamed'}</span>
            <span className="text-gray-400 ml-2 font-mono">{r.phone || ''}</span>
          </div>
          <button
            onClick={() => handleRestoreOne(r._id, r.name || r.phone || 'Record')}
            disabled={busyId === r._id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Restore
          </button>
          <button
            onClick={() => handlePurgeOne(r._id, r.name || r.phone || 'Record')}
            disabled={busyId === r._id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold disabled:opacity-50"
          >
            <XCircle className="w-3 h-3" /> Delete
          </button>
        </div>
      ))}
    </div>
  );
}
