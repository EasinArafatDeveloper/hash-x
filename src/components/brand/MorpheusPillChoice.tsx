'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Flame, AlertTriangle, RefreshCw, Skull, Sparkles } from 'lucide-react';
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
    }, 850);
  };

  const handleBluePillClick = () => {
    if (selectedPill !== 'none') return;
    setSelectedPill('blue');
    setIsExploding(true);
    matrixSoundFx.playBluePillBoom();

    // Trigger full simulation crash screen
    setTimeout(() => {
      setExplodedDone(true);
    }, 1600);
  };

  const handleReboot = () => {
    setSelectedPill('none');
    setIsExploding(false);
    setExplodedDone(false);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-3 sm:px-6 flex flex-col items-center justify-center select-none z-20 py-2 sm:py-4">
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
                  'rgba(255, 0, 0, 0.85)',
                  'rgba(0, 200, 255, 0.95)',
                  'rgba(255, 255, 255, 1)',
                  'rgba(0, 0, 0, 0.98)',
                  'rgba(239, 68, 68, 0.8)',
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
              transition={{ duration: 1.3, ease: 'easeOut' }}
              className="absolute w-96 h-96 rounded-full border-8 border-cyan-400 shadow-[0_0_120px_#06b6d4]"
            />
            <motion.div
              initial={{ scale: 0.1, opacity: 1 }}
              animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 1.1, delay: 0.1, ease: 'easeOut' }}
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
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-emerald-950/75 backdrop-blur-md"
          >
            <div className="text-center space-y-3">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.4, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
                className="w-20 h-20 mx-auto rounded-full border-4 border-emerald-400 border-t-transparent shadow-[0_0_80px_#10b981]"
              />
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-widest uppercase drop-shadow-[0_0_20px_#10b981]">
                [ ACCESSING THE MATRIX ]
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
          className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-black/95 border-2 border-rose-600/80 shadow-[0_0_80px_rgba(225,29,72,0.4)] text-center space-y-5 relative overflow-hidden backdrop-blur-2xl z-30 my-auto"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#f43f5e]" />

          {/* Glitch Danger Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.5)] animate-bounce">
            <Flame className="w-8 h-8 text-rose-400" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-300 font-mono text-xs uppercase tracking-widest font-bold">
              <Skull className="w-3.5 h-3.5 text-rose-400" /> SIMULATION DESTROYED // BOOM
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              You Chose The <span className="text-rose-400 underline decoration-rose-500">Blue Pill</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-normal">
              The story ended, the website detonated, and you woke up in your bed believing whatever you want to believe.
            </p>
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-[11px] font-mono text-rose-300">
              FATAL_ERROR_0x99A: CONNECTION SEVERED BY USER CHOICE.
            </div>
          </div>

          {/* Reboot Button */}
          <div className="pt-2">
            <button
              onClick={handleReboot}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-black" />
              <span>Reboot Matrix & Take The Red Pill</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* 🕶️ MORPHEUS WITH OPEN HANDS & TWO PILLS */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{
            opacity: 1,
            y: 0,
            x: isExploding ? [0, -15, 15, -10, 10, -5, 5, 0] : 0,
          }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col items-center text-center space-y-3 sm:space-y-4"
        >
          {/* Header Title & Morpheus Quote */}
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>THE MORPHEUS CHOICE</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Choose Your <span className="bg-gradient-to-r from-rose-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Pill</span>
            </h1>

            <p className="text-[11px] sm:text-xs text-slate-300 font-sans italic max-w-lg mx-auto leading-relaxed opacity-90">
              &ldquo;This is your last chance. After this, there is no turning back. You take the blue pill—the story ends. You take the red pill—you stay in Wonderland.&rdquo;
            </p>
          </div>

          {/* Interactive Morpheus Scene with Exact Palm Positioning */}
          <div className="relative w-full max-w-[650px] aspect-[1024/682] flex items-center justify-center select-none">
            {/* Morpheus Image Cutout */}
            <div className="relative w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]">
              <Image
                src="/images/matrix/morpheus-choice.png"
                alt="Morpheus offering the Red and Blue Pill"
                fill
                priority
                className="object-contain pointer-events-none drop-shadow-[0_0_30px_rgba(16,185,129,0.12)]"
                sizes="(max-width: 768px) 100vw, 650px"
              />
            </div>

            {/* 🔴 RED PILL (Morpheus Right Hand / Viewer Left Hand: X=14.5%, Y=76%) */}
            <motion.div
              style={{
                left: '14.5%',
                top: '76%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group flex flex-col items-center"
              onClick={handleRedPillClick}
              onMouseEnter={() => matrixSoundFx.playHover('red')}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Pulsing Red Aura Light */}
              <div className="absolute -inset-4 sm:-inset-6 bg-red-600/40 rounded-full blur-xl animate-pulse group-hover:bg-red-500/70 transition-all duration-300 pointer-events-none" />

              {/* Floating Animation */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, -3, 0],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center"
              >
                <Image
                  src="/images/matrix/red-pill.png"
                  alt="Red Pill"
                  fill
                  className="object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.95)] group-hover:drop-shadow-[0_0_35px_rgba(239,68,68,1)] transition-all"
                  sizes="(max-width: 768px) 80px, 96px"
                />
              </motion.div>

              {/* Red Pill Interactive Click Button / Badge */}
              <motion.button
                type="button"
                className="mt-1 px-3 py-1 rounded-full bg-red-950/95 border-2 border-red-500 text-[10px] sm:text-xs font-mono font-black text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)] group-hover:bg-red-600 group-hover:text-white transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Flame className="w-3 h-3 text-red-400 group-hover:text-white" />
                <span>RED PILL (LOGIN)</span>
              </motion.button>
            </motion.div>

            {/* 🔵 BLUE PILL (Morpheus Left Hand / Viewer Right Hand: X=85.6%, Y=76%) */}
            <motion.div
              style={{
                left: '85.6%',
                top: '76%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group flex flex-col items-center"
              onClick={handleBluePillClick}
              onMouseEnter={() => matrixSoundFx.playHover('blue')}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Pulsing Blue Aura Light */}
              <div className="absolute -inset-4 sm:-inset-6 bg-cyan-600/40 rounded-full blur-xl animate-pulse group-hover:bg-cyan-500/70 transition-all duration-300 pointer-events-none" />

              {/* Floating Animation */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 3, 0],
                }}
                transition={{
                  duration: 2.6,
                  delay: 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center"
              >
                <Image
                  src="/images/matrix/blue-pill.png"
                  alt="Blue Pill"
                  fill
                  className="object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.95)] group-hover:drop-shadow-[0_0_35px_rgba(6,182,212,1)] transition-all"
                  sizes="(max-width: 768px) 80px, 96px"
                />
              </motion.div>

              {/* Blue Pill Interactive Click Button / Badge */}
              <motion.button
                type="button"
                className="mt-1 px-3 py-1 rounded-full bg-cyan-950/95 border-2 border-cyan-500 text-[10px] sm:text-xs font-mono font-black text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.6)] group-hover:bg-cyan-600 group-hover:text-white transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <AlertTriangle className="w-3 h-3 text-cyan-400 group-hover:text-white" />
                <span>BLUE PILL (BOOM)</span>
              </motion.button>
            </motion.div>
          </div>

          {/* Quick Guidance */}
          <div className="pt-1 flex items-center justify-center gap-2 text-[11px] font-mono text-emerald-400/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click the <strong>Red Pill</strong> to reveal login, or the <strong>Blue Pill</strong> to explode</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
