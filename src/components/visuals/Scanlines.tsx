'use client';

import { useEffect, useState } from 'react';

interface ScanlinesProps {
  opacity?: number;
}

export function Scanlines({ opacity = 1 }: ScanlinesProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) return null;

  return <div className="scanlines" style={{ opacity }} aria-hidden="true" />;
}
