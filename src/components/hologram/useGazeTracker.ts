import { useRef, useEffect, useCallback, useState } from "react";

/**
 * Tracks mouse/touch position normalized to [-1, 1] range.
 * Optionally uses MediaPipe face detection for camera-based tracking.
 */
export function useGazeTracker(enableCamera: boolean = false) {
  const gazeRef = useRef({ x: 0, y: 0 });
  const [cameraActive, setCameraActive] = useState(false);

  // Mouse/touch tracking
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      const x = (clientX / window.innerWidth) * 2 - 1;
      const y = -((clientY / window.innerHeight) * 2 - 1);
      gazeRef.current = { x: x * 0.8, y: y * 0.5 };
    };

    const onMouse = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  // Camera-based face tracking (simplified - uses getUserMedia + face position)
  useEffect(() => {
    if (!enableCamera) return;
    let animId: number;
    let video: HTMLVideoElement | null = null;
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
        video = document.createElement("video");
        video.srcObject = stream;
        video.play();
        setCameraActive(true);

        // Simple brightness-based face position estimation
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext("2d")!;

        const track = () => {
          if (!video) return;
          ctx.drawImage(video, 0, 0, 320, 240);
          const imageData = ctx.getImageData(0, 0, 320, 240);
          const data = imageData.data;

          // Find center of brightness (rough face position)
          let totalWeight = 0, weightedX = 0, weightedY = 0;
          for (let y = 0; y < 240; y += 4) {
            for (let x = 0; x < 320; x += 4) {
              const i = (y * 320 + x) * 4;
              const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              // Skin-tone detection (rough)
              const r = data[i], g = data[i + 1], b = data[i + 2];
              const isSkinLike = r > 100 && g > 60 && b > 40 && r > g && r > b;
              const w = isSkinLike ? brightness * 2 : brightness * 0.1;
              totalWeight += w;
              weightedX += x * w;
              weightedY += y * w;
            }
          }

          if (totalWeight > 0) {
            const cx = weightedX / totalWeight / 320 * 2 - 1;
            const cy = -(weightedY / totalWeight / 240 * 2 - 1);
            // Blend camera with existing gaze
            gazeRef.current = {
              x: gazeRef.current.x * 0.3 + cx * 0.7,
              y: gazeRef.current.y * 0.3 + cy * 0.7,
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
      cancelAnimationFrame(animId);
      stream?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
    };
  }, [enableCamera]);

  return { gazeRef, cameraActive };
}
