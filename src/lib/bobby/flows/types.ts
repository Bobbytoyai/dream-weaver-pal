/**
 * Bobby Brain V6 — Flow Engine Types
 *
 * Définit les structures pour les scénarios multi-tours :
 * jeux, histoires, apprentissage, conversations émotionnelles.
 */

import type { LocalIntent } from "../localBrain/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type FlowType =
  | "game"          // Jeu interactif (devinettes, quiz, etc.)
  | "story"         // Histoire interactive avec choix
  | "learning"      // Mini-leçon progressive
  | "emotional"     // Accompagnement émotionnel multi-tours
  | "exploration"   // Exploration d'un sujet (questions en chaîne)
  | "free";         // Conversation libre (pas de flow actif)

export type FlowStatus = "idle" | "active" | "paused" | "completed" | "interrupted";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW STEP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FlowStep {
  id: string;
  /** Texte de Bobby pour cette étape */
  bobbyText: string | ((childName: string, childAge: number) => string);
  /** Étape suivante par défaut */
  next: string | null;
  /** Transitions conditionnelles (intent → step id) */
  branches?: Record<string, string>;
  /** Réponses attendues (regex pour matcher la réponse de l'enfant) */
  expectedPatterns?: RegExp[];
  /** Émotion de Bobby pour cette étape */
  emotion?: string;
  /** Délai max avant relance (ms) — 0 = pas de relance */
  timeoutMs?: number;
  /** Texte de relance si timeout */
  nudgeText?: string;
  /** Marque la fin du flow */
  isEnd?: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW DEFINITION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FlowDefinition {
  id: string;
  type: FlowType;
  name: string;
  /** Intents qui déclenchent ce flow */
  triggerIntents: LocalIntent[];
  /** Mots-clés déclencheurs (lowercase) */
  triggerKeywords?: string[];
  /** Âge minimum */
  ageMin: number;
  /** Âge maximum */
  ageMax: number;
  /** Étapes du flow */
  steps: Record<string, FlowStep>;
  /** ID de la première étape */
  startStep: string;
  /** Priorité (plus haut = prioritaire) */
  priority: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW STATE (runtime)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FlowState {
  flowId: string;
  type: FlowType;
  status: FlowStatus;
  currentStepId: string;
  stepHistory: string[];
  turnCount: number;
  startedAt: number;
  pausedAt: number | null;
  /** Données custom du flow (scores, réponses, etc.) */
  data: Record<string, unknown>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW ENGINE RESULT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface FlowResult {
  text: string;
  emotion: string;
  /** true si le flow a pris le contrôle de la réponse */
  handled: boolean;
  /** true si le flow vient de se terminer */
  flowEnded: boolean;
  /** Texte de transition si le flow se termine */
  transitionText?: string;
}
