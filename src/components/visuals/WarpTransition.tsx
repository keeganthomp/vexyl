'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WarpTransitionProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
}

// Cold, premium color palette
const COLORS = {
  void: '#020406',
  ring1: '#0a1520',
  ring2: '#0d1a28',
  ring3: '#102030',
  accent: '#00f0ff',
  accentDim: '#004455',
  star: '#1a3050',
};

export function WarpTransition({ isActive, onComplete, duration = 1200 }: WarpTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'warping' | 'complete'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Canvas wormhole animation
  useEffect(() => {
    if (!isActive || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    setPhase('warping');
    startTimeRef.current = Date.now();

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY) * 1.5;

    // Generate star field (converging toward center)
    const stars: { angle: number; distance: number; speed: number; size: number }[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * maxRadius + 100,
        speed: Math.random() * 0.5 + 0.5,
        size: Math.random() * 1.5 + 0.5,
      });
    }

    // Ring parameters
    const ringCount = 12;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing - slow start, accelerate, then slow at end
      const easeProgress =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Clear to void
      ctx.fillStyle = COLORS.void;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw converging star streaks
      ctx.save();
      stars.forEach((star) => {
        // Stars move toward center over time
        const convergeFactor = 1 - easeProgress * 0.9;
        const currentDistance = star.distance * convergeFactor;

        if (currentDistance < 5) return; // Skip stars that reached center

        const streakLength = 5 + easeProgress * 80 * star.speed;

        const x = centerX + Math.cos(star.angle) * currentDistance;
        const y = centerY + Math.sin(star.angle) * currentDistance;
        const innerX = centerX + Math.cos(star.angle) * Math.max(currentDistance - streakLength, 0);
        const innerY = centerY + Math.sin(star.angle) * Math.max(currentDistance - streakLength, 0);

        // Streak gradient (brighter toward center)
        const gradient = ctx.createLinearGradient(x, y, innerX, innerY);
        const alpha = 0.1 + easeProgress * 0.4;
        gradient.addColorStop(0, `rgba(26, 48, 80, 0)`);
        gradient.addColorStop(0.5, `rgba(26, 48, 80, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(0, 240, 255, ${alpha * 0.3})`);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(innerX, innerY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = star.size * (1 + easeProgress);
        ctx.stroke();
      });
      ctx.restore();

      // Draw wormhole rings (concentric, scaling inward)
      for (let i = ringCount; i >= 0; i--) {
        const baseRadius = (i / ringCount) * maxRadius;
        const pulseOffset = Math.sin(elapsed * 0.003 + i * 0.5) * 10;

        // Rings contract toward center as animation progresses
        const contractFactor = 1 - easeProgress * 0.7;
        const radius = (baseRadius + pulseOffset) * contractFactor;

        if (radius < 2) continue;

        // Ring rotation
        const rotation = elapsed * 0.0005 * (i % 2 === 0 ? 1 : -1);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);

        // Draw ring as dashed circle for more visual interest
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);

        // Color based on depth - darker toward center
        const depthFactor = i / ringCount;
        const alpha = 0.05 + depthFactor * 0.15;

        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * (1 - easeProgress * 0.5)})`;
        ctx.lineWidth = 1 + (1 - depthFactor) * 2;
        ctx.setLineDash([10 + i * 5, 20 + i * 10]);
        ctx.stroke();

        ctx.restore();
      }

      // Central void / event horizon
      const voidRadius = 20 + easeProgress * 150;
      const voidGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        voidRadius * 2
      );
      voidGradient.addColorStop(0, COLORS.void);
      voidGradient.addColorStop(0.3, COLORS.void);
      voidGradient.addColorStop(0.6, `rgba(0, 240, 255, ${0.05 * (1 - easeProgress)})`);
      voidGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, voidRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = voidGradient;
      ctx.fill();

      // Inner glow ring at event horizon edge
      ctx.beginPath();
      ctx.arc(centerX, centerY, voidRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 * (1 - easeProgress * 0.8)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Final flash at the end
      if (progress > 0.85) {
        const flashProgress = (progress - 0.85) / 0.15;
        const flashAlpha = Math.sin(flashProgress * Math.PI) * 0.3;

        ctx.fillStyle = `rgba(0, 240, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Vignette overlay
      const vignetteGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        maxRadius
      );
      vignetteGradient.addColorStop(0, 'transparent');
      vignetteGradient.addColorStop(0.5, 'transparent');
      vignetteGradient.addColorStop(1, `rgba(2, 4, 6, ${0.5 + easeProgress * 0.5})`);

      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('complete');
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, duration, onComplete, reducedMotion]);

  // Reduced motion fallback
  useEffect(() => {
    if (isActive && reducedMotion) {
      setPhase('warping');
      const timer = setTimeout(() => {
        setPhase('complete');
        onComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isActive, reducedMotion, onComplete]);

  if (!isActive && phase === 'idle') return null;

  return (
    <AnimatePresence>
      {(isActive || phase === 'warping') && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: COLORS.void }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {reducedMotion ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="text-[#00f0ff] text-sm font-mono tracking-widest"
            >
              INITIALIZING...
            </motion.div>
          ) : (
            <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
