/**
 * Bobby Brain V6 — Goal Determination Rules
 * 
 * Weighted rule engine that determines the primary goal for Bobby's response.
 * Runs in <2ms, fully offline.
 */

import type { CognitionInput, ResponseGoal } from "./types";
import type { EmotionType } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT → GOAL MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INTENT_GOAL_MAP: Record<string, ResponseGoal> = {
  // Emotions → écouter ou rassurer
  PEUR: "rassurer", TRISTESSE: "ecouter", COLERE: "ecouter",
  HONTE: "rassurer", JALOUSIE: "ecouter", ANXIETE: "rassurer",
  SOLITUDE: "rassurer", ABANDON: "rassurer", PEUR_ABANDON: "rassurer",
  PEUR_ECHEC: "rassurer", FATIGUE_EMOTIONNELLE: "ecouter",
  CRISE_SECURITE: "rassurer", HARCELEMENT: "ecouter",
  CONFLIT_FAMILLE: "ecouter", CONFLIT_AMI: "ecouter",
  MANQUE_CONFIANCE: "rassurer", STRESS: "rassurer",

  // Positive emotions → valider
  JOIE: "valider", FIERTE: "valider", EXCITATION: "valider",
  AMOUR: "valider", SURPRISE: "valider", GRATITUDE: "valider",
  COMPLIMENT: "valider",

  // Learning → enseigner
  APPRENDRE: "enseigner", QUESTION_COMPLEXE: "enseigner",
  QUESTION_SIMPLE: "enseigner", CURIOSITE: "enseigner",
  QUESTION_EXISTENTIELLE: "enseigner", QUESTION_ABSURDE: "enseigner",

  // Play → jouer
  JEU: "jouer", DEVINETTE: "jouer", AVENTURE: "jouer",
  BLAGUE: "jouer", CHANSON: "jouer", IMAGINATION: "jouer",

  // Stories → engager
  HISTOIRE: "engager",

  // Social → engager
  SALUT: "engager", IDENTITE_BOBBY: "engager", IDENTITE_ENFANT: "engager",
  BESOIN_AFFECTION: "rassurer", BESOIN_AIDE: "ecouter",

  // Daily → engager
  ECOLE: "engager", DODO: "rassurer", NOURRITURE: "engager",
  SANTE: "rassurer", FATIGUE: "rassurer",
  PARTAGE_QUOTIDIEN: "ecouter",

  // Motivation → valider
  OBJECTIF: "valider", REVE_AVENIR: "valider", CREATION: "valider",

  // Challenges
  ECHEC: "rassurer", PERTE: "rassurer",
  ENNUI: "engager", RESISTANCE: "rediriger",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXTUAL GOAL OVERRIDES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NEGATIVE_EMOTIONS: EmotionType[] = [
  "sadness", "fear", "anger", "shame", "jealousy", "confusion",
];

const POSITIVE_EMOTIONS: EmotionType[] = [
  "joy", "excitement", "pride", "love", "gratitude",
];

export function determineGoal(input: CognitionInput): ResponseGoal {
  const { intent, emotion, session } = input;

  // ── Rule 1: Strong negative emotion → ALWAYS listen/reassure ──
  if (emotion.intensity >= 4 && NEGATIVE_EMOTIONS.includes(emotion.type)) {
    return emotion.intensity >= 5 ? "rassurer" : "ecouter";
  }

  // ── Rule 2: Strong positive emotion → validate ──
  if (emotion.intensity >= 4 && POSITIVE_EMOTIONS.includes(emotion.type)) {
    return "valider";
  }

  // ── Rule 3: Session start → warm engagement ──
  if (session.turnCount <= 2) {
    // Unless child starts with strong emotion
    if (emotion.intensity >= 3 && NEGATIVE_EMOTIONS.includes(emotion.type)) {
      return "ecouter";
    }
    return "engager";
  }

  // ── Rule 4: Topic getting deep → approfondir ──
  if (session.topicDepth >= 3 && session.currentTopic) {
    const baseGoal = INTENT_GOAL_MAP[intent];
    // Only deepen if the base goal isn't more urgent
    if (!baseGoal || baseGoal === "engager" || baseGoal === "enseigner") {
      return "approfondir";
    }
  }

  // ── Rule 5: Long monotone session → re-engage ──
  if (session.turnCount > 12 && session.sessionMood === "neutral") {
    if (intent === "GENERAL" || intent === "OUI" || intent === "NON") {
      return "engager";
    }
  }

  // ── Rule 6: Repeated "ENNUI" → actively redirect ──
  if (intent === "ENNUI" && session.lastBobbyGoal === "engager") {
    return "rediriger";
  }

  // ── Rule 7: Intent-based mapping ──
  return INTENT_GOAL_MAP[intent] || "engager";
}
