'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HUDOverlayProps {
  showCorners?: boolean;
  showStats?: boolean;
  showScanEffect?: boolean;
}

export function HUDOverlay({
  showCorners = true,
  showStats = true,
  showScanEffect = true,
}: HUDOverlayProps) {
  const [time, setTime] = useState(new Date());
  const [scanPosition, setScanPosition] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (reducedMotion || !showScanEffect) return;

    const interval = setInterval(() => {
      setScanPosition((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [reducedMotion, showScanEffect]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Corner brackets */}
      {showCorners && (
        <>
          {/* Top Left */}
          <div className="absolute top-4 left-4">
            <svg width="60" height="60" className="text-solana-green/60">
              <path
                d="M 0 20 L 0 0 L 20 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M 0 25 L 0 5 L 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Top Right */}
          <div className="absolute top-4 right-4">
            <svg width="60" height="60" className="text-solana-green/60">
              <path
                d="M 60 20 L 60 0 L 40 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Bottom Left */}
          <div className="absolute bottom-4 left-4">
            <svg width="60" height="60" className="text-solana-green/60">
              <path
                d="M 0 40 L 0 60 L 20 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Bottom Right */}
          <div className="absolute bottom-4 right-4">
            <svg width="60" height="60" className="text-solana-green/60">
              <path
                d="M 60 40 L 60 60 L 40 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
        </>
      )}

      {/* Stats readout */}
      {showStats && (
        <div className="absolute top-4 right-20 text-right font-mono text-xs">
          <div className="text-solana-green/80">{formatTime(time)}</div>
          <div className="text-solana-purple/60 text-[10px]">SOLANA.MAINNET</div>
          <motion.div
            className="text-accent-cyan/50 text-[10px]"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            SYS.NOMINAL
          </motion.div>
        </div>
      )}

      {/* Left side data bars */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 space-y-2">
        {[0.7, 0.4, 0.9, 0.5, 0.8].map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-solana-green/60" />
            <div className="w-16 h-1 bg-glass-border overflow-hidden">
              <motion.div
                className="h-full bg-solana-green/40"
                initial={{ width: 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 1, delay: i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Scan line effect */}
      {showScanEffect && !reducedMotion && (
        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-solana-green/30 to-transparent"
          style={{
            top: `${scanPosition}%`,
            boxShadow: '0 0 20px rgba(20, 241, 149, 0.3)',
          }}
        />
      )}

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Film grain noise */}
      <div className="holo-noise opacity-[0.02]" />
    </div>
  );
}
