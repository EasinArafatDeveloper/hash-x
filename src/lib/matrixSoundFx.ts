/**
 * High-Fidelity Web Audio Synthesizer for Matrix Sound Effects
 * Zero external audio files required - pure Web Audio API synthesis
 */

class MatrixAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Subtle sci-fi hover chime when mouse floats over a pill
   */
  playHover(type: 'red' | 'blue' = 'red') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      const baseFreq = type === 'red' ? 528 : 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio autoplay restrictions
    }
  }

  /**
   * Red Pill: Matrix Awakening / Digital Warp Ascension Chime
   */
  playRedPillSound() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Digital Chord Harmonic Arpeggio
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 1046.5]; // C major harmonic series
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteStart + 0.6);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.85);
      });

      // 2. Futuristic Matrix Shimmer Sweep (High frequency resonant filter sweep)
      const sweepOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const sweepGain = ctx.createGain();

      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(440, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(1760, now + 1.2);

      filter.type = 'bandpass';
      filter.Q.setValueAtTime(6, now);
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 1.2);

      sweepGain.gain.setValueAtTime(0.001, now);
      sweepGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      sweepOsc.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(ctx.destination);

      sweepOsc.start(now);
      sweepOsc.stop(now + 1.35);
    } catch {
      // Audio play failure handled gracefully
    }
  }

  /**
   * Blue Pill: Massive Boom / Sub-bass Explosion & Glitch Static Blast
   */
  playBluePillBoom() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // 1. Heavy 808 Sub-bass Boom Drop (180Hz -> 20Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(24, now + 1.6);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 2.3);

      // 2. White Noise Explosion Shockwave
      const bufferSize = ctx.sampleRate * 2.0;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(2400, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 1.8);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 2.1);

      // 3. Glitch / Electrical Static Overload
      const glitchOsc = ctx.createOscillator();
      const glitchGain = ctx.createGain();

      glitchOsc.type = 'sawtooth';
      glitchOsc.frequency.setValueAtTime(880, now);
      glitchOsc.frequency.setValueAtTime(220, now + 0.1);
      glitchOsc.frequency.setValueAtTime(1200, now + 0.2);
      glitchOsc.frequency.setValueAtTime(90, now + 0.35);

      glitchGain.gain.setValueAtTime(0.18, now);
      glitchGain.gain.linearRampToValueAtTime(0.01, now + 0.45);
      glitchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      glitchOsc.connect(glitchGain);
      glitchGain.connect(ctx.destination);

      glitchOsc.start(now);
      glitchOsc.stop(now + 0.65);
    } catch {
      // Audio play failure handled gracefully
    }
  }
}

export const matrixSoundFx = new MatrixAudioEngine();
