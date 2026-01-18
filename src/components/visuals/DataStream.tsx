'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface DataStreamProps {
  direction?: 'up' | 'down' | 'left' | 'right';
  color?: string;
  width?: number;
  className?: string;
}

export function DataStream({
  direction = 'up',
  color = '#14f195',
  width = 2,
  className,
}: DataStreamProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) return null;

  const isVertical = direction === 'up' || direction === 'down';
  const isReverse = direction === 'down' || direction === 'right';

  return (
    <div
      className={`absolute overflow-hidden ${className}`}
      style={{
        width: isVertical ? width : '100%',
        height: isVertical ? '100%' : width,
      }}
    >
      {/* Main stream */}
      <motion.div
        className="absolute"
        style={{
          width: isVertical ? '100%' : '30%',
          height: isVertical ? '30%' : '100%',
          background: `linear-gradient(${isVertical ? (isReverse ? '180deg' : '0deg') : isReverse ? '90deg' : '270deg'}, transparent, ${color}, transparent)`,
          boxShadow: `0 0 10px ${color}`,
        }}
        animate={
          isVertical
            ? { y: isReverse ? ['100%', '-100%'] : ['-100%', '100%'] }
            : { x: isReverse ? ['100%', '-100%'] : ['-100%', '100%'] }
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Data packets */}
      {[0, 0.3, 0.6].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            width: isVertical ? '100%' : 8,
            height: isVertical ? 8 : '100%',
            background: color,
            borderRadius: 4,
            boxShadow: `0 0 6px ${color}`,
          }}
          animate={
            isVertical
              ? { y: isReverse ? ['100%', '-100%'] : ['-100%', '100%'] }
              : { x: isReverse ? ['100%', '-100%'] : ['-100%', '100%'] }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
            delay,
          }}
        />
      ))}

      {/* Static glow line */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${isVertical ? '180deg' : '90deg'}, transparent, ${color}20, transparent)`,
        }}
      />
    </div>
  );
}

// Horizontal data stream connector between elements
export function DataStreamConnector({
  color = '#14f195',
  className,
}: {
  color?: string;
  className?: string;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return (
      <div
        className={`h-px bg-gradient-to-r from-transparent via-[${color}]/30 to-transparent ${className}`}
      />
    );
  }

  return (
    <div className={`relative h-px ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
        }}
      />
      <motion.div
        className="absolute h-full w-8"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 10px ${color}`,
        }}
        animate={{ left: ['-10%', '110%'] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
