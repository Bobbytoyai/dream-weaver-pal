import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionTracker(childName: string, childAge: number) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const messageCountRef = useRef(0);

  const startSession = useCallback(async () => {
    startTimeRef.current = new Date();
    messageCountRef.current = 0;
    try {
      const { data, error } = await supabase
        .from("child_sessions")
        .insert({ child_name: childName, child_age: childAge })
        .select("id")
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
      } else {
        console.warn("[Session] Failed to create session:", error?.message);
      }
      return data?.id;
    } catch (e) {
      console.warn("[Session] Session creation error:", e);
      return undefined;
    }
  }, [childName, childAge]);

  const addMessage = useCallback(async (role: "user" | "assistant", content: string, detectedEmotion?: string) => {
    if (!sessionIdRef.current) return;
    messageCountRef.current++;
    try {
      await supabase
        .from("session_messages")
        .insert({
          session_id: sessionIdRef.current,
          role,
          content,
          detected_emotion: detectedEmotion || null,
        });
    } catch (e) {
      console.warn("[Session] Failed to save message:", e);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current.getTime()) / 1000);
    const id = sessionIdRef.current;
    sessionIdRef.current = null; // Clear immediately to prevent double-end
    try {
      await supabase
        .from("child_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          message_count: messageCountRef.current,
        })
        .eq("id", id);
    } catch (e) {
      console.warn("[Session] Failed to end session:", e);
    }
    return id;
  }, []);

  return { startSession, addMessage, endSession, sessionIdRef, messageCountRef };
}
