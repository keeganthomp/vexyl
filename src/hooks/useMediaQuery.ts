'use client';

import { useState, useEffect } from 'react';

/**
 * SSR-safe hook for responsive detection
 * Returns false on server, then updates on client
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Convenience hook for mobile detection
 * Mobile: < 768px
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Convenience hook for desktop detection
 * Desktop: >= 768px
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
