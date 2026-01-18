'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TimelineSpineProps {
  transactionCount: number;
  scrollOffset?: number;
  width?: number;
  height: number;
}

// WebGL Energy Spine - minimal vertical beam with traveling pulses
function EnergyBeam({ height, scrollOffset }: { height: number; scrollOffset: number }) {
  const beamRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Points>(null);

  const pulseCount = 8;

  const pulsePositions = useMemo(() => {
    const positions = new Float32Array(pulseCount * 3);
    for (let i = 0; i < pulseCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = (i / pulseCount) * height - height / 2;
      positions[i * 3 + 2] = 0;
    }
    return positions;
  }, [height]);

  const pulseSizes = useMemo(() => {
    return new Float32Array(pulseCount).fill(0.08);
  }, []);

  useFrame((state) => {
    if (!pulseRef.current) return;

    const positions = pulseRef.current.geometry.attributes.position.array as Float32Array;
    const sizes = pulseRef.current.geometry.attributes.size.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < pulseCount; i++) {
      // Pulses travel downward
      const baseY = (i / pulseCount) * height - height / 2;
      const travelSpeed = 0.3;
      const cycleOffset = (time * travelSpeed + i * 0.5) % 2;

      positions[i * 3 + 1] = baseY - cycleOffset * height * 0.1;

      // Pulse size oscillates
      const pulsePhase = Math.sin(time * 2 + i * 0.8);
      sizes[i] = 0.04 + pulsePhase * 0.02;
    }

    pulseRef.current.geometry.attributes.position.needsUpdate = true;
    pulseRef.current.geometry.attributes.size.needsUpdate = true;
  });

  return (
    <group>
      {/* Main spine line - very subtle */}
      <mesh ref={beamRef}>
        <planeGeometry args={[0.02, height]} />
        <meshBasicMaterial color="#0a1a2a" transparent opacity={0.8} />
      </mesh>

      {/* Glow layer */}
      <mesh>
        <planeGeometry args={[0.08, height]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.03}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Traveling pulses */}
      <points ref={pulseRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pulsePositions, 3]} />
          <bufferAttribute attach="attributes-size" args={[pulseSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#00f0ff"
          transparent
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// Transaction node markers
function NodeMarkers({
  transactionCount,
  nodeSpacing,
  height,
}: {
  transactionCount: number;
  nodeSpacing: number;
  height: number;
}) {
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  const nodeCount = Math.min(transactionCount, 50); // Limit visible nodes

  useEffect(() => {
    if (!nodesRef.current || !glowRef.current) return;

    const dummy = new THREE.Object3D();
    const startY = height / 2 - 1;

    for (let i = 0; i < nodeCount; i++) {
      const y = startY - i * nodeSpacing * 0.018; // Scale to WebGL units

      dummy.position.set(0, y, 0);
      dummy.updateMatrix();

      nodesRef.current.setMatrixAt(i, dummy.matrix);
      glowRef.current.setMatrixAt(i, dummy.matrix);
    }

    nodesRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
  }, [nodeCount, nodeSpacing, height]);

  useFrame((state) => {
    if (!glowRef.current) return;

    // Subtle pulse animation on glow
    const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    glowRef.current.scale.setScalar(scale);
  });

  return (
    <group>
      {/* Node glow */}
      <instancedMesh ref={glowRef} args={[undefined, undefined, nodeCount]}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Node cores */}
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodeCount]}>
        <circleGeometry args={[0.04, 8]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.6} />
      </instancedMesh>
    </group>
  );
}

function Scene({
  height,
  scrollOffset,
  transactionCount,
}: {
  height: number;
  scrollOffset: number;
  transactionCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeSpacing = 132; // CARD_HEIGHT + CARD_GAP

  // Convert scroll to camera offset
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = scrollOffset * 0.018;
    }
  });

  return (
    <>
      <color attach="background" args={['#030608']} />
      <group ref={groupRef}>
        <EnergyBeam height={20} scrollOffset={scrollOffset} />
        <NodeMarkers transactionCount={transactionCount} nodeSpacing={nodeSpacing} height={20} />
      </group>
    </>
  );
}

export function TimelineSpine({
  transactionCount,
  scrollOffset = 0,
  width = 40,
  height,
}: TimelineSpineProps) {
  const [isClient, setIsClient] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Minimal fallback
  if (!isClient || reducedMotion) {
    return (
      <div style={{ width }} className="relative h-full">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#00f0ff]/10" />
      </div>
    );
  }

  return (
    <div style={{ width, height }} className="relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Scene height={height} scrollOffset={scrollOffset} transactionCount={transactionCount} />
      </Canvas>

      {/* Top/bottom fade */}
      <div
        className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #030608, transparent)' }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #030608, transparent)' }}
      />
    </div>
  );
}

// Alternative: Pure CSS version for even lighter weight
export function TimelineSpineCSS({
  transactionCount,
  width = 40,
}: {
  transactionCount: number;
  width?: number;
}) {
  return (
    <div style={{ width }} className="relative h-full">
      {/* Main spine */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a1a2a] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00f0ff]/5 to-transparent" />
      </div>

      {/* Node markers */}
      {Array.from({ length: Math.min(transactionCount, 30) }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: `${60 + i * 132}px` }}
        >
          {/* Glow */}
          <div
            className="absolute -inset-2 rounded-full bg-[#00f0ff]/5"
            style={{
              animation: `pulse 3s ease-in-out ${i * 0.1}s infinite`,
            }}
          />
          {/* Core */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]/40" />
        </div>
      ))}

      {/* Traveling pulse */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-1 h-8 rounded-full"
        style={{
          background: 'linear-gradient(to bottom, transparent, #00f0ff/20, transparent)',
          animation: 'travelDown 4s linear infinite',
        }}
      />

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
        @keyframes travelDown {
          0% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
