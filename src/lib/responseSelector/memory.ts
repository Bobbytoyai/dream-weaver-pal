/**
 * Bobby AI — Behavioral Memory (singleton)
 */

import type { BehavioralMemory } from "./types";

const MAX_HISTORY = 20;
const MAX_INTERACTIONS = 50;

export const memory: BehavioralMemory = {
  lastInputs: [],
  lastResponseTexts: [],
  lastIntents: [],
  favoriteTopics: {},
  preferredTypes: {},
  emotionalState: "neutral",
  emotionHistory: [],
  engagementLevel: 50,
  confidenceLevel: 50,
  responseScores: {},
  topicsHistory: [],
  lastInteractions: [],
};

export function getMemory(): Readonly<BehavioralMemory> {
  return memory;
}

export function resetMemory(): void {
  memory.lastInputs = [];
  memory.lastResponseTexts = [];
  memory.lastIntents = [];
  memory.favoriteTopics = {};
  memory.preferredTypes = {};
  memory.emotionalState = "neutral";
  memory.emotionHistory = [];
  memory.engagementLevel = 50;
  memory.confidenceLevel = 50;
  memory.responseScores = {};
  memory.topicsHistory = [];
  memory.lastInteractions = [];
}

export function recordInput(input: string): void {
  memory.lastInputs.push(input.toLowerCase().trim());
  if (memory.lastInputs.length > MAX_HISTORY) memory.lastInputs.shift();
}

export function recordResponse(text: string, category?: string, type?: string): void {
  memory.lastResponseTexts.push(text);
  if (memory.lastResponseTexts.length > MAX_HISTORY) memory.lastResponseTexts.shift();

  if (category) {
    memory.favoriteTopics[category] = (memory.favoriteTopics[category] || 0) + 1;
    if (!memory.topicsHistory.includes(category)) {
      memory.topicsHistory.push(category);
      if (memory.topicsHistory.length > 30) memory.topicsHistory.shift();
    }
  }
  if (type) {
    memory.preferredTypes[type] = (memory.preferredTypes[type] || 0) + 1;
  }
}

export function recordIntent(intent: string): void {
  memory.lastIntents.push(intent);
  if (memory.lastIntents.length > MAX_HISTORY) memory.lastIntents.shift();
}

export function recordEmotion(emotion: string): void {
  memory.emotionHistory.push(emotion);
  if (memory.emotionHistory.length > MAX_HISTORY) memory.emotionHistory.shift();

  const negativeEmotions = ["tristesse", "peur", "colere", "detresse", "honte", "danger"];
  const positiveEmotions = ["joie", "excitation", "confiance"];
  if (negativeEmotions.includes(emotion)) {
    memory.confidenceLevel = Math.max(0, memory.confidenceLevel - 3);
  } else if (positiveEmotions.includes(emotion)) {
    memory.confidenceLevel = Math.min(100, memory.confidenceLevel + 2);
  }
}

export function recordInteraction(input: string, response: string, emotion: string): void {
  memory.lastInteractions.push({ input, response, emotion, timestamp: Date.now() });
  if (memory.lastInteractions.length > MAX_INTERACTIONS) memory.lastInteractions.shift();
}

export function updateEngagement(delta: number): void {
  memory.engagementLevel = Math.max(0, Math.min(100, memory.engagementLevel + delta));
}

export function setEmotionalState(emotion: string): void {
  memory.emotionalState = emotion;
  recordEmotion(emotion);
}

// ─── Learning Loop ──────────────────────────────────────

function hashResponse(text: string): string {
  return text.slice(0, 60).toLowerCase().replace(/\s+/g, "_");
}

export function boostResponseScore(responseText: string, delta = 1): void {
  const key = hashResponse(responseText);
  memory.responseScores[key] = (memory.responseScores[key] || 0) + delta;
}

export function penalizeResponseScore(responseText: string, delta = 1): void {
  const key = hashResponse(responseText);
  memory.responseScores[key] = (memory.responseScores[key] || 0) - delta;
}

export function getResponseScore(text: string): number {
  return memory.responseScores[hashResponse(text)] || 0;
}
