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
  Terminal,
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
      setErrorMsg('Please enter both your Operator Username and Password.');
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
        toast.info('Google Authenticator 2FA verification required');
      } else {
        toast.success('Matrix Access Granted! Welcome to Morpheus.');
        router.push(callbackUrl);
        router.refresh();
      }
    } else {
      setErrorMsg(res.error || 'Access Denied: Invalid credentials.');
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
      toast.success('Identity Verified: Access to Morpheus Granted.');
      router.push(callbackUrl);
      router.refresh();
    } else {
      setErrorMsg(res.error || 'Verification Failed: Invalid security code.');
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
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-black select-none">
      {/* 🌟 Morpheus Matrix HD Natural Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
        style={{ backgroundImage: `url('/morpheus-matrix-bg.jpg')` }}
      />

      {/* Subtle Gentle Darkening for Card Readability (Natural & Clear) */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Main Glassmorphic Terminal Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="relative p-7 sm:p-9 rounded-3xl bg-[#070D18]/90 backdrop-blur-2xl border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.18)] space-y-6 overflow-hidden">
          {/* Subtle Cyberpunk Neon Top Border Line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10B981]" />

          {/* Brand Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center py-2 px-4 rounded-2xl bg-black/70 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <MorpheusLogo variant="full" size="lg" textColor="white" />
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
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                    <span>System Authentication</span>
                  </h1>
                  <p className="text-xs text-emerald-400/80 font-mono flex items-center justify-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enter operator credentials to initiate session</span>
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 2FA Device Verification
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Security Token Challenge
                  </h1>
                  <p className="text-xs text-slate-400 font-mono">
                    Welcome <strong className="text-emerald-400">{authName}</strong>! Enter your Authenticator code.
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
                className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5 font-mono shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
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
              {/* Username Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-[11px] font-bold text-emerald-400/90 font-mono uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Operator ID / Username</span>
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 group-focus-within:text-emerald-400 transition-colors">
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
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-black/60 border border-emerald-900/60 focus:border-emerald-400 text-sm font-mono text-emerald-100 placeholder-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-[11px] font-bold text-emerald-400/90 font-mono uppercase tracking-wider flex items-center justify-between"
                >
                  <span>Access Key / Password</span>
                </label>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600 group-focus-within:text-emerald-400 transition-colors">
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
                    className="w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl bg-black/60 border border-emerald-900/60 focus:border-emerald-400 text-sm font-mono text-emerald-100 placeholder-emerald-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-600 hover:text-emerald-400 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Session */}
              <div className="flex items-center justify-between text-xs py-1">
                <label className="flex items-center gap-2 cursor-pointer text-emerald-400/70 font-mono select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-black border-emerald-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Keep session authenticated</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Decrypting Access...</span>
                  </div>
                ) : (
                  <>
                    <span>Enter The Matrix</span>
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
                  <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-emerald-400">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
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
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3.5 px-4 rounded-2xl bg-black/70 border-2 border-emerald-500/50 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 text-emerald-300 transition-all shadow-inner"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono pt-1">
                    Open your <strong>Google Authenticator</strong> app and enter the 6-digit code for MORPHEUS.
                  </p>
                </div>
              ) : (
                /* Emergency Backup Code Input */
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Emergency Backup Recovery Code</span>
                  </label>
                  <input
                    ref={backupInputRef}
                    type="text"
                    value={backupCodeInput}
                    onChange={(e) => setBackupCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A8B2-9F41"
                    className="w-full text-center tracking-widest font-mono text-base font-bold py-3 px-4 rounded-2xl bg-black/70 border-2 border-amber-500/50 focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/20 text-amber-300 transition-all uppercase"
                  />
                  <p className="text-[11px] text-slate-400 font-mono">
                    Enter one of your 8 single-use emergency recovery codes.
                  </p>
                </div>
              )}

              {/* Verify & Enter Button */}
              <button
                type="submit"
                disabled={isLoading || (!useBackupCode ? totpCode.length !== 6 : !backupCodeInput.trim())}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Authenticating Token...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Security Token</span>
                  </>
                )}
              </button>

              {/* Toggle Alternative Options & Back to Login */}
              <div className="pt-2 flex flex-col items-center gap-2.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setErrorMsg(null);
                  }}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  {useBackupCode ? 'Use Google Authenticator App Code' : 'Lost phone? Use Emergency Backup Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStage('credentials');
                    setTwoFactorPendingToken(null);
                    setErrorMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Credentials Login</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* Clean Cyberpunk Footer */}
          <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-[10px] text-emerald-600 font-mono">
            <span>MORPHEUS MAINFRAME</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ENCRYPTED
            </span>
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
        <div className="min-h-screen flex items-center justify-center bg-[#03070E]">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
