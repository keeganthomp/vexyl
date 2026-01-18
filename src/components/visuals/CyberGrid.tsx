'use client';

import { useEffect, useRef, useState } from 'react';

interface CyberGridProps {
  opacity?: number;
  lineColor?: string;
  glowColor?: string;
  perspective?: boolean;
}

export function CyberGrid({
  opacity = 0.4,
  lineColor = '#14f195',
  glowColor = '#14f195',
  perspective = true,
}: CyberGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);
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
    };

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const gridSize = 60;
      const horizonY = perspective ? height * 0.3 : 0;
      const vanishX = width / 2;

      // Scroll offset for animation
      offsetRef.current = (offsetRef.current + 0.5) % gridSize;

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;

      if (perspective) {
        // Draw perspective grid (floor effect)
        const numLines = 40;
        const startY = horizonY;

        // Vertical lines converging to vanishing point
        for (let i = -numLines; i <= numLines; i++) {
          const spread = (i / numLines) * width * 1.5;
          const startX = vanishX + spread * 0.1;
          const endX = vanishX + spread;

          const alpha = 1 - Math.abs(i) / numLines;
          ctx.globalAlpha = alpha * opacity * 0.5;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, height);
          ctx.stroke();
        }

        // Horizontal lines with perspective
        for (let i = 0; i < 30; i++) {
          const t = (i + offsetRef.current / gridSize) / 30;
          const y = startY + (height - startY) * Math.pow(t, 1.5);
          const horizonWidth = width * 0.1;
          const currentWidth = horizonWidth + (width - horizonWidth) * Math.pow(t, 1.2);
          const x1 = vanishX - currentWidth / 2;
          const x2 = vanishX + currentWidth / 2;

          ctx.globalAlpha = t * opacity * 0.6;

          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
        }

        // Glow line at horizon
        const gradient = ctx.createLinearGradient(0, horizonY - 2, 0, horizonY + 20);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, glowColor);
        gradient.addColorStop(1, 'transparent');

        ctx.globalAlpha = opacity * 0.8;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Flat grid
        ctx.globalAlpha = opacity * 0.3;

        // Vertical lines
        for (let x = offsetRef.current; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = offsetRef.current; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Add scan pulse effect
      const pulseY = ((Date.now() / 50) % (height * 1.5)) - height * 0.25;
      const pulseGradient = ctx.createLinearGradient(0, pulseY - 100, 0, pulseY + 100);
      pulseGradient.addColorStop(0, 'transparent');
      pulseGradient.addColorStop(0.5, `${glowColor}40`);
      pulseGradient.addColorStop(1, 'transparent');

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = pulseGradient;
      ctx.fillRect(0, pulseY - 100, width, 200);

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(draw);

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
  }, [reducedMotion, lineColor, glowColor, opacity, perspective]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -15 }}
      aria-hidden="true"
    />
  );
}
