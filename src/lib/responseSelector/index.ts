/**
 * Bobby AI — Smart Response Selector v2.0 (barrel)
 * Re-exports all sub-modules for backward compatibility.
 */

// Types
export type { ResponseType, EnergyLevel, TaggedResponse, MultiResponseEntry, BehavioralMemory } from "./types";

// Memory
export {
  getMemory,
  resetMemory,
  recordInput,
  recordResponse,
  recordIntent,
  recordEmotion,
  recordInteraction,
  updateEngagement,
  setEmotionalState,
  boostResponseScore,
  penalizeResponseScore,
} from "./memory";

// Scoring & Selection
export {
  getDominantEmotion,
  isIntentRepeated,
  selectBestResponse,
  selectNonRepetitiveResponse,
} from "./scoring";

// Conversational Rebond
export { getConversationalRebond } from "./rebond";

// Response Database
export { BOBBY_MULTI_RESPONSES } from "./responses";

// Matcher & Proactive
export { findMultiResponse, getProactiveRelance } from "./matcher";
