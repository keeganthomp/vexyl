'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

interface AmbientParticlesProps {
  count?: number;
  colors?: string[];
  speed?: number;
  className?: string;
}

export function AmbientParticles({
  count = 80,
  colors = ['#14f195', '#9945ff', '#00d1ff', '#ffffff'],
  speed = 0.3,
  className,
}: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
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
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      const isMobile = window.innerWidth < 768;
      const actualCount = isMobile ? Math.floor(count * 0.4) : count;

      for (let i = 0; i < actualCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 0.5 + 0.5,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed - 0.1,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around screen
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Pulsing alpha
        const pulseAlpha = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);

        // Draw glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4 * p.z);
        gradient.addColorStop(
          0,
          p.color +
            Math.floor(pulseAlpha * 255)
              .toString(16)
              .padStart(2, '0')
        );
        gradient.addColorStop(0.4, p.color + '40');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4 * p.z, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pulseAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw occasional connection lines
      ctx.strokeStyle = '#14f19520';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p1 = particlesRef.current[i];
        for (let j = i + 1; j < Math.min(i + 5, particlesRef.current.length); j++) {
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.globalAlpha = (1 - dist / 100) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
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
  }, [reducedMotion, count, colors, speed]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 pointer-events-none', className)}
      style={{ zIndex: -5 }}
      aria-hidden="true"
    />
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
