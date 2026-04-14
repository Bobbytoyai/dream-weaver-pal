/**
 * Bobby Brain V6 — 3-Layer Intent Pipeline + Cognition Layer
 * 
 * Architecture:
 *   Pre-pipeline: Safety, narration, games (bypass)
 *   Cache check: L1 RAM → L2 IndexedDB
 *   Layer 1: LocalBrain (Regex + SmartClassifier) → confidence ≥ 0.75
 *   ★ COGNITION LAYER: goal + strategy + tone decision
 *   Layer 2: Knowledge Base (semantic TF-IDF) → confidence ≥ 0.50
 *   Layer 3: LLM (Gemini) → cloud fallback
 *   Fallback: LocalBrain template (always offline)
 */

import type { FaceState } from "@/components/hologram/useFaceAnimation";
import type { ParentSettings } from "@/components/parentSettings";
import { resetConversationContext } from "@/lib/offlineEngine";
import { isBlockedContent, getSafetyLevel, getSafeRedirect } from "@/lib/offline-intents";
import { getLibraryReply, getNarrationText } from "./library";
import type { BobbyBrainReply, PendingNarration } from "./types";
import { simplifyForAge } from "@/lib/adaptiveEngine";
import { resetMemory } from "@/lib/responseSelector";
import { resetScenario } from "@/lib/scenarioEngine";
import { trackInterests, getSmartFollowUp, resetInterestTracker, getInterestSnapshot } from "./interestTracker";
import { getLLMReply, clearHistory } from "./llmBrain";
import { getLocalBrainReply, resetLocalBrain } from "./localBrain";
import { queryKnowledgeBase, clearConversationContext } from "./knowledgeQuery";
import { getCachedReply, cacheReply, clearResponseCache } from "./responseCache";
import { cogitate, resetCognition, type CognitionOutput } from "./cognition";
import { getPersonalityProfile, applyPersonalityToText, type PersonalityContext } from "./personality";
import { mem } from "./localBrain/memory";
import { detectLocalIntent } from "./localBrain/intentEngine";
import { detectEmotion } from "./localBrain/emotionEngine";
import { getPersistentMemory } from "./persistentMemory";
import {
  loadPersistentMemory,
  savePersistentMemory,
  extractFactsFromMessage,
  mergeNewFacts,
  mergeInterestScores,
  resetPersistentMemoryCache,
} from "./persistentMemory";
import {
  isGameActive,
  detectGameRequest,
  startGame,
  processGameTurn,
  resetGames,
} from "./offlineGames";
import {
  isFlowActive,
  advanceFlow,
  detectFlowTrigger,
  startFlow,
  resetFlows,
  tryResumeFlow,
} from "./flows";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIDENCE THRESHOLDS (V5 Architecture)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const LAYER1_CONFIDENCE = 0.75; // LocalBrain confident enough → skip KB & LLM
const LAYER2_CONFIDENCE = 0.50; // KB match good enough → skip LLM
const LAYER3_TIMEOUT_MS = 12000; // LLM timeout

interface BuildBobbyReplyOptions {
  childName: string;
  childAge: number;
  userText?: string;
  pendingNarration?: PendingNarration | null;
  parentSettings?: ParentSettings;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMOTION MAPPING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const INTENT_EMOTION_MAP: Record<string, FaceState> = {
  GREETING: "happy", FAREWELL: "calm", STORY_REQUEST: "curious",
  PLAY_REQUEST: "playful", EDUCATION: "curious", QUESTION: "attentive",
  QUESTION_SIMPLE: "attentive", EMOTION_NEGATIVE: "reassuring",
  EMOTION_POSITIVE: "happy", CALM_REQUEST: "calm", IDENTITY: "proud",
  COMPLIMENT: "proud", BLOCKED: "reassuring", JOKE_REQUEST: "playful",
  LIBRARY_OVERVIEW: "proud", NARRATION: "curious",
  PEUR: "reassuring", TRISTESSE: "reassuring", COLERE: "reassuring",
  JOIE: "happy", CONFIANCE: "reassuring", JALOUSIE: "reassuring", ENNUI: "playful",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PERSONALITY MODIFIERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Personality is now handled by src/lib/bobby/personality/
// See getPersonalityProfile() + applyPersonalityToText()

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY & CONTENT FILTERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isTopicBlocked(text: string, blockedTopics: string[]): boolean {
  if (!blockedTopics.length) return false;
  const normalized = text.toLowerCase();
  return blockedTopics.some(topic => normalized.includes(topic.toLowerCase()));
}

function getBlockedTopicReply(): BobbyBrainReply {
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST-PROCESSING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function postProcess(
  reply: BobbyBrainReply,
  childName: string,
  childAge: number,
  personalityCtx: PersonalityContext | null,
): BobbyBrainReply {
  let text = simplifyForAge(reply.text, childAge);
  if (personalityCtx) {
    const profile = getPersonalityProfile(personalityCtx);
    text = applyPersonalityToText(text, profile);
  }
  return { ...reply, text };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  resetGames();
  resetCognition();
  clearResponseCache().catch(() => {});
}

export async function initBobbySession(childName: string): Promise<void> {
  await loadPersistentMemory(childName);
  console.log("[Brain] 🧠 Persistent memory loaded for", childName);
}

export async function endBobbySession(childName: string): Promise<void> {
  const snapshot = getInterestSnapshot();
  const sessionScores: Record<string, number> = {};
  for (const { topic, score } of snapshot.topInterests) {
    sessionScores[topic] = score;
  }
  mergeInterestScores(sessionScores);
  await savePersistentMemory(childName);
  console.log("[Brain] 💾 Persistent memory saved for", childName);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PIPELINE — Bobby Brain V5
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function buildBobbyReply({
  childName, childAge, userText = "", pendingNarration, parentSettings,
}: BuildBobbyReplyOptions): Promise<BobbyBrainReply> {
  const personality = parentSettings?.personality ?? "balanced";
  const blockedTopics = parentSettings?.blockedTopics ?? [];
  const pipelineStart = performance.now();

  // Build personality context once for the whole pipeline
  const personalityCtx: PersonalityContext = {
    childAge,
    sessionMood: mem.sessionMood,
    emotionType: "neutral",
    emotionIntensity: 0,
    turnCount: mem.turnCount,
    hour: new Date().getHours(),
    parentPersonality: personality,
  };

  // ═══════════════════════════════════════════════════════════
  // PRE-PIPELINE: Bypasses (narration, safety, games)
  // ═══════════════════════════════════════════════════════════

  // ── Narration passthrough ──
  if (pendingNarration) {
    return {
      text: simplifyForAge(getNarrationText(pendingNarration, childName), childAge),
      intent: "NARRATION", source: "narration", emotion: "curious", confidence: 1, isOffline: true,
    };
  }

  // ── Safety: parent-blocked topics ──
  if (userText && isTopicBlocked(userText, blockedTopics)) {
    return getBlockedTopicReply();
  }

  // ── Safety: dangerous/inappropriate content ──
  if (userText && isBlockedContent(userText)) {
    const safetyLevel = getSafetyLevel(userText);
    const safeReply = getSafeRedirect(userText);
    console.warn(`[Brain V5] 🛡️ Safety (${safetyLevel}):`, userText.slice(0, 50));
    return {
      text: simplifyForAge(safeReply, childAge),
      intent: safetyLevel === "CRITICAL" ? "BLOCKED" : "EMOTION_NEGATIVE",
      source: "safety_filter", emotion: "reassuring", confidence: 1, isOffline: true,
    };
  }

  // ── Identity quick-check ──
  if (userText && /comment je m'appelle|c'est quoi mon (pré)?nom|tu (sais|connais) mon (pré)?nom|quel est mon (pré)?nom/i.test(userText)) {
    return {
      text: simplifyForAge(`Bien sûr ! Tu t'appelles ${childName} ! 😄 Comment je pourrais oublier ?`, childAge),
      intent: "IDENTITE_ENFANT", source: "local_brain", emotion: "happy", confidence: 1, isOffline: true,
    };
  }

  // ── Track interests & extract facts ──
  if (userText) {
    trackInterests(userText);
    const newFacts = extractFactsFromMessage(userText);
    if (newFacts.length > 0) mergeNewFacts(newFacts);
  }

  // ── Active game — process turn ──
  if (isGameActive() && userText) {
    const gameReply = processGameTurn(userText);
    if (gameReply) {
      return {
        text: simplifyForAge(gameReply, childAge),
        intent: "GAME", source: "offline_games", emotion: "playful", confidence: 1, isOffline: true,
      };
    }
  }

  // ── New game request ──
  if (userText) {
    const gameType = detectGameRequest(userText);
    if (gameType) {
      return {
        text: simplifyForAge(startGame(gameType, childAge), childAge),
        intent: "GAME", source: "offline_games", emotion: "playful", confidence: 1, isOffline: true,
      };
    }
  }

  // ── Library (stories, jokes) — curated content ──
  const libraryReply = getLibraryReply(userText, childName, childAge);
  if (libraryReply) {
    return postProcess(libraryReply, childName, childAge, personalityCtx);
  }

  // ═══════════════════════════════════════════════════════════
  // V6 3-LAYER PIPELINE + COGNITION
  // ═══════════════════════════════════════════════════════════

  if (!userText) {
    return {
      text: `Je suis là ! Dis-moi ce que tu veux faire 😊`,
      intent: "GENERAL", source: "local_brain", emotion: "attentive", confidence: 0.4, isOffline: true,
    };
  }

  // ── CACHE CHECK: L1 RAM → L2 IndexedDB (~0-3ms) ──
  const cached = await getCachedReply(userText);
  if (cached) {
    const totalMs = performance.now() - pipelineStart;
    console.log(`[Brain V6] ⚡ Cache hit → ${cached.intent} (${totalMs.toFixed(0)}ms total)`);
    return postProcess(cached, childName, childAge, personalityCtx);
  }

  // ── LAYER 1: LocalBrain (Regex + SmartClassifier + Templates) ──
  const layer1Start = performance.now();
  const localReply = getLocalBrainReply(userText, childName, childAge);
  const layer1Ms = performance.now() - layer1Start;

  console.log(`[Brain V6] L1 LocalBrain: intent=${localReply.intent} confidence=${localReply.confidence.toFixed(2)} (${layer1Ms.toFixed(1)}ms)`);

  // ── ★ COGNITION LAYER: decide HOW to respond ──
  const emotion = detectEmotion(userText);
  // Update personality context with detected emotion
  personalityCtx.emotionType = emotion.type;
  personalityCtx.emotionIntensity = emotion.intensity;
  const persistentMem = getPersistentMemory();
  const cognition = cogitate({
    intent: localReply.intent as any,
    intentConfidence: localReply.confidence,
    emotion,
    childAge,
    session: {
      turnCount: mem.turnCount,
      sessionMood: mem.sessionMood,
      topicDepth: mem.topicDepth,
      currentTopic: mem.currentTopic,
      lastBobbyGoal: null,
    },
    memory: {
      facts: persistentMem.facts,
      interests: persistentMem.interestScores,
      relationshipScore: 50, // TODO: compute from interaction count
    },
  });

  // ── Apply cognition to follow-up strategy ──
  const shouldAddFollowUp = cognition.suggestedFollowUp !== "none";
  const cognitionFollowUp = buildCognitionFollowUp(cognition, childName);

  // High-confidence Layer 1 → respond directly (skip KB + LLM)
  if (localReply.confidence >= LAYER1_CONFIDENCE) {
    const reply = postProcess(localReply, childName, childAge, personalityCtx);
    if (shouldAddFollowUp && cognitionFollowUp && Math.random() < 0.5) {
      reply.text = reply.text.replace(/[.!?…]*$/, ". ") + cognitionFollowUp;
    } else {
      const smartFollowUp = getSmartFollowUp(childName);
      if (smartFollowUp && Math.random() < 0.3) {
        reply.text = reply.text.replace(/[.!?…]*$/, ". ") + smartFollowUp;
      }
    }
    const totalMs = performance.now() - pipelineStart;
    console.log(`[Brain V6] ✅ L1 direct → ${localReply.intent} | goal=${cognition.goal} (${totalMs.toFixed(0)}ms total)`);
    cacheReply(userText, reply).catch(() => {});
    return reply;
  }

  // ── LAYER 2: Knowledge Base (semantic TF-IDF scoring) ──
  try {
    const layer2Start = performance.now();
    const kbReply = await queryKnowledgeBase(userText, childAge);
    const layer2Ms = performance.now() - layer2Start;

    if (kbReply && kbReply.confidence >= LAYER2_CONFIDENCE) {
      const reply = postProcess(kbReply, childName, childAge, personalityCtx);
      if (shouldAddFollowUp && cognitionFollowUp && Math.random() < 0.4) {
        reply.text = reply.text.replace(/[.!?…]*$/, ". ") + cognitionFollowUp;
      }
      const totalMs = performance.now() - pipelineStart;
      console.log(`[Brain V6] ✅ L2 KB → conf=${kbReply.confidence.toFixed(2)} | goal=${cognition.goal} (L2: ${layer2Ms.toFixed(0)}ms, total: ${totalMs.toFixed(0)}ms)`);
      cacheReply(userText, reply).catch(() => {});
      return reply;
    }

    if (kbReply) {
      console.log(`[Brain V6] L2 KB: conf=${kbReply.confidence.toFixed(2)} → escalate to L3`);
    }
  } catch (e) {
    console.warn("[Brain V6] L2 KB error:", e);
  }

  // ── LAYER 3: LLM (Gemini via edge function) ──
  try {
    const layer3Start = performance.now();
    const llmReply = await getLLMReply(childName, childAge, userText, personality);
    const layer3Ms = performance.now() - layer3Start;

    if (llmReply) {
      const totalMs = performance.now() - pipelineStart;
      console.log(`[Brain V6] ✅ L3 LLM → goal=${cognition.goal} (L3: ${layer3Ms.toFixed(0)}ms, total: ${totalMs.toFixed(0)}ms)`);
      cacheReply(userText, llmReply).catch(() => {});
      return llmReply;
    }
  } catch (e) {
    console.warn("[Brain V6] L3 LLM failed:", e);
  }

  // ── FALLBACK: Use Layer 1 response (always available offline) ──
  const reply = postProcess(localReply, childName, childAge, personalityCtx);
  if (shouldAddFollowUp && cognitionFollowUp) {
    reply.text = reply.text.replace(/[.!?…]*$/, ". ") + cognitionFollowUp;
  } else {
    const smartFollowUp = getSmartFollowUp(childName);
    if (smartFollowUp && localReply.confidence >= 0.5 && Math.random() < 0.3) {
      reply.text = reply.text.replace(/[.!?…]*$/, ". ") + smartFollowUp;
    }
  }

  const totalMs = performance.now() - pipelineStart;
  console.log(`[Brain V6] ⚡ Fallback L1 → ${localReply.intent} | goal=${cognition.goal} (${totalMs.toFixed(0)}ms total)`);
  cacheReply(userText, reply).catch(() => {});
  return reply;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COGNITION-DRIVEN FOLLOW-UPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildCognitionFollowUp(cognition: CognitionOutput, _childName: string): string | null {
  const { suggestedFollowUp, goal } = cognition;

  if (suggestedFollowUp === "none") return null;

  const followUps: Record<string, string[]> = {
    open_question: [
      "Et toi, tu en penses quoi ?",
      "Qu'est-ce que tu voudrais faire ?",
      "Tu veux m'en dire plus ?",
      "Dis-moi ce qui te ferait plaisir !",
    ],
    related_question: [
      "Tu veux en savoir plus là-dessus ?",
      "Ça t'intéresse d'en apprendre plus ?",
      "Tu as d'autres questions ?",
    ],
    deeper_question: [
      "Et tu sais pourquoi c'est comme ça ?",
      "Tu veux que je t'explique comment ça marche ?",
      "C'est fascinant, non ? Tu veux creuser ?",
    ],
    topic_bridge: [
      "Au fait, tu veux qu'on fasse un jeu ?",
      "Sinon, je peux te raconter une histoire !",
      "On pourrait aussi parler d'autre chose, qu'est-ce qui te tente ?",
    ],
    game_turn: [
      "À toi de jouer !",
      "Alors, tu devines ?",
      "C'est ton tour !",
    ],
    memory_callback: [
      "Tu m'avais parlé de trucs super la dernière fois !",
      "Je me souviens qu'on avait discuté de plein de choses cool !",
    ],
  };

  const pool = followUps[suggestedFollowUp];
  if (!pool?.length) return null;

  return pool[Math.floor(Math.random() * pool.length)];
}
