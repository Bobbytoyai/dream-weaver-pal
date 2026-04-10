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
        ownsStreamRef.current = false;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ownsStreamRef.current = true;
      }
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(5000);
      mediaRecorderRef.current = mediaRecorder;
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
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        // Only stop tracks if we own the stream
        if (ownsStreamRef.current && streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;

        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        const path = `${sessionId}.webm`;
        const { error } = await supabase.storage
          .from("conversation-audio")
          .upload(path, blob, { contentType: "audio/webm", upsert: true });

        if (error) {
          console.error("[Recorder] Upload error:", error);
          resolve(null);
        } else {
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
