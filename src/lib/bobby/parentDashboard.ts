import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";

export type ParentSession = Tables<"child_sessions">;
type RawParentAnalysis = Tables<"conversation_analyses">;

export interface ParentAnalysis extends Omit<RawParentAnalysis, "alerts" | "emotions"> {
  alerts: Array<{ type: string; message: string }>;
  emotions: Record<string, number>;
}

export type ParentSessionMessage = Pick<Tables<"session_messages">, "role" | "content" | "created_at" | "detected_emotion">;

export interface ParentDashboardSnapshot {
  sessions: ParentSession[];
  analyses: ParentAnalysis[];
}

function toEmotionMap(value: Json | null | undefined): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number")
  );
}

function toAlerts(value: Json | null | undefined): Array<{ type: string; message: string }> {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];

    const typedEntry = entry as Record<string, unknown>;
    if (typeof typedEntry.type !== "string" || typeof typedEntry.message !== "string") return [];

    return [{ type: typedEntry.type, message: typedEntry.message }];
  });
}

function normalizeAnalysis(analysis: RawParentAnalysis): ParentAnalysis {
  return {
    ...analysis,
    alerts: toAlerts(analysis.alerts),
    emotions: toEmotionMap(analysis.emotions),
  };
}

function normalizeRuntimeAnalysis(analysis: Partial<RawParentAnalysis> & { alerts?: Json; emotions?: Json }): ParentAnalysis {
  return {
    id: analysis.id ?? analysis.session_id ?? "analysis-runtime",
    session_id: analysis.session_id ?? "",
    audio_path: analysis.audio_path ?? null,
    full_transcription: analysis.full_transcription ?? null,
    summary: analysis.summary ?? null,
    emotions: toEmotionMap(analysis.emotions),
    topics_detected: Array.isArray(analysis.topics_detected) ? analysis.topics_detected.filter((item): item is string => typeof item === "string") : [],
    behavior_insights: Array.isArray(analysis.behavior_insights) ? analysis.behavior_insights.filter((item): item is string => typeof item === "string") : [],
    engagement_level: analysis.engagement_level ?? "medium",
    attention_span: analysis.attention_span ?? null,
    interaction_frequency: analysis.interaction_frequency ?? null,
    mood_score: analysis.mood_score ?? null,
    alerts: toAlerts(analysis.alerts),
    created_at: analysis.created_at ?? new Date().toISOString(),
    sociability_score: analysis.sociability_score ?? null,
    curiosity_score: analysis.curiosity_score ?? null,
    emotional_stability_score: analysis.emotional_stability_score ?? null,
    extracted_interests: Array.isArray(analysis.extracted_interests) ? analysis.extracted_interests.filter((item): item is string => typeof item === "string") : [],
  };
}

export async function loadParentDashboardSnapshot(limit = 50): Promise<ParentDashboardSnapshot> {
  const [sessionsRes, analysesRes] = await Promise.all([
    supabase.from("child_sessions").select("*").order("started_at", { ascending: false }).limit(limit),
    supabase.from("conversation_analyses").select("*").order("created_at", { ascending: false }).limit(limit),
  ]);

  return {
    sessions: (sessionsRes.data ?? []) as ParentSession[],
    analyses: (analysesRes.data ?? []).map(normalizeAnalysis),
  };
}

export async function loadParentSessionMessages(sessionId: string): Promise<ParentSessionMessage[]> {
  const { data } = await supabase
    .from("session_messages")
    .select("role, content, created_at, detected_emotion")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ParentSessionMessage[];
}

export async function requestParentSessionAnalysis(sessionId: string): Promise<ParentAnalysis | null> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.analysis) return null;

    return normalizeRuntimeAnalysis(data.analysis);
  } catch {
    return null;
  }
}