'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  ShieldAlert,
  Smartphone,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { MorpheusLogo } from '@/components/brand/MorpheusLogo';
import { toast } from 'sonner';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl') || '/dashboard';
  const callbackUrl =
    rawCallback.startsWith('/') && !rawCallback.startsWith('//') && !rawCallback.includes(':')
      ? rawCallback
      : '/dashboard';
  const { login, verify2FA } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Stage: 'credentials' | '2fa'
  const [stage, setStage] = useState<'credentials' | '2fa'>('credentials');
  const [twoFactorPendingToken, setTwoFactorPendingToken] = useState<string | null>(null);
  const [authName, setAuthName] = useState<string>('');

  // Credentials State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA Challenge State
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totpInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === '2fa') {
      if (useBackupCode) {
        backupInputRef.current?.focus();
      } else {
        totpInputRef.current?.focus();
      }
    }
  }, [stage, useBackupCode]);

  // Step 1: Submit Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both your Username and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const res = await login(username.trim(), password);

    if (res.success) {
      if (res.requires2FA && res.twoFactorPendingToken) {
        setTwoFactorPendingToken(res.twoFactorPendingToken);
        setAuthName(res.name || res.username || 'Admin');
        setStage('2fa');
        setTotpCode('');
        setIsLoading(false);
        toast.info('Google Authenticator verification required');
      } else {
        toast.success('Authentication successful! Welcome back.');
        router.push(callbackUrl);
        router.refresh();
      }
    } else {
      setErrorMsg(res.error || 'Authentication failed. Please check your credentials.');
      toast.error(res.error || 'Login failed');
      setIsLoading(false);
    }
  };

  // Step 2: Submit 2FA Code
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorPendingToken) {
      setStage('credentials');
      setErrorMsg('2FA session expired. Please log in again.');
      return;
    }

    const codeToVerify = useBackupCode ? backupCodeInput.trim() : totpCode.trim();

    if (!codeToVerify) {
      setErrorMsg(
        useBackupCode
          ? 'Please enter your 8-character backup recovery code.'
          : 'Please enter the 6-digit code from Google Authenticator.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const res = await verify2FA(twoFactorPendingToken, codeToVerify, useBackupCode);

    if (res.success) {
      toast.success('Two-factor verification successful! Access granted.');
      router.push(callbackUrl);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Invalid verification code. Please check and try again.');
      toast.error(res.error || '2FA verification failed');
      setIsLoading(false);
    }
  };

  // Auto-submit 2FA when 6 digits are typed in standard TOTP mode
  const handleTotpChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setTotpCode(digitsOnly);
    if (digitsOnly.length === 6 && twoFactorPendingToken) {
      setErrorMsg(null);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#F8FAFC] dark:bg-[#080C14] transition-colors duration-300">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[15%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-brand-600/25 to-accent-500/25 blur-[130px] dark:from-brand-600/20 dark:to-accent-500/20" />
        <div className="absolute -bottom-[25%] -right-[15%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-accent-600/25 to-brand-500/25 blur-[130px] dark:from-accent-600/20 dark:to-brand-500/20" />
        {/* Subtle grid mesh overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Top Bar: Theme Switcher */}
      <header className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-8 flex items-center justify-end z-10 max-w-6xl mx-auto">
        <ThemeSelector variant="compact" />
      </header>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] relative z-10"
      >
        <div className="p-7 sm:p-9 rounded-3xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-gray-200/90 dark:border-slate-800/90 shadow-2xl shadow-gray-200/50 dark:shadow-black/50 space-y-6">
          {/* Brand & Security Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center py-2 px-4 rounded-2xl bg-gradient-to-tr from-brand-600/10 via-indigo-500/10 to-brand-400/10 border border-brand-500/20 shadow-inner">
              <MorpheusLogo variant="full" size="lg" />
            </div>

            <AnimatePresence mode="wait">
              {stage === 'credentials' ? (
                <motion.div
                  key="header-cred"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Secure Dashboard Login
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your authorized credentials to access Morpheus
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="header-2fa"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Two-Factor Authentication
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Device Verification
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Welcome <strong className="text-gray-900 dark:text-white">{authName}</strong>! Enter code from your Google Authenticator app.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Message Box */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 font-medium"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-base leading-none opacity-60 hover:opacity-100 font-bold"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* STAGE 1: Credentials Form */}
          {stage === 'credentials' && (
            <motion.form
              key="credentials-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleCredentialsSubmit}
              className="space-y-4"
            >
              {/* Username / ID Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Username or Email ID</span>
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Password</span>
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl bg-gray-50/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Check note & Remember Me */}
              <div className="flex items-center justify-between text-xs py-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span>Remember session for 7 days</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white font-bold text-sm shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all hover:shadow-brand-600/40 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* STAGE 2: Two-Factor Authentication Challenge Form */}
          {stage === '2fa' && (
            <motion.form
              key="2fa-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handle2FASubmit}
              className="space-y-5"
            >
              {!useBackupCode ? (
                /* 6-Digit Google Authenticator Code Input */
                <div className="space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                    <Smartphone className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>6-Digit Google Authenticator Code</span>
                  </div>

                  <div className="relative">
                    <input
                      ref={totpInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => handleTotpChange(e.target.value)}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3.5 px-4 rounded-2xl bg-gray-50/90 dark:bg-slate-800/90 border-2 border-brand-500/40 focus:border-brand-600 dark:focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/20 text-gray-900 dark:text-white transition-all shadow-inner"
                    />
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                    Open your <strong>Google Authenticator</strong> app and enter the current 6-digit code for DATAFLOW.
                  </p>
                </div>
              ) : (
                /* Emergency Backup Code Input */
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Emergency Backup Recovery Code</span>
                  </label>
                  <input
                    ref={backupInputRef}
                    type="text"
                    value={backupCodeInput}
                    onChange={(e) => setBackupCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A8B2-9F41"
                    className="w-full text-center tracking-widest font-mono text-base font-bold py-3 px-4 rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-amber-500/40 focus:border-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-500/20 text-gray-900 dark:text-white transition-all uppercase"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Use one of the 8 single-use recovery codes generated when you enabled 2FA.
                  </p>
                </div>
              )}

              {/* Verify & Enter Button */}
              <button
                type="submit"
                disabled={isLoading || (!useBackupCode ? totpCode.length !== 6 : !backupCodeInput.trim())}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:shadow-emerald-600/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying 2FA Security Token...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Access Dashboard</span>
                  </>
                )}
              </button>

              {/* Toggle Alternative Options & Back to Login */}
              <div className="pt-2 flex flex-col items-center gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setErrorMsg(null);
                  }}
                  className="text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                >
                  {useBackupCode ? 'Use Google Authenticator App Code' : 'Lost your phone? Use Emergency Backup Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('credentials');
                    setTwoFactorPendingToken(null);
                    setErrorMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Credentials Login</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Clean Minimalist Footer */}
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800/80 flex items-center justify-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            <span>MORPHEUS &bull; Enterprise Data Management Platform</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#080C14]">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
