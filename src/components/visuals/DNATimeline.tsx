'use client';

import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface DNATimelineProps {
  transactionCount: number;
  scrollOffset?: number;
  width?: number;
}

export function DNATimeline({ transactionCount, scrollOffset = 0, width = 60 }: DNATimelineProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const { pathD, nodePositions } = useMemo(() => {
    const nodeSpacing = 132; // CARD_HEIGHT + CARD_GAP
    const centerX = width / 2;
    const amplitude = 15;
    const frequency = 0.008;

    // Generate helix path
    let path1 = `M ${centerX} 0`;
    let path2 = `M ${centerX} 0`;

    const nodes: { x: number; y: number; strand: 1 | 2 }[] = [];
    const totalHeight = Math.max(transactionCount * nodeSpacing + 200, 1000);

    for (let y = 0; y <= totalHeight; y += 4) {
      const wave = Math.sin((y + scrollOffset) * frequency) * amplitude;
      const x1 = centerX + wave;
      const x2 = centerX - wave;

      path1 += ` L ${x1} ${y}`;
      path2 += ` L ${x2} ${y}`;
    }

    // Calculate node positions (alternating strands)
    for (let i = 0; i < transactionCount; i++) {
      const y = i * nodeSpacing + 60;
      const wave = Math.sin((y + scrollOffset) * frequency) * amplitude;
      const strand = i % 2 === 0 ? 1 : 2;
      const x = strand === 1 ? centerX + wave : centerX - wave;

      nodes.push({ x, y, strand });
    }

    return {
      pathD: { strand1: path1, strand2: path2 },
      nodePositions: nodes,
    };
  }, [transactionCount, scrollOffset, width]);

  if (reducedMotion) {
    return (
      <div style={{ width }} className="relative h-full">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-solana-green/20" />
      </div>
    );
  }

  return (
    <div style={{ width }} className="relative h-full overflow-visible">
      <svg
        className="absolute top-0 left-0 w-full h-full overflow-visible"
        style={{ minHeight: '100%' }}
      >
        <defs>
          {/* Gradient for strand 1 */}
          <linearGradient id="strand1Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#14f195" stopOpacity="0" />
            <stop offset="10%" stopColor="#14f195" stopOpacity="0.6" />
            <stop offset="90%" stopColor="#14f195" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#14f195" stopOpacity="0" />
          </linearGradient>

          {/* Gradient for strand 2 */}
          <linearGradient id="strand2Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9945ff" stopOpacity="0" />
            <stop offset="10%" stopColor="#9945ff" stopOpacity="0.6" />
            <stop offset="90%" stopColor="#9945ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#9945ff" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="dnaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Strand 1 - Green */}
        <motion.path
          d={pathD.strand1}
          fill="none"
          stroke="url(#strand1Gradient)"
          strokeWidth="2"
          filter="url(#dnaGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        {/* Strand 2 - Purple */}
        <motion.path
          d={pathD.strand2}
          fill="none"
          stroke="url(#strand2Gradient)"
          strokeWidth="2"
          filter="url(#dnaGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
        />

        {/* Bridge connections */}
        {nodePositions.map((node, i) => {
          const prevNode = nodePositions[i - 1];
          if (!prevNode || prevNode.strand === node.strand) return null;

          return (
            <motion.line
              key={`bridge-${i}`}
              x1={prevNode.x}
              y1={prevNode.y}
              x2={node.x}
              y2={node.y}
              stroke="#00d1ff"
              strokeWidth="1"
              strokeOpacity="0.3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
            />
          );
        })}

        {/* Transaction nodes */}
        {nodePositions.map((node, i) => (
          <motion.g key={`node-${i}`}>
            {/* Outer glow */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="6"
              fill={node.strand === 1 ? '#14f195' : '#9945ff'}
              fillOpacity="0.2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.05 }}
            />
            {/* Inner node */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="3"
              fill={node.strand === 1 ? '#14f195' : '#9945ff'}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.05, type: 'spring' }}
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
