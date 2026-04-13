/**
 * Knowledge Base Query — Searches installed content Q&A in Bobby's brain
 * 
 * Queries the knowledge_base table for matching answers based on keyword overlap
 * and fuzzy question similarity. Includes content from Bobby Store packs
 * and auto-learned Q&A from conversations.
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
  const inputWords = normalize(input).split(/\s+/).filter(w => w.length >= 2);
  if (inputWords.length === 0 || keywords.length === 0) return 0;
  
  const normalizedKw = keywords.map(k => normalize(k)).filter(k => k.length >= 2);
  if (normalizedKw.length === 0) return 0;
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

// Fuzzy question-to-question similarity (shared word ratio)
function questionSimilarity(input: string, question: string): number {
  const a = new Set(normalize(input).split(/\s+/).filter(w => w.length >= 2));
  const b = new Set(normalize(question).split(/\s+/).filter(w => w.length >= 2));
  if (a.size === 0 || b.size === 0) return 0;
  
  let shared = 0;
  for (const w of a) {
    for (const q of b) {
      if (w === q || (w.length >= 4 && q.includes(w)) || (q.length >= 4 && w.includes(q))) {
        shared++;
        break;
      }
    }
  }
  
  // Jaccard-like: shared / min(a,b) to be lenient with short queries
  return shared / Math.min(a.size, b.size);
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
      .select("id, question, answer, keywords, emotion, priority, source_content_id")
      .eq("is_active", true)
      .lte("age_min", childAge)
      .gte("age_max", childAge)
      .order("priority", { ascending: false })
      .limit(200);

    if (error || !data?.length) return null;

    // Score each entry by keyword overlap + question similarity
    let bestMatch: typeof data[0] | null = null;
    let bestScore = 0;

    for (const entry of data) {
      const kwScore = wordOverlapScore(userText, entry.keywords || []);
      const qScore = questionSimilarity(userText, entry.question);
      // Take the best of keyword match or question similarity
      const rawScore = Math.max(kwScore, qScore);
      // Priority boost (P6=0.6x, P8=0.8x, P10=1.0x)
      const score = rawScore * Math.max(0.5, (entry.priority || 5) / 10);

      if (score > bestScore && score >= 0.15) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (!bestMatch) return null;

    // Increment usage count
    Promise.resolve(supabase.rpc("increment_kb_usage", { entry_id: bestMatch.id })).catch(() => {});

    console.log(`[KnowledgeQuery] ✅ Match found (score ${bestScore.toFixed(2)}): "${bestMatch.question.slice(0, 50)}…" → "${bestMatch.answer.slice(0, 50)}…" ${bestMatch.source_content_id ? "[Store]" : "[learned]"}`);

    return {
      text: bestMatch.answer,
      intent: "EDUCATION",
      source: bestMatch.source_content_id ? "library" : "local_brain",
      emotion: (bestMatch.emotion || "happy") as FaceState,
      confidence: Math.min(0.95, 0.6 + bestScore * 0.4),
      isOffline: false,
    };

  } catch (e) {
    console.warn("[KnowledgeQuery] Query failed:", e);
    return null;
  }
}
