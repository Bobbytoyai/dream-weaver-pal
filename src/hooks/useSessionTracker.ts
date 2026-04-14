import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const BOBBY_CODE_KEY = "bobby_lcd_code_id";

export function useSessionTracker(childName: string, childAge: number) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const messageCountRef = useRef(0);
  const userIdRef = useRef<string | null>(null);

  const getUserId = async (): Promise<string | null> => {
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
      if (!userId) { console.warn("[Session] No user ID"); return undefined; }
      userIdRef.current = userId;

      const { data, error } = await supabase.rpc("create_child_session" as any, {
        p_user_id: userId,
        p_child_name: childName,
        p_child_age: childAge,
      });

      if (!error && data) {
        sessionIdRef.current = data;
        console.log("[Session] ✅ Session created:", data);
      } else {
        console.warn("[Session] Failed to create session:", error?.message);
      }
      return data || undefined;
    } catch (e) {
      console.warn("[Session] Session creation error:", e);
      return undefined;
    }
  }, [childName, childAge]);

  const addMessage = useCallback(async (role: "user" | "assistant", content: string, detectedEmotion?: string) => {
    if (!sessionIdRef.current || !userIdRef.current) return;
    messageCountRef.current++;
    try {
      await supabase.rpc("add_session_message" as any, {
        p_session_id: sessionIdRef.current,
        p_user_id: userIdRef.current,
        p_role: role,
        p_content: content,
        p_detected_emotion: detectedEmotion || null,
      });
    } catch (e) {
      console.warn("[Session] Failed to save message:", e);
    }
  }, []);

  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || !startTimeRef.current) return;
    const durationSeconds = Math.round((Date.now() - startTimeRef.current.getTime()) / 1000);
    const id = sessionIdRef.current;
    const userId = userIdRef.current;
    sessionIdRef.current = null;

    const MIN_SESSION_DURATION = 30;
    const shouldDelete = messageCountRef.current === 0 && durationSeconds < MIN_SESSION_DURATION;
    if (shouldDelete && userId) {
      try {
        await supabase.rpc("delete_empty_session" as any, {
          p_session_id: id,
          p_user_id: userId,
        });
        console.log(`[Session] Deleted short/empty session (${messageCountRef.current} msgs, ${durationSeconds}s):`, id);
      } catch (e) { console.warn("[Session] Failed to delete session:", e); }
      return id;
    }

    if (userId) {
      try {
        await supabase.rpc("end_child_session" as any, {
          p_session_id: id,
          p_user_id: userId,
          p_duration_seconds: durationSeconds,
          p_detected_emotions: [] as string[],
          p_topics: [] as string[],
        });

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
    }
    return id;
  }, []);

  return { startSession, addMessage, endSession, sessionIdRef, messageCountRef };
}
