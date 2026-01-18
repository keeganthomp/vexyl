'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface GlitchTextProps {
  children: string;
  className?: string;
  continuous?: boolean;
  burstInterval?: number;
  burstDuration?: number;
}

export function GlitchText({
  children,
  className,
  continuous = false,
  burstInterval = 3000,
  burstDuration = 200,
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(continuous);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const triggerBurst = useCallback(() => {
    if (reducedMotion || continuous) return;

    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), burstDuration);
  }, [reducedMotion, continuous, burstDuration]);

  useEffect(() => {
    if (continuous || reducedMotion) return;

    const interval = setInterval(triggerBurst, burstInterval);
    // Initial burst after a short delay
    const initialTimeout = setTimeout(triggerBurst, 500);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [continuous, reducedMotion, burstInterval, triggerBurst]);

  return (
    <span
      className={cn('glitch-text', isGlitching && 'glitch-active', className)}
      data-text={children}
      onMouseEnter={triggerBurst}
    >
      {children}
    </span>
  );
}
