'use client';

import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  opacity?: number;
  className?: string;
  speedMultiplier?: number;
  density?: number;
}

interface RainColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  chars: string[];
  fontSize: number;
  opacity: number;
  lastCharChange: number;
}

export function MatrixRain({
  opacity = 0.85,
  className = '',
  speedMultiplier = 1,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Authentic Matrix character set: Katakana, binary, digits, math symbols
    const matrixChars =
      '0123456789010101ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍXYZABCDEF:・."=*+-<>¦｜';
    const charArray = matrixChars.split('');

    const getRandomChar = () =>
      charArray[Math.floor(Math.random() * charArray.length)];

    const baseFontSize = 15;
    let columns: RainColumn[] = [];

    const initColumns = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      const numColumns = Math.ceil(width / (baseFontSize * 1.1));
      columns = [];

      for (let i = 0; i < numColumns; i++) {
        const colLength = Math.floor(Math.random() * 25) + 15; // 15 to 40 characters long
        const colChars: string[] = [];
        for (let j = 0; j < colLength; j++) {
          colChars.push(getRandomChar());
        }

        const isForeground = Math.random() > 0.4;
        columns.push({
          x: i * (baseFontSize * 1.1),
          y: Math.random() * -height * 1.5, // staggered start above the screen
          speed: (Math.random() * 1.2 + 0.8) * (isForeground ? 1.2 : 0.7) * speedMultiplier,
          length: colLength,
          chars: colChars,
          fontSize: isForeground ? baseFontSize : baseFontSize - 2,
          opacity: isForeground ? 1 : 0.55,
          lastCharChange: 0,
        });
      }
    };

    initColumns();

    const handleResize = () => {
      initColumns();
    };

    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Deep, pitch-black fade creates cinematic light trails
      ctx.fillStyle = 'rgba(2, 6, 12, 0.16)';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        col.y += col.speed * 18 * (deltaTime * 60);

        ctx.font = `bold ${col.fontSize}px "Courier New", monospace`;

        // Randomly mutate characters inside this column
        if (currentTime - col.lastCharChange > 70) {
          const randIdx = Math.floor(Math.random() * col.length);
          col.chars[randIdx] = getRandomChar();
          col.lastCharChange = currentTime;
        }

        // Draw character column from top to bottom
        for (let j = 0; j < col.length; j++) {
          const charY = col.y - j * col.fontSize;

          // Only draw visible characters
          if (charY < -col.fontSize || charY > height + col.fontSize) continue;

          const char = col.chars[j] || '0';

          if (j === 0) {
            // 🌟 Leading Head Character: Brilliant Glowing White/Cyan
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#34D399';
            ctx.shadowBlur = 12;
            ctx.fillText(char, col.x, charY);
            ctx.shadowBlur = 0; // reset for performance
          } else if (j === 1) {
            // Bright neon emerald head trail
            ctx.fillStyle = '#6EE7B7';
            ctx.shadowColor = '#10B981';
            ctx.shadowBlur = 6;
            ctx.fillText(char, col.x, charY);
            ctx.shadowBlur = 0;
          } else if (j < 6) {
            // Vivid green body
            ctx.fillStyle = `rgba(16, 185, 129, ${0.95 * col.opacity})`;
            ctx.fillText(char, col.x, charY);
          } else {
            // Trailing tail fading into the void
            const fade = Math.max(0.08, 1 - j / col.length);
            ctx.fillStyle = `rgba(5, 150, 105, ${fade * col.opacity})`;
            ctx.fillText(char, col.x, charY);
          }
        }

        // Reset column to top once it has completely fallen past the viewport
        if (col.y - col.length * col.fontSize > height) {
          col.y = Math.random() * -100 - 20;
          col.speed = (Math.random() * 1.2 + 0.8) * speedMultiplier;
          for (let j = 0; j < col.length; j++) {
            col.chars[j] = getRandomChar();
          }
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [speedMultiplier]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Cinematic Radial Vignette (Keeps center text crystal clear) */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
}
