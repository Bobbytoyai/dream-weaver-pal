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

    const MIN_SESSION_DURATION = 90; // 1m30 minimum

    // ─── Don't save empty or too-short sessions ───
    const shouldDelete = messageCountRef.current === 0 || durationSeconds < MIN_SESSION_DURATION;
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

      // ─── Post-session auto-learning: trigger analysis + knowledge extraction ───
      if (messageCountRef.current >= 4) {
        // Fire-and-forget: session analysis
        supabase.functions.invoke("session-analysis", { body: { sessionId: id } })
          .then(r => { if (r.error) console.warn("[Session] Analysis error:", r.error); })
          .catch(e => console.warn("[Session] Analysis failed:", e));

        // Fire-and-forget: learn from this conversation
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
