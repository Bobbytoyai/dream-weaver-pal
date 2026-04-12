/**
 * Bobby Intelligence Orchestrator v5.0 — 100% Offline
 * 
 * Pipeline: detect_intent → detect_emotion → select_response → assign_expression
 * All responses are local. No AI fallback. No network calls.
 */

import { detectBobbyEmotion, detectEmotionIntensity } from "./emotionMapper";
import { detectEmotionForTTS } from "./voicePipeline";
import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { Emotion } from "./voicePipeline";
import type { ChildMemory } from "./memoryService";
import { getOfflineResponse } from "./offlineEngine";
import { getCachedResponse, isSimpleGreeting } from "./responseCache";

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
  response: string | null;
  intent: BobbyIntent;
  childEmotion: Emotion | undefined;
  faceState: FaceState;
  faceIntensity: number;
  voiceTone: Emotion | undefined;
  aiMode: string;
  memoryContext: string | undefined;
  source: "cache" | "offline";
  followUpType?: "question" | "suggestion" | "game" | "story";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. INTENT DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectIntent(text: string): BobbyIntent {
  const lower = text.toLowerCase();
  if (/^(salut|bonjour|coucou|hey|hello|yo|re)\b/i.test(lower) && lower.length < 30) return "greeting";
  if (/raconte|histoire|conte|fable|il était une fois/.test(lower)) return "story";
  if (/jou[eo]|devinette|quiz|charade|on joue|jeu/.test(lower)) return "game";
  if (/peur|triste|pleure|mal|cauchemar|effrayé|seul|malheureux|colère|fâché|énervé|pas bien|je suis triste/.test(lower)) return "emotion_support";
  if (/dodo|dormir|nuit|fatigué|sommeil|bonne nuit|calme/.test(lower)) return "calm";
  if (/ennui|ennuie|rien à faire|c'est nul|je m'ennuie|bof/.test(lower)) return "boredom";
  if (/pourquoi|comment ça marche|explique|c'est quoi|réfléchi|logique|si on|imagine que/.test(lower)) return "logic";
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
// 3. MEMORY CONTEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildMemoryContext(memory: ChildMemory | null, intent: BobbyIntent): string | undefined {
  if (!memory) return undefined;
  const parts: string[] = [];
  const prefs = memory.preferences as Record<string, unknown>;
  if (prefs && Object.keys(prefs).length > 0) {
    const relevantPrefs = Object.entries(prefs).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(", ");
    parts.push(`Préférences: ${relevantPrefs}`);
  }
  if (memory.favoriteThemes.length > 0 && (intent === "story" || intent === "game" || intent === "chat")) {
    parts.push(`Thèmes favoris: ${memory.favoriteThemes.join(", ")}`);
  }
  if (memory.totalStoriesHeard > 0) {
    parts.push(`Histoires écoutées: ${memory.totalStoriesHeard}`);
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. RESPONSE SELECTION — 100% offline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function selectResponse(
  input: OrchestratorInput,
  intent: BobbyIntent
): { response: string; source: "cache" | "offline" } {
  // Cached greeting
  if (intent === "greeting" && isSimpleGreeting(input.userText)) {
    return { response: getCachedResponse("greeting"), source: "cache" };
  }

  // All responses come from the offline engine
  const offlineResp = getOfflineResponse(input.userText, input.childName, input.childAge);
  return { response: offlineResp.text, source: "offline" };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. EXPRESSION ASSIGNMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function assignExpression(
  responseText: string,
  intent: BobbyIntent,
  childEmotion: Emotion | undefined
): { faceState: FaceState; faceIntensity: number; voiceTone: Emotion | undefined } {
  return {
    faceState: detectBobbyEmotion(responseText),
    faceIntensity: detectEmotionIntensity(responseText),
    voiceTone: detectEmotionForTTS(responseText) || childEmotion,
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
// 7. SILENCE HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  const intent = detectIntent(input.userText);
  const childEmotion = detectChildEmotion(input.userText);
  const memoryContext = buildMemoryContext(input.memory, intent);
  const { response, source } = selectResponse(input, intent);
  const { faceState, faceIntensity, voiceTone } = assignExpression(response, intent, childEmotion);
  const followUpType = suggestFollowUp(intent, childEmotion);

  const aiModeMap: Record<BobbyIntent, string> = {
    story: "story", game: "game", emotion_support: "chat", calm: "chat",
    greeting: "chat", boredom: "game", logic: "chat", question: "chat", chat: "chat",
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
 * Refine expression after response text is available.
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
