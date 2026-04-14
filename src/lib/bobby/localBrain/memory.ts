import type { ConversationTurn, ShortTermMemory } from "./types";
import { resetScenarios } from "../emotionalScenarios";

const MAX_TURNS = 5;
const MAX_RECENT = 15;

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

export function addTurn(turn: ConversationTurn) {
  mem.turns.push(turn);
  if (mem.turns.length > MAX_TURNS) mem.turns.shift();
  mem.turnCount++;
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
  return mem.turns.map(t => `${t.role === "child" ? "Enfant" : "Bobby"}: ${t.text}`).join("\n");
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
  resetScenarios();
}
