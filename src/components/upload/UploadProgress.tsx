'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Loader2,
  Database,
  Sparkles,
  Layers,
  Terminal,
  Copy,
  Check,
  Clock,
  Gauge,
  Shield,
  Activity,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface StreamLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'batch';
  message: string;
  details?: string;
}

interface UploadProgressProps {
  currentStage: number; // 1 to 5
  processedRows?: number;
  totalRows?: number;
  currentChunk?: number;
  totalChunks?: number;
  liveNewCount?: number;
  liveUpdatedCount?: number;
  filename?: string;
  startTime?: number;
  logs?: StreamLogEntry[];
  onClearLogs?: () => void;
}

const STAGES = [
  { stage: 1, label: 'Initializing Session' },
  { stage: 2, label: 'Validating Schema' },
  { stage: 3, label: 'Micro-batch Streaming' },
  { stage: 4, label: 'Fast MongoDB Indexing' },
  { stage: 5, label: 'Dataset Ready' },
];

export function UploadProgress({
  currentStage,
  processedRows = 0,
  totalRows = 0,
  currentChunk = 0,
  totalChunks = 0,
  liveNewCount = 0,
  liveUpdatedCount = 0,
  filename,
  startTime = 0,
  logs = [],
  onClearLogs,
}: UploadProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (!startTime || currentStage >= 5) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
    }, 500);
    return () => clearInterval(interval);
  }, [startTime, currentStage]);

  // Terminal Auto-scroll
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs, autoScroll]);

  // Format elapsed time string
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}s`;
  };

  // Calculate accurate progress percentage
  let percentage = 0;
  if (currentStage >= 5) {
    percentage = 100;
  } else if (totalRows > 0 && processedRows > 0) {
    percentage = Math.min(99, Math.max(3, Math.round((processedRows / totalRows) * 100)));
  } else {
    percentage = Math.min(Math.round((currentStage / 5) * 100), 20);
  }

  // Calculate live ingestion speed (rows / sec)
  const speed = elapsedSeconds > 0 && processedRows > 0
    ? Math.round(processedRows / elapsedSeconds)
    : 0;

  // Calculate ETA remaining
  let etaText = 'Calculating...';
  if (currentStage >= 5) {
    etaText = 'Completed';
  } else if (currentStage === 4) {
    etaText = 'Finalizing indexes (~2s)';
  } else if (speed > 0 && totalRows > processedRows) {
    const remainingRows = totalRows - processedRows;
    const remainingSeconds = Math.ceil(remainingRows / speed);
    if (remainingSeconds < 60) {
      etaText = `~${remainingSeconds}s remaining`;
    } else {
      const remMins = Math.floor(remainingSeconds / 60);
      const remSecs = remainingSeconds % 60;
      etaText = `~${remMins}m ${remSecs}s remaining`;
    }
  } else if (currentStage === 1 || currentStage === 2) {
    etaText = 'Estimating pipeline...';
  }

  const handleCopyLogs = () => {
    const formatted = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.details || ''}`)
      .join('\n');
    navigator.clipboard.writeText(formatted || 'No logs recorded');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden space-y-0">
      {/* Top Telemetry Header */}
      <div className="p-5 sm:p-6 bg-gray-900 dark:bg-black/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-900" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-white">
                High-Speed Stream Telemetry
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {currentStage >= 5 ? 'Done' : 'Live Ingestion'}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5 font-medium">
              {filename ? `Processing "${filename}" via serverless micro-batches.` : 'Streaming records securely into MongoDB Atlas.'}
            </p>
          </div>
        </div>

        {/* Live Speed & Percentage HUD */}
        <div className="flex items-center gap-4 self-end sm:self-center">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-3xl font-bold font-mono tracking-tight text-white">
                {percentage}%
              </span>
            </div>
            <span className="text-[11px] font-mono text-white/60 font-semibold block">
              {processedRows.toLocaleString()} / {totalRows.toLocaleString()} rows
            </span>
          </div>
        </div>
      </div>

      {/* Main HUD Metrics & Progress Section */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* 4-Metric Live Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Metric 1: Elapsed Time */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 block">
                Elapsed Time
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Metric 2: Live ETA */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 block">
                Estimated ETA
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-amber-400 truncate block">
                {etaText}
              </span>
            </div>
          </div>

          {/* Metric 3: Processing Speed */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 block">
                Throughput Speed
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {speed > 0 ? `~${speed.toLocaleString()} rows/s` : 'Buffering...'}
              </span>
            </div>
          </div>

          {/* Metric 4: Micro-Batch Counter */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400 block">
                Batch Pipeline
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-violet-600 dark:text-violet-400 truncate block">
                {totalChunks > 0 ? `Batch ${currentChunk} of ${totalChunks}` : 'Preparing...'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-100 dark:bg-white/5 h-3 rounded-full overflow-hidden border border-gray-200 dark:border-white/10">
            <motion.div
              className="bg-brand-600 h-full rounded-full"
              initial={{ width: '2%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Realtime Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400 pt-1 font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-900/60">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                +{liveNewCount.toLocaleString()} New Records
              </span>

              {liveUpdatedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-900/60">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  {liveUpdatedCount.toLocaleString()} Merged
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span>{percentage < 100 ? 'Active Stream Pipeline' : 'Stream Completed 100%'}</span>
            </div>
          </div>
        </div>

        {/* 5-Stage Checklist Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
          {STAGES.map((s) => {
            const isDone = currentStage > s.stage || currentStage === 5;
            const isCurrent = currentStage === s.stage && currentStage < 5;

            return (
              <div
                key={s.stage}
                className={`p-2.5 rounded-xl border transition-colors text-xs flex items-center space-x-2 ${
                  isDone
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300'
                    : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/10 text-gray-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-brand-600 dark:text-brand-400 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-white/20 flex items-center justify-center text-[10px] shrink-0 font-semibold text-gray-400">
                    {s.stage}
                  </div>
                )}
                <span className="font-semibold line-clamp-1 text-[11px]">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded Live Ingestion Terminal Console */}
      <div className="border-t border-gray-200 dark:border-white/10 bg-gray-900 dark:bg-black/40 text-gray-200 font-mono">
        {/* Terminal Header Bar */}
        <div className="px-4 py-3 bg-black/20 border-b border-white/10 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block" />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-300 tracking-wide">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              <span>INGESTION LOG</span>
            </div>
          </div>

          {/* Terminal Controls */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Auto-scroll is Enabled' : 'Auto-scroll is Paused'}
              className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                autoScroll
                  ? 'bg-brand-500/10 border-brand-800 text-brand-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>Scroll</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLogs}
              title="Copy All Terminal Logs"
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                title="Clear Terminal Logs"
                className="px-2 py-1 rounded-md bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-800 text-gray-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Terminal Screen / Log Feed */}
        <div className="p-4 h-60 overflow-y-auto space-y-1.5 text-[11px] sm:text-xs leading-relaxed font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-500 py-6 text-center space-y-1">
              <p>&gt; Initializing stream ingestion channel...</p>
              <p className="text-[10px]">Awaiting micro-batch telemetry events from MongoDB Atlas stream...</p>
            </div>
          ) : (
            logs.map((log, idx) => {
              let badgeColor = 'bg-white/5 text-gray-300 border-white/10';
              let textColor = 'text-gray-300';

              if (log.type === 'batch') {
                badgeColor = 'bg-cyan-500/10 text-cyan-300 border-cyan-800/50';
                textColor = 'text-cyan-200';
              } else if (log.type === 'success') {
                badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-800/50';
                textColor = 'text-emerald-200';
              } else if (log.type === 'warn') {
                badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-800/50';
                textColor = 'text-amber-200';
              } else if (log.type === 'error') {
                badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-800/50';
                textColor = 'text-rose-200 font-bold';
              }

              return (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-2.5 hover:bg-white/5 px-1.5 py-0.5 rounded transition-colors group"
                >
                  <span className="text-gray-600 select-none text-[10px] w-6 shrink-0 text-right">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-gray-500 shrink-0 text-[10px] font-mono">
                    [{log.timestamp}]
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 ${badgeColor}`}>
                    {log.type}
                  </span>
                  <div className={`flex-1 break-words ${textColor}`}>
                    <span>{log.message}</span>
                    {log.details && (
                      <span className="text-gray-400 text-[10px] ml-1.5 opacity-80 group-hover:opacity-100">
                        {log.details}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Terminal Blinking Active Cursor Line */}
          <div className="flex items-center gap-2 pt-1 text-emerald-400 select-none">
            <span className="text-gray-600 text-[10px] w-6 text-right">&gt;</span>
            <span className="w-2 h-4 bg-emerald-400 animate-pulse inline-block" />
            {percentage < 100 ? (
              <span className="text-[10px] text-gray-500 italic">
                Listening to MongoDB stream ingestion pipeline...
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400/80 font-bold">
                Session finalized. Ready for queries and data filtering.
              </span>
            )}
          </div>

          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
