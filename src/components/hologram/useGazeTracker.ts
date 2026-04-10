import { useRef, useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tracks mouse/touch position normalized to [-1, 1] range.
 * Optionally uses camera-based skin/face-like tracking.
 * Emits FACE_DETECTED / FACE_LOST via event bus.
 */
export function useGazeTracker(enableCamera: boolean = false) {
  const gazeRef = useRef({ x: 0, y: 0 });
  const [cameraActive, setCameraActive] = useState(false);
  const faceDetectedRef = useRef(false);

  // Mouse/touch tracking
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (cameraActive) return;

      const x = clamp((clientX / window.innerWidth) * 2 - 1, -1, 1);
      const y = clamp(-((clientY / window.innerHeight) * 2 - 1), -1, 1);
      gazeRef.current = { x, y };
    };

    const onPointerMove = (e: PointerEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [cameraActive]);

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
          video: {
            facingMode: "user",
            width: { ideal: 320 },
            height: { ideal: 240 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        setCameraActive(true);

        const width = 320;
        const height = 240;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const track = () => {
          if (!video) return;

          if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            animId = requestAnimationFrame(track);
            return;
          }

          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          let totalWeight = 0;
          let weightedX = 0;
          let weightedY = 0;
          let skinPixels = 0;

          for (let y = 0; y < height; y += 4) {
            for (let x = 0; x < width; x += 4) {
              const i = (y * width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const brightness = (r + g + b) / 3;
              const chroma = Math.max(r, g, b) - Math.min(r, g, b);

              const isSkinLike =
                r > 75 &&
                g > 40 &&
                b > 20 &&
                r > g &&
                r > b &&
                chroma > 15;

              if (!isSkinLike) continue;

              skinPixels++;
              const weight = brightness + chroma * 0.6 + r * 0.2;
              totalWeight += weight;
              weightedX += x * weight;
              weightedY += y * weight;
            }
          }

          const hasFace = skinPixels > 35 && totalWeight > 0;

          if (hasFace) {
            const rawX = clamp(-((weightedX / totalWeight / width) * 2 - 1), -1, 1);
            const rawY = clamp(-((weightedY / totalWeight / height) * 2 - 1), -1, 1);
            const targetX = clamp(rawX * 1.15, -1, 1);
            const targetY = clamp(rawY * 1.15, -1, 1);

            gazeRef.current = {
              x: gazeRef.current.x * 0.18 + targetX * 0.82,
              y: gazeRef.current.y * 0.18 + targetY * 0.82,
            };

            if (!faceDetectedRef.current) {
              faceDetectedRef.current = true;
              eventBus.emit({ type: "FACE_DETECTED", position: { x: targetX, y: targetY, z: 0 } });
            }
          } else {
            gazeRef.current = {
              x: gazeRef.current.x * 0.92,
              y: gazeRef.current.y * 0.92,
            };

            if (faceDetectedRef.current) {
              faceDetectedRef.current = false;
              eventBus.emit({ type: "FACE_LOST" });
            }
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
      stream?.getTracks().forEach((track) => track.stop());
      setCameraActive(false);

      if (faceDetectedRef.current) {
        faceDetectedRef.current = false;
        eventBus.emit({ type: "FACE_LOST" });
      }
    };
  }, [enableCamera]);

  return { gazeRef, cameraActive };
}
