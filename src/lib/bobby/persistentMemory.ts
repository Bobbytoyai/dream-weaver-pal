/**
 * Persistent Memory — Saves and loads key facts & interest scores
 * across sessions so Bobby remembers the child between conversations.
 * 
 * V6: Enhanced with smart decay, category importance, and emotional memory.
 * Data is stored in child_memories table (persistent_facts, interest_scores).
 * Falls back gracefully when offline or unauthenticated.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { extractFacts, type ExtractedFact } from "./factExtractor";
import {
  type EnhancedFact,
  type EmotionalProfile,
  EMPTY_EMOTIONAL_PROFILE,
  upgradeFacts,
  applySmartForgetting,
  computeDecay,
  computeImportance,
  decayInterestScores,
  recordSessionEmotion,
  getDominantMoodTrend,
  scoreFactsForContext,
} from "./memory/advancedMemory";

// Re-export for external usage
export type { EnhancedFact, EmotionalProfile };
export { scoreFactsForContext, getDominantMoodTrend };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PersistentFact {
  text: string;
  category: string;
  firstMentioned: string;
  mentionCount: number;
  lastMentioned?: string;    // V6: for decay tracking
  decayScore?: number;       // V6: computed on load
  importanceScore?: number;  // V6: computed on load
}

export interface PersistentMemoryData {
  facts: PersistentFact[];
  interestScores: Record<string, number>;
  emotionalProfile: EmotionalProfile; // V6
}

const EMPTY_DATA: PersistentMemoryData = {
  facts: [],
  interestScores: {},
  emotionalProfile: EMPTY_EMOTIONAL_PROFILE,
};
const MAX_FACTS = 50; // V6: increased from 30
const LOCAL_KEY = "bobby_persistent_memory";

// In-memory cache for current session
let cached: PersistentMemoryData = { ...EMPTY_DATA };
let loaded = false;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Load
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Load persistent memory from cloud (or localStorage fallback) */
export async function loadPersistentMemory(childName: string): Promise<PersistentMemoryData> {
  if (loaded) return cached;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("child_memories")
        .select("persistent_facts, interest_scores")
        .eq("user_id", user.id)
        .eq("child_name", childName)
        .maybeSingle();

      if (data) {
        const rawFacts = (data.persistent_facts as unknown as PersistentFact[]) || [];
        const rawInterests = (data.interest_scores as Record<string, number>) || {};

        // V6: Upgrade legacy facts and compute decay/importance
        const enhanced = upgradeFacts(rawFacts);
        const { kept, forgotten } = applySmartForgetting(enhanced);

        if (forgotten.length > 0) {
          console.log(`[PersistentMemory V6] 🧹 Smart forgetting: dropped ${forgotten.length} stale facts`);
        }

        cached = {
          facts: kept,
          interestScores: rawInterests,
          emotionalProfile: EMPTY_EMOTIONAL_PROFILE,
        };
        loaded = true;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(cached));
        console.log(`[PersistentMemory V6] ✅ Loaded ${kept.length} facts (${forgotten.length} forgotten), ${Object.keys(rawInterests).length} interests`);
        return cached;
      }
    }
  } catch (e) {
    console.warn("[PersistentMemory] Cloud load failed, using localStorage", e);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure emotionalProfile exists (backward compat)
      if (!parsed.emotionalProfile) parsed.emotionalProfile = EMPTY_EMOTIONAL_PROFILE;
      cached = parsed;
      loaded = true;
      return cached;
    }
  } catch { }

  loaded = true;
  return cached;
}

/** Get currently loaded memory (sync, no fetch) */
export function getPersistentMemory(): PersistentMemoryData {
  return cached;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Save
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Save persistent memory to cloud + localStorage */
export async function savePersistentMemory(childName: string): Promise<void> {
  // V6: Apply smart forgetting before save
  const enhanced = upgradeFacts(cached.facts);
  const { kept } = applySmartForgetting(enhanced);
  cached.facts = kept;

  // Always save locally
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cached));

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("child_memories")
      .update({
        persistent_facts: cached.facts as unknown as Json,
        interest_scores: cached.interestScores as unknown as Json,
      })
      .eq("user_id", user.id)
      .eq("child_name", childName);

    console.log("[PersistentMemory V6] 💾 Saved to cloud");
  } catch (e) {
    console.warn("[PersistentMemory] Cloud save failed", e);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fact extraction & merge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Extract facts from a user message (delegates to factExtractor module) */
export function extractFactsFromMessage(message: string): ExtractedFact[] {
  return extractFacts(message);
}

/** Merge new facts into persistent memory (dedup by similarity, V6: refresh timestamps) */
export function mergeNewFacts(newFacts: ExtractedFact[]): void {
  const now = new Date().toISOString();

  for (const nf of newFacts) {
    const norm = nf.text.toLowerCase().trim();
    const existing = cached.facts.find(f => {
      const fNorm = f.text.toLowerCase().trim();
      if (fNorm === norm) return true;
      if (f.category === nf.category) {
        const words1 = new Set(norm.split(/\s+/).filter(w => w.length > 2));
        const words2 = new Set(fNorm.split(/\s+/).filter(w => w.length > 2));
        if (words1.size === 0) return false;
        let overlap = 0;
        for (const w of words1) if (words2.has(w)) overlap++;
        return overlap / Math.max(words1.size, words2.size) > 0.6;
      }
      return false;
    });

    if (existing) {
      existing.mentionCount++;
      // V6: Refresh timestamp to prevent decay
      existing.lastMentioned = now;
    } else {
      cached.facts.push({
        text: nf.text,
        category: nf.category,
        firstMentioned: now,
        lastMentioned: now,
        mentionCount: 1,
      });
    }
  }

  // V6: Use smart forgetting instead of simple truncation
  if (cached.facts.length > MAX_FACTS) {
    const enhanced = upgradeFacts(cached.facts);
    const { kept } = applySmartForgetting(enhanced);
    cached.facts = kept;
  }
}

/** Merge session interest scores into persistent totals (V6: with decay) */
export function mergeInterestScores(
  sessionScores: Record<string, number>,
  activeTopics: string[] = [],
): void {
  // Apply decay to existing scores first
  cached.interestScores = decayInterestScores(cached.interestScores, activeTopics);

  // Then add session scores
  for (const [topic, score] of Object.entries(sessionScores)) {
    cached.interestScores[topic] = (cached.interestScores[topic] || 0) + score;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// V6: Emotional Memory
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Record session emotions into the emotional profile */
export function recordSessionEmotions(
  sessionMood: "positive" | "neutral" | "negative",
  dominantEmotions: Array<{ emotion: string; intensity: number; context: string }>,
): void {
  cached.emotionalProfile = recordSessionEmotion(
    cached.emotionalProfile,
    sessionMood,
    dominantEmotions,
  );
}

/** Get the child's mood trend across recent sessions */
export function getMoodTrend(): "positive" | "neutral" | "negative" {
  return getDominantMoodTrend(cached.emotionalProfile);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// V6: Contextual fact retrieval
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Get top N relevant facts for current conversation context */
export function getRelevantFacts(
  context: {
    currentTopic?: string | null;
    currentEmotion?: string;
    userText?: string;
  },
  topN: number = 5,
): PersistentFact[] {
  if (cached.facts.length === 0) return [];

  const enhanced = upgradeFacts(cached.facts);
  const scored = scoreFactsForContext(enhanced, context);
  return scored.slice(0, topN);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Context block for LLM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Build a persistent memory block for the LLM system prompt */
export function buildPersistentMemoryBlock(): string {
  if (cached.facts.length === 0 && Object.keys(cached.interestScores).length === 0) {
    return "";
  }

  const parts: string[] = [];
  parts.push("[MÉMOIRE PERSISTANTE — Ce que Bobby sait de cet enfant des sessions précédentes]");

  if (cached.facts.length > 0) {
    // V6: Show top facts by combined importance + freshness
    const enhanced = upgradeFacts(cached.facts);
    const scored = scoreFactsForContext(enhanced, {});
    const topFacts = scored.slice(0, 10);

    parts.push("Faits mémorisés :");
    for (const f of topFacts) {
      const decay = f.decayScore !== undefined ? ` (fraîcheur: ${Math.round(f.decayScore * 100)}%)` : "";
      parts.push(`  • ${f.text} (mentionné ${f.mentionCount}×${decay})`);
    }
  }

  if (Object.keys(cached.interestScores).length > 0) {
    const sorted = Object.entries(cached.interestScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const interestStr = sorted.map(([t, s]) => `${t}(${s})`).join(", ");
    parts.push(`Intérêts cumulés (toutes sessions) : ${interestStr}`);
  }

  // V6: Mood trend
  const trend = getMoodTrend();
  if (trend !== "neutral") {
    parts.push(`Tendance émotionnelle récente : ${trend}`);
  }

  parts.push("CONSIGNE : Fais naturellement référence à ces souvenirs quand c'est pertinent. Ex: \"Tu m'avais parlé de ton chat Moustache, il va bien ?\"");

  return parts.join("\n");
}

/** Reset cache (for testing) */
export function resetPersistentMemoryCache(): void {
  cached = { facts: [], interestScores: {}, emotionalProfile: EMPTY_EMOTIONAL_PROFILE };
  loaded = false;
}
