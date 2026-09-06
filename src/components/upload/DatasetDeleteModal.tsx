'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Flame,
  Clock,
  Gauge,
  Layers,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { IDatasetSummary } from '@/types';

interface DatasetDeleteModalProps {
  dataset: IDatasetSummary | null;
  onClose: () => void;
  onDeleted: () => void;
}

interface DeleteLog {
  id: string;
  time: string;
  type: 'info' | 'batch' | 'success' | 'warn';
  message: string;
}

const BATCH_SIZE = 10000; // 10,000 records per micro-batch deletion

export function DatasetDeleteModal({
  dataset,
  onClose,
  onDeleted,
}: DatasetDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [initialTotalRecords, setInitialTotalRecords] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [remainingCount, setRemainingCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [logs, setLogs] = useState<DeleteLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dataset) {
      const total = dataset.totalRecords || dataset.liveRecordsCount || dataset.newRecordsCount || 0;
      setInitialTotalRecords(total);
      setRemainingCount(total);
      setDeletedCount(0);
      const estBatches = Math.max(1, Math.ceil(total / BATCH_SIZE));
      setTotalBatches(estBatches);
      setIsDeleting(false);
      setIsCompleted(false);
      setElapsedSeconds(0);
      setLogs([]);
    }
  }, [dataset]);

  // Elapsed time timer
  useEffect(() => {
    if (!isDeleting || isCompleted || !startTime) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 500);
    return () => clearInterval(interval);
  }, [isDeleting, isCompleted, startTime]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs]);

  const addLog = (type: DeleteLog['type'], message: string) => {
    const now = new Date();
    const time =
      now.toTimeString().split(' ')[0] +
      '.' +
      String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, time, type, message }]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}s`;
  };

  const handleStartDelete = async () => {
    if (!dataset?._id) return;

    setIsDeleting(true);
    const start = Date.now();
    setStartTime(start);

    const total = initialTotalRecords || 1;
    let accumulatedDeleted = 0;
    let batchIndex = 0;

    addLog('info', `🛑 Initiated live purging pipeline for "${dataset.filename}" (${total.toLocaleString()} records)`);

    try {
      let isDone = false;

      while (!isDone) {
        batchIndex += 1;
        setCurrentBatch(batchIndex);
        const batchStartTime = Date.now();

        const res = await fetch('/api/data/datasets/delete-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetId: dataset._id,
            batchSize: BATCH_SIZE,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Batch ${batchIndex} deletion failed`);
        }

        const data = await res.json();
        const batchDuration = Date.now() - batchStartTime;
        const deletedInThis = data.deletedInBatch || 0;
        accumulatedDeleted += deletedInThis;
        const remaining = data.remainingRecords || 0;

        const effectiveTotal = Math.max(total, accumulatedDeleted + remaining);
        setInitialTotalRecords(effectiveTotal);
        setDeletedCount(accumulatedDeleted);
        setRemainingCount(remaining);

        const batchSpeed = Math.round(deletedInThis / (batchDuration / 1000 || 0.001));

        addLog(
          'batch',
          `⚡ Batch ${batchIndex}: Purged ${deletedInThis.toLocaleString()} records in ${batchDuration}ms [${batchSpeed.toLocaleString()} rows/s]`
        );

        if (data.isCompleted || remaining === 0) {
          isDone = true;
          break;
        }

        // Small micro-yield so UI updates silky smooth
        await new Promise((r) => setTimeout(r, 60));
      }

      // Completed
      const totalTime = ((Date.now() - start) / 1000).toFixed(1);
      addLog('success', `🎉 Purge Complete: All records & dataset metadata removed in ${totalTime}s!`);
      setDeletedCount(total);
      setRemainingCount(0);
      setIsCompleted(true);

      toast.success(`Deleted "${dataset.filename}" and its records successfully!`);

      setTimeout(() => {
        onDeleted();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Delete error:', err);
      addLog('warn', `❌ Deletion error: ${err.message || 'Failed to complete purge'}`);
      toast.error(err.message || 'Deletion failed. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!dataset) return null;

  // Percentage calculations
  const total = initialTotalRecords || 1;
  const percentage = isCompleted
    ? 100
    : Math.min(99, Math.max(isDeleting ? 5 : 0, Math.round((deletedCount / total) * 100)));

  // Live speed
  const speed = elapsedSeconds > 0 && deletedCount > 0
    ? Math.round(deletedCount / elapsedSeconds)
    : 0;

  // ETA calculation
  let etaText = 'Estimating...';
  if (isCompleted) {
    etaText = 'Completed';
  } else if (speed > 0 && remainingCount > 0) {
    const remSecs = Math.ceil(remainingCount / speed);
    etaText = remSecs < 60 ? `~${remSecs}s remaining` : `~${Math.ceil(remSecs / 60)}m remaining`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isDeleting && onClose()}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      {/* Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Bar */}
        <div className="p-5 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                {isDeleting ? 'Live Dataset Purging Pipeline' : 'Delete File & Remove Data?'}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {isDeleting
                  ? `Purging "${dataset.filename}" in high-concurrency micro-batches`
                  : 'Permanently remove dataset and its associated contacts'}
              </p>
            </div>
          </div>

          {!isDeleting && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {!isDeleting ? (
            /* Confirmation State */
            <div className="space-y-4">
              {/* Target File Summary Card */}
              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {dataset.filename}
                  </span>
                  <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-sm">
                    {initialTotalRecords.toLocaleString()} records
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 pt-0.5 font-mono">
                  <span>Size: <strong>{dataset.fileSize || 'Unknown'}</strong></span>
                  <span>•</span>
                  <span>
                    Uploaded:{' '}
                    {dataset.uploadedAt
                      ? new Date(dataset.uploadedAt).toLocaleDateString()
                      : 'Recently'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  <strong>Permanent Action:</strong> Deleting this file will live-purge all{' '}
                  <strong>{initialTotalRecords.toLocaleString()}</strong> contacts from MongoDB Atlas and instantly recalculate system statistics.
                </p>
              </div>
            </div>
          ) : (
            /* Live Deleting Telemetry State */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* 4-Metric Live Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Metric 1: Elapsed */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">
                      Elapsed
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      {formatTime(elapsedSeconds)}
                    </span>
                  </div>
                </div>

                {/* Metric 2: Live ETA */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">
                      ETA Left
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate block">
                      {etaText}
                    </span>
                  </div>
                </div>

                {/* Metric 3: Speed */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">
                      Speed
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {speed > 0 ? `~${speed.toLocaleString()} /s` : 'Purging...'}
                    </span>
                  </div>
                </div>

                {/* Metric 4: Remaining Records */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">
                      Remaining
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 truncate block">
                      {remainingCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Badges */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 animate-bounce" />
                    Deleted {deletedCount.toLocaleString()} of {total.toLocaleString()} records
                  </span>
                  <span className="text-sm font-black font-mono bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">
                    {percentage}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-slate-700 relative shadow-inner">
                  <motion.div
                    className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 h-full rounded-full shadow-md"
                    initial={{ width: '2%' }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Mini Deletion Telemetry Logs Window */}
              <div className="rounded-2xl border border-slate-800 bg-[#090d16] text-slate-200 font-mono overflow-hidden">
                <div className="px-3 py-2 bg-[#0d1322] border-b border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-2 font-bold">
                    <Terminal className="w-3 h-3 text-rose-400" />
                    <span>PURGE TELEMETRY FEED</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 font-bold border border-rose-900/60">
                    LIVE
                  </span>
                </div>

                <div className="p-3 h-32 overflow-y-auto space-y-1 text-[11px] leading-relaxed custom-scrollbar">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-slate-500 text-[10px] shrink-0">[{log.time}]</span>
                      <span
                        className={`flex-1 break-words ${
                          log.type === 'batch'
                            ? 'text-rose-300'
                            : log.type === 'success'
                            ? 'text-emerald-300 font-bold'
                            : log.type === 'warn'
                            ? 'text-amber-300 font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3">
          {!isDeleting ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete File & Live Purge Data</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>{isCompleted ? 'Purge Finished Successfully' : 'Purging Database Stream...'}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
