import type { FaceState } from "@/components/hologram/useFaceAnimation";
import { getOfflineResponse, resetConversationContext } from "@/lib/offlineEngine";
import { getLibraryReply, getNarrationText } from "./library";
import type { BobbyBrainReply, PendingNarration } from "./types";

interface BuildBobbyReplyOptions {
  childName: string;
  childAge: number;
  userText?: string;
  pendingNarration?: PendingNarration | null;
}

const INTENT_EMOTION_MAP: Record<string, FaceState> = {
  GREETING: "happy",
  FAREWELL: "calm",
  STORY_REQUEST: "curious",
  PLAY_REQUEST: "playful",
  EDUCATION: "curious",
  QUESTION: "attentive",
  QUESTION_SIMPLE: "attentive",
  EMOTION_NEGATIVE: "reassuring",
  EMOTION_POSITIVE: "happy",
  CALM_REQUEST: "calm",
  IDENTITY: "proud",
  COMPLIMENT: "proud",
  BLOCKED: "reassuring",
  JOKE_REQUEST: "playful",
  LIBRARY_OVERVIEW: "proud",
  NARRATION: "curious",
};

function inferEmotionFromText(text: string): FaceState {
  const normalized = text.toLowerCase();

  if (/bravo|génial|genial|super|youpi|cool|haha|hihi/.test(normalized)) return "happy";
  if (/calme|respire|doucement|nuit|dodo/.test(normalized)) return "calm";
  if (/peur|triste|pas grave|je suis là|je suis la/.test(normalized)) return "reassuring";
  if (/histoire|conte|aventure|imagine/.test(normalized)) return "curious";
  return "attentive";
}

function resolveEmotion(intent: string, text: string): FaceState {
  return INTENT_EMOTION_MAP[intent] ?? inferEmotionFromText(text);
}

export function getBobbyWelcomeMessage(childName: string): string {
  return `Salut ${childName} ! Touche Bobby et parle près du micro. Je peux discuter, raconter des histoires et répondre même hors ligne grâce à Bobby Brain.`;
}

export function getBobbyMicRecoveryMessage(isOffline: boolean): string {
  return isOffline
    ? "Je suis en mode Bobby Brain local. Touche-moi puis parle tout près du micro pour réessayer."
    : "Je n'ai pas bien entendu. Touche Bobby puis reparle tout près du micro.";
}

export function getBobbySleepMessage(): string {
  return "💤 Bobby se repose. Touche-le pour le réveiller.";
}

export function resetBobbyBrainSession() {
  resetConversationContext();
}

export function buildBobbyReply({ childName, childAge, userText = "", pendingNarration }: BuildBobbyReplyOptions): BobbyBrainReply {
  if (pendingNarration) {
    return {
      text: getNarrationText(pendingNarration, childName),
      intent: "NARRATION",
      source: "narration",
      emotion: "curious",
      confidence: 1,
      isOffline: true,
    };
  }

  const libraryReply = getLibraryReply(userText, childName, childAge);
  if (libraryReply) return libraryReply;

  const offlineReply = getOfflineResponse(userText, childName, childAge);

  return {
    text: offlineReply.text,
    intent: offlineReply.intent,
    source: "offline_brain",
    emotion: resolveEmotion(offlineReply.intent, offlineReply.text),
    confidence: offlineReply.intent === "UNKNOWN" ? 0.55 : 0.88,
    isOffline: true,
  };
}