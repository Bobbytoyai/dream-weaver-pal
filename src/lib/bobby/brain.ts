import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { ParentSettings } from "@/components/parentSettings";
import { resetConversationContext } from "@/lib/offlineEngine";
import { getLibraryReply, getNarrationText } from "./library";
import type { BobbyBrainReply, PendingNarration } from "./types";
import { simplifyForAge } from "@/lib/adaptiveEngine";
import { resetMemory } from "@/lib/responseSelector";
import { resetScenario } from "@/lib/scenarioEngine";
import { trackInterests, getSmartFollowUp, resetInterestTracker, getInterestSnapshot } from "./interestTracker";
import { getLLMReply, clearHistory } from "./llmBrain";
import { getLocalBrainReply, resetLocalBrain } from "./localBrain";
import { queryKnowledgeBase, clearConversationContext } from "./knowledgeQuery";
import {
  loadPersistentMemory,
  savePersistentMemory,
  extractFactsFromMessage,
  mergeNewFacts,
  mergeInterestScores,
  resetPersistentMemoryCache,
} from "./persistentMemory";

interface BuildBobbyReplyOptions {
  childName: string;
  childAge: number;
  userText?: string;
  pendingNarration?: PendingNarration | null;
  parentSettings?: ParentSettings;
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
  // New emotional intents
  PEUR: "reassuring",
  TRISTESSE: "reassuring",
  COLERE: "reassuring",
  JOIE: "happy",
  CONFIANCE: "reassuring",
  JALOUSIE: "reassuring",
  ENNUI: "playful",
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

// ─── Personality modifiers ──────────────────────────────────────────────
// Adjusts Bobby's tone based on the parent-chosen personality profile.
const PERSONALITY_PREFIXES: Record<string, string[]> = {
  calm: [
    "Doucement… ",
    "Tranquillement, ",
    "Tout en douceur, ",
  ],
  energetic: [
    "Génial ! ",
    "Trop cool ! ",
    "Trop bien ! ",
  ],
  educational: [
    "Bonne question ! ",
    "Intéressant ! ",
    "Tu sais quoi ? ",
  ],
  balanced: [],
};

function applyPersonality(text: string, personality: string): string {
  const prefixes = PERSONALITY_PREFIXES[personality];
  if (!prefixes?.length) return text;
  // Add a personality prefix ~40% of the time to keep it natural
  if (Math.random() > 0.4) return text;
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return prefix + text.charAt(0).toLowerCase() + text.slice(1);
}

// ─── Content filtering ──────────────────────────────────────────────────
function isTopicBlocked(text: string, blockedTopics: string[]): boolean {
  if (!blockedTopics.length) return false;
  const normalized = text.toLowerCase();
  return blockedTopics.some(topic => normalized.includes(topic.toLowerCase()));
}

function getBlockedTopicReply(_childName: string): BobbyBrainReply {
  const responses = [
    `Parlons d'autre chose ! Tu veux qu'on joue ou que je te raconte une histoire ?`,
    `Hmm, j'ai une meilleure idée ! Et si on parlait d'un truc super cool ?`,
    `Bobby préfère qu'on parle d'aventures et de découvertes ! 🚀`,
  ];
  return {
    text: responses[Math.floor(Math.random() * responses.length)],
    intent: "BLOCKED",
    source: "safety_filter",
    emotion: "reassuring",
    confidence: 1,
    isOffline: true,
  };
}

// Name injection disabled — Bobby ne mentionne plus le prénom
function personalizeWithName(text: string, _childName: string): string {
  return text;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function getBobbyWelcomeMessage(_childName: string): string {
  const greetings = [
    `Salut ! Touche Bobby pour me parler. Je suis là rien que pour toi ! 🌟`,
    `Hey ! C'est Bobby ! Touche-moi et dis-moi ce que tu veux faire aujourd'hui !`,
    `Coucou ! Bobby est prêt à jouer, discuter ou raconter des histoires ! Touche-moi !`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
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
  resetMemory();
  resetScenario();
  resetInterestTracker();
  clearHistory();
  resetLocalBrain();
  clearConversationContext();
  resetPersistentMemoryCache();
}

/** Call at session start to load persistent memory from cloud/local */
export async function initBobbySession(childName: string): Promise<void> {
  await loadPersistentMemory(childName);
  console.log("[Brain] 🧠 Persistent memory loaded for", childName);
}

/** Call at session end to save accumulated facts & interests */
export async function endBobbySession(childName: string): Promise<void> {
  // Merge current session interest scores into persistent totals
  const snapshot = getInterestSnapshot();
  const sessionScores: Record<string, number> = {};
  for (const { topic, score } of snapshot.topInterests) {
    sessionScores[topic] = score;
  }
  mergeInterestScores(sessionScores);

  await savePersistentMemory(childName);
  console.log("[Brain] 💾 Persistent memory saved for", childName);
}

export async function buildBobbyReply({ childName, childAge, userText = "", pendingNarration, parentSettings }: BuildBobbyReplyOptions): Promise<BobbyBrainReply> {
  const personality = parentSettings?.personality ?? "balanced";
  const blockedTopics = parentSettings?.blockedTopics ?? [];

  // ─── Narration passthrough ───
  if (pendingNarration) {
    return {
      text: simplifyForAge(getNarrationText(pendingNarration, childName), childAge),
      intent: "NARRATION",
      source: "narration",
      emotion: "curious",
      confidence: 1,
      isOffline: true,
    };
  }

  // ─── Safety: blocked topics ───
  if (userText && isTopicBlocked(userText, blockedTopics)) {
    return getBlockedTopicReply(childName);
  }

  // ─── Track child interests for smart follow-ups ───
  if (userText) {
    trackInterests(userText);
    // Extract and persist key facts from child's message
    const newFacts = extractFactsFromMessage(userText);
    if (newFacts.length > 0) mergeNewFacts(newFacts);
  }

  // ─── 1. Library (stories, jokes) — always high confidence ───
  const libraryReply = getLibraryReply(userText, childName, childAge);
  if (libraryReply) {
    let text = simplifyForAge(libraryReply.text, childAge);
    text = personalizeWithName(text, childName);
    text = applyPersonality(text, personality);
    return { ...libraryReply, text };
  }

  // ─── 2. Knowledge Base (installed Store content + learned Q&A) ───
  if (userText) {
    try {
      const kbReply = await queryKnowledgeBase(userText, childAge);
      if (kbReply && kbReply.confidence >= 0.35) {
        let text = simplifyForAge(kbReply.text, childAge);
        text = personalizeWithName(text, childName);
        text = applyPersonality(text, personality);
        return { ...kbReply, text };
      }
    } catch (e) {
      console.warn("[BobbyBrain] KB query failed:", e);
    }
  }

  // ─── 3. LLM Brain (Gemini via Lovable AI Gateway) ───
  if (userText) {
    try {
      const llmReply = await getLLMReply(childName, childAge, userText, personality);
      if (llmReply) {
        console.log("[BobbyBrain] ✅ LLM reply:", llmReply.text.slice(0, 60));
        return llmReply;
      }
    } catch (e) {
      console.warn("[BobbyBrain] LLM failed, falling back to offline:", e);
    }
  }

  // ─── 4. Local Brain (intelligent template-based engine) ───
  if (userText) {
    const localReply = getLocalBrainReply(userText, childName, childAge);
    
    // Apply personality
    let text = applyPersonality(localReply.text, personality);
    
    // Smart follow-up injection (~30% chance after 3+ exchanges)
    const smartFollowUp = getSmartFollowUp(childName);
    if (smartFollowUp && localReply.confidence >= 0.5 && Math.random() < 0.3) {
      text = text.replace(/[.!?…]*$/, ". ") + smartFollowUp;
    }

    return {
      ...localReply,
      text,
    };
  }

  // ─── 4. Absolute fallback ───
  return {
    text: personalizeWithName(`Je suis là ! Dis-moi ce que tu veux faire 😊`, childName),
    intent: "GENERAL",
    source: "local_brain",
    emotion: "attentive" as FaceState,
    confidence: 0.4,
    isOffline: true,
  };
}
