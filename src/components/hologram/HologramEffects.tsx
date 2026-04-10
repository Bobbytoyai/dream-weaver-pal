import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Floating holographic particles around the face */
export function HologramParticles({ intensity = 0.3 }: { intensity?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 120;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.3 + Math.random() * 0.8;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) - 0.2;
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const speeds = useMemo(() => {
    return Array.from({ length: count }, () => ({
      speed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      radius: 0.02 + Math.random() * 0.05,
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
      (posAttr.array as Float32Array)[i * 3 + 1] = baseY + Math.cos(time * s.speed * 0.7 + s.phase) * s.radius;
      (posAttr.array as Float32Array)[i * 3 + 2] = baseZ + Math.sin(time * s.speed * 0.5) * s.radius * 0.5;
    }
    posAttr.needsUpdate = true;

    // Pulse opacity with intensity
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.3 + intensity * 0.5 + Math.sin(time * 2) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions.slice(), 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={new THREE.Color("hsl(200, 100%, 75%)")}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/** Scan line ring effect */
export function ScanRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    ringRef.current.rotation.x = Math.PI / 2;
    ringRef.current.position.y = Math.sin(t * 0.5) * 0.8;
    const mat = ringRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.08 + Math.sin(t * 2) * 0.04;
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[1.2, 0.005, 8, 64]} />
      <meshStandardMaterial
        color="hsl(200, 100%, 70%)"
        emissive="hsl(200, 100%, 60%)"
        emissiveIntensity={0.8}
        transparent
        opacity={0.1}
        depthWrite={false}
      />
    </mesh>
  );
}
