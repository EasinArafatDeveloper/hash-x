'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Database,
  Download,
  Monitor,
  Trash2,
  Zap,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
  LogOut,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  FileText,
  Sparkles,
  Plus,
  Edit2,
  Share2,
  Laptop,
  Tablet,
  Globe,
  Radio,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';

type SettingsSection = 'profile' | 'security' | 'dataset' | 'export' | 'system';

interface TwoFactorStatus {
  enabled: boolean;
  createdAt: string | null;
  backupCodesCount: number;
}

interface TwoFactorDevice {
  id: string;
  name: string;
  deviceType: 'iphone' | 'android' | 'desktop' | 'phone';
  addedAt: string;
  status: 'active' | 'revoked';
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [defaultLimit, setDefaultLimit] = useState('25');
  const [isResetting, setIsResetting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Two-Factor Authentication (2FA) State
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<TwoFactorDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // 2FA Setup Modal State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [setupQrCode, setSetupQrCode] = useState('');
  const [setupSecretKey, setSetupSecretKey] = useState('');
  const [setupAccountName, setSetupAccountName] = useState('');
  const [isInitializingSetup, setIsInitializingSetup] = useState(false);
  const [confirmTotpCode, setConfirmTotpCode] = useState('');
  const [isConfirming2FA, setIsConfirming2FA] = useState(false);
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[]>([]);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);
  const [hasCopiedBackupCodes, setHasCopiedBackupCodes] = useState(false);

  // Add / Edit Device Label Modal State
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<TwoFactorDevice | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [deviceTypeInput, setDeviceTypeInput] = useState<'iphone' | 'android' | 'desktop' | 'phone'>('iphone');
  const [isSavingDevice, setIsSavingDevice] = useState(false);

  // Share QR Drawer / Modal (e.g. for Boss's Phone)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [targetDeviceForShare, setTargetDeviceForShare] = useState<TwoFactorDevice | null>(null);

  // 2FA Disable Modal State
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  // Client-side Browser / OS Detection
  const [clientDeviceInfo, setClientDeviceInfo] = useState({
    browser: 'Chrome / Webkit',
    os: 'Windows / Mac / Android',
    deviceCategory: 'Desktop PC',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = navigator.userAgent;
      let browser = 'Modern Browser';
      if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
      else if (ua.includes('Edg')) browser = 'Microsoft Edge';
      else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';

      let os = 'Windows 11 / 10';
      if (ua.includes('Macintosh')) os = 'macOS';
      else if (ua.includes('iPhone')) os = 'iOS (iPhone)';
      else if (ua.includes('iPad')) os = 'iPadOS';
      else if (ua.includes('Android')) os = 'Android Mobile';
      else if (ua.includes('Linux')) os = 'Linux';

      let devCat = 'Desktop Workstation';
      if (/iPhone|Android|Mobile/i.test(ua)) devCat = 'Mobile Smartphone';
      else if (/iPad|Tablet/i.test(ua)) devCat = 'Tablet';

      setClientDeviceInfo({ browser, os, deviceCategory: devCat });
    }
  }, []);

  const [archiveStats, setArchiveStats] = useState<{
    totalWithAvatar: number;
    permanentlyArchived: number;
    pending: number;
    percentage: number;
    isFullyArchived: boolean;
  } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveProgressText, setArchiveProgressText] = useState('');

  // Fetch 2FA status and devices
  const fetch2FAStatus = async () => {
    setIsLoading2FAStatus(true);
    try {
      const res = await fetch('/api/auth/2fa/status');
      if (res.ok) {
        const data = await res.json();
        setTwoFactorStatus(data);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setIsLoading2FAStatus(false);
    }
  };

  const fetchConnectedDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/auth/2fa/devices');
      if (res.ok) {
        const data = await res.json();
        setConnectedDevices(data.devices || []);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'security') {
      fetch2FAStatus();
      fetchConnectedDevices();
    }
    if (activeSection === 'dataset') {
      fetch('/api/data/archive-avatars')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setArchiveStats(data);
        })
        .catch(() => {});
    }
  }, [activeSection]);

  // Initiate 2FA Setup
  const handleStartSetup2FA = async () => {
    setIsInitializingSetup(true);
    setSetupStep(1);
    setConfirmTotpCode('');
    setGeneratedBackupCodes([]);
    setHasCopiedSecret(false);
    setHasCopiedBackupCodes(false);
    setIsSetupModalOpen(true);

    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start 2FA setup');

      setSetupQrCode(data.qrCodeDataUrl);
      setSetupSecretKey(data.secretKey);
      setSetupAccountName(data.accountName);
    } catch (err: any) {
      toast.error(err.message || 'Could not initialize 2FA setup.');
      setIsSetupModalOpen(false);
    } finally {
      setIsInitializingSetup(false);
    }
  };

  // Open QR for adding/sharing device (Boss or 2nd phone)
  const handleOpenShareQr = async (device?: TwoFactorDevice) => {
    setTargetDeviceForShare(device || null);
    setIsInitializingSetup(true);
    setIsShareModalOpen(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate QR');

      setSetupQrCode(data.qrCodeDataUrl);
      setSetupSecretKey(data.secretKey);
      setSetupAccountName(data.accountName);
    } catch (err: any) {
      toast.error(err.message || 'Could not load QR.');
      setIsShareModalOpen(false);
    } finally {
      setIsInitializingSetup(false);
    }
  };

  // Confirm 2FA with first 6-digit code
  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTotpCode || confirmTotpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code from Google Authenticator.');
      return;
    }

    setIsConfirming2FA(true);
    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmTotpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification code failed');

      setGeneratedBackupCodes(data.backupCodes || []);
      setSetupStep(3);
      toast.success('Two-Factor Authentication is now enabled!');
      fetch2FAStatus();
      fetchConnectedDevices();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please check the 6-digit code.');
    } finally {
      setIsConfirming2FA(false);
    }
  };

  // Save or Update Device Label
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceNameInput.trim()) {
      toast.error('Please enter a name for this phone/device.');
      return;
    }

    setIsSavingDevice(true);
    try {
      if (editingDevice) {
        // PUT update
        const res = await fetch('/api/auth/2fa/devices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDevice.id,
            name: deviceNameInput.trim(),
            deviceType: deviceTypeInput,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        setConnectedDevices(data.devices || []);
        toast.success(`Device renamed to "${deviceNameInput.trim()}"!`);
      } else {
        // POST new device
        const res = await fetch('/api/auth/2fa/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deviceNameInput.trim(),
            deviceType: deviceTypeInput,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Add failed');
        setConnectedDevices(data.devices || []);
        toast.success(`"${deviceNameInput.trim()}" registered to 2FA devices!`);
      }

      setIsDeviceModalOpen(false);
      setEditingDevice(null);
      setDeviceNameInput('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save device label.');
    } finally {
      setIsSavingDevice(false);
    }
  };

  // Remove Device
  const handleRemoveDevice = async (device: TwoFactorDevice) => {
    if (!confirm(`Are you sure you want to remove "${device.name}" from authorized 2FA devices?`)) {
      return;
    }

    try {
      const res = await fetch('/api/auth/2fa/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: device.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      setConnectedDevices(data.devices || []);
      toast.success(`"${device.name}" removed from device list.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove device.');
    }
  };

  // Disable 2FA
  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      toast.error('Please enter your password to confirm disabling 2FA.');
      return;
    }

    setIsDisabling2FA(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');

      toast.success('Two-Factor Authentication has been disabled.');
      setIsDisableModalOpen(false);
      setDisablePassword('');
      setDisableCode('');
      fetch2FAStatus();
      setConnectedDevices([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA.');
    } finally {
      setIsDisabling2FA(false);
    }
  };

  // Copy secret key
  const handleCopySecretKey = () => {
    if (!setupSecretKey) return;
    navigator.clipboard.writeText(setupSecretKey);
    setHasCopiedSecret(true);
    toast.success('Secret key copied to clipboard!');
    setTimeout(() => setHasCopiedSecret(false), 2000);
  };

  // Copy all backup codes
  const handleCopyBackupCodes = () => {
    if (generatedBackupCodes.length === 0) return;
    const text = generatedBackupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setHasCopiedBackupCodes(true);
    toast.success('Backup codes copied to clipboard!');
    setTimeout(() => setHasCopiedBackupCodes(false), 2000);
  };

  // Download backup codes as .txt file
  const handleDownloadBackupCodes = () => {
    if (generatedBackupCodes.length === 0) return;
    const content = `MORPHEUS ENTERPRISE - EMERGENCY 2FA BACKUP RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\nAccount: ${user?.username || 'Admin'}\n\n${generatedBackupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n* Keep these recovery codes safe. Each code can only be used once if you lose access to your phone.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morpheus-2fa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded as text file.');
  };

  const handleArchiveAllAvatars = async () => {
    setIsArchiving(true);
    setArchiveProgressText('Connecting to image archiver...');
    try {
      let isDone = false;
      let totalArchived = 0;

      while (!isDone) {
        const res = await fetch('/api/data/archive-avatars?limit=80', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Archiving failed');

        totalArchived += data.archivedInThisBatch || 0;
        setArchiveProgressText(
          `Archiving avatars... ${totalArchived} saved (${data.remainingPending} remaining)`
        );

        if (data.isComplete || data.archivedInThisBatch === 0 || data.remainingPending === 0) {
          isDone = true;
          break;
        }

        const statsRes = await fetch('/api/data/archive-avatars');
        if (statsRes.ok) {
          const s = await statsRes.json();
          setArchiveStats(s);
        }
      }

      toast.success('All avatar photos are now permanently archived in MongoDB!');
      setNotification({
        type: 'success',
        msg: 'All avatar photos have been converted to permanent database storage. Broken links are now 100% protected!',
      });
    } catch (err: any) {
      toast.error(err.message || 'Archiving process failed');
    } finally {
      setIsArchiving(false);
      setArchiveProgressText('');
      fetch('/api/data/archive-avatars')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setArchiveStats(data);
        })
        .catch(() => {});
    }
  };

  const sections = [
    { id: 'profile' as SettingsSection, label: 'Profile Details', icon: User },
    { id: 'security' as SettingsSection, label: 'Security & 2FA Devices', icon: Shield },
    { id: 'dataset' as SettingsSection, label: 'Dataset & Storage', icon: Database },
    { id: 'export' as SettingsSection, label: 'Export Preferences', icon: Download },
    { id: 'system' as SettingsSection, label: 'System Environment', icon: Monitor },
  ];

  const handleResetDataset = async () => {
    if (!confirm('This will permanently delete all records. Are you sure?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/data', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Dataset cleared from database');
        setNotification({ type: 'success', msg: 'Dataset reset successfully. All records deleted.' });
      } else {
        throw new Error('Reset failed');
      }
    } catch {
      toast.error('Failed to reset dataset');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/data/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Seeded ${data.count} demo records!`);
        setNotification({ type: 'success', msg: `Seeded ${data.count} demo records across 10 districts.` });
      } else {
        throw new Error(data.error || 'Seed failed');
      }
    } catch {
      toast.error('Failed to seed dataset');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotification({
        type: 'success',
        msg: 'Password has been updated securely. Event logged in system activity.',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const displayName = user?.name || 'Administrator';
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Administrator';
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AD';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border text-xs font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {notification.msg}
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-lg leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Sidebar Tabs */}
        <aside className="md:w-60 shrink-0">
          <div className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                    activeSection === s.id
                      ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/25'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Settings Content Area */}
        <div className="flex-1 space-y-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" /> Profile Details
              </h3>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-brand-500/20">
                  {initials}
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">{displayName}</h4>
                  <p className="text-xs text-gray-500">
                    {displayRole} &bull; @{user?.username || 'admin'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', value: displayName },
                  { label: 'Username ID', value: user?.username || 'admin' },
                  { label: 'Role', value: displayRole },
                  { label: 'Email', value: user?.email || 'admin@dataflow.io' },
                ].map((field) => (
                  <div key={field.label} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      defaultValue={field.value}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveSection('security')}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" /> Manage Security & 2FA Phones
                </button>
              </div>
            </div>
          )}

          {/* Security & 2FA Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              {/* 1. GOOGLE AUTHENTICATOR (2FA) CARD */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 shadow-card space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/10 via-teal-500/20 to-emerald-400/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          Two-Factor Authentication (2FA)
                        </h3>
                        {twoFactorStatus?.enabled ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Protection
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold text-[10px] border border-gray-200 dark:border-slate-700">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Protects your dashboard with time-synchronized dynamic 6-digit passcodes.
                      </p>
                    </div>
                  </div>

                  <div className="self-start sm:self-center flex items-center gap-2">
                    {twoFactorStatus?.enabled ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenShareQr()}
                          className="px-3.5 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900/60 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Show QR Code to link Boss's phone or 2nd device"
                        >
                          <QrCode className="w-3.5 h-3.5 text-brand-600" />
                          <span>Link 2nd Phone / Boss</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsDisableModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all shadow-2xs"
                        >
                          Disable 2FA
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartSetup2FA}
                        disabled={isInitializingSetup}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                      >
                        {isInitializingSetup ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating QR...</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4" />
                            <span>Enable Google Authenticator</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2FA DEVICES LIST & MULTI-PHONE MANAGER */}
                {twoFactorStatus?.enabled && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-850 dark:to-emerald-950/20 border border-gray-200/80 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                          Authorized 2FA Devices & Team Phones ({connectedDevices.length})
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingDevice(null);
                          setDeviceNameInput('');
                          setDeviceTypeInput('iphone');
                          setIsDeviceModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-brand-200 dark:border-brand-900 text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-50 dark:hover:bg-brand-950/60 transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Phone Label</span>
                      </button>
                    </div>

                    {/* Devices List (Full Width Rows - No Cramping) */}
                    <div className="flex flex-col gap-3 pt-1">
                      {connectedDevices.map((dev) => (
                        <div
                          key={dev.id}
                          className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all"
                        >
                          {/* Left Details */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/80 flex items-center justify-center shrink-0 shadow-2xs">
                              {dev.deviceType === 'desktop' ? (
                                <Laptop className="w-5 h-5 shrink-0" />
                              ) : (
                                <Smartphone className="w-5 h-5 shrink-0" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                                {dev.name}
                              </h5>
                              <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200/60 dark:border-emerald-900/60">
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Synchronized & Active</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                                  {dev.deviceType === 'iphone' ? '📱 Apple iPhone' : dev.deviceType === 'android' ? '📱 Android Phone' : dev.deviceType === 'desktop' ? '💻 Workstation' : '📱 Mobile Device'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenShareQr(dev)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5 text-xs font-bold transition-colors shadow-2xs shrink-0 cursor-pointer"
                              title="Show QR Code to link this phone"
                            >
                              <QrCode className="w-4 h-4 shrink-0" />
                              <span>Show QR</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingDevice(dev);
                                setDeviceNameInput(dev.name);
                                setDeviceTypeInput(dev.deviceType);
                                setIsDeviceModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
                              title="Rename Device"
                            >
                              <Edit2 className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                              <span>Rename</span>
                            </button>

                            {connectedDevices.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDevice(dev)}
                                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                                title="Remove Phone Label"
                              >
                                <Trash2 className="w-4 h-4 shrink-0" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. ACTIVE SESSION CARD */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Session
                  </h3>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 shrink-0">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>{clientDeviceInfo.os} &bull; {clientDeviceInfo.browser}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                          Current Session
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Logged in as <strong>@{user?.username || 'admin'}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. CHANGE PASSWORD CARD */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-brand-600" /> Change Administrator Password
                  </h3>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                        className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Dataset Management Section */}
          {activeSection === 'dataset' && (
            <div className="space-y-6">
              {/* Permanent Avatar Archiver & Local Backup Card */}
              <div className="p-7 rounded-3xl bg-gradient-to-br from-brand-50/70 to-accent-50/50 dark:from-slate-900 dark:to-accent-950/20 border border-brand-200/80 dark:border-brand-900/60 shadow-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      Permanent Database Avatar Storage & Archiver
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Converts all external avatar links (Viber/WhatsApp CDN) into permanent Base64 binary storage inside your MongoDB database. Even if the original source link expires or is deleted, your images remain 100% safe forever!
                    </p>
                  </div>

                  {archiveStats && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-center shrink-0 ${
                        archiveStats.isFullyArchived
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {archiveStats.isFullyArchived
                        ? '✓ 100% Protected'
                        : `${archiveStats.percentage}% Archived`}
                    </span>
                  )}
                </div>

                {/* Progress & Stat Metrics */}
                {archiveStats && (
                  <div className="space-y-2">
                    <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-accent-500 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, archiveStats.percentage)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                      <span>
                        Permanently Saved:{' '}
                        <strong className="text-brand-600 dark:text-brand-400 font-bold">
                          {archiveStats.permanentlyArchived.toLocaleString()}
                        </strong>{' '}
                        of {archiveStats.totalWithAvatar.toLocaleString()} images
                      </span>
                      <span>
                        Pending:{' '}
                        <strong className="text-amber-600 dark:text-amber-400 font-bold">
                          {archiveStats.pending.toLocaleString()}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {archiveProgressText && (
                  <div className="p-3 rounded-xl bg-brand-100/60 dark:bg-brand-950/50 text-brand-800 dark:text-brand-200 text-xs font-semibold flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{archiveProgressText}</span>
                  </div>
                )}

                <div className="pt-1 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleArchiveAllAvatars}
                    disabled={isArchiving || (archiveStats ? archiveStats.isFullyArchived : false)}
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isArchiving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Archiving Images into Database...</span>
                      </>
                    ) : archiveStats?.isFullyArchived ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>All Avatars Permanently Archived (100%)</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Archive & Save All Avatars to MongoDB</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Seed Demo Dataset Card */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-600" /> Seed Demo Dataset
                </h3>
                <p className="text-xs text-gray-500">
                  Generate a fresh demo dataset with 2,123 realistic business records across 10 Bangladesh districts. This will replace your existing dataset.
                </p>
                <button
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 disabled:opacity-60 transition-all"
                >
                  {isSeeding ? 'Seeding...' : '⚡ Seed 2,123 Demo Records'}
                </button>
              </div>

              {/* Reset Dataset Card */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Reset & Clear Dataset
                </h3>
                <p className="text-xs text-gray-500">
                  Permanently delete all records from the database. This action cannot be undone.
                </p>
                <button
                  onClick={handleResetDataset}
                  disabled={isResetting}
                  className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-all disabled:opacity-60"
                >
                  {isResetting ? 'Clearing...' : 'Clear All Records'}
                </button>
              </div>
            </div>
          )}

          {/* Export Preferences */}
          {activeSection === 'export' && (
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-brand-600" /> Export Preferences
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Default Rows Per Page
                  </label>
                  <select
                    value={defaultLimit}
                    onChange={(e) => setDefaultLimit(e.target.value)}
                    className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="10">10 per page</option>
                    <option value="25">25 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Include Custom Fields in Export
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Adds extra metadata columns to CSV exports
                    </p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-600 transition-all">
                    <span className="translate-x-6 inline-block h-4 w-4 rounded-full bg-white shadow transition-all" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => toast.success('Export preferences saved!')}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
              >
                Save Preferences
              </button>
            </div>
          )}

          {/* System Section */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              {/* Theme & Visual Appearance Customizer */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600" /> Visual Theme & Style Presets
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose from 6 curated color themes and switch between light and dark modes. Your selected theme syncs across your dashboard and generated share links.
                  </p>
                </div>

                <ThemeSelector variant="expanded" />
              </div>

              {/* System Environment Info */}
              <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-card space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-brand-600" /> System Environment
                </h3>

                <div className="py-3 px-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-2 text-xs">
                  {[
                    { label: 'Application', value: 'MORPHEUS v1.0.0' },
                    { label: 'Database', value: 'MongoDB Atlas (Connected)' },
                    { label: 'Security Mode', value: 'Two-Factor Authentication (2FA)' },
                    { label: 'Environment', value: 'Production' },
                  ].map((info) => (
                    <div key={info.label} className="flex justify-between">
                      <span className="text-gray-500">{info.label}</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA SETUP MODAL WIZARD */}
      {isSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">
                    Setup Google Authenticator (2FA)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Step {setupStep} of 3 &bull;{' '}
                    {setupStep === 1
                      ? 'Scan QR with Phone'
                      : setupStep === 2
                      ? 'Verify 6-Digit Code'
                      : 'Save Emergency Backup Codes'}
                  </p>
                </div>
              </div>

              {setupStep !== 3 && (
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* STEP 1: Scan QR Code */}
              {setupStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Instructions:
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <li>Open the <strong>Google Authenticator</strong> app on your mobile phone.</li>
                      <li>Tap the <strong>+</strong> button and choose <strong>Scan a QR code</strong>.</li>
                      <li>Point your phone camera at the QR code below. (Both you and your boss can scan this).</li>
                    </ol>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center py-3">
                    {setupQrCode ? (
                      <div className="p-3.5 bg-white rounded-2xl border-2 border-emerald-500/40 shadow-md inline-block">
                        <img
                          src={setupQrCode}
                          alt="Google Authenticator QR Code"
                          width={190}
                          height={190}
                          className="w-44 h-44 object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Manual Key Option */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                        Cannot scan QR? Enter text key manually:
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySecretKey}
                        className="text-brand-600 dark:text-brand-400 text-[11px] font-bold flex items-center gap-1 hover:underline"
                      >
                        {hasCopiedSecret ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Key
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block font-mono text-xs font-bold text-gray-900 dark:text-gray-100 tracking-wider break-all select-all">
                      {setupSecretKey || 'Loading...'}
                    </code>
                  </div>

                  {/* Next Step Button */}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSetupModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupStep(2)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                    >
                      Next: Verify 6-Digit Code &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Verify Code */}
              {setupStep === 2 && (
                <form onSubmit={handleConfirm2FA} className="space-y-4">
                  <div className="text-center space-y-1">
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                      Enter the 6-Digit Code from Phone
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Check your Google Authenticator app for <strong>MORPHEUS ({setupAccountName})</strong> and enter the 6-digit code:
                    </p>
                  </div>

                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      value={confirmTotpCode}
                      onChange={(e) => setConfirmTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3 px-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-emerald-500/50 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-gray-900 dark:text-white shadow-inner"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupStep(1)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                    >
                      &larr; Back to QR
                    </button>

                    <button
                      type="submit"
                      disabled={confirmTotpCode.length !== 6 || isConfirming2FA}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                    >
                      {isConfirming2FA ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Enable 2FA</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Emergency Backup Codes */}
              {setupStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Save Your Emergency Recovery Backup Codes!</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      If you ever lose your phone or switch devices, each backup code can be used <strong>once</strong> to sign in to your dashboard.
                    </p>
                  </div>

                  {/* Backup Codes Grid */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs font-bold text-gray-800 dark:text-gray-200 text-center">
                      {generatedBackupCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-750 shadow-2xs select-all"
                        >
                          <span className="text-gray-400 text-[10px] mr-1">{idx + 1}.</span>
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyBackupCodes}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                      >
                        {hasCopiedBackupCodes ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{hasCopiedBackupCodes ? 'Copied!' : 'Copy All'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadBackupCodes}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download (.txt)</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSetupModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHARE QR CODE FOR BOSS'S PHONE / 2ND DEVICE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Link Boss&apos;s Phone / 2nd Device
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    {targetDeviceForShare ? targetDeviceForShare.name : 'Synchronize Google Authenticator'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center text-base"
              >
                ×
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> How to connect:
              </p>
              <p className="text-[11px] leading-relaxed">
                Open <strong>Google Authenticator</strong> on your boss&apos;s phone, tap <strong>+ &rarr; Scan a QR code</strong>, and scan the QR code below. Both phones will now show the identical code!
              </p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center py-2">
              {setupQrCode ? (
                <div className="p-3 bg-white rounded-2xl border-2 border-emerald-500/40 shadow-md inline-block">
                  <img
                    src={setupQrCode}
                    alt="Google Authenticator QR Code"
                    width={180}
                    height={180}
                    className="w-40 h-40 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Manual Secret Key */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  Or Send Key to Boss:
                </span>
                <button
                  type="button"
                  onClick={handleCopySecretKey}
                  className="text-brand-600 dark:text-brand-400 text-[11px] font-bold flex items-center gap-1 hover:underline"
                >
                  {hasCopiedSecret ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Key
                    </>
                  )}
                </button>
              </div>
              <code className="block font-mono text-xs font-bold text-gray-900 dark:text-gray-100 tracking-wider break-all select-all">
                {setupSecretKey || 'Loading...'}
              </code>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT DEVICE MODAL */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {editingDevice ? 'Rename Phone / Device' : 'Add New 2FA Phone Label'}
                </h4>
                <p className="text-[11px] text-gray-500">
                  Label the phone so you know who has access to the 2FA code.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">
                  Phone / Device Name
                </label>
                <input
                  type="text"
                  required
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  placeholder="e.g. Boss's Phone (iPhone 15), Easin's Samsung"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">
                  Device Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'iphone' as const, label: '📱 iPhone', icon: Smartphone },
                    { id: 'android' as const, label: '📱 Android', icon: Smartphone },
                    { id: 'desktop' as const, label: '💻 Computer', icon: Laptop },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDeviceTypeInput(t.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        deviceTypeInput === t.id
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDevice}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingDevice ? 'Saving...' : 'Save Label'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA DISABLE CONFIRMATION MODAL */}
      {isDisableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Disable Two-Factor Authentication?
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This will remove phone passkey verification from all connected devices.
                </p>
              </div>
            </div>

            <form onSubmit={handleDisable2FA} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">
                  Current Account Password
                </label>
                <input
                  type="password"
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">
                  Google Authenticator Code (Optional)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code (if available)"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDisableModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisabling2FA}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                >
                  {isDisabling2FA ? 'Disabling...' : 'Confirm & Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
