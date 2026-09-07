'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, AlertTriangle, RefreshCw, Terminal, Skull, ShieldCheck, Flame } from 'lucide-react';
import { matrixSoundFx } from '@/lib/matrixSoundFx';

interface MorpheusPillChoiceProps {
  onSelectRed: () => void;
}

export function MorpheusPillChoice({ onSelectRed }: MorpheusPillChoiceProps) {
  const [selectedPill, setSelectedPill] = useState<'none' | 'red' | 'blue'>('none');
  const [isExploding, setIsExploding] = useState(false);
  const [explodedDone, setExplodedDone] = useState(false);

  const handleRedPillClick = () => {
    if (selectedPill !== 'none') return;
    setSelectedPill('red');
    matrixSoundFx.playRedPillSound();
    
    // Smooth transition to Operator Login card after awakening animation
    setTimeout(() => {
      onSelectRed();
    }, 900);
  };

  const handleBluePillClick = () => {
    if (selectedPill !== 'none') return;
    setSelectedPill('blue');
    setIsExploding(true);
    matrixSoundFx.playBluePillBoom();

    // Trigger full simulation crash screen
    setTimeout(() => {
      setExplodedDone(true);
    }, 1800);
  };

  const handleReboot = () => {
    setSelectedPill('none');
    setIsExploding(false);
    setExplodedDone(false);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[90vh] select-none z-20">
      {/* 💥 BLUE PILL EXPLOSION / SCREEN SHATTER OVERLAY */}
      <AnimatePresence>
        {isExploding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {/* Rapid Strobe & Glitch Flash */}
            <motion.div
              animate={{
                backgroundColor: [
                  'rgba(255, 0, 0, 0.8)',
                  'rgba(0, 200, 255, 0.9)',
                  'rgba(255, 255, 255, 1)',
                  'rgba(0, 0, 0, 0.95)',
                  'rgba(239, 68, 68, 0.7)',
                  'rgba(15, 23, 42, 0.98)',
                ],
              }}
              transition={{ duration: 1.5, times: [0, 0.15, 0.3, 0.5, 0.7, 1] }}
              className="absolute inset-0"
            />

            {/* Shockwave Rings */}
            <motion.div
              initial={{ scale: 0.1, opacity: 1 }}
              animate={{ scale: 8, opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute w-96 h-96 rounded-full border-8 border-cyan-400 shadow-[0_0_120px_#06b6d4]"
            />
            <motion.div
              initial={{ scale: 0.1, opacity: 1 }}
              animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.1, ease: 'easeOut' }}
              className="absolute w-80 h-80 rounded-full border-8 border-rose-500 shadow-[0_0_120px_#f43f5e]"
            />

            {/* Glitch Scanlines and Static */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.7)_50%)] bg-[length:100%_4px] pointer-events-none opacity-80 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 RED PILL AWAKENING WARP FLASH OVERLAY */}
      <AnimatePresence>
        {selectedPill === 'red' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-emerald-950/70 backdrop-blur-md"
          >
            <div className="text-center space-y-4">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.4, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                className="w-24 h-24 mx-auto rounded-full border-4 border-emerald-400 border-t-transparent shadow-[0_0_80px_#10b981]"
              />
              <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-widest uppercase drop-shadow-[0_0_20px_#10b981]">
                [ AWAKENING FROM THE MATRIX ]
              </div>
              <div className="text-xs sm:text-sm font-mono text-emerald-300">
                DECRYPTING OPERATOR MAINFRAME...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💥 EXPLODED DESTROYED TERMINAL STATE (When Blue Pill is chosen) */}
      {explodedDone ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl p-8 sm:p-10 rounded-3xl bg-black/95 border-2 border-rose-600/80 shadow-[0_0_80px_rgba(225,29,72,0.4)] text-center space-y-7 relative overflow-hidden backdrop-blur-2xl z-30"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#f43f5e]" />

          {/* Glitch Danger Icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-950/80 border-2 border-rose-500/60 flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.5)] animate-bounce">
            <Flame className="w-10 h-10 text-rose-400" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-300 font-mono text-xs uppercase tracking-widest font-bold">
              <Skull className="w-4 h-4 text-rose-400" /> SIMULATION TERMINATED // BOOM
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              You Chose The <span className="text-rose-400 underline decoration-rose-500">Blue Pill</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans font-normal">
              The story ended, the simulation exploded, and you woke up in your bed believing whatever you want to believe.
            </p>
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs font-mono text-rose-300">
              FATAL_ERROR_0x99A: CONNECTION SEVERED BY USER CHOICE.
            </div>
          </div>

          {/* Reboot Button */}
          <div className="pt-2">
            <button
              onClick={handleReboot}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className="w-5 h-5 text-black" />
              <span>Reboot Matrix & Take The Red Pill</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* 🕶️ MORPHEUS WITH OPEN HANDS & TWO PILLS */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            x: isExploding ? [0, -15, 15, -10, 10, -5, 5, 0] : 0,
          }}
          transition={{ duration: 0.6 }}
          className="w-full flex flex-col items-center text-center space-y-6 sm:space-y-8"
        >
          {/* Header Title & Morpheus Quote */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>THE MORPHEUS PROTOCOL</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Choose Your <span className="bg-gradient-to-r from-rose-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Reality</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-300 font-sans italic max-w-xl mx-auto leading-relaxed drop-shadow">
              &ldquo;This is your last chance. After this, there is no turning back. You take the blue pill—the story ends. You take the red pill—you stay in Wonderland, and I show you how deep the rabbit hole goes.&rdquo;
            </p>
          </div>

          {/* Interactive Morpheus Scene */}
          <div className="relative w-full max-w-[760px] aspect-[1024/682] flex items-center justify-center">
            {/* Morpheus Image Cutout */}
            <div className="relative w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
              <Image
                src="/images/matrix/morpheus-choice.png"
                alt="Morpheus offering the Red and Blue Pill"
                fill
                priority
                className="object-contain pointer-events-none drop-shadow-[0_0_35px_rgba(16,185,129,0.15)]"
                sizes="(max-width: 768px) 100vw, 760px"
              />
            </div>

            {/* 🔴 RED PILL (Viewer's Left Hand / Morpheus's Right Hand) */}
            <motion.div
              style={{
                left: '18%',
                top: '74%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
              onClick={handleRedPillClick}
              onMouseEnter={() => matrixSoundFx.playHover('red')}
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Pulsing Red Aura Light */}
              <div className="absolute -inset-4 sm:-inset-6 bg-red-600/40 rounded-full blur-xl animate-pulse group-hover:bg-red-500/70 transition-all duration-300 pointer-events-none" />

              {/* Floating Animation */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, -3, 0],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center"
              >
                <Image
                  src="/images/matrix/red-pill.png"
                  alt="Red Pill"
                  fill
                  className="object-contain drop-shadow-[0_0_25px_rgba(239,68,68,0.95)] group-hover:drop-shadow-[0_0_35px_rgba(239,68,68,1)] transition-all"
                  sizes="(max-width: 768px) 96px, 120px"
                />

                {/* Floating Tooltip / Label */}
                <div className="absolute -top-7 sm:-top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-red-950/95 border border-red-500 text-[10px] sm:text-xs font-mono font-bold text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.6)] group-hover:scale-105 transition-all">
                  🔴 RED PILL
                </div>
              </motion.div>
            </motion.div>

            {/* 🔵 BLUE PILL (Viewer's Right Hand / Morpheus's Left Hand) */}
            <motion.div
              style={{
                left: '82%',
                top: '74%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
              onClick={handleBluePillClick}
              onMouseEnter={() => matrixSoundFx.playHover('blue')}
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Pulsing Blue Aura Light */}
              <div className="absolute -inset-4 sm:-inset-6 bg-cyan-600/40 rounded-full blur-xl animate-pulse group-hover:bg-cyan-500/70 transition-all duration-300 pointer-events-none" />

              {/* Floating Animation */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 3, 0],
                }}
                transition={{
                  duration: 2.8,
                  delay: 0.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center"
              >
                <Image
                  src="/images/matrix/blue-pill.png"
                  alt="Blue Pill"
                  fill
                  className="object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.95)] group-hover:drop-shadow-[0_0_35px_rgba(6,182,212,1)] transition-all"
                  sizes="(max-width: 768px) 96px, 120px"
                />

                {/* Floating Tooltip / Label */}
                <div className="absolute -top-7 sm:-top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-cyan-950/95 border border-cyan-500 text-[10px] sm:text-xs font-mono font-bold text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.6)] group-hover:scale-105 transition-all">
                  🔵 BLUE PILL
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Interactive Choice Action Cards below Morpheus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl pt-2">
            {/* RED PILL BUTTON CARD */}
            <motion.button
              type="button"
              onClick={handleRedPillClick}
              onMouseEnter={() => matrixSoundFx.playHover('red')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-950/80 via-black/80 to-red-950/40 border-2 border-red-500/50 hover:border-red-400 text-left space-y-2 shadow-[0_0_25px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.45)] transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/25 transition-all" />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/60 border border-red-500/50 text-red-200 font-mono text-xs font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                  <Flame className="w-3.5 h-3.5 text-red-400" /> TAKE THE RED PILL
                </span>
                <span className="text-xl">🔴</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white group-hover:text-red-300 transition-colors">
                Enter The Matrix (Login)
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Stay in Wonderland, unlock the terminal, and view the raw truth.
              </p>
            </motion.button>

            {/* BLUE PILL BUTTON CARD */}
            <motion.button
              type="button"
              onClick={handleBluePillClick}
              onMouseEnter={() => matrixSoundFx.playHover('blue')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-950/80 via-black/80 to-blue-950/40 border-2 border-cyan-500/50 hover:border-cyan-400 text-left space-y-2 shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.45)] transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all" />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-900/60 border border-cyan-500/50 text-cyan-200 font-mono text-xs font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" /> TAKE THE BLUE PILL
                </span>
                <span className="text-xl">🔵</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                Detonate & Disconnect
              </h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                The story ends, the website explodes into bits, and you wake up.
              </p>
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
