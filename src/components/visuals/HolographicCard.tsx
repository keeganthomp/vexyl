'use client';

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
  disabled?: boolean;
}

export function HolographicCard({
  children,
  className,
  maxTilt = 10,
  glareOpacity = 0.15,
  disabled = false,
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || reducedMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const percentX = (x - centerX) / centerX;
      const percentY = (y - centerY) / centerY;

      const rotateX = -percentY * maxTilt;
      const rotateY = percentX * maxTilt;

      setTransform(
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
      );

      setGlarePosition({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
      });
    },
    [disabled, reducedMotion, maxTilt]
  );

  const handleMouseEnter = useCallback(() => {
    if (!disabled && !reducedMotion) {
      setIsHovered(true);
    }
  }, [disabled, reducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTransform('');
    setGlarePosition({ x: 50, y: 50 });
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative transition-transform duration-150 ease-out',
        isHovered && !disabled && !reducedMotion && 'holographic-card',
        className
      )}
      style={{
        transform: isHovered ? transform : '',
        ['--mouse-x' as string]: `${glarePosition.x}%`,
        ['--mouse-y' as string]: `${glarePosition.y}%`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glare overlay */}
      {isHovered && !disabled && !reducedMotion && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, ${glareOpacity}) 0%, transparent 50%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
