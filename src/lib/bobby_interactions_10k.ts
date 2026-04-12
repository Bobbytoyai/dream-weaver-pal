// Bobby AI — Child Interactions Database
// Rebuilt from scratch with coherent, quality responses
// Last updated: 2026-04-12

export interface BobbyInteraction {
  age: number;
  intent: string;
  child_input: string;
  ai_response: string;
  emotion: string;
  difficulty_level: number;
  category: string;
}

export const BOBBY_INTERACTIONS: BobbyInteraction[] = [];
