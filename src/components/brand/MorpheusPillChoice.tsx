'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Flame, RefreshCw, Skull, Sparkles } from 'lucide-react';
import { matrixSoundFx } from '@/lib/matrixSoundFx';

interface MorpheusPillChoiceProps {
  onSelectRed: () => void;
}

// Generate deterministic particles for explosive blast
const EXPLOSION_PARTICLES = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * 360 * (Math.PI / 180);
  const distance = 250 + (i % 5) * 80;
  return {
    id: i,
    targetX: Math.cos(angle) * distance,
    targetY: Math.sin(angle) * distance,
    size: 4 + (i % 6) * 4,
    color: i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#38bdf8' : '#f43f5e',
    duration: 0.8 + (i % 4) * 0.25,
    delay: (i % 3) * 0.05,
    rotation: (i * 45) % 360,
  };
});

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
    }, 1700);
  };

  const handleReboot = () => {
    setSelectedPill('none');
    setIsExploding(false);
    setExplodedDone(false);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-3 sm:px-6 flex flex-col items-center justify-center select-none z-20 py-2 sm:py-4">
      {/* 💥 SPECTACULAR BLUE PILL BOOM EXPLOSION / SCREEN SHATTER OVERLAY */}
      <AnimatePresence>
        {isExploding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {/* Blinding Flash & Multi-color Screen Shake Flash */}
            <motion.div
              animate={{
                backgroundColor: [
                  'rgba(255, 255, 255, 1)',
                  'rgba(6, 182, 212, 0.95)',
                  'rgba(244, 63, 94, 0.9)',
                  'rgba(255, 255, 255, 0.95)',
                  'rgba(0, 0, 0, 0.98)',
                  'rgba(225, 29, 72, 0.85)',
                  'rgba(2, 6, 23, 0.98)',
                ],
              }}
              transition={{ duration: 1.6, times: [0, 0.1, 0.25, 0.45, 0.65, 0.85, 1] }}
              className="absolute inset-0"
            />

            {/* Giant Expanding Shockwave Blast Rings */}
            <motion.div
              initial={{ scale: 0.05, opacity: 1 }}
              animate={{ scale: 12, opacity: 0 }}
              transition={{ duration: 1.4, ease: [0.1, 0.8, 0.2, 1] }}
              className="absolute w-64 h-64 rounded-full border-[12px] border-cyan-300 shadow-[0_0_150px_#22d3ee,inset_0_0_80px_#06b6d4]"
            />
            <motion.div
              initial={{ scale: 0.05, opacity: 1 }}
              animate={{ scale: 9, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.08, ease: [0.1, 0.8, 0.2, 1] }}
              className="absolute w-56 h-56 rounded-full border-[10px] border-rose-500 shadow-[0_0_140px_#f43f5e]"
            />
            <motion.div
              initial={{ scale: 0.05, opacity: 1 }}
              animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
              className="absolute w-48 h-48 rounded-full border-8 border-white shadow-[0_0_100px_#ffffff]"
            />

            {/* Exploding Shards / Digital Blast Particles */}
            {EXPLOSION_PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: p.targetX,
                  y: p.targetY,
                  scale: [1, 2.2, 0],
                  opacity: [1, 0.9, 0],
                  rotate: [0, p.rotation + 360],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: 'easeOut',
                }}
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 25px ${p.color}`,
                }}
                className="absolute rounded-sm"
              />
            ))}

            {/* Glitch Scanlines and Screen Tearing */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px] pointer-events-none opacity-90 animate-pulse" />
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

      {/* 💥 EXPLODED / DESTROYED TERMINAL STATE (When Blue Pill is chosen) */}
      {explodedDone ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-black/95 border-2 border-rose-600/80 shadow-[0_0_80px_rgba(225,29,72,0.45)] text-center space-y-5 relative overflow-hidden backdrop-blur-2xl z-30 my-auto"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_20px_#f43f5e]" />

          {/* Glitch Danger Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.5)] animate-bounce">
            <Flame className="w-8 h-8 text-rose-400" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-300 font-mono text-xs uppercase tracking-widest font-bold">
              <Skull className="w-3.5 h-3.5 text-rose-400" /> SIMULATION DETONATED // BOOM
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              You Chose The <span className="text-rose-400 underline decoration-rose-500">Blue Pill</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans font-normal">
              The story ends, the matrix collapsed in a fiery blast, and you wake up in your bed believing whatever you want to believe.
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
              <span>Reboot Matrix & Try Again</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* 🕶️ MORPHEUS SITTING IN LEATHER CHAIR WITH TWO FLOATING PILLS (PURE PUZZLE) */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{
            opacity: 1,
            x: isExploding ? [0, -25, 25, -20, 20, -15, 15, -8, 8, 0] : 0,
            y: isExploding ? [0, -15, 15, -12, 12, -8, 8, 0] : 0,
          }}
          transition={{ duration: 0.5 }}
          className="w-full flex flex-col items-center text-center space-y-3 sm:space-y-4"
        >
          {/* Header Title & Morpheus Quote */}
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>THE MORPHEUS PROTOCOL</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Choose Your <span className="bg-gradient-to-r from-rose-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Reality</span>
            </h1>

            <p className="text-[11px] sm:text-xs text-slate-300 font-sans italic max-w-lg mx-auto leading-relaxed opacity-90">
              &ldquo;This is your last chance. After this, there is no turning back. You take the blue pill—the story ends. You take the red pill—you stay in Wonderland.&rdquo;
            </p>
          </div>

          {/* Interactive Morpheus in Leather Chair Scene (Exact Palm Positioning: Left 25.7%, Right 74.7%) */}
          <div className="relative w-full max-w-[720px] aspect-[612/307] flex items-center justify-center select-none">
            {/* Morpheus Leather Chair Cutout */}
            <div className="relative w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
              <Image
                src="/images/matrix/morpheus-chair.png"
                alt="Morpheus in armchair offering the Red and Blue Pill"
                fill
                priority
                className="object-contain pointer-events-none drop-shadow-[0_0_35px_rgba(16,185,129,0.12)]"
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>

            {/* 🔴 RED PILL (Morpheus Right Hand / Viewer Left Palm: X=25.7%, Y=77%) */}
            <motion.div
              style={{
                left: '25.7%',
                top: '77%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group flex items-center justify-center"
              onClick={handleRedPillClick}
              onMouseEnter={() => matrixSoundFx.playHover('red')}
              whileHover={{ scale: 1.22 }}
              whileTap={{ scale: 0.9 }}
              title="Red Pill"
            >
              {/* Pulsing Ambient Red Aura Light */}
              <div className="absolute -inset-4 sm:-inset-6 bg-red-600/40 rounded-full blur-xl animate-pulse group-hover:bg-red-500/80 transition-all duration-300 pointer-events-none" />

              {/* Floating Levitation Animation */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, -4, 0],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center"
              >
                <Image
                  src="/images/matrix/red-pill.png"
                  alt="Red Pill"
                  fill
                  className="object-contain drop-shadow-[0_0_20px_rgba(239,68,68,0.95)] group-hover:drop-shadow-[0_0_35px_rgba(239,68,68,1)] transition-all"
                  sizes="(max-width: 768px) 64px, 80px"
                />
              </motion.div>
            </motion.div>

            {/* 🔵 BLUE PILL (Morpheus Left Hand / Viewer Right Palm: X=74.7%, Y=77%) */}
            <motion.div
              style={{
                left: '74.7%',
                top: '77%',
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group flex items-center justify-center"
              onClick={handleBluePillClick}
              onMouseEnter={() => matrixSoundFx.playHover('blue')}
              whileHover={{ scale: 1.22 }}
              whileTap={{ scale: 0.9 }}
              title="Blue Pill"
            >
              {/* Pulsing Ambient Blue Aura Light */}
              <div className="absolute -inset-4 sm:-inset-6 bg-cyan-600/40 rounded-full blur-xl animate-pulse group-hover:bg-cyan-500/80 transition-all duration-300 pointer-events-none" />

              {/* Floating Levitation Animation */}
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 4, 0],
                }}
                transition={{
                  duration: 2.8,
                  delay: 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center"
              >
                <Image
                  src="/images/matrix/blue-pill.png"
                  alt="Blue Pill"
                  fill
                  className="object-contain drop-shadow-[0_0_20px_rgba(6,182,212,0.95)] group-hover:drop-shadow-[0_0_35px_rgba(6,182,212,1)] transition-all"
                  sizes="(max-width: 768px) 64px, 80px"
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Minimalist Subtitle Hint without spoiling the puzzle */}
          <div className="pt-1 flex items-center justify-center gap-2 text-[11px] font-mono text-emerald-400/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Click a pill to decide your fate</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
