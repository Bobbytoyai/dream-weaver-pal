import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Floating pastel particles around the face — warm, magical, anime-style */
export function HologramParticles({ intensity = 0.3 }: { intensity?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 100;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.2 + Math.random() * 0.9;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) - 0.2;
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const cols = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("hsl(215, 80%, 78%)"),  // soft blue
      new THREE.Color("hsl(270, 50%, 78%)"),   // lavender
      new THREE.Color("hsl(320, 45%, 78%)"),   // pink
      new THREE.Color("hsl(45, 70%, 80%)"),    // warm gold
      new THREE.Color("hsl(180, 50%, 75%)"),   // mint
    ];
    for (let i = 0; i < count; i++) {
      const c = palette[i % palette.length];
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    return cols;
  }, []);

  const speeds = useMemo(() => {
    return Array.from({ length: count }, () => ({
      speed: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      radius: 0.02 + Math.random() * 0.06,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const time = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const s = speeds[i];
      const baseX = positions[i * 3];
      const baseY = positions[i * 3 + 1];
      const baseZ = positions[i * 3 + 2];

      (posAttr.array as Float32Array)[i * 3] = baseX + Math.sin(time * s.speed + s.phase) * s.radius;
      (posAttr.array as Float32Array)[i * 3 + 1] = baseY + Math.cos(time * s.speed * 0.7 + s.phase) * s.radius * 1.2;
      (posAttr.array as Float32Array)[i * 3 + 2] = baseZ + Math.sin(time * s.speed * 0.5) * s.radius * 0.5;
    }
    posAttr.needsUpdate = true;

    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.35 + intensity * 0.45 + Math.sin(time * 1.5) * 0.06;
    mat.size = 0.028 + Math.sin(time * 0.8) * 0.005;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.slice(), 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/** Soft glowing ring — gentle halo effect */
export function ScanRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    ringRef.current.rotation.x = Math.PI / 2;
    ringRef.current.position.y = Math.sin(t * 0.3) * 0.5;
    const mat = ringRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.06 + Math.sin(t * 1.5) * 0.03;
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[1.3, 0.004, 8, 64]} />
      <meshStandardMaterial
        color="hsl(215, 70%, 78%)"
        emissive="hsl(270, 50%, 70%)"
        emissiveIntensity={0.6}
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </mesh>
  );
}
