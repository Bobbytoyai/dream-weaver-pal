/**
 * Bobby AI — Multi-Response Matcher & Proactive Relance
 */

import type { MultiResponseEntry } from "./types";
import { memory } from "./memory";
import { isRecentlyUsed, selectBestResponse } from "./scoring";
import { getConversationalRebond } from "./rebond";
import { BOBBY_MULTI_RESPONSES } from "./responses";

// ─── DETRESSE Priority Keywords ─────────────────────────

const DETRESSE_KEYWORDS = [
  "mourir", "disparaître", "me faire mal", "personne m'aime",
  "je veux mourir", "je veux disparaître", "je veux me faire mal",
  "me tuer", "plus envie de vivre", "je veux plus être là",
  "je suis inutile", "personne ne m'aime",
];

function isDetresseInput(text: string): boolean {
  const lower = text.toLowerCase();
  return DETRESSE_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── French stop words ──────────────────────────────────

const STOP_WORDS = new Set([
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "le", "la", "les", "un", "une", "des", "du", "de", "au", "aux",
  "et", "ou", "mais", "donc", "car", "ni", "que", "qui", "dont",
  "en", "à", "dans", "sur", "sous", "avec", "pour", "par", "sans",
  "ce", "se", "ne", "pas", "plus", "très", "bien", "trop", "aussi",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
  "suis", "est", "es", "ai", "as", "sont", "ont", "été",
  "j'ai", "j'aime", "c'est", "j'suis", "moi", "toi",
]);

function contentWords(text: string): string[] {
  return text.split(/[\s'']+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── Multi-Response Matcher (with DETRESSE priority) ────

export function findMultiResponse(userInput: string): MultiResponseEntry | null {
  const normalized = userInput.toLowerCase().trim();
  if (!normalized || normalized.length < 2) return null;

  // 🚨 PRIORITÉ ABSOLUE: DÉTRESSE → route vers securite_critique
  if (isDetresseInput(normalized)) {
    const criticalEntries = BOBBY_MULTI_RESPONSES.filter(
      e => e.category === "securite_critique" || e.category === "securite"
    );
    let bestCritical: MultiResponseEntry | null = null;
    let bestScore = 0;
    for (const entry of criticalEntries) {
      const entryNorm = entry.input.toLowerCase().trim();
      if (normalized === entryNorm) return entry;
      const userWords = normalized.split(/\s+/).filter(w => w.length > 1);
      const entryWords = entryNorm.split(/\s+/).filter(w => w.length > 1);
      let overlap = 0;
      for (const uw of userWords) {
        for (const ew of entryWords) {
          if (uw === ew || uw.includes(ew) || ew.includes(uw)) { overlap++; break; }
        }
      }
      const score = entryWords.length > 0 ? overlap / entryWords.length : 0;
      if (score > bestScore) { bestScore = score; bestCritical = entry; }
    }
    if (bestCritical) return bestCritical;
    if (criticalEntries.length > 0) return criticalEntries[0];
  }

  let bestMatch: MultiResponseEntry | null = null;
  let bestScore = 0;

  const userContent = contentWords(normalized);

  for (const entry of BOBBY_MULTI_RESPONSES) {
    const entryNorm = entry.input.toLowerCase().trim();
    
    if (normalized === entryNorm) return entry;

    const entryContent = contentWords(entryNorm);
    
    if (entryContent.length === 0 || userContent.length === 0) continue;

    let overlap = 0;
    for (const uw of userContent) {
      for (const ew of entryContent) {
        if (uw === ew || (uw.length > 3 && ew.length > 3 && (uw.includes(ew) || ew.includes(uw)))) {
          overlap++;
          break;
        }
      }
    }

    const entryScore = entryContent.length > 0 ? overlap / entryContent.length : 0;
    const userScore = userContent.length > 0 ? overlap / userContent.length : 0;
    const score = (entryScore + userScore) / 2;

    if (score > bestScore && score >= 0.35) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

// ─── Proactive Relance (with Conversational Rebond) ─────

export function getProactiveRelance(childName?: string): string {
  if (Math.random() < 0.4) {
    const rebond = getConversationalRebond(childName);
    if (rebond) return rebond;
  }

  const silenceEntry = BOBBY_MULTI_RESPONSES.find(e => e.input === "__silence__");
  if (!silenceEntry) return "Tu es là ? 😊";

  const topTopics = Object.entries(memory.favoriteTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  if (topTopics.includes("jeux") || topTopics.includes("jeu")) {
    const gameRelances = [
      "Tu veux refaire un jeu ? 😄",
      "J'ai un nouveau défi pour toi !",
      "On rejoue ? 😊",
    ];
    const fresh = gameRelances.filter(r => !isRecentlyUsed(r));
    if (fresh.length > 0) return fresh[Math.floor(Math.random() * fresh.length)];
  }

  const selected = selectBestResponse(silenceEntry.responses);
  return selected?.text ?? "Tu es là ? 😊";
}
