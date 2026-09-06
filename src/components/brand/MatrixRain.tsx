'use client';

import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  opacity?: number;
  className?: string;
}

export function MatrixRain({ opacity = 0.35, className = '' }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Matrix characters: Katakana, Numbers, Latin
    const chars = '0123456789ABCDEFﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ101010101010';
    const charArray = chars.split('');
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -100);
    }

    let lastDrawTime = 0;
    const fpsInterval = 1000 / 30; // 30 FPS for optimal performance

    const draw = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(draw);

      const elapsed = currentTime - lastDrawTime;
      if (elapsed < fpsInterval) return;
      lastDrawTime = currentTime - (elapsed % fpsInterval);

      // Semi-transparent black background creates fade trail
      ctx.fillStyle = 'rgba(5, 8, 15, 0.09)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head of the drop is bright white/emerald, tail is green
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 8;
        ctx.fillText(text, x, y);

        // Reset shadow for performance
        ctx.shadowBlur = 0;

        if (drops[i] > 1) {
          const prevText = charArray[Math.floor(Math.random() * charArray.length)];
          ctx.fillStyle = '#10B981';
          ctx.fillText(prevText, x, (drops[i] - 1) * fontSize);
        }

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${className}`}
      style={{ opacity }}
    />
  );
}
