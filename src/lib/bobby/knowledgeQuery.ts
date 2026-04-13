/**
 * Knowledge Base Query — Searches installed content Q&A in Bobby's brain
 * 
 * Queries the knowledge_base table for matching answers based on keyword overlap.
 * This includes content injected from installed Bobby Store packs.
 * 
 * Falls back to IndexedDB cache when offline.
 */

import { supabase } from "@/integrations/supabase/client";
import { getCachedPack } from "./contentInstaller";
import type { BobbyBrainReply } from "./types";
import type { FaceState } from "@/components/hologram/useFaceAnimation";

// ─── Normalize input for matching ────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function wordOverlapScore(input: string, keywords: string[]): number {
  const inputWords = normalize(input).split(/\s+/);
  if (inputWords.length === 0 || keywords.length === 0) return 0;
  
  const normalizedKw = keywords.map(k => normalize(k));
  let matches = 0;
  
  for (const kw of normalizedKw) {
    if (inputWords.some(w => w.includes(kw) || kw.includes(w))) {
      matches++;
    }
  }
  
  // Also check if the full input contains any keyword
  const fullInput = normalize(input);
  for (const kw of normalizedKw) {
    if (fullInput.includes(kw) && kw.length >= 3) {
      matches += 0.5;
    }
  }
  
  return matches / Math.max(normalizedKw.length, 1);
}

// ─── Cloud Query ─────────────────────────────────────────────────────

export async function queryKnowledgeBase(
  userText: string,
  childAge: number
): Promise<BobbyBrainReply | null> {
  if (!userText || userText.length < 3) return null;

  try {
    // Fetch active KB entries within age range
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("question, answer, keywords, emotion, priority, source_content_id")
      .eq("is_active", true)
      .lte("age_min", childAge)
      .gte("age_max", childAge)
      .order("priority", { ascending: false })
      .limit(200);

    if (error || !data?.length) return null;

    // Score each entry by keyword overlap with user input
    let bestMatch: typeof data[0] | null = null;
    let bestScore = 0;

    for (const entry of data) {
      const kwScore = wordOverlapScore(userText, entry.keywords || []);
      const qScore = wordOverlapScore(userText, entry.question.split(/\s+/));
      const score = Math.max(kwScore, qScore * 0.8) * (entry.priority / 10);

      if (score > bestScore && score >= 0.3) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (!bestMatch) return null;

    // Increment usage count
    supabase.rpc("increment_kb_usage", { entry_id: (bestMatch as any).id }).then(() => {}).catch(() => {});

    console.log(`[KnowledgeQuery] ✅ Match found (score ${bestScore.toFixed(2)}): "${bestMatch.question.slice(0, 40)}…" ${bestMatch.source_content_id ? "[from Store pack]" : "[base]"}`);

    return {
      text: bestMatch.answer,
      intent: "EDUCATION",
      source: bestMatch.source_content_id ? "library" : "local_brain",
      emotion: (bestMatch.emotion || "happy") as FaceState,
      confidence: Math.min(0.9, 0.5 + bestScore * 0.5),
      isOffline: false,
    };

  } catch (e) {
    console.warn("[KnowledgeQuery] Query failed:", e);
    return null;
  }
}
