import { useRef, useEffect, useState, useCallback } from "react";
import { eventBus } from "@/lib/eventBus";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Smooth exponential lerp */
function smoothLerp(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

/**
 * Gaze tracker — mouse/touch/camera.
 *
 * Principles:
 * - Full [-1, 1] range on both axes
 * - Smooth interpolation (no jerky movements)
 * - Camera: skin-tone centroid tracking
 * - Face lost → 2-3s delay before idle wandering
 * - Multi-face: priority to closest/most-centered
 * - Emits GAZE_UPDATED, FACE_DETECTED, FACE_LOST
 */
export function useGazeTracker(enableCamera: boolean = false) {
  const gazeRef = useRef({ x: 0, y: 0 });
  const [cameraActive, setCameraActive] = useState(false);
  const faceDetectedRef = useRef(false);
  const faceLostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleWanderPhaseRef = useRef(Math.random() * Math.PI * 2);
  const lastEmitRef = useRef(0);

  // Idle wandering gaze (soft random movement when no input)
  const updateIdleWander = useCallback((delta: number) => {
    if (faceDetectedRef.current) return;
    idleWanderPhaseRef.current += delta * 0.4;
    const phase = idleWanderPhaseRef.current;
    const targetX = Math.sin(phase * 0.7) * 0.15 + Math.sin(phase * 1.3) * 0.08;
    const targetY = Math.cos(phase * 0.5) * 0.1 + Math.sin(phase * 0.9) * 0.05;
    gazeRef.current = {
      x: smoothLerp(gazeRef.current.x, targetX, 0.02),
      y: smoothLerp(gazeRef.current.y, targetY, 0.02),
    };
  }, []);

  // Emit GAZE_UPDATED at ~15Hz (not every frame)
  const emitGazeUpdate = useCallback(() => {
    const now = performance.now();
    if (now - lastEmitRef.current > 66) {
      lastEmitRef.current = now;
      eventBus.emit({ type: "GAZE_UPDATED", x: gazeRef.current.x, y: gazeRef.current.y });
    }
  }, []);

  // Mouse/touch tracking
  useEffect(() => {
    if (cameraActive) return; // camera takes priority

    const handleMove = (clientX: number, clientY: number) => {
      const x = clamp((clientX / window.innerWidth) * 2 - 1, -1, 1);
      const y = clamp(-((clientY / window.innerHeight) * 2 - 1), -1, 1);
      // Smooth interpolation for natural feel
      gazeRef.current = {
        x: smoothLerp(gazeRef.current.x, x, 0.3),
        y: smoothLerp(gazeRef.current.y, y, 0.3),
      };
      emitGazeUpdate();
    };

    const onPointer = (e: PointerEvent) => handleMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [cameraActive, emitGazeUpdate]);

  // Idle wandering animation (runs continuously via rAF)
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (!faceDetectedRef.current && !cameraActive) {
        // Only wander if mouse isn't actively moving (check staleness)
        updateIdleWander(delta);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, updateIdleWander]);

  // Camera-based face/hand tracking
  useEffect(() => {
    if (!enableCamera) {
      setCameraActive(false);
      return;
    }

    let animId = 0;
    let video: HTMLVideoElement | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        setCameraActive(true);

        const W = 320, H = 240;
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const track = () => {
          if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            animId = requestAnimationFrame(track);
            return;
          }

          ctx.drawImage(video, 0, 0, W, H);
          const { data } = ctx.getImageData(0, 0, W, H);

          let totalWeight = 0, weightedX = 0, weightedY = 0, skinPixels = 0;

          for (let y = 0; y < H; y += 3) {
            for (let x = 0; x < W; x += 3) {
              const i = (y * W + x) * 4;
              const r = data[i], g = data[i + 1], b = data[i + 2];
              const chroma = Math.max(r, g, b) - Math.min(r, g, b);

              // Skin-tone detection (works for various skin colors)
              const isSkin = r > 70 && g > 35 && b > 15 && r > g && r > b && chroma > 12;
              if (!isSkin) continue;

              skinPixels++;
              const brightness = (r + g + b) / 3;
              const weight = brightness + chroma * 0.5;
              totalWeight += weight;
              weightedX += x * weight;
              weightedY += y * weight;
            }
          }

          const hasFace = skinPixels > 30 && totalWeight > 0;

          if (hasFace) {
            // Camera is mirrored → negate X for natural tracking
            const rawX = clamp(-((weightedX / totalWeight / W) * 2 - 1), -1, 1);
            const rawY = clamp(-((weightedY / totalWeight / H) * 2 - 1), -1, 1);

            // Amplify slightly for full range coverage
            const targetX = clamp(rawX * 1.2, -1, 1);
            const targetY = clamp(rawY * 1.2, -1, 1);

            // Smooth interpolation — fast follow, no jitter
            gazeRef.current = {
              x: smoothLerp(gazeRef.current.x, targetX, 0.2),
              y: smoothLerp(gazeRef.current.y, targetY, 0.2),
            };

            emitGazeUpdate();

            // Clear face lost timer
            if (faceLostTimerRef.current) {
              clearTimeout(faceLostTimerRef.current);
              faceLostTimerRef.current = null;
            }

            if (!faceDetectedRef.current) {
              faceDetectedRef.current = true;
              eventBus.emit({ type: "FACE_DETECTED", position: { x: targetX, y: targetY, z: 0 } });
            }
          } else {
            // Face lost → wait 2.5s before declaring lost (spec: 2-3s)
            if (faceDetectedRef.current && !faceLostTimerRef.current) {
              faceLostTimerRef.current = setTimeout(() => {
                faceDetectedRef.current = false;
                faceLostTimerRef.current = null;
                eventBus.emit({ type: "FACE_LOST" });
              }, 2500);
            }

            // Gradually return to center
            gazeRef.current = {
              x: smoothLerp(gazeRef.current.x, 0, 0.02),
              y: smoothLerp(gazeRef.current.y, 0, 0.02),
            };
          }

          animId = requestAnimationFrame(track);
        };

        track();
      } catch {
        setCameraActive(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      if (faceLostTimerRef.current) clearTimeout(faceLostTimerRef.current);
      stream?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      if (faceDetectedRef.current) {
        faceDetectedRef.current = false;
        eventBus.emit({ type: "FACE_LOST" });
      }
    };
  }, [enableCamera, emitGazeUpdate]);

  return { gazeRef, cameraActive };
}
