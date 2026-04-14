/**
 * Knowledge Base Query v2 — Semantic-aware scoring engine
 * 
 * Barrel re-exports + main query + debug scoring.
 * Maintains backward compatibility for all existing imports.
 */

import { supabase } from "@/integrations/supabase/client";
import { ensureKBCache, getEntriesForAge, type KBEntry } from "../kbCache";
import type { BobbyBrainReply } from "../types";
import type { FaceState } from "@/components/hologram/useFaceAnimation";

import { normalize, tokenize } from "./textProcessing";
import {
  expandWithSemantics,
  fuzzyMatch,
  scoreKeywords,
  scoreQuestion,
  scoreFullContainment,
  contextBonus,
  recentTopics,
  pushConversationContext,
  clearConversationContext,
} from "./scoring";
import { extractFocus, focusPenalty } from "./focusExtraction";

// Re-export for external consumers
export { pushConversationContext, clearConversationContext } from "./scoring";


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEBUG SCORING — exported for admin debug panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KBScoreBreakdown {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  emotion: string;
  priority: number;
  kwScore: number;
  qScore: number;
  containment: number;
  ctxBonus: number;
  rawScore: number;
  priorityFactor: number;
  finalScore: number;
  expandedTokens: string[];
  inputTokens: string[];
}

export async function debugScoreQuery(
  userText: string,
  childAge: number,
  limit: number = 20,
): Promise<{ results: KBScoreBreakdown[]; context: string[] }> {
  if (!userText || userText.length < 2) return { results: [], context: [...recentTopics] };

  await ensureKBCache();
  const data = getEntriesForAge(childAge)
    .sort((a, b) => (b.priority || 5) - (a.priority || 5))
    .slice(0, 500);

  if (!data.length) return { results: [], context: [...recentTopics] };

  const inputTokens = tokenize(userText);
  if (inputTokens.length === 0) return { results: [], context: [...recentTopics] };

  const expandedInput = expandWithSemantics(inputTokens);
  const inputNorm = normalize(userText);

  const scored: KBScoreBreakdown[] = [];

  for (const entry of data) {
    const kwScore = scoreKeywords(inputTokens, expandedInput, entry.keywords || []);
    const qScore = scoreQuestion(inputTokens, entry.question);
    const containment = scoreFullContainment(inputNorm, normalize(entry.question));
    const ctxBonus = contextBonus(entry.keywords || []);
    const rawScore = Math.max(kwScore, qScore, containment) + ctxBonus;
    const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
    const finalScore = rawScore * priorityFactor;

    if (finalScore > 0.01) {
      scored.push({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        keywords: entry.keywords || [],
        category: entry.category || "",
        emotion: entry.emotion || "happy",
        priority: entry.priority || 5,
        kwScore,
        qScore,
        containment,
        ctxBonus,
        rawScore,
        priorityFactor,
        finalScore,
        expandedTokens: [...expandedInput],
        inputTokens,
      });
    }
  }

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return { results: scored.slice(0, limit), context: [...recentTopics] };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN QUERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function queryKnowledgeBase(
  userText: string,
  childAge: number
): Promise<BobbyBrainReply | null> {
  if (!userText || userText.length < 2) return null;

  pushConversationContext(userText);

  try {
    // Use local cache instead of Supabase — works 100% offline
    await ensureKBCache();
    const data = getEntriesForAge(childAge);

    if (!data.length) return null;

    const inputTokens = tokenize(userText);
    if (inputTokens.length === 0) return null;
    
    const expandedInput = expandWithSemantics(inputTokens);
    const inputNorm = normalize(userText);

    let bestMatch: KBEntry | null = null;
    let bestScore = 0;

    for (const entry of data) {
      const kwScore = scoreKeywords(inputTokens, expandedInput, entry.keywords || []);
      const qScore = scoreQuestion(inputTokens, entry.question);
      const containment = scoreFullContainment(inputNorm, normalize(entry.question));
      const ctxBonus = contextBonus(entry.keywords || []);
      
      const rawScore = Math.max(kwScore, qScore, containment) + ctxBonus;
      const priorityFactor = 0.5 + ((entry.priority || 5) / 10) * 0.5;
      const finalScore = rawScore * priorityFactor;

      if (finalScore > bestScore && finalScore >= 0.12) {
        bestScore = finalScore;
        bestMatch = entry;
      }
    }

    if (!bestMatch) return null;

    // Non-blocking usage tracking (only when online)
    if (navigator.onLine) {
      Promise.resolve(supabase.rpc("increment_kb_usage", { entry_id: bestMatch.id })).catch(() => {});
    }

    console.log(`[KnowledgeQuery] ✅ Match (score ${bestScore.toFixed(3)}): "${bestMatch.question.slice(0, 60)}" → "${bestMatch.answer.slice(0, 60)}" ${bestMatch.source_content_id ? "[Store]" : "[learned]"} [LOCAL]`);

    return {
      text: bestMatch.answer,
      intent: "EDUCATION",
      source: bestMatch.source_content_id ? "library" : "local_brain",
      emotion: (bestMatch.emotion || "happy") as FaceState,
      confidence: Math.min(0.97, 0.55 + bestScore * 0.45),
      isOffline: !navigator.onLine,
    };

  } catch (e) {
    console.warn("[KnowledgeQuery] Query failed:", e);
    return null;
  }
}
