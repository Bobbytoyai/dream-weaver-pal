/**
 * Bobby AI — Response Selector Types
 */

export type ResponseType = "question" | "jeu" | "soutien" | "fun" | "proposition" | "imagination";
export type EnergyLevel = "low" | "medium" | "high";

export interface TaggedResponse {
  text: string;
  type: ResponseType;
  energy: EnergyLevel;
}

export interface MultiResponseEntry {
  category: string;
  input: string;
  emotion: string;
  tags: string[];
  responses: TaggedResponse[];
}

export interface BehavioralMemory {
  lastInputs: string[];
  lastResponseTexts: string[];
  lastIntents: string[];
  favoriteTopics: Record<string, number>;
  preferredTypes: Record<string, number>;
  emotionalState: string;
  emotionHistory: string[];
  engagementLevel: number;
  confidenceLevel: number;
  responseScores: Record<string, number>;
  topicsHistory: string[];
  lastInteractions: { input: string; response: string; emotion: string; timestamp: number }[];
}
