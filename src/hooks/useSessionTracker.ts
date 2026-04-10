import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSessionTracker(childName: string, childAge: number) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const startSession = useCallback(async () => {
    startTimeRef.current = new Date();
    const { data, error } = await supabase
      .from("child_sessions")
      .insert({ child_name: childName, child_age: childAge })
      .select("id")
      .single();

    if (!error && data) {
      sessionIdRef.current = data.id;
    }
    return data?.id;
  }, [childName, childAge]);

  const addMessage = useCallback(async (role: "user" | "assistant", content: string, detectedEmotion?: string) => {
    if (!sessionIdRef.current) return;
    await supabase
      .from("session_messages")
      .insert({
        session_id: sessionIdRef.current,
        role,
        content,
        detected_emotion: detectedEmotion || null,
      });
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current.getTime()) / 1000);
    await supabase
      .from("child_sessions")
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", sessionIdRef.current);

    const id = sessionIdRef.current;
    sessionIdRef.current = null;
    return id;
  }, []);

  return { startSession, addMessage, endSession, sessionIdRef };
}
