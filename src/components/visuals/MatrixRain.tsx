'use client';

import { useEffect, useRef, useState } from 'react';

interface MatrixRainProps {
  opacity?: number;
  density?: number;
}

const CHARS = '0123456789ABCDEF';
const SPECIAL_WORDS = ['SOLANA', 'SOL', 'VEXYL', 'NFT', 'SWAP', 'STAKE'];

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  specialWord: string | null;
  specialIndex: number;
}

export function MatrixRain({ opacity = 0.12, density = 0.5 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initColumns();
    };

    const initColumns = () => {
      const fontSize = 14;
      const columnCount = Math.floor((canvas.width / fontSize) * density);
      columnsRef.current = [];

      for (let i = 0; i < columnCount; i++) {
        const x = (i / columnCount) * canvas.width + Math.random() * 20 - 10;
        columnsRef.current.push({
          x,
          y: Math.random() * canvas.height,
          speed: 1 + Math.random() * 3,
          chars: Array.from({ length: 20 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
          specialWord:
            Math.random() < 0.1
              ? SPECIAL_WORDS[Math.floor(Math.random() * SPECIAL_WORDS.length)]
              : null,
          specialIndex: 0,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = `rgba(5, 5, 5, 0.05)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fontSize = 14;
      ctx.font = `${fontSize}px monospace`;

      columnsRef.current.forEach((column) => {
        const gradient = ctx.createLinearGradient(
          column.x,
          column.y - fontSize * 10,
          column.x,
          column.y
        );
        gradient.addColorStop(0, 'rgba(20, 241, 149, 0)');
        gradient.addColorStop(0.5, 'rgba(20, 241, 149, 0.3)');
        gradient.addColorStop(1, 'rgba(20, 241, 149, 0.8)');

        // Draw trail
        for (let i = 0; i < column.chars.length; i++) {
          const charY = column.y - i * fontSize;
          if (charY < 0 || charY > canvas.height) continue;

          const alpha = 1 - i / column.chars.length;

          if (column.specialWord && i < column.specialWord.length) {
            // Draw special word characters
            ctx.fillStyle = `rgba(153, 69, 255, ${alpha * 0.8})`;
            ctx.fillText(column.specialWord[column.specialWord.length - 1 - i], column.x, charY);
          } else {
            ctx.fillStyle = `rgba(20, 241, 149, ${alpha * 0.6})`;
            ctx.fillText(column.chars[i], column.x, charY);
          }
        }

        // Head glow
        ctx.fillStyle = 'rgba(20, 241, 149, 1)';
        ctx.shadowColor = '#14f195';
        ctx.shadowBlur = 10;
        ctx.fillText(column.chars[0], column.x, column.y);
        ctx.shadowBlur = 0;

        // Update position
        column.y += column.speed;

        // Reset when off screen
        if (column.y > canvas.height + fontSize * 20) {
          column.y = -fontSize * 10;
          column.speed = 1 + Math.random() * 3;
          column.chars = Array.from(
            { length: 20 },
            () => CHARS[Math.floor(Math.random() * CHARS.length)]
          );
          column.specialWord =
            Math.random() < 0.1
              ? SPECIAL_WORDS[Math.floor(Math.random() * SPECIAL_WORDS.length)]
              : null;
        }

        // Randomly change characters
        if (Math.random() < 0.02) {
          const idx = Math.floor(Math.random() * column.chars.length);
          column.chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(draw);

    // Pause when tab is hidden
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationRef.current);
      } else {
        animationRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(animationRef.current);
    };
  }, [reducedMotion, density]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="matrix-rain gpu-accelerated"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
