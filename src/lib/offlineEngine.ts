/**
 * Bobby Offline Conversational Brain v3.0
 * 
 * Refactored into modules:
 * - qa-database.ts: QA trigger/response pairs
 * - offline-intents.ts: Intent detection, normalization, safety, fuzzy matching
 * - offline-stories.ts: Stories, games, response pools
 * - offline-context.ts: Conversation context, memory, multi-turn
 * 
 * Pipeline: STT → Normalize → Intent → Context → Response → Follow-up → TTS
 */

// ─── Re-exports for backward compatibility ─────────────────
export { normalizeInput, detectOfflineIntent, isBlockedContent, matchQA, SAFE_REDIRECTS,
  getSafetyLevel, detectSafetyCategory, extractSafetyKeyword, getSafeRedirect,
  storeSafetyAlertRecord, getSafetyAlertRecords, clearSafetyAlertRecords, getUnreadAlertCount,
} from "./offline-intents";
export type { OfflineIntent, SafetyLevel, SafetyAlertRecord } from "./offline-intents";
export { detectStoryTheme, LOCAL_STORIES, RESPONSES, RIDDLES, TRUE_FALSE, ANIMAL_QUIZ, TONGUE_TWISTERS, WOULD_YOU_RATHER } from "./offline-stories";
export type { StoryTheme, MiniGameType } from "./offline-stories";
export { resetConversationContext, context, updateContext, pickRandom, personalize, detectMoodFromText, buildContextualPrefix, getFollowUp, handleConversationalContext, handleFollowUpAnswer, handleContextualContinuation } from "./offline-context";
export type { Mood } from "./offline-context";

// ─── Network State ──────────────────────────────────────────
export type NetworkMode = "ONLINE" | "OFFLINE" | "HYBRID";

let currentMode: NetworkMode = navigator.onLine ? "ONLINE" : "OFFLINE";
const listeners = new Set<(mode: NetworkMode) => void>();

function updateMode() {
  const newMode: NetworkMode = navigator.onLine ? "ONLINE" : "OFFLINE";
  if (newMode !== currentMode) {
    currentMode = newMode;
    console.log(`[Offline] 🌐 Network mode: ${newMode}`);
    listeners.forEach(cb => cb(newMode));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", updateMode);
  window.addEventListener("offline", updateMode);
}

export function getNetworkMode(): NetworkMode { return currentMode; }
export function isOffline(): boolean { return currentMode === "OFFLINE"; }
export function onNetworkChange(cb: (mode: NetworkMode) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ─── Imports from modules ───────────────────────────────────
import { normalizeInput, detectOfflineIntent, isBlockedContent, matchQA, SAFE_REDIRECTS,
  getSafetyLevel, detectSafetyCategory, extractSafetyKeyword, getSafeRedirect, storeSafetyAlertRecord,
} from "./offline-intents";
import { eventBus } from "./eventBus";
import { detectStoryTheme, LOCAL_STORIES, RESPONSES, pickMiniGame, TONGUE_TWISTERS, FOLLOW_UPS,
  isAnimalGameActive, isAnimalGameTrigger, startAnimalGame, handleAnimalGameInput,
  isMemoryGameActive, isMemoryGameTrigger, startMemoryGame, handleMemoryGameInput,
  isLearningActive, isLearningTrigger, startLearning, handleLearningInput,
} from "./offline-stories";
import type { MiniGameType } from "./offline-stories";
import { context, updateContext, detectMoodFromText, pickRandom, personalize, handleFollowUpAnswer, handleContextualContinuation, handleConversationalContext, buildContextualPrefix, getFollowUp } from "./offline-context";
import { BOBBY_INTERACTIONS } from "./bobby_interactions_10k";
import { adaptiveEngine, type AdaptiveContext } from "./adaptiveEngine";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN RESPONSE ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface OfflineResponse {
  text: string;
  intent: string;
  isOffline: boolean;
  theme?: string;
  gameType?: string;
}

export function getOfflineResponse(
  text: string,
  childName?: string,
  childAge = 8,
): OfflineResponse {
  const normalized = normalizeInput(text);

  // Update mood from text
  const detectedMood = detectMoodFromText(text);
  if (detectedMood) context.mood = detectedMood;

  // 1. Safety filter — with severity-aware response + parent alert
  if (isBlockedContent(text)) {
    const level = getSafetyLevel(text) ?? "MEDIUM";
    const category = detectSafetyCategory(text);
    const keyword = extractSafetyKeyword(text);
    const resp = getSafeRedirect(text);

    // Store alert for parent review
    storeSafetyAlertRecord({
      severity: level, category, keyword,
      fullText: text.slice(0, 200),
      timestamp: Date.now(),
      childName: childName ?? "enfant",
    });

    // Emit real-time parent alert via event bus
    try {
      eventBus.emit({
        type: "SAFETY_ALERT",
        severity: level,
        category,
        keyword,
        fullText: text.slice(0, 200),
        timestamp: Date.now(),
        childName: childName ?? "enfant",
      });
    } catch { /* eventBus unavailable in some test environments */ }

    updateContext("BLOCKED", "", resp);
    return { text: resp, intent: "BLOCKED", isOffline: true };
  }

  // 1b-1g. Active games
  if (isAnimalGameActive()) {
    const gameResp = handleAnimalGameInput(text, childName);
    updateContext("PLAY_REQUEST", text, gameResp);
    return { text: gameResp, intent: "PLAY_REQUEST", isOffline: true, gameType: "animal_guess" };
  }
  if (isAnimalGameTrigger(text)) {
    const gameResp = startAnimalGame(childName, 7);
    updateContext("PLAY_REQUEST", text, gameResp);
    return { text: gameResp, intent: "PLAY_REQUEST", isOffline: true, gameType: "animal_guess" };
  }
  if (isMemoryGameActive()) {
    const gameResp = handleMemoryGameInput(text, childName);
    updateContext("PLAY_REQUEST", text, gameResp);
    return { text: gameResp, intent: "PLAY_REQUEST", isOffline: true, gameType: "memory_game" };
  }
  if (isMemoryGameTrigger(text)) {
    const gameResp = startMemoryGame(childName, 7);
    updateContext("PLAY_REQUEST", text, gameResp);
    return { text: gameResp, intent: "PLAY_REQUEST", isOffline: true, gameType: "memory_game" };
  }
  if (isLearningActive()) {
    const gameResp = handleLearningInput(text, childName);
    updateContext("EDUCATION", text, gameResp);
    return { text: gameResp, intent: "EDUCATION", isOffline: true, gameType: "learning" };
  }
  if (isLearningTrigger(text)) {
    const gameResp = startLearning(childName, 7);
    updateContext("EDUCATION", text, gameResp);
    return { text: gameResp, intent: "EDUCATION", isOffline: true, gameType: "learning" };
  }

  // 2. Follow-up answers
  const followUpAnswer = handleFollowUpAnswer(text, childName);
  if (followUpAnswer) return followUpAnswer;

  // 3. Contextual continuation
  const miniGameFn = () => pickMiniGame(pickRandom);
  const continuation = handleContextualContinuation(text, childName, miniGameFn);
  if (continuation) {
    updateContext(continuation.intent as any, context.lastTopic, continuation.text);
    return continuation;
  }

  // 3b. Multi-turn context
  const contextual = handleConversationalContext(text, childName);
  if (contextual) return contextual;

  // 4. QA fuzzy match
  const qaMatch = matchQA(normalized);
  if (qaMatch) {
    const response = pickRandom(qaMatch.responses, `qa_${qaMatch.triggers[0]}`);
    const intent = qaMatch.intent || detectOfflineIntent(text);

    if (intent === "STORY_REQUEST") {
      const theme = detectStoryTheme(text);
      const story = pickRandom(LOCAL_STORIES[theme], `story_${theme}`);
      const finalText = personalize(story, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, theme };
    }
    if (intent === "PLAY_REQUEST") {
      const game = pickMiniGame(pickRandom);
      const finalText = personalize(game.text, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, gameType: game.type };
    }

    const finalText = personalize(response, childName);
    const followUp = getFollowUp(intent);
    const fullResponse = finalText + followUp;
    updateContext(intent, text, fullResponse);
    return { text: fullResponse, intent, isOffline: true };
  }

  // 4b. 🧠 Secondary fallback: Bobby 10K interaction database (adaptive match)
  const adaptCtx: AdaptiveContext = {
    childAge,
    detectedEmotion: "neutral",
    sessionInteractionCount: 0,
    confidenceScore: 0.7,
    isOffline: true,
  };
  const interactionMatch = adaptiveEngine.findBestMatch(normalized, adaptCtx, BOBBY_INTERACTIONS);
  if (interactionMatch) {
    const finalText = personalize(interactionMatch.ai_response, childName);
    const followUp = getFollowUp(interactionMatch.intent as any);
    const fullResponse = finalText + followUp;
    updateContext(interactionMatch.intent as any, text, fullResponse);
    return { text: fullResponse, intent: interactionMatch.intent, isOffline: true };
  }

  // 5. Intent-based fallback
  const intent = detectOfflineIntent(text);
  let response: string;

  switch (intent) {
    case "BLOCKED":
      response = pickRandom(SAFE_REDIRECTS, "BLOCKED");
      break;
    case "GREETING":
      response = pickRandom(RESPONSES.GREETING, "GREETING");
      break;
    case "FAREWELL":
      response = pickRandom(RESPONSES.FAREWELL, "FAREWELL");
      break;
    case "STORY_REQUEST": {
      const theme = detectStoryTheme(text);
      const story = pickRandom(LOCAL_STORIES[theme], `story_${theme}`);
      const finalText = personalize(story, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, theme };
    }
    case "PLAY_REQUEST": {
      const game = pickMiniGame(pickRandom);
      const finalText = personalize(game.text, childName);
      updateContext(intent, text, finalText);
      return { text: finalText, intent, isOffline: true, gameType: game.type };
    }
    case "QUESTION":
    case "QUESTION_SIMPLE":
      if (/^(oui|ouais|ok|d'accord|yep|yes)\s*$/i.test(normalized)) {
        response = pickRandom(RESPONSES.QUESTION_SIMPLE_YES, "YES");
      } else if (/^(non|nan|nope)\s*$/i.test(normalized)) {
        response = pickRandom(RESPONSES.QUESTION_SIMPLE_NO, "NO");
      } else {
        response = pickRandom(RESPONSES.QUESTION_COMPLEX, "COMPLEX");
      }
      break;
    case "EMOTION_POSITIVE":
      response = pickRandom(RESPONSES.EMOTION_POSITIVE, "EMO_POS");
      break;
    case "EMOTION_NEGATIVE":
      response = pickRandom(RESPONSES.EMOTION_NEGATIVE, "EMO_NEG");
      break;
    case "IDENTITY":
      response = pickRandom(RESPONSES.IDENTITY, "IDENTITY");
      break;
    case "COMPLIMENT":
      response = pickRandom(RESPONSES.COMPLIMENT, "COMPLIMENT");
      break;
    case "CALM_REQUEST":
      response = pickRandom(RESPONSES.CALM, "CALM");
      break;
    case "HELP":
      response = pickRandom(RESPONSES.HELP, "HELP");
      break;
    case "CONTROL":
      response = pickRandom(RESPONSES.CONTROL, "CONTROL");
      break;
    case "HUMOR": {
      const useJoke = Math.random() > 0.3;
      if (useJoke) {
        const jokes = [
          "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau ! 😄",
          "Qu'est-ce qu'un canif ? Un petit fien ! 😂",
          "Quel est le comble pour un électricien ? De ne pas être au courant ! ⚡😄",
          "Pourquoi le livre de maths est triste ? Parce qu'il a trop de problèmes ! 📚😢",
          "Que dit une imprimante dans l'eau ? J'ai papier ! 🖨️😂",
          "Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat-peint de Noël ! 🐱🎄",
          "Quel est le sport préféré des insectes ? Le criquet ! 🦗⚽",
          "Pourquoi les fantômes sont-ils de mauvais menteurs ? Parce qu'on voit à travers ! 👻😄",
        ];
        response = pickRandom(jokes, "JOKES");
      } else {
        response = pickRandom(TONGUE_TWISTERS, "tongue_twister_humor");
      }
      break;
    }
    case "ADVENTURE":
      response = pickRandom(RESPONSES.ADVENTURE, "ADVENTURE");
      break;
    case "EDUCATION":
      response = pickRandom(RESPONSES.EDUCATION, "EDUCATION");
      break;
    case "UNKNOWN":
    default:
      response = pickRandom(RESPONSES.OFFLINE_FALLBACK, "FALLBACK");
      break;
  }

  const contextPrefix = buildContextualPrefix(childName);
  const finalText = personalize(response, childName);
  const followUp = getFollowUp(intent);
  const fullResponse = (contextPrefix ? contextPrefix + " " : "") + finalText + followUp;
  updateContext(intent, text, fullResponse);
  return { text: fullResponse, intent, isOffline: true };
}

/**
 * Decides whether the offline engine can handle this request.
 */
export function canHandleOffline(text: string): boolean {
  if (isBlockedContent(text)) return true;
  if (matchQA(normalizeInput(text))) return true;
  const intent = detectOfflineIntent(text);
  return intent !== "UNKNOWN";
}
