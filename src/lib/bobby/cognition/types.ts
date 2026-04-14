/**
 * Bobby Brain V6 — Cognition Layer Types
 */

import type { LocalIntent, EmotionType, DetectedEmotion } from "../localBrain/types";
import type { PersistentFact } from "../persistentMemory";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COGNITION INPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CognitionInput {
  intent: LocalIntent;
  intentConfidence: number;
  emotion: DetectedEmotion;
  childAge: number;
  session: {
    turnCount: number;
    sessionMood: "positive" | "neutral" | "negative";
    topicDepth: number;
    currentTopic: string | null;
    lastBobbyGoal: ResponseGoal | null;
  };
  memory: {
    facts: PersistentFact[];
    interests: Record<string, number>;
    relationshipScore: number;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COGNITION OUTPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CognitionOutput {
  goal: ResponseGoal;
  responseType: ResponseType;
  strategy: ResponseStrategy;
  emotionalTone: EmotionalTone;
  shouldInjectMemory: boolean;
  suggestedFollowUp: FollowUpType;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENUMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ResponseGoal =
  | "enseigner"     // Transmettre un savoir
  | "jouer"         // Lancer ou continuer un jeu
  | "rassurer"      // Répondre à une émotion négative
  | "engager"       // Relancer l'intérêt
  | "approfondir"   // Creuser le sujet actuel
  | "valider"       // Encourager, féliciter
  | "rediriger"     // Changer de sujet prudemment
  | "ecouter";      // Empathie pure, pas de conseil

export type ResponseType =
  | "fact"          // Information factuelle
  | "question"      // Question ouverte
  | "game"          // Proposition/tour de jeu
  | "story"         // Fragment d'histoire
  | "empathy"       // Réponse émotionnelle pure
  | "humor"         // Blague, trait d'esprit
  | "challenge"     // Défi, quiz
  | "reflection";   // "Et toi, qu'est-ce que tu en penses ?"

export type ResponseStrategy =
  | "court_fun"     // 1-2 phrases, ton léger
  | "educatif"      // Explication adaptée à l'âge
  | "calme"         // Ton doux, rythme lent
  | "energique"     // Enthousiaste, exclamations
  | "mystere"       // Créer du suspense
  | "complice";     // Ton "entre nous"

export type EmotionalTone =
  | "warm_supportive"
  | "enthusiastic"
  | "curious"
  | "playful"
  | "calm_gentle"
  | "proud"
  | "neutral_friendly"
  | "mysterious";

export type FollowUpType =
  | "open_question"     // Question ouverte libre
  | "related_question"  // Question liée au sujet
  | "deeper_question"   // Approfondir
  | "topic_bridge"      // Pont vers un autre sujet
  | "game_turn"         // Tour de jeu
  | "memory_callback"   // Rappeler un souvenir
  | "none";             // Pas de relance
