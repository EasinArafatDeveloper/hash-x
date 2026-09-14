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
  ShieldAlert,
  Smartphone,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthContext';
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

  // Stage: 'credentials' | '2fa'
  const [stage, setStage] = useState<'credentials' | '2fa'>('credentials');
  const [twoFactorPendingToken, setTwoFactorPendingToken] = useState<string | null>(null);
  const [authName, setAuthName] = useState<string>('');

  // Credentials State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
      setErrorMsg('Please enter both your username and password.');
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
        toast.info('Two-factor verification required');
      } else {
        toast.success('Signed in successfully. Welcome back!');
        router.push(callbackUrl);
        router.refresh();
      }
    } else {
      setErrorMsg(res.error || 'Invalid username or password.');
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
      toast.success('Identity verified. Access granted.');
      router.push(callbackUrl);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Verification failed: invalid security code.');
      toast.error(res.error || '2FA verification failed');
      setIsLoading(false);
    }
  };

  const handleTotpChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    setTotpCode(digitsOnly);
    if (digitsOnly.length === 6 && twoFactorPendingToken) {
      setErrorMsg(null);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-[#0a0a0b]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="p-7 sm:p-8 rounded-xl bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/10 shadow-card space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center">
              <MorpheusLogo variant="icon-only" size="lg" />
            </div>

            <AnimatePresence mode="wait">
              {stage === 'credentials' ? (
                <motion.div
                  key="header-cred"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1"
                >
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Sign in to your account
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter your credentials to continue
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="header-2fa"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-900/60 text-brand-700 dark:text-brand-300 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Two-Factor Verification
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Security Code Required
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Welcome <strong className="text-gray-800 dark:text-gray-200">{authName}</strong>! Enter your authenticator code.
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
                className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1">{errorMsg}</div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  aria-label="Dismiss error"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
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
              {/* Username Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                    className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Session */}
              <div className="flex items-center justify-between text-xs py-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In</span>
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
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    <span>6-Digit Authenticator Code</span>
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
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.5em] text-2xl font-semibold py-3.5 px-4 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 text-gray-900 dark:text-gray-100 transition-all"
                    />
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                    Open your <strong>Google Authenticator</strong> app and enter the 6-digit code.
                  </p>
                </div>
              ) : (
                /* Emergency Backup Code Input */
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" />
                    <span>Emergency Backup Recovery Code</span>
                  </label>
                  <input
                    ref={backupInputRef}
                    type="text"
                    value={backupCodeInput}
                    onChange={(e) => setBackupCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A8B2-9F41"
                    className="w-full text-center tracking-widest font-semibold text-base py-3 px-4 rounded-lg bg-amber-50/60 dark:bg-amber-500/5 border border-amber-300 dark:border-amber-900/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-amber-800 dark:text-amber-300 transition-all uppercase"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Enter one of your 8 single-use emergency recovery codes.
                  </p>
                </div>
              )}

              {/* Verify & Enter Button */}
              <button
                type="submit"
                disabled={isLoading || (!useBackupCode ? totpCode.length !== 6 : !backupCodeInput.trim())}
                className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-card flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Security Code</span>
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
                  className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  {useBackupCode ? 'Use Authenticator App Code' : 'Lost phone? Use Emergency Backup Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('credentials');
                    setTwoFactorPendingToken(null);
                    setErrorMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0b]">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
