/**
 * Cloud Quota Calculator
 * 
 * Formula: (sessions × 2) + (messages × 0.5) + (analyses × 5) Ko
 * Default quota: 500 Mo (free plan)
 */

import { supabase } from "@/integrations/supabase/client";

export interface CloudUsage {
  sessions: number;
  messages: number;
  analyses: number;
  usedKB: number;
  usedMB: number;
  quotaMB: number;
  usedPercent: number;
  remainingMB: number;
  isOverQuota: boolean;
}

/** Calculate cloud storage usage for the current user */
export async function getCloudUsage(): Promise<CloudUsage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Parallel queries
  const [sessionsRes, messagesRes, analysesRes, profileRes] = await Promise.all([
    supabase.from("child_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("session_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("conversation_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("profiles").select("cloud_storage_mb").eq("user_id", user.id).single(),
  ]);

  const sessions = sessionsRes.count ?? 0;
  const messages = messagesRes.count ?? 0;
  const analyses = analysesRes.count ?? 0;
  const quotaMB = profileRes.data?.cloud_storage_mb ?? 500;

  const usedKB = (sessions * 2) + (messages * 0.5) + (analyses * 5);
  const usedMB = usedKB / 1024;

  return {
    sessions,
    messages,
    analyses,
    usedKB,
    usedMB,
    quotaMB,
    usedPercent: quotaMB > 0 ? Math.min(100, (usedMB / quotaMB) * 100) : 0,
    remainingMB: Math.max(0, quotaMB - usedMB),
    isOverQuota: usedMB >= quotaMB,
  };
}

/** Format usage for display */
export function formatStorage(mb: number): string {
  if (mb < 1) return `${Math.round(mb * 1024)} Ko`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} Go`;
  return `${mb.toFixed(1)} Mo`;
}

/** Estimate pack size in KB (rough: 0.5 KB per content_data row) */
export function estimatePackSizeKB(contentCount: number): number {
  return contentCount * 0.5;
}
