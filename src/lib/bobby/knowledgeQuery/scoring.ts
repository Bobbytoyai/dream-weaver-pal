/**
 * Scoring Engine v2 — Semantic-aware KB matching
 */

import { normalize, stem, tokenize } from "./textProcessing";

// Lazy-load the heavy semantic fields map (72KB) — only needed on first KB query
let _semanticFields: Record<string, string[]> | null = null;
let _semanticFieldsPromise: Promise<Record<string, string[]>> | null = null;

function getSemanticFields(): Record<string, string[]> {
  if (_semanticFields) return _semanticFields;
  // Trigger async load for next call
  if (!_semanticFieldsPromise) {
    _semanticFieldsPromise = import("./semanticFields").then(m => {
      _semanticFields = m.SEMANTIC_FIELDS;
      return _semanticFields;
    });
  }
  return {}; // Return empty on first call, populated on subsequent calls
}

/** Pre-warm the semantic fields cache (call early in session) */
export function preloadSemanticFields(): void {
  if (_semanticFields) return;
  if (!_semanticFieldsPromise) {
    _semanticFieldsPromise = import("./semanticFields").then(m => {
      _semanticFields = m.SEMANTIC_FIELDS;
      return _semanticFields;
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONVERSATIONAL CONTEXT — Remember recent topics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const recentTopics: string[] = [];
const MAX_CONTEXT = 15;

export function pushConversationContext(userText: string) {
  const tokens = tokenize(userText);
  for (const t of tokens) {
    if (!recentTopics.includes(t)) {
      recentTopics.push(t);
      if (recentTopics.length > MAX_CONTEXT) recentTopics.shift();
    }
  }
}

export function clearConversationContext() {
  recentTopics.length = 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCORING ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Expand input tokens with semantic associations */
export function expandWithSemantics(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const stemmed = stem(t);
    // Check semantic fields for the token and its stem
    for (const [key, related] of Object.entries(getSemanticFields())) {
      if (key === t || key === stemmed || t.includes(key) || key.includes(t.length >= 4 ? t : "__")) {
        for (const r of related) expanded.add(r);
      }
    }
  }
  return expanded;
}

/** Check if two words are fuzzy-equal (stem match, substring, or edit-close) */
export function fuzzyMatch(a: string, b: string): number {
  if (a === b) return 1.0;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return 0.9;
  // Substring containment (for compound words) — require high overlap to avoid false positives
  // e.g. "continent" should NOT match "content" (only 7/9 = 78% overlap is too low)
  const longer = Math.max(a.length, b.length);
  if (a.length >= 4 && b.includes(a) && a.length / longer >= 0.85) return 0.8;
  if (b.length >= 4 && a.includes(b) && b.length / longer >= 0.85) return 0.8;
  // Prefix match (require 80%+ of shorter word to match)
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) shared++; else break;
    }
    if (shared >= 4 && shared / minLen >= 0.8) return 0.6 + (shared / minLen) * 0.2;
  }
  return 0;
}

/** Score input against a KB entry's keywords with semantic + fuzzy tolerance */
export function scoreKeywords(inputTokens: string[], expandedInput: Set<string>, keywords: string[]): number {
  const normalizedKw = keywords.map(k => normalize(k)).filter(k => k.length >= 2);
  if (normalizedKw.length === 0) return 0;
  
  let totalWeight = 0;
  let matchWeight = 0;

  for (const kw of normalizedKw) {
    totalWeight += 1;
    let bestFuzzy = 0;

    // Direct/fuzzy match against input tokens
    for (const tok of inputTokens) {
      const f = fuzzyMatch(tok, kw);
      if (f > bestFuzzy) bestFuzzy = f;
    }

    // Check semantic expansion
    if (bestFuzzy < 0.5 && expandedInput.has(kw)) {
      bestFuzzy = Math.max(bestFuzzy, 0.5);
    }

    // Check conversational context
    if (bestFuzzy < 0.3) {
      for (const ctx of recentTopics) {
        const f = fuzzyMatch(ctx, kw);
        if (f > 0.5) { bestFuzzy = Math.max(bestFuzzy, f * 0.4); break; }
      }
    }

    matchWeight += bestFuzzy;
  }

  return matchWeight / totalWeight;
}

/** Score input against the KB entry's question text (shared words with fuzzy) */
export function scoreQuestion(inputTokens: string[], question: string): number {
  const qTokens = tokenize(question);
  if (inputTokens.length === 0 || qTokens.length === 0) return 0;

  let shared = 0;
  for (const iw of inputTokens) {
    for (const qw of qTokens) {
      if (fuzzyMatch(iw, qw) >= 0.6) {
        shared++;
        break;
      }
    }
  }

  // Also check reverse: how many question words are in input
  let reverseShared = 0;
  for (const qw of qTokens) {
    for (const iw of inputTokens) {
      if (fuzzyMatch(qw, iw) >= 0.6) {
        reverseShared++;
        break;
      }
    }
  }

  // Bi-directional Jaccard for balanced scoring
  const fwd = shared / Math.max(inputTokens.length, 1);
  const rev = reverseShared / Math.max(qTokens.length, 1);
  return (fwd + rev) / 2;
}

/** Full-text containment: does the raw input contain the full question or vice versa? */
export function scoreFullContainment(inputNorm: string, questionNorm: string): number {
  if (inputNorm.includes(questionNorm) && questionNorm.length >= 8) return 0.95;
  if (questionNorm.includes(inputNorm) && inputNorm.length >= 8) return 0.85;
  return 0;
}

/** Contextual bonus: if recent conversation topics overlap with KB keywords */
export function contextBonus(keywords: string[]): number {
  if (recentTopics.length === 0) return 0;
  const normalizedKw = keywords.map(k => normalize(k));
  let hits = 0;
  for (const ctx of recentTopics) {
    if (normalizedKw.some(kw => fuzzyMatch(ctx, kw) >= 0.6)) hits++;
  }
  return Math.min(0.15, hits * 0.05);
}
