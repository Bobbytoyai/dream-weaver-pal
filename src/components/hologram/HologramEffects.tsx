import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Generate a circular particle texture
function createCircleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Floating pastel particles — circular, behind the face */
export function HologramParticles({ intensity = 0.3 }: { intensity?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 80;

  const circleMap = useMemo(() => createCircleTexture(), []);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 0.8 + Math.random() * 1.2;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(theta) - 0.1;
      // All particles BEHIND the face (negative Z)
      pos[i * 3 + 2] = -0.3 - Math.random() * 1.5;
    }
    return pos;
  }, []);

  const colors = useMemo(() => {
    const cols = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("hsl(215, 70%, 82%)"),
      new THREE.Color("hsl(260, 40%, 82%)"),
      new THREE.Color("hsl(310, 35%, 82%)"),
      new THREE.Color("hsl(45, 60%, 85%)"),
      new THREE.Color("hsl(180, 40%, 80%)"),
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
      speed: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      radius: 0.015 + Math.random() * 0.04,
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
      (posAttr.array as Float32Array)[i * 3 + 2] = baseZ; // stay behind
    }
    posAttr.needsUpdate = true;

    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.3 + intensity * 0.35 + Math.sin(time * 1.2) * 0.05;
    mat.size = 0.035 + Math.sin(time * 0.6) * 0.005;
  });

  return (
    <points ref={pointsRef} renderOrder={-1}>
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
        size={0.035}
        map={circleMap}
        vertexColors
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={true}
        sizeAttenuation
        alphaTest={0.01}
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
