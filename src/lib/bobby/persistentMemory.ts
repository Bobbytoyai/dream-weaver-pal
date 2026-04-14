/**
 * Persistent Memory — Saves and loads key facts & interest scores
 * across sessions so Bobby remembers the child between conversations.
 * 
 * Data is stored in child_memories table (persistent_facts, interest_scores).
 * Falls back gracefully when offline or unauthenticated.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PersistentFact {
  text: string;           // e.g. "Son chat s'appelle Moustache"
  category: string;       // e.g. "animal", "famille", "préférence"
  firstMentioned: string; // ISO date
  mentionCount: number;
}

export interface PersistentMemoryData {
  facts: PersistentFact[];
  interestScores: Record<string, number>;
}

const EMPTY_DATA: PersistentMemoryData = { facts: [], interestScores: {} };
const MAX_FACTS = 30;
const LOCAL_KEY = "bobby_persistent_memory";

// In-memory cache for current session
let cached: PersistentMemoryData = { ...EMPTY_DATA, facts: [], interestScores: {} };
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
        cached = {
          facts: (data.persistent_facts as unknown as PersistentFact[]) || [],
          interestScores: (data.interest_scores as Record<string, number>) || {},
        };
        loaded = true;
        // Mirror to localStorage
        localStorage.setItem(LOCAL_KEY, JSON.stringify(cached));
        console.log(`[PersistentMemory] ✅ Loaded ${cached.facts.length} facts, ${Object.keys(cached.interestScores).length} interests from cloud`);
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
      cached = JSON.parse(raw);
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

    console.log("[PersistentMemory] 💾 Saved to cloud");
  } catch (e) {
    console.warn("[PersistentMemory] Cloud save failed", e);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fact extraction & merge (delegates to factExtractor)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { extractFacts, type ExtractedFact } from "./factExtractor";

/** Extract facts from a user message (delegates to factExtractor module) */
export function extractFactsFromMessage(message: string): ExtractedFact[] {
  return extractFacts(message);
}

/** Merge new facts into persistent memory (dedup by similarity) */
export function mergeNewFacts(newFacts: ExtractedFact[]): void {
  const now = new Date().toISOString();

  for (const nf of newFacts) {
    const norm = nf.text.toLowerCase().trim();
    const existing = cached.facts.find(f => {
      const fNorm = f.text.toLowerCase().trim();
      // Same text or high overlap
      if (fNorm === norm) return true;
      // Same category + similar content
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
    } else {
      cached.facts.push({
        text: nf.text,
        category: nf.category,
        firstMentioned: now,
        mentionCount: 1,
      });
    }
  }

  // Keep top facts by mention count
  if (cached.facts.length > MAX_FACTS) {
    cached.facts.sort((a, b) => b.mentionCount - a.mentionCount);
    cached.facts = cached.facts.slice(0, MAX_FACTS);
  }
}

/** Merge session interest scores into persistent totals */
export function mergeInterestScores(sessionScores: Record<string, number>): void {
  for (const [topic, score] of Object.entries(sessionScores)) {
    cached.interestScores[topic] = (cached.interestScores[topic] || 0) + score;
  }
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
    // Show top facts by mention count
    const topFacts = [...cached.facts]
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10);
    parts.push("Faits mémorisés :");
    for (const f of topFacts) {
      parts.push(`  • ${f.text} (mentionné ${f.mentionCount}×)`);
    }
  }

  if (Object.keys(cached.interestScores).length > 0) {
    const sorted = Object.entries(cached.interestScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const interestStr = sorted.map(([t, s]) => `${t}(${s})`).join(", ");
    parts.push(`Intérêts cumulés (toutes sessions) : ${interestStr}`);
  }

  parts.push("CONSIGNE : Fais naturellement référence à ces souvenirs quand c'est pertinent. Ex: \"Tu m'avais parlé de ton chat Moustache, il va bien ?\"");

  return parts.join("\n");
}

/** Reset cache (for testing) */
export function resetPersistentMemoryCache(): void {
  cached = { facts: [], interestScores: {} };
  loaded = false;
}
