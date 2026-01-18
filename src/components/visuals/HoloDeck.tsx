'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/useMediaQuery';

// Minimal color palette
const COLORS = {
  void: '#030608',
  gridLine: '#0a1520',
  gridAccent: '#0d1a28',
  particle: '#1a3050',
  glitch: '#00f0ff',
};

// Minimal infinite grid - just horizon lines fading into distance
function HorizonGrid() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(COLORS.gridLine) },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vPosition;

        void main() {
          float dist = length(vPosition.xz);

          // Distance fade - aggressive falloff
          float fade = 1.0 - smoothstep(5.0, 40.0, dist);

          // Only horizontal lines (Z direction)
          float lineZ = abs(fract(vPosition.z * 0.15 + uTime * 0.02) - 0.5);
          float gridZ = 1.0 - smoothstep(0.0, 0.02, lineZ);

          // Very sparse vertical lines
          float lineX = abs(fract(vPosition.x * 0.05) - 0.5);
          float gridX = 1.0 - smoothstep(0.0, 0.008, lineX);

          float grid = max(gridZ * 0.4, gridX * 0.15);

          float alpha = grid * fade * 0.5;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[120, 120, 1, 1]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}

// Sparse, slow-drifting dust particles
function DustParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 60; // Much fewer particles

  const { positions, basePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = Math.random() * 12 - 4;
      const z = (Math.random() - 0.5) * 50 - 10;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;
    }

    return { positions: pos, basePositions: base };
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Very slow drift
      pos[i * 3] = basePositions[i * 3] + Math.sin(time * 0.1 + i) * 0.5;
      pos[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(time * 0.15 + i * 0.5) * 0.3;
      pos[i * 3 + 2] = basePositions[i * 3 + 2] + Math.cos(time * 0.08 + i * 0.3) * 0.5;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={COLORS.particle}
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={[COLORS.void]} />
      <fog attach="fog" args={[COLORS.void, 8, 50]} />
      <HorizonGrid />
      <DustParticles />
    </>
  );
}

// CSS-based glitch overlay - occasional, subtle (disabled on mobile for performance)
function GlitchOverlay({ disabled = false }: { disabled?: boolean }) {
  const [glitchActive, setGlitchActive] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  useEffect(() => {
    if (disabled) return;

    // Random glitch bursts
    const triggerGlitch = () => {
      const shouldGlitch = Math.random() < 0.15; // 15% chance
      if (shouldGlitch) {
        setGlitchActive(true);
        setGlitchIntensity(Math.random() * 0.5 + 0.2);

        // Short glitch duration
        setTimeout(
          () => {
            setGlitchActive(false);
          },
          50 + Math.random() * 100
        );
      }
    };

    const interval = setInterval(triggerGlitch, 3000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [disabled]);

  if (disabled || !glitchActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" style={{ mixBlendMode: 'screen' }}>
      {/* Horizontal scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-[#00f0ff]"
        style={{
          top: `${Math.random() * 100}%`,
          opacity: glitchIntensity * 0.3,
          boxShadow: '0 0 10px #00f0ff',
        }}
      />

      {/* RGB shift - subtle color fringing */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg,
            rgba(255,0,0,${glitchIntensity * 0.02}) 0%,
            transparent 30%,
            transparent 70%,
            rgba(0,255,255,${glitchIntensity * 0.02}) 100%
          )`,
        }}
      />

      {/* Noise band */}
      {Math.random() > 0.5 && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: `${Math.random() * 80 + 10}%`,
            height: `${2 + Math.random() * 4}px`,
            background: `repeating-linear-gradient(90deg,
              transparent,
              transparent 2px,
              rgba(0,240,255,${glitchIntensity * 0.1}) 2px,
              rgba(0,240,255,${glitchIntensity * 0.1}) 4px
            )`,
          }}
        />
      )}
    </div>
  );
}

// Static noise texture overlay
function NoiseOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[99] opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

// Vignette effect
function Vignette() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[98]"
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)',
      }}
    />
  );
}

interface HoloDeckProps {
  className?: string;
  children?: React.ReactNode;
}

// CSS-only mobile background fallback
function MobileBackground() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(180deg, #030608 0%, #050a12 50%, #0a1520 100%)',
      }}
    />
  );
}

export function HoloDeck({ className, children }: HoloDeckProps) {
  const [isClient, setIsClient] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Fallback for SSR or reduced motion
  if (!isClient || reducedMotion) {
    return (
      <div className={className} style={{ background: COLORS.void }}>
        {children}
      </div>
    );
  }

  // Mobile: Use CSS-only background for performance
  if (isMobile) {
    return (
      <div className={className} style={{ position: 'relative' }}>
        <MobileBackground />
        <Vignette />
        <NoiseOverlay />
        {/* No GlitchOverlay on mobile - causes repaints */}

        {/* UI Layer - z-index higher than overlays to ensure interactivity */}
        <div style={{ position: 'relative', zIndex: 101, height: '100%' }}>{children}</div>
      </div>
    );
  }

  // Desktop: Full WebGL experience
  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Minimal WebGL Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Canvas
          camera={{ position: [0, 2, 12], fov: 50, near: 0.1, far: 100 }}
          gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
          style={{ background: COLORS.void }}
        >
          <Scene />
        </Canvas>
      </div>

      {/* Post-processing overlays (CSS-based, lightweight) */}
      <Vignette />
      <NoiseOverlay />
      <GlitchOverlay />

      {/* UI Layer */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%' }}>{children}</div>
    </div>
  );
}
