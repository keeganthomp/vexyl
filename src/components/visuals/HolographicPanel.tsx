'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HolographicPanelProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'green' | 'purple' | 'cyan' | 'orange';
  variant?: 'default' | 'floating' | 'terminal';
  scanlines?: boolean;
  noise?: boolean;
  animate?: boolean;
}

const GLOW_COLORS = {
  green: { primary: '#14f195', secondary: '#0a7a4a' },
  purple: { primary: '#9945ff', secondary: '#4a2280' },
  cyan: { primary: '#00d1ff', secondary: '#006880' },
  orange: { primary: '#ff8c42', secondary: '#804620' },
};

export function HolographicPanel({
  children,
  className,
  glowColor = 'green',
  variant = 'default',
  scanlines = true,
  noise = true,
  animate = true,
}: HolographicPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const colors = GLOW_COLORS[glowColor];

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <motion.div
      ref={panelRef}
      className={cn(
        'relative overflow-hidden',
        variant === 'floating' && 'transform-gpu',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        ['--glow-primary' as string]: colors.primary,
        ['--glow-secondary' as string]: colors.secondary,
        ['--mouse-x' as string]: `${mousePos.x}%`,
        ['--mouse-y' as string]: `${mousePos.y}%`,
      }}
    >
      {/* Base panel */}
      <div className="holo-panel relative z-10 h-full">
        {/* Corner accents */}
        <div className="holo-corner holo-corner-tl" />
        <div className="holo-corner holo-corner-tr" />
        <div className="holo-corner holo-corner-bl" />
        <div className="holo-corner holo-corner-br" />

        {/* Animated border */}
        <div className="holo-border-glow" />

        {/* Scan line effect */}
        {scanlines && <div className="holo-scanlines" />}

        {/* Noise texture */}
        {noise && <div className="holo-noise" />}

        {/* Mouse follow glow */}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none z-20 opacity-30 transition-opacity"
            style={{
              background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${colors.primary}40 0%, transparent 50%)`,
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-30 h-full">{children}</div>
      </div>

      {/* Floating effect shadow/glow for floating variant */}
      {variant === 'floating' && (
        <>
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 blur-xl opacity-50"
            style={{ background: colors.primary }}
          />
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-1 opacity-80"
            style={{ background: colors.primary }}
          />
        </>
      )}

      {/* Terminal header for terminal variant */}
      {variant === 'terminal' && (
        <div className="absolute top-0 left-0 right-0 h-8 bg-black/50 border-b border-[var(--glow-primary)]/30 flex items-center px-3 gap-2 z-40">
          <div className="w-2 h-2 rounded-full bg-accent-coral/80" />
          <div className="w-2 h-2 rounded-full bg-accent-yellow/80" />
          <div className="w-2 h-2 rounded-full bg-solana-green/80" />
          <span className="ml-2 text-xs font-mono text-[var(--glow-primary)]/60 uppercase tracking-wider">
            sys.terminal
          </span>
        </div>
      )}
    </motion.div>
  );
}
