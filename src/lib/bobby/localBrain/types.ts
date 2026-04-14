import type { FaceState } from "@/components/hologram/useFaceAnimation";

export interface ConversationTurn {
  role: "child" | "bobby";
  text: string;
  intent?: string;
  emotion?: string;
  emotionIntensity?: number;
  topic?: string;
  timestamp: number;
}

export interface ShortTermMemory {
  turns: ConversationTurn[];
  currentEmotion: string;
  currentIntensity: number;
  currentTopic: string | null;
  topicDepth: number;
  sessionMood: "positive" | "neutral" | "negative";
  turnCount: number;
  recentResponses: string[];
}

export type LocalIntent =
  // Emotions (12)
  | "PEUR" | "TRISTESSE" | "COLERE" | "JOIE" | "ENNUI" | "HONTE"
  | "JALOUSIE" | "SURPRISE" | "FIERTE" | "AMOUR" | "TIMIDITE" | "CONFUSION"
  // Social (8)
  | "CONFLIT_FAMILLE" | "CONFLIT_AMI" | "SOLITUDE" | "HARCELEMENT"
  | "BESOIN_AFFECTION" | "BESOIN_AIDE" | "MANQUE_CONFIANCE" | "GRATITUDE"
  // Daily life (8)
  | "ECOLE" | "DEVOIRS" | "NOURRITURE" | "DODO" | "REVEILS" | "ANIMAUX_COMPAGNIE" | "VACANCES" | "ACTIVITE"
  // Requests (8)
  | "HISTOIRE" | "JEU" | "BLAGUE" | "CHANSON" | "DEVINETTE" | "AVENTURE" | "IMAGINATION" | "APPRENDRE"
  // Conversation (9)
  | "SALUT" | "AU_REVOIR" | "OUI" | "NON" | "QUESTION_SIMPLE" | "QUESTION_COMPLEXE" | "IDENTITE_BOBBY" | "IDENTITE_ENFANT" | "COMPLIMENT"
  // Safety
  | "CONTENU_BLOQUE" | "CRISE_SECURITE"
  // Comprehension
  | "NOT_UNDERSTOOD" | "DEMANDE_LANGUE"
  // Situational
  | "FATIGUE" | "ECHEC" | "OBJECTIF" | "SANTE" | "PERTE" | "REVE_AVENIR"
  | "ANXIETE" | "ABANDON" | "MENSONGE" | "EXCITATION" | "AMOUREUX"
  | "PERFECTIONNISME" | "COMPARAISON" | "FATIGUE_EMOTIONNELLE"
  | "RETRAIT" | "PEUR_ABANDON" | "PEUR_ECHEC" | "AVERSION" | "PEOPLE_PLEASING"
  | "CURIOSITE" | "CREATION" | "IDENTITE_PEUR" | "MAUVAIS_COMPORTEMENT"
  | "STRESS" | "PARTAGE_QUOTIDIEN" | "RESISTANCE" | "ENVIE"
  | "QUESTION_ABSURDE" | "QUESTION_EXISTENTIELLE"
  // Catch-all
  | "GENERAL";

export type EmotionType = "joy" | "sadness" | "fear" | "anger" | "love" | "curiosity" | "pride"
  | "surprise" | "calm" | "excitement" | "boredom" | "shame" | "jealousy" | "confusion"
  | "gratitude" | "determination" | "neutral";

export interface DetectedEmotion {
  type: EmotionType;
  intensity: number;
}

export interface ResponseTemplate {
  empathy: string[];
  response: string[];
  opening: string[];
}

export interface IntentRule {
  intent: LocalIntent;
  patterns: RegExp[];
  priority: number;
}
