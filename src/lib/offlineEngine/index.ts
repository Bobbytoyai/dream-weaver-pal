/**
 * Bobby Offline Engine — Barrel re-exports
 * Maintains backward compatibility for all existing imports.
 */

// ─── Network state ──────────────────────────────────────────
export { getNetworkMode, isOffline, onNetworkChange } from "./network";
export type { NetworkMode } from "./network";

// ─── Response engine ────────────────────────────────────────
export { getOfflineResponse, canHandleOffline } from "./responseEngine";
export type { OfflineResponse } from "./responseEngine";

// ─── Re-exports from sub-modules (backward compat) ─────────
export { normalizeInput, detectOfflineIntent, isBlockedContent, matchQA, SAFE_REDIRECTS,
  getSafetyLevel, detectSafetyCategory, extractSafetyKeyword, getSafeRedirect,
  storeSafetyAlertRecord, getSafetyAlertRecords, clearSafetyAlertRecords, getUnreadAlertCount,
} from "../offline-intents";
export type { OfflineIntent, SafetyLevel, SafetyAlertRecord } from "../offline-intents";
export { detectStoryTheme, LOCAL_STORIES, RESPONSES, RIDDLES, TRUE_FALSE, ANIMAL_QUIZ, TONGUE_TWISTERS, WOULD_YOU_RATHER } from "../offline-stories";
export type { StoryTheme, MiniGameType } from "../offline-stories";
export { resetConversationContext, context, updateContext, pickRandom, personalize, detectMoodFromText, buildContextualPrefix, getFollowUp, handleConversationalContext, handleFollowUpAnswer, handleContextualContinuation } from "../offline-context";
export type { Mood } from "../offline-context";
