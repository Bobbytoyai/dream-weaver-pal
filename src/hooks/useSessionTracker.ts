import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const BOBBY_CODE_KEY = "bobby_lcd_code_id";

export function useSessionTracker(childName: string, childAge: number) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const messageCountRef = useRef(0);

  /**
   * Get a user_id for session tracking.
   * Priority: 1) Supabase auth user  2) bobby_codes.id from localStorage
   */
  /**
   * Get a user_id for session tracking.
   * Priority: 1) bobby_codes.id from localStorage (device identity)
   *           2) Supabase auth user (fallback for authenticated parents)
   * This ensures the parent dashboard can filter sessions by bobby_code_id.
   */
  const getUserId = async (): Promise<string | null> => {
    // Prefer bobby_code_id — this is the device identity the parent dashboard filters on
    const bobbyCodeId = localStorage.getItem(BOBBY_CODE_KEY);
    if (bobbyCodeId) return bobbyCodeId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) return user.id;
    } catch { /* no auth */ }
    return null;
  };

  const startSession = useCallback(async () => {
    startTimeRef.current = new Date();
    messageCountRef.current = 0;
    try {
      const userId = await getUserId();
      if (!userId) { console.warn("[Session] No user ID (no auth & no bobby code)"); return undefined; }

      const { data, error } = await supabase
        .from("child_sessions")
        .insert({ child_name: childName, child_age: childAge, user_id: userId })
        .select("id")
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
        console.log("[Session] ✅ Session created:", data.id);
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
      const userId = await getUserId();
      if (!userId) return;
      await supabase
        .from("session_messages")
        .insert({
          session_id: sessionIdRef.current,
          role,
          content,
          detected_emotion: detectedEmotion || null,
          user_id: userId,
        });
    } catch (e) {
      console.warn("[Session] Failed to save message:", e);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current.getTime()) / 1000);
    const id = sessionIdRef.current;
    sessionIdRef.current = null;

    const MIN_SESSION_DURATION = 30;
    const shouldDelete = messageCountRef.current === 0 && durationSeconds < MIN_SESSION_DURATION;
    if (shouldDelete) {
      try {
        await supabase.from("session_messages").delete().eq("session_id", id);
        await supabase.from("child_sessions").delete().eq("id", id);
        console.log(`[Session] Deleted short/empty session (${messageCountRef.current} msgs, ${durationSeconds}s):`, id);
      } catch (e) { console.warn("[Session] Failed to delete session:", e); }
      return id;
    }

    try {
      await supabase
        .from("child_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          message_count: messageCountRef.current,
        })
        .eq("id", id);

      console.log(`[Session] ✅ Session ended: ${messageCountRef.current} msgs, ${durationSeconds}s`);

      if (messageCountRef.current >= 4) {
        supabase.functions.invoke("session-analysis", { body: { sessionId: id } })
          .then(r => { if (r.error) console.warn("[Session] Analysis error:", r.error); })
          .catch(e => console.warn("[Session] Analysis failed:", e));

        supabase.functions.invoke("learn-from-conversations", { body: { mode: "session", sessionId: id } })
          .then(r => {
            if (r.data?.total_qa_learned > 0) {
              console.log(`[AutoLearn] 🧠 Learned ${r.data.total_qa_learned} new Q&A from session`);
            }
          })
          .catch(e => console.warn("[AutoLearn] Learning failed:", e));
      }
    } catch (e) {
      console.warn("[Session] Failed to end session:", e);
    }
    return id;
  }, []);

  return { startSession, addMessage, endSession, sessionIdRef, messageCountRef };
}
