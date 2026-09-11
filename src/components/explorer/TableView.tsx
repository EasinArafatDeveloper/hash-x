'use client';

import React, { useState } from 'react';
import { IRecord } from '@/types';
import {
  Phone,
  Eye,
  ArrowUpDown,
  Calendar,
  Tag,
  Pencil,
  Trash2,
} from 'lucide-react';

interface TableViewProps {
  records: IRecord[];
  onSelectRecord: (record: IRecord) => void;
  onEditRecord?: (record: IRecord) => void;
  onDeleteRecord?: (record: IRecord) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
  isLoading?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
  Inactive: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-400 border-gray-200 dark:border-slate-700',
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  Suspended: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900',
};

function TableAvatar({ record }: { record: IRecord }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl =
    (record.avatarBase64 && record.avatarBase64.startsWith('data:image/'))
      ? record.avatarBase64
      : record._id
      ? `/api/avatar/${record._id}`
      : record.avatarUrl || (record.avatarType?.startsWith('http') ? record.avatarType : '');

  const initials = record.name
    ? record.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  if (avatarUrl && !imgError) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-1 ring-gray-200 dark:ring-slate-700 bg-gray-100 dark:bg-slate-800">
        <img
          src={avatarUrl}
          alt={record.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
      {initials}
    </div>
  );
}

function TableViewComponent({
  records,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  onSortChange,
  isLoading,
}: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r._id!).filter(Boolean));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-slate-800/50 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  checked={records.length > 0 && selectedIds.length === records.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th
                onClick={() => onSortChange && onSortChange('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-1">
                  <span>User / Name</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3.5 px-4">Number</th>
              <th
                onClick={() => onSortChange && onSortChange('age')}
                className="py-3.5 px-4 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center space-x-1">
                  <span>Age</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </div>
              </th>
              <th className="py-3.5 px-4">Gender</th>
              <th className="py-3.5 px-4">Avatar</th>
              <th className="py-3.5 px-4">Active Days</th>
              <th className="py-3.5 px-4">Last Online</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {records.map((record) => {
              const isChecked = selectedIds.includes(record._id!);
              const hasAvatar = !!(record.avatarUrl || (record.avatarType && record.avatarType !== 'Without Avatar' && !record.avatarType.startsWith('http')));

              return (
                <tr
                  key={record._id}
                  className={`hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    isChecked ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectRow(record._id!)}
                      className="rounded border-gray-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <TableAvatar record={record} />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                          {record.name}
                        </div>
                        {record.email && (
                          <div className="text-[11px] text-gray-400">{record.email}</div>
                        )}
                        {((record.tags && record.tags.length > 0) || record.category) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {record.tags && record.tags.length > 0 ? (
                              record.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/80 dark:border-brand-900/60"
                                >
                                  <Tag className="w-2.5 h-2.5 text-brand-500" />
                                  {tag}
                                </span>
                              ))
                            ) : record.category ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/80 dark:border-brand-900/60">
                                <Tag className="w-2.5 h-2.5 text-brand-500" />
                                {record.category}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-gray-800 dark:text-gray-200">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" /> {record.phone}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-semibold">
                    {record.age > 0 ? `${record.age} yrs` : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 font-medium">
                    {record.gender}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      hasAvatar
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 border-gray-200 dark:border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hasAvatar ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {hasAvatar ? 'With Photo' : 'No Photo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 font-medium">
                    {record.activeDays > 0 ? `≤ ${record.activeDays} days` : '0 days'}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {record.lastActive ? new Date(record.lastActive).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        STATUS_STYLES[record.status] || STATUS_STYLES.Active
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEditRecord && (
                        <button
                          type="button"
                          onClick={() => onEditRecord(record)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteRecord && (
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(record)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectRecord(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-brand-50 hover:text-brand-600 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const TableView = React.memo(TableViewComponent);
