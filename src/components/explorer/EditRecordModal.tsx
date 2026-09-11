'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Phone, Mail, MapPin, Tag, Hash, AlertCircle } from 'lucide-react';
import { IRecord } from '@/types';
import { toast } from 'sonner';

interface EditRecordModalProps {
  record: IRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: IRecord) => void;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending', 'Suspended'];

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-all';

export function EditRecordModal({ record, isOpen, onClose, onSaved }: EditRecordModalProps) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Other',
    status: 'Active',
    age: '',
    location: '',
    address: '',
    tags: '',
    orderAmount: '',
    orderCount: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when record changes
  useEffect(() => {
    if (record) {
      setForm({
        name: record.name || '',
        phone: record.phone || '',
        email: record.email || '',
        gender: record.gender || 'Other',
        status: record.status || 'Active',
        age: record.age ? String(record.age) : '',
        location: record.location || '',
        address: record.address || '',
        tags: record.tags?.join(', ') || '',
        orderAmount: record.orderAmount ? String(record.orderAmount) : '',
        orderCount: record.orderCount ? String(record.orderCount) : '',
      });
    }
  }, [record]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!record?._id) return;
    if (!form.name.trim()) {
      toast.error('নাম দেওয়া আবশ্যক।');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('ফোন নম্বর দেওয়া আবশ্যক।');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        gender: form.gender,
        status: form.status,
        location: form.location.trim(),
        address: form.address.trim(),
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (form.age) payload.age = parseInt(form.age, 10) || 0;
      if (form.orderAmount) payload.orderAmount = parseFloat(form.orderAmount) || 0;
      if (form.orderCount) payload.orderCount = parseInt(form.orderCount, 10) || 0;

      const res = await fetch(`/api/data/${record._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      toast.success(`"${form.name}" সফলভাবে আপডেট হয়েছে!`);
      onSaved(data.record as IRecord);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Update করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200/60 dark:border-slate-700/60 pointer-events-auto max-h-[90vh] flex flex-col overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-950/30 dark:to-purple-950/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">রেকর্ড এডিট করুন</h2>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{record?._id?.slice(-8)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 no-scrollbar">

                {/* Name + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="নাম" icon={User}>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="পূর্ণ নাম"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="ফোন" icon={Phone}>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="01xxxxxxxxx"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Email */}
                <Field label="ইমেইল" icon={Mail}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="email@example.com"
                    className={inputCls}
                  />
                </Field>

                {/* Gender + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="লিঙ্গ">
                    <select value={form.gender} onChange={set('gender')} className={inputCls}>
                      {GENDER_OPTIONS.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="স্ট্যাটাস">
                    <select value={form.status} onChange={set('status')} className={inputCls}>
                      {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Age + Order Amount + Order Count */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="বয়স" icon={Hash}>
                    <input
                      type="number"
                      value={form.age}
                      onChange={set('age')}
                      placeholder="25"
                      min="0"
                      max="120"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="মোট খরচ (৳)">
                    <input
                      type="number"
                      value={form.orderAmount}
                      onChange={set('orderAmount')}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="অর্ডার সংখ্যা">
                    <input
                      type="number"
                      value={form.orderCount}
                      onChange={set('orderCount')}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Location */}
                <Field label="এলাকা / শহর" icon={MapPin}>
                  <input
                    type="text"
                    value={form.location}
                    onChange={set('location')}
                    placeholder="Dhaka, Keraniganj..."
                    className={inputCls}
                  />
                </Field>

                {/* Address */}
                <Field label="পূর্ণ ঠিকানা" icon={MapPin}>
                  <textarea
                    value={form.address}
                    onChange={set('address')}
                    placeholder="বিস্তারিত ঠিকানা..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </Field>

                {/* Tags */}
                <Field label="ট্যাগ (কমা দিয়ে আলাদা করুন)" icon={Tag}>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={set('tags')}
                    placeholder="VIP Client, WhatsApp Active, Hot Leads"
                    className={inputCls}
                  />
                </Field>

                {/* Info note */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Custom fields (merchant, address details) এখানে edit করা যাবে না। এগুলো আপলোড করা ফাইলের মূল ডাটা।
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-700 hover:to-accent-600 rounded-xl shadow-md shadow-brand-500/25 transition-all disabled:opacity-60 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      সেভ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      সেভ করুন
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
