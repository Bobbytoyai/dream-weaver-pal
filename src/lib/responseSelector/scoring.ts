/**
 * Bobby AI — Anti-Repetition, Energy Matching & Smart Selection
 */

import type { TaggedResponse, EnergyLevel } from "./types";
import { memory, getResponseScore } from "./memory";

// ─── Dominant Emotion Detection ─────────────────────────

export function getDominantEmotion(): string {
  if (memory.emotionHistory.length < 3) return "neutral";
  const recent = memory.emotionHistory.slice(-5);
  const counts: Record<string, number> = {};
  for (const e of recent) counts[e] = (counts[e] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "neutral";
}

// ─── Anti-Repetition Check ──────────────────────────────

export function isRecentlyUsed(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return memory.lastResponseTexts.some(r => {
    const rNorm = r.toLowerCase().trim();
    if (rNorm === normalized) return true;
    const words1 = new Set(normalized.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(rNorm.split(/\s+/).filter(w => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return false;
    let overlap = 0;
    for (const w of words1) if (words2.has(w)) overlap++;
    if (overlap / Math.max(words1.size, words2.size) > 0.80) return true;
    const start1 = normalized.split(/\s+/).slice(0, 4).join(" ");
    const start2 = rNorm.split(/\s+/).slice(0, 4).join(" ");
    if (start1.length > 8 && start1 === start2) return true;
    return false;
  });
}

export function isIntentRepeated(intent: string): boolean {
  const recent = memory.lastIntents.slice(-3);
  return recent.filter(i => i === intent).length >= 2;
}

// ─── Energy Matching ────────────────────────────────────

function getTargetEnergy(): EnergyLevel {
  if (memory.engagementLevel >= 70) return "high";
  if (memory.engagementLevel >= 40) return "medium";
  return "low";
}

// ─── Type Preference ────────────────────────────────────

function getPreferredType(): string | null {
  const entries = Object.entries(memory.preferredTypes);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// ─── Smart Selection from Multi-Response ────────────────

export function selectBestResponse(responses: TaggedResponse[]): TaggedResponse | null {
  if (!responses || responses.length === 0) return null;

  const fresh = responses.filter(r => !isRecentlyUsed(r.text));
  const pool = fresh.length > 0 ? fresh : responses;

  if (pool.length === 1) return pool[0];

  const targetEnergy = getTargetEnergy();
  const preferredType = getPreferredType();
  const dominantEmo = getDominantEmotion();

  const scored = pool.map(r => {
    let score = Math.random() * 0.2;

    if (r.energy === targetEnergy) score += 0.3;
    else if (r.energy === "medium" || targetEnergy === "medium") score += 0.15;

    if (preferredType && r.type === preferredType) score += 0.15;

    const emoState = memory.emotionalState;
    if (emoState === "sad" || emoState === "scared" || emoState === "tristesse" || emoState === "peur" || dominantEmo === "tristesse") {
      if (r.type === "soutien") score += 0.35;
    }
    if (emoState === "happy" || emoState === "excited" || emoState === "joie" || dominantEmo === "joie") {
      if (r.type === "jeu" || r.type === "fun") score += 0.2;
    }
    if (emoState === "bored" || emoState === "ennui" || dominantEmo === "ennui") {
      if (r.type === "jeu" || r.type === "proposition") score += 0.3;
    }

    if (memory.confidenceLevel < 30 && r.type === "soutien") score += 0.2;

    const learnScore = getResponseScore(r.text);
    score += Math.max(-0.2, Math.min(0.3, learnScore * 0.05));

    if (memory.emotionHistory.length >= 3) {
      const lastEmos = memory.emotionHistory.slice(-3);
      const allSame = lastEmos.every(e => e === lastEmos[0]);
      if (allSame && r.type !== "question") score += 0.1;
    }

    return { response: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].response;
}

// ─── Select from flat string array (legacy support) ─────

export function selectNonRepetitiveResponse(responses: string[]): string {
  if (!responses || responses.length === 0) return "";
  const fresh = responses.filter(r => !isRecentlyUsed(r));
  const pool = fresh.length > 0 ? fresh : responses;
  return pool[Math.floor(Math.random() * pool.length)];
}
