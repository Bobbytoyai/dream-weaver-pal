import type { ConversationTurn, ShortTermMemory } from "./types";
import { resetScenarios } from "../emotionalScenarios";

const MAX_TURNS = 15;
const MAX_RECENT = 25;
const SUMMARY_THRESHOLD = 10; // Compress oldest turns into summary after this count

export const mem: ShortTermMemory = {
  turns: [],
  currentEmotion: "neutral",
  currentIntensity: 2,
  currentTopic: null,
  topicDepth: 0,
  sessionMood: "neutral",
  turnCount: 0,
  recentResponses: [],
};

// Compressed summary of older conversation turns
let conversationSummary = "";

export function getConversationSummary(): string {
  return conversationSummary;
}

export function addTurn(turn: ConversationTurn) {
  mem.turns.push(turn);
  mem.turnCount++;

  // When turns exceed threshold, compress oldest into summary
  if (mem.turns.length > MAX_TURNS) {
    compressOldTurns();
  }
}

/** Compress oldest turns into a text summary to preserve context without memory bloat */
function compressOldTurns() {
  if (mem.turns.length <= SUMMARY_THRESHOLD) return;

  // Take the oldest 5 turns and summarize them
  const toCompress = mem.turns.splice(0, 5);
  const summaryParts: string[] = [];

  for (const t of toCompress) {
    const role = t.role === "child" ? "Enfant" : "Bobby";
    summaryParts.push(`${role}: ${t.text.slice(0, 60)}`);
  }

  // Append to existing summary
  const newSummary = summaryParts.join(" | ");
  conversationSummary = conversationSummary
    ? `${conversationSummary} ‖ ${newSummary}`
    : newSummary;

  // Keep summary from growing infinitely (max ~500 chars)
  if (conversationSummary.length > 500) {
    conversationSummary = conversationSummary.slice(-500);
  }
}

export function addBobbyResponse(text: string) {
  mem.recentResponses.push(text.toLowerCase().trim());
  if (mem.recentResponses.length > MAX_RECENT) mem.recentResponses.shift();
}

export function isResponseUsed(text: string): boolean {
  const norm = text.toLowerCase().trim();
  return mem.recentResponses.some(r => {
    if (r === norm) return true;
    const w1 = new Set(norm.split(/\s+/).filter(w => w.length > 2));
    const w2 = new Set(r.split(/\s+/).filter(w => w.length > 2));
    if (w1.size === 0) return false;
    let overlap = 0;
    for (const w of w1) if (w2.has(w)) overlap++;
    return overlap / Math.max(w1.size, w2.size) > 0.7;
  });
}

export function getLastChildTurn(): ConversationTurn | null {
  for (let i = mem.turns.length - 1; i >= 0; i--) {
    if (mem.turns[i].role === "child") return mem.turns[i];
  }
  return null;
}

export function getConversationContext(): string {
  const parts: string[] = [];
  // Include compressed summary if any
  if (conversationSummary) {
    parts.push(`[Résumé précédent] ${conversationSummary}`);
  }
  // Then current turns
  for (const t of mem.turns) {
    parts.push(`${t.role === "child" ? "Enfant" : "Bobby"}: ${t.text}`);
  }
  return parts.join("\n");
}

export function resetLocalBrain() {
  mem.turns = [];
  mem.currentEmotion = "neutral";
  mem.currentIntensity = 2;
  mem.currentTopic = null;
  mem.topicDepth = 0;
  mem.sessionMood = "neutral";
  mem.turnCount = 0;
  mem.recentResponses = [];
  conversationSummary = "";
  resetScenarios();
}
