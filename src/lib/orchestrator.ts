/**
 * Bobby Intelligence Orchestrator v4.8 — Offline-First
 * 
 * Central brain that decides:
 * → what to say (response selection — OFFLINE FIRST)
 * → how to say it (emotion + voice tone)
 * → what face to show (facial expression)
 * → what action to trigger (follow-up, game, story)
 * 
 * Pipeline: detect_intent → check_local_cache → check_offline_kb → detect_emotion → retrieve_memory → select_response → assign_expression → generate_follow_up
 * 
 * RULE: Always try local/offline before calling AI.
 * AI is only used when offline confidence < 0.7 AND network is available.
 */

import { detectBobbyEmotion, detectEmotionIntensity } from "./emotionMapper";
import { detectEmotionForTTS } from "./voicePipeline";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { Emotion } from "./voicePipeline";
import type { ChildMemory } from "./memoryService";
import { getOfflineResponse } from "./offlineEngine";
import { getCachedResponse, isSimpleGreeting } from "./responseCache";
import { isHighLatency } from "./stabilityEngine";
import { lookupCachedAI } from "./localMemoryStore";
import { matchQAWithConfidence, detectOfflineIntent } from "./offline-intents";

// Intents that are safe to handle offline without QA match
// (simple, low-information responses work fine here)
const SIMPLE_OFFLINE_INTENTS = new Set([
  "GREETING", "FAREWELL", "COMPLIMENT", "CONTROL",
  "CALM_REQUEST", "HUMOR", "EMOTION_POSITIVE", "EMOTION_NEGATIVE",
  "IDENTITY", "HELP",
]);
// HIGH-CONFIDENCE threshold for routing complex questions offline
const HIGH_CONFIDENCE_OFFLINE = 0.80;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type BobbyIntent = "story" | "game" | "emotion_support" | "question" | "calm" | "chat" | "greeting" | "boredom" | "logic";

export interface OrchestratorInput {
  userText: string;
  childName: string;
  childAge: number;
  memory: ChildMemory | null;
  isOffline: boolean;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}

export interface OrchestratorOutput {
  /** The response text (only set for local/cached responses — null means "ask AI") */
  response: string | null;
  /** Detected intent */
  intent: BobbyIntent;
  /** Child's detected emotion from their input */
  childEmotion: Emotion | undefined;
  /** Bobby's face expression to display */
  faceState: FaceState;
  /** Expression intensity 0.4–1.0 */
  faceIntensity: number;
  /** TTS voice tone to use */
  voiceTone: Emotion | undefined;
  /** AI mode hint for bobby-brain */
  aiMode: string;
  /** Memory context string to inject into AI prompt */
  memoryContext: string | undefined;
  /** Source of the response */
  source: "cache" | "offline" | "local_ai_cache" | "ai";
  /** Suggested follow-up type */
  followUpType?: "question" | "suggestion" | "game" | "story";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. INTENT DETECTION (enhanced)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectIntent(text: string): BobbyIntent {
  const lower = text.toLowerCase();

  // Greeting
  if (/^(salut|bonjour|coucou|hey|hello|yo|re)\b/i.test(lower) && lower.length < 30) return "greeting";

  // Story
  if (/raconte|histoire|conte|fable|il était une fois/.test(lower)) return "story";

  // Game / play
  if (/jou[eo]|devinette|quiz|charade|on joue|jeu/.test(lower)) return "game";

  // Emotion support
  if (/peur|triste|pleure|mal|cauchemar|effrayé|seul|malheureux|colère|fâché|énervé|pas bien|je suis triste/.test(lower)) return "emotion_support";

  // Calm / sleep
  if (/dodo|dormir|nuit|fatigué|sommeil|bonne nuit|calme/.test(lower)) return "calm";

  // Boredom
  if (/ennui|ennuie|rien à faire|c'est nul|je m'ennuie|bof/.test(lower)) return "boredom";

  // Logic / reasoning
  if (/pourquoi|comment ça marche|explique|c'est quoi|réfléchi|logique|si on|imagine que/.test(lower)) return "logic";

  // Question
  if (/\?$|pourquoi|comment|c'est quoi|qu'est-ce|sais pas/.test(lower)) return "question";

  return "chat";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CHILD EMOTION DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectChildEmotion(text: string): Emotion | undefined {
  return detectEmotionForTTS(text);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. MEMORY RETRIEVAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildMemoryContext(memory: ChildMemory | null, intent: BobbyIntent): string | undefined {
  if (!memory) return undefined;

  const parts: string[] = [];

  // Priority 1: child name (always available via memory object)

  // Priority 2: recent preferences
  const prefs = memory.preferences as Record<string, unknown>;
  if (prefs && Object.keys(prefs).length > 0) {
    const relevantPrefs = Object.entries(prefs)
      .slice(0, 5) // max 5 most recent
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    parts.push(`Préférences: ${relevantPrefs}`);
  }

  // Priority 3: favorite themes (useful for stories/games)
  if (memory.favoriteThemes.length > 0 && (intent === "story" || intent === "game" || intent === "chat")) {
    parts.push(`Thèmes favoris: ${memory.favoriteThemes.join(", ")}`);
  }

  // Priority 4: story count (for personalization)
  if (memory.totalStoriesHeard > 0) {
    parts.push(`Histoires écoutées: ${memory.totalStoriesHeard}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. RESPONSE SELECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function selectResponse(
  input: OrchestratorInput,
  intent: BobbyIntent
): { response: string | null; source: "cache" | "offline" | "local_ai_cache" | "ai" } {
  // Fast path 1: cached greeting (instant, <1ms)
  if (intent === "greeting" && isSimpleGreeting(input.userText)) {
    return { response: getCachedResponse("greeting"), source: "cache" };
  }

  // FIX B4: adventure → treated as story request (offline)
  if (intent === "adventure" || intent === "boredom") {
    const offlineResp = getOfflineResponse(input.userText, input.childName);
    if (offlineResp.text) return { response: offlineResp.text, source: "offline" };
  }

  // Fast path 2: offline engine — smart routing (not just "any recognized intent")
  // Only go offline for: (a) simple intents (greetings, emotions, control) OR
  // (b) QA match with confidence >= 0.80 (specific factual answers)
  // Complex questions (QUESTION, EDUCATION, ADVENTURE, LOGIC) go to AI for rich answers
  const qaResult = matchQAWithConfidence(input.userText);
  if (qaResult && qaResult.confidence >= HIGH_CONFIDENCE_OFFLINE) {
    const offlineResp = getOfflineResponse(input.userText, input.childName);
    return { response: offlineResp.text, source: "offline" };
  }
  const detectedOfflineIntent = detectOfflineIntent(input.userText);
  if (SIMPLE_OFFLINE_INTENTS.has(detectedOfflineIntent)) {
    const offlineResp = getOfflineResponse(input.userText, input.childName);
    return { response: offlineResp.text, source: "offline" };
  }

  // Fast path 3: local AI response cache (previously cached AI responses)
  const cachedAI = lookupCachedAI(input.userText);
  if (cachedAI) {
    console.log("[Orchestrator] 💾 Using cached AI response");
    return { response: cachedAI.answer, source: "local_ai_cache" };
  }

  // Path 4: if offline or high latency, force offline fallback
  if (input.isOffline || isHighLatency()) {
    const offlineResp = getOfflineResponse(input.userText, input.childName);
    return { response: offlineResp.text, source: "offline" };
  }

  // Default: delegate to AI (bobby-brain) — only when local can't handle
  return { response: null, source: "ai" };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. EXPRESSION ASSIGNMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function assignExpression(
  responseText: string | null,
  intent: BobbyIntent,
  childEmotion: Emotion | undefined
): { faceState: FaceState; faceIntensity: number; voiceTone: Emotion | undefined } {
  // If we have a response, detect from it
  if (responseText) {
    return {
      faceState: detectBobbyEmotion(responseText),
      faceIntensity: detectEmotionIntensity(responseText),
      voiceTone: detectEmotionForTTS(responseText) || childEmotion,
    };
  }

  // Pre-assign based on intent (AI will refine later)
  const intentFaceMap: Record<BobbyIntent, FaceState> = {
    greeting: "happy",
    story: "excited",
    game: "excited",
    emotion_support: "reassuring",
    calm: "calm",
    boredom: "curious",
    logic: "thinking",
    question: "curious",
    chat: "happy",
  };

  return {
    faceState: intentFaceMap[intent] || "happy",
    faceIntensity: 0.6,
    voiceTone: childEmotion,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. FOLLOW-UP ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function suggestFollowUp(intent: BobbyIntent, childEmotion: Emotion | undefined): OrchestratorOutput["followUpType"] {
  if (childEmotion === "sad" || childEmotion === "scared") return "suggestion";
  if (childEmotion === "bored") return "game";

  switch (intent) {
    case "greeting": return "question";
    case "story": return "story";
    case "game": return "game";
    case "boredom": return "game";
    case "emotion_support": return "suggestion";
    case "calm": return undefined;
    case "logic": return "question";
    case "question": return "question";
    default: return "question";
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. AUTO-CORRECTION / SILENCE HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// FIX I4: 8 phrases variées — naturelles, amusantes, adaptées enfants
const SILENCE_RELAUNCHES = [
  "Je t'écoute !",
  "Tu peux me parler, je suis là !",
  "Dis-moi ce que tu veux faire !",
  "Hé, je suis là ! Tu veux jouer ?",
  "Je t'entends… tu voulais dire quoi ?",
  "Tu es là ? Je t'écoute !",
  "Dis-moi, qu'est-ce qui te ferait plaisir ?",
  "Une histoire ? Un jeu ? Dis-moi !",
];

let silenceRelaunchIdx = 0;

export function getSilenceRelaunch(): string {
  const text = SILENCE_RELAUNCHES[silenceRelaunchIdx % SILENCE_RELAUNCHES.length];
  silenceRelaunchIdx++;
  return text;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ORCHESTRATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function orchestrate(input: OrchestratorInput): OrchestratorOutput {
  // 1. Intent
  const intent = detectIntent(input.userText);

  // 2. Child emotion
  const childEmotion = detectChildEmotion(input.userText);

  // 3. Memory
  const memoryContext = buildMemoryContext(input.memory, intent);

  // 4. Response selection
  const { response, source } = selectResponse(input, intent);

  // 5. Expression
  const { faceState, faceIntensity, voiceTone } = assignExpression(response, intent, childEmotion);

  // 6. Follow-up
  const followUpType = suggestFollowUp(intent, childEmotion);

  // FIX B4: ADVENTURE intent → story mode (adventure IS a story request)
  // AI mode mapping
  const aiModeMap: Record<BobbyIntent, string> = {
    story: "story",
    game: "game",
    emotion_support: "chat",
    calm: "chat",
    greeting: "chat",
    boredom: "game",   // boredom → propose a game (more engaging than chat)
    logic: "chat",
    question: "chat",
    chat: "chat",
  };

  return {
    response,
    intent,
    childEmotion,
    faceState,
    faceIntensity,
    voiceTone,
    aiMode: aiModeMap[intent] || "chat",
    memoryContext,
    source,
    followUpType,
  };
}

/**
 * Refine expression after AI response is received.
 * Call this when the full AI text is available.
 */
export function refineExpression(responseText: string): {
  faceState: FaceState;
  faceIntensity: number;
} {
  return {
    faceState: detectBobbyEmotion(responseText),
    faceIntensity: detectEmotionIntensity(responseText),
  };
}
