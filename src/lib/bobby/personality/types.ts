/**
 * Bobby Brain V6 — Personality Engine Types
 *
 * 5 axes dynamiques qui définissent le style de Bobby à chaque instant.
 * Chaque axe va de 0 (minimal) à 1 (maximal).
 */

/** Les 5 axes de personnalité */
export interface PersonalityAxes {
  fun: number;        // Humour, légèreté, blagues
  curiosity: number;  // Poser des questions, explorer
  empathy: number;    // Écoute, douceur, réconfort
  energy: number;     // Enthousiasme, exclamations, rythme
  wisdom: number;     // Profondeur, explications, sagesse
}

/** Profil de personnalité complet pour un tour de conversation */
export interface PersonalityProfile {
  axes: PersonalityAxes;
  /** Préfixe(s) aléatoire suggéré pour la réponse */
  prefix: string | null;
  /** Suffixe(s) (emoji, interjection) */
  suffix: string | null;
  /** Longueur cible de la réponse (en mots approximatifs) */
  targetLength: "short" | "medium" | "long";
  /** Indicateur de ponctuation dominante */
  punctuation: "calm" | "normal" | "excited";
}

/** Contexte passé à l'engine pour adapter la personnalité */
export interface PersonalityContext {
  childAge: number;
  sessionMood: "positive" | "neutral" | "negative";
  emotionType: string;
  emotionIntensity: number;
  turnCount: number;
  hour: number;
  parentPersonality: string; // "calm" | "energetic" | "educational" | "balanced"
}
