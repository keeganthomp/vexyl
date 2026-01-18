'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Refined color palette - silver/blue tones
const HELIX_COLORS = {
  strand1: '#5eead4', // Soft teal
  strand2: '#7dd3fc', // Soft sky blue
  bridge: '#94a3b8', // Muted silver
  particle: '#a5f3fc', // Light cyan
};

function DNAStrand() {
  const groupRef = useRef<THREE.Group>(null);
  const offsetRef = useRef(0);

  // Create the helix geometry with more segments for smoothness
  const { strand1Geometry, strand2Geometry, bridgeData } = useMemo(() => {
    const segments = 200;
    const height = 20;
    const radius = 1.8;
    const twists = 4;

    const s1Points: THREE.Vector3[] = [];
    const s2Points: THREE.Vector3[] = [];
    const bridges: { y: number; angle: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = (t - 0.5) * height;
      const angle = t * Math.PI * 2 * twists;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;

      s1Points.push(new THREE.Vector3(x1, y, z1));
      s2Points.push(new THREE.Vector3(x2, y, z2));

      // Store bridge data for animation
      if (i % 12 === 0 && i > 0 && i < segments) {
        bridges.push({ y, angle });
      }
    }

    const curve1 = new THREE.CatmullRomCurve3(s1Points);
    const curve2 = new THREE.CatmullRomCurve3(s2Points);

    return {
      strand1Geometry: new THREE.TubeGeometry(curve1, 150, 0.08, 8, false),
      strand2Geometry: new THREE.TubeGeometry(curve2, 150, 0.08, 8, false),
      bridgeData: bridges,
    };
  }, []);

  // Perpetual downward rotation
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Slow, continuous rotation around Y axis (spin)
    groupRef.current.rotation.y += delta * 0.15;

    // Perpetual downward scroll effect via offset
    offsetRef.current += delta * 0.3;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Strand 1 - Soft teal */}
      <mesh geometry={strand1Geometry}>
        <meshBasicMaterial
          color={HELIX_COLORS.strand1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Strand 2 - Soft blue */}
      <mesh geometry={strand2Geometry}>
        <meshBasicMaterial
          color={HELIX_COLORS.strand2}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Bridges - Animated */}
      {bridgeData.map((bridge, i) => (
        <AnimatedBridge
          key={i}
          baseY={bridge.y}
          baseAngle={bridge.angle}
          index={i}
          offsetRef={offsetRef}
        />
      ))}

      {/* Subtle floating particles */}
      <HelixParticles offsetRef={offsetRef} />
    </group>
  );
}

interface AnimatedBridgeProps {
  baseY: number;
  baseAngle: number;
  index: number;
  offsetRef: React.RefObject<number>;
}

function AnimatedBridge({ baseY, baseAngle, index, offsetRef }: AnimatedBridgeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const radius = 1.8;
  const height = 20;

  useFrame(() => {
    if (!meshRef.current || !offsetRef.current) return;

    // Calculate scrolling Y position
    const scrollOffset = (offsetRef.current * 2) % height;
    let y = baseY - scrollOffset;

    // Wrap around when going below
    if (y < -height / 2) {
      y += height;
    }

    const angle = baseAngle + (y / height) * Math.PI * 2 * 4;

    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;
    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    meshRef.current.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    meshRef.current.rotation.y = angle;

    // Fade out at edges
    const edgeFade = 1 - Math.abs(y) / (height / 2);
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, edgeFade * 0.4);
  });

  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(0.02, 0.02, radius * 2, 4);
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[0, 0, Math.PI / 2]}>
      <meshBasicMaterial color={HELIX_COLORS.bridge} transparent opacity={0.4} />
    </mesh>
  );
}

interface HelixParticlesProps {
  offsetRef: React.RefObject<number>;
}

function HelixParticles({ offsetRef }: HelixParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 50;
  const height = 20;
  const radius = 1.8;

  // Seeded random for consistent particle positions
  const seedRandom = useMemo(() => {
    let seed = 12345;
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }, []);

  const { positions, baseData } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const data: { t: number; radiusOffset: number; speed: number }[] = [];

    for (let i = 0; i < count; i++) {
      const t = seedRandom();
      const radiusOffset = (seedRandom() - 0.5) * 0.5;
      const speed = 0.5 + seedRandom() * 0.5;

      data.push({ t, radiusOffset, speed });

      // Initial positions
      const y = (t - 0.5) * height;
      const angle = t * Math.PI * 2 * 4;
      const r = radius + radiusOffset;

      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }

    return { positions: pos, baseData: data };
  }, [seedRandom]);

  useFrame(() => {
    if (!particlesRef.current || !offsetRef.current) return;
    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const data = baseData[i];

      // Scroll downward
      let t = data.t - (offsetRef.current * 0.05 * data.speed) % 1;
      if (t < 0) t += 1;

      const y = (t - 0.5) * height;
      const angle = t * Math.PI * 2 * 4;
      const r = radius + data.radiusOffset;

      posArray[i * 3] = Math.cos(angle) * r;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = Math.sin(angle) * r;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={HELIX_COLORS.particle}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <DNAStrand />
    </>
  );
}

interface DNAHelixProps {
  className?: string;
}

export function DNAHelix({ className }: DNAHelixProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (!isClient || reducedMotion) {
    return null;
  }

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, zIndex: -10 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
