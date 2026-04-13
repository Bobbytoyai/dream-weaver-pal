import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Records audio during conversations and uploads to storage.
 * Accepts an external MediaStream to avoid duplicate getUserMedia calls.
 */
export function useConversationRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ownsStreamRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Start recording. If an external stream is provided, use it (no new getUserMedia).
   * Otherwise falls back to creating its own stream.
   */
  const startRecording = useCallback(async (externalStream?: MediaStream) => {
    try {
      let stream: MediaStream;
      if (externalStream && externalStream.active) {
        stream = externalStream;
        ownsStreamRef.current = false; // Don't stop external stream tracks
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          ownsStreamRef.current = true; // We own this stream
        } catch {
          console.warn("[Recorder] No mic access — skip recording");
          return false;
        }
      }
      streamRef.current = stream;

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(3000); // Smaller chunks for reliability
      mediaRecorderRef.current = mediaRecorder;
      console.log("[Recorder] ✅ Recording started, format:", mediaRecorder.mimeType);
      return true;
    } catch (err) {
      console.warn("[Recorder] Could not start:", err);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (sessionId: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        console.warn("[Recorder] No active recorder to stop");
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        // Only stop tracks if we created the stream ourselves
        if (ownsStreamRef.current && streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;

        if (chunksRef.current.length === 0) {
          console.warn("[Recorder] No audio chunks recorded");
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || "audio/webm";
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        console.log(`[Recorder] 📦 Audio blob: ${(blob.size / 1024).toFixed(1)}KB, ${ext}`);

        const path = `${sessionId}.${ext}`;
        const { error } = await supabase.storage
          .from("conversation-audio")
          .upload(path, blob, { contentType: mimeType, upsert: true });

        if (error) {
          console.error("[Recorder] Upload error:", error);
          resolve(null);
        } else {
          console.log("[Recorder] ✅ Audio uploaded:", path);
          resolve(path);
        }
      };

      recorder.stop();
    });
  }, []);

  const triggerAnalysis = useCallback(async (sessionId: string) => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionId }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        return data.analysis;
      }
    } catch (err) {
      console.error("[Recorder] Analysis error:", err);
    }
    return null;
  }, []);

  return { startRecording, stopRecording, triggerAnalysis };
}
