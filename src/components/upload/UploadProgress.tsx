'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Loader2,
  Database,
  Sparkles,
  Layers,
  Zap,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Clock,
  Gauge,
  Shield,
  Activity,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 shadow-2xl overflow-hidden space-y-0 transition-all duration-300">
      {/* Top Telemetry Header & Pulse Indicator */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/30 ring-2 ring-brand-400/40">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                High-Speed Stream Telemetry
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {currentStage >= 5 ? 'Done' : 'Live Ingestion'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {filename ? `Processing "${filename}" via serverless micro-batches.` : 'Streaming records securely into MongoDB Atlas.'}
            </p>
          </div>
        </div>

        {/* Live Speed & Percentage HUD */}
        <div className="flex items-center gap-4 self-end sm:self-center">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tight bg-gradient-to-r from-brand-400 via-accent-300 to-emerald-400 bg-clip-text text-transparent">
                {percentage}%
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold block">
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
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Elapsed Time
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Metric 2: Live ETA */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Estimated ETA
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-amber-400 truncate block">
                {etaText}
              </span>
            </div>
          </div>

          {/* Metric 3: Processing Speed */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Throughput Speed
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {speed > 0 ? `~${speed.toLocaleString()} rows/s` : 'Buffering...'}
              </span>
            </div>
          </div>

          {/* Metric 4: Micro-Batch Counter */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Batch Pipeline
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-purple-600 dark:text-purple-400 truncate block">
                {totalChunks > 0 ? `Batch ${currentChunk} of ${totalChunks}` : 'Preparing...'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Glowing Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-slate-700 relative shadow-inner">
            <motion.div
              className="bg-gradient-to-r from-brand-600 via-accent-500 to-emerald-400 h-full rounded-full shadow-md relative overflow-hidden"
              initial={{ width: '2%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Shimmer pulse effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] w-full" />
            </motion.div>
          </div>

          {/* Realtime Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400 pt-1 font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-900">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                +{liveNewCount.toLocaleString()} New Records
              </span>

              {liveUpdatedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-900">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  {liveUpdatedCount.toLocaleString()} Merged
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
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
                className={`p-2.5 rounded-2xl border transition-all text-xs flex items-center space-x-2 ${
                  isDone
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : isCurrent
                    ? 'bg-brand-50/90 dark:bg-brand-950/50 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 shadow-sm ring-2 ring-brand-500/20'
                    : 'bg-gray-50/60 dark:bg-slate-800/40 border-gray-200/70 dark:border-slate-800/70 text-gray-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-slate-700 flex items-center justify-center text-[10px] shrink-0 font-semibold text-gray-400">
                    {s.stage}
                  </div>
                )}
                <span className="font-bold line-clamp-1 text-[11px]">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 💻 Embedded Live Detective Terminal Console */}
      <div className="border-t border-slate-800 bg-[#090d16] text-slate-200 font-mono">
        {/* Terminal Header Bar */}
        <div className="px-4 py-3 bg-[#0d1322] border-b border-slate-800/80 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block border border-rose-600/40"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block border border-amber-600/40"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block border border-emerald-600/40"></span>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 tracking-wide">
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              <span>MORPHEUS</span>
            </div>
          </div>

          {/* Terminal Controls */}
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Auto-scroll is Enabled' : 'Auto-scroll is Paused'}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                autoScroll
                  ? 'bg-brand-950/60 border-brand-800 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDown className={`w-3 h-3 ${autoScroll ? 'animate-bounce' : ''}`} />
              <span>Scroll</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLogs}
              title="Copy All Terminal Logs"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                title="Clear Terminal Logs"
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Terminal Screen / Log Feed */}
        <div className="p-4 h-60 overflow-y-auto space-y-1.5 text-[11px] sm:text-xs leading-relaxed custom-scrollbar font-mono">
          {logs.length === 0 ? (
            <div className="text-slate-500 py-6 text-center space-y-1">
              <p>&gt; Initializing stream ingestion channel...</p>
              <p className="text-[10px]">Awaiting micro-batch telemetry events from MongoDB Atlas stream...</p>
            </div>
          ) : (
            logs.map((log, idx) => {
              let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
              let textColor = 'text-slate-300';
              let icon = 'ℹ️';

              if (log.type === 'batch') {
                badgeColor = 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60';
                textColor = 'text-cyan-200';
                icon = '⚡';
              } else if (log.type === 'success') {
                badgeColor = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
                textColor = 'text-emerald-200';
                icon = '✅';
              } else if (log.type === 'warn') {
                badgeColor = 'bg-amber-950/70 text-amber-300 border-amber-800/60';
                textColor = 'text-amber-200';
                icon = '⚠️';
              } else if (log.type === 'error') {
                badgeColor = 'bg-rose-950/70 text-rose-300 border-rose-800/60';
                textColor = 'text-rose-200 font-bold';
                icon = '❌';
              }

              return (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-2.5 hover:bg-slate-800/40 px-1.5 py-0.5 rounded transition-colors group"
                >
                  <span className="text-slate-600 select-none text-[10px] w-6 shrink-0 text-right">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-slate-500 shrink-0 text-[10px] font-mono">
                    [{log.timestamp}]
                  </span>
                  <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase tracking-wider shrink-0 ${badgeColor}`}>
                    {log.type}
                  </span>
                  <div className={`flex-1 break-words ${textColor}`}>
                    <span>{log.message}</span>
                    {log.details && (
                      <span className="text-slate-400 text-[10px] ml-1.5 opacity-80 group-hover:opacity-100">
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
            <span className="text-slate-600 text-[10px] w-6 text-right">&gt;</span>
            <span className="w-2 h-4 bg-emerald-400 animate-[pulse_1s_infinite] inline-block"></span>
            {percentage < 100 ? (
              <span className="text-[10px] text-slate-500 italic">
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
