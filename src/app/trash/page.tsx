'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthContext';

interface TrashedRecord {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  orderCount?: number;
  orderAmount?: number;
  deletedAt: string;
}

export default function TrashPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TrashedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data/trash?limit=100');
      if (!res.ok) throw new Error('Failed to load recycle bin');
      const data = await res.json();
      setRecords(Array.isArray(data.records) ? data.records : []);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load recycle bin');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id: string, name: string) => {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/data/trash/${id}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore');
      toast.success(`"${name}" restored successfully`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore record');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
          Deleted records stay here for 30 days before being permanently purged — restore anything deleted by mistake.
        </p>
        <button
          onClick={fetchTrash}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
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

      {!isLoading && records.length === 0 && (
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

      {!isLoading && records.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800">
                <th className="py-3.5 px-5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="py-3.5 px-5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                <th className="py-3.5 px-5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Deleted</th>
                <th className="py-3.5 px-5 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {records.map((r, idx) => (
                <motion.tr
                  key={r._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 px-5 font-semibold text-gray-900 dark:text-gray-100">{r.name || 'Unnamed'}</td>
                  <td className="py-4 px-5 hidden sm:table-cell font-mono text-gray-600 dark:text-gray-400">{r.phone || '—'}</td>
                  <td className="py-4 px-5 hidden md:table-cell text-gray-500 dark:text-gray-400">{formatDate(r.deletedAt)}</td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => handleRestore(r._id, r.name || r.phone || 'Record')}
                      disabled={restoringId === r._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${restoringId === r._id ? 'animate-spin' : ''}`} />
                      Restore
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > records.length && !isLoading && (
        <p className="text-center text-[11px] text-gray-400">
          Showing {records.length} of {total.toLocaleString()} deleted records.
        </p>
      )}
    </div>
  );
}
