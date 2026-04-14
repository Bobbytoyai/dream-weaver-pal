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
import { normalizeChildSpeech } from "./normalizer";
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
import { getPersistentMemory, getRelevantFacts } from "./persistentMemory";
import { extractDeepUnderstanding, type UnderstandingFrame, type SessionContext as V7Session } from "./v7/deepUnderstanding";
import { computePriority, createDefaultMemoryContext, type PriorityDecision } from "./v7/priorityEngine";
import { orchestrate, recordBobbyResponse, resetOrchestrator, type OrchestrationDirective } from "./v7/orchestrator";
import { checkUnderstanding, applyUnderstandingCheck, detectCorrectionSignal, resetFeedbackLoop } from "./v7/understandingLoop";
import { buildCognitionPlan, resetCognitionV7, type CognitionPlan } from "./v7/cognitionV7";
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

/**
 * V7: Apply orchestrator bridge phrase to a reply and record it.
 */
function applyOrchestration(
  reply: BobbyBrainReply,
  directive: OrchestrationDirective | null,
  understanding?: UnderstandingFrame,
  session?: V7Session,
): BobbyBrainReply {
  if (!directive) return reply;

  // Prepend bridge phrase on scene transitions
  if (directive.bridgePhrase && directive.action === "spawn" && directive.transition) {
    reply.text = directive.bridgePhrase + " " + reply.text;
  }

  // Append resume prompt if available
  if (directive.resumePrompt && Math.random() < 0.4) {
    reply.text = reply.text.replace(/[.!?…]*\s*$/, ". ") + directive.resumePrompt;
  }

  // V7: Understanding Feedback Loop — verify comprehension
  if (understanding && session) {
    const check = checkUnderstanding(understanding, reply.text, session);
    if (check.type !== "no_check") {
      console.log(`[Brain V7] 🔁 Feedback Loop: ${check.type} — ${check.triggerReason}`);
      reply.text = applyUnderstandingCheck(reply.text, check);
    }
  }

  // Record Bobby's response in the scene
  recordBobbyResponse(reply.text);

  return reply;
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
  resetFlows();
  resetCognition();
  resetOrchestrator();
  resetFeedbackLoop();
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

  // ═══════════════════════════════════════════════════════════
  // STEP 0: NORMALIZE child speech (phonetic, SMS, contractions)
  // ═══════════════════════════════════════════════════════════
  if (userText) {
    const normalized = normalizeChildSpeech(userText);
    if (normalized !== userText) {
      console.log(`[Brain V6] 📝 Normalized: "${userText}" → "${normalized}"`);
      userText = normalized;
    }
  }

  // ── V7: CORRECTION DETECTION — did the child correct Bobby? ──
  if (userText) {
    const correction = detectCorrectionSignal(userText);
    if (correction.corrected && correction.extractedClarification) {
      console.log(`[Brain V7] 🔄 Correction detected → using clarification: "${correction.extractedClarification}"`);
      userText = correction.extractedClarification;
    }
  }

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

  // ── Active flow — advance scenario ──
  if (isFlowActive() && userText) {
    const flowIntent = detectLocalIntent(userText);
    const flowResult = advanceFlow(userText, flowIntent, childName, childAge);
    if (flowResult.handled) {
      return {
        text: simplifyForAge(flowResult.text, childAge),
        intent: "FLOW", source: "flow_engine", emotion: flowResult.emotion as any,
        confidence: 1, isOffline: true,
      };
    }
    // Flow was interrupted — fall through to normal pipeline
  }

  // ── Library (stories, jokes) — curated content ──
  const libraryReply = getLibraryReply(userText, childName, childAge);
  if (libraryReply) {
    return postProcess(libraryReply, childName, childAge, personalityCtx);
  }

  // ═══════════════════════════════════════════════════════════
  // V7 DEEP UNDERSTANDING + V6 3-LAYER PIPELINE + COGNITION
  // ═══════════════════════════════════════════════════════════

  if (!userText) {
    return {
      text: `Je suis là ! Dis-moi ce que tu veux faire 😊`,
      intent: "GENERAL", source: "local_brain", emotion: "attentive", confidence: 0.4, isOffline: true,
    };
  }

  // ── V7: DEEP UNDERSTANDING — 4-level intent analysis ──
  const v7Session: V7Session = {
    turnCount: mem.turnCount,
    sessionMood: mem.sessionMood,
    currentTopic: mem.currentTopic,
    topicDepth: mem.topicDepth,
    lastExplicitIntent: null,
    lastImplicitIntent: null,
  };
  const understanding = extractDeepUnderstanding(userText, v7Session, {
    age: childAge,
    name: childName,
    relationshipScore: 50,
  });
  console.log(
    `[Brain V7] 🧠 Deep Understanding: explicit=${understanding.explicitIntent} implicit=${understanding.implicitIntent} need=${understanding.emotionalNeed}(${understanding.needIntensity}) goal=${understanding.userGoal} ambiguity=${understanding.ambiguityScore.toFixed(2)}${understanding.requiresConfirmation ? " ⚠️ CONFIRM" : ""}`
  );

  // ── V7: PRIORITY ENGINE — 5-dimension scoring ──
  const priority = computePriority(understanding, v7Session, createDefaultMemoryContext());
  console.log(
    `[Brain V7] 🎯 Priority: ${priority.priorityLevel} (${priority.totalScore}) | S=${priority.scores.safety} E=${priority.scores.emotion} U=${priority.scores.urgency} C=${priority.scores.context} H=${priority.scores.history}${priority.requiresEmpathyFirst ? " 💙EMPATHY" : ""}${priority.interruptCurrent ? " ⚡INTERRUPT" : ""}`
  );

  // ── V7: If ambiguity is very high, ask for clarification ──
  if (understanding.requiresConfirmation && understanding.confirmationPrompt && understanding.ambiguityScore > 0.7) {
    const confirmReply: BobbyBrainReply = {
      text: simplifyForAge(understanding.confirmationPrompt, childAge),
      intent: understanding.explicitIntent,
      source: "local_brain",
      emotion: "attentive",
      confidence: 0.5,
      isOffline: true,
    };
    return postProcess(confirmReply, childName, childAge, personalityCtx);
  }

  // ── V7: ORCHESTRATOR — scene management ──
  const directive = orchestrate(understanding, priority, userText);
  console.log(
    `[Brain V7] 🎬 Orchestrator: scene=${directive.scene.type} action=${directive.action} turn=${directive.scene.turnCount}/${directive.scene.maxTurns}${directive.bridgePhrase ? ` bridge="${directive.bridgePhrase.slice(0, 40)}"` : ""}`
  );

  if (!priority.bypassCache) {
    const cached = await getCachedReply(userText);
    if (cached) {
      const totalMs = performance.now() - pipelineStart;
      console.log(`[Brain V7] ⚡ Cache hit → ${cached.intent} (${totalMs.toFixed(0)}ms total)`);
      return postProcess(cached, childName, childAge, personalityCtx);
    }
  }

  // ── LAYER 1: LocalBrain (Regex + SmartClassifier + Templates) ──
  const layer1Start = performance.now();
  const localReply = getLocalBrainReply(userText, childName, childAge);
  const layer1Ms = performance.now() - layer1Start;

  console.log(`[Brain V7] L1 LocalBrain: intent=${localReply.intent} confidence=${localReply.confidence.toFixed(2)} | goal=${understanding.userGoal} (${layer1Ms.toFixed(1)}ms)`);

  // ── ★ COGNITION LAYER: decide HOW to respond ──
  const emotion = understanding.emotion;
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

  // ── ★ FLOW ENGINE: check if we should start a multi-turn scenario ──
  if (!isFlowActive() && localReply.confidence >= 0.5) {
    const flowMatch = detectFlowTrigger(localReply.intent as any, userText, childAge);
    if (flowMatch) {
      const flowResult = startFlow(flowMatch, childName, childAge);
      if (flowResult.handled) {
        return {
          text: simplifyForAge(flowResult.text, childAge),
          intent: "FLOW", source: "flow_engine", emotion: flowResult.emotion as any,
          confidence: 1, isOffline: true,
        };
      }
    }
  }
  if (localReply.confidence >= LAYER1_CONFIDENCE) {
    const reply = postProcess(localReply, childName, childAge, personalityCtx);
    // V6: Memory injection when cognition suggests it
    if (cognition.shouldInjectMemory && Math.random() < 0.4) {
      reply.text = maybeInjectMemory(reply.text, userText, childName, mem.currentTopic, emotion.type);
    } else if (shouldAddFollowUp && cognitionFollowUp && Math.random() < 0.5) {
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
    return applyOrchestration(reply, directive, understanding, v7Session);
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
      return applyOrchestration(reply, directive, understanding, v7Session);
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
      return applyOrchestration(llmReply, directive, understanding, v7Session);
    }
  } catch (e) {
    console.warn("[Brain V6] L3 LLM failed:", e);
  }

  // ── FALLBACK: Use Layer 1 response (always available offline) ──
  const reply = postProcess(localReply, childName, childAge, personalityCtx);
  if (cognition.shouldInjectMemory && Math.random() < 0.4) {
    reply.text = maybeInjectMemory(reply.text, userText, childName, mem.currentTopic, emotion.type);
  } else if (shouldAddFollowUp && cognitionFollowUp) {
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
  return applyOrchestration(reply, directive, understanding, v7Session);
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
    memory_callback: (() => {
      // V6: Use real facts if available
      const facts = getRelevantFacts({}, 2);
      if (facts.length > 0) {
        return facts.map(f => {
          const val = extractFactValue(f.text);
          return `Tu m'avais parlé de ${val}, je m'en souviens ! 😊`;
        });
      }
      return [
        "Tu m'avais parlé de trucs super la dernière fois !",
        "Je me souviens qu'on avait discuté de plein de choses cool !",
      ];
    })(),
  };

  const pool = followUps[suggestedFollowUp];
  if (!pool?.length) return null;

  return pool[Math.floor(Math.random() * pool.length)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMORY-DRIVEN CALLBACKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MEMORY_TEMPLATES: Record<string, (fact: string, childName: string) => string> = {
  animaux: (f, n) => `Au fait ${n}, tu m'avais parlé de ${extractFactValue(f)} ! Comment ça va ? 🐾`,
  famille: (f, n) => `Tu sais, je me souviens que ${extractFactValue(f)}. C'est chouette ! 💙`,
  amis: (f, n) => `Oh, ça me rappelle, tu m'avais dit que ${extractFactValue(f)} ! 😊`,
  préférence: (f, n) => `Tiens ${n}, tu m'avais dit que tu adorais ${extractFactValue(f)} ! C'est toujours le cas ? 🌟`,
  activité: (f, n) => `${n}, tu fais toujours ${extractFactValue(f)} ? Tu me racontes ? 😄`,
  école: (f, n) => `Au fait, tu m'avais dit que ${extractFactValue(f)}. Ça se passe bien ? 📚`,
  peur: (f, _n) => `Je me souviens que ${extractFactValue(f)}. Si tu veux en parler, je suis là. 💙`,
  rêve: (f, n) => `${n}, tu rêves toujours de ${extractFactValue(f)} ? C'est un super rêve ! ✨`,
  identité: (f, _n) => `Je me souviens bien, ${extractFactValue(f)} ! 😄`,
  objet: (f, n) => `Au fait ${n}, ${extractFactValue(f)}, il va bien ? 🧸`,
  aversion: (f, _n) => `Je me souviens que tu n'aimais pas trop ${extractFactValue(f)}, c'est toujours pareil ? 😅`,
  lieu: (f, _n) => `Tu m'avais dit que ${extractFactValue(f)} ! C'est cool ! 🏠`,
  santé: (f, _n) => `Je me souviens, ${extractFactValue(f)}. J'espère que tout va bien ! 💙`,
};

function extractFactValue(factText: string): string {
  // "Adore : les dinosaures" → "les dinosaures"
  // "A un(e) chat : Moustache" → "ton chat Moustache"
  const colonIdx = factText.indexOf(":");
  if (colonIdx !== -1) {
    const value = factText.slice(colonIdx + 1).trim();
    const prefix = factText.slice(0, colonIdx).trim().toLowerCase();
    if (prefix.startsWith("a un")) return `ton ${value.toLowerCase()}`;
    if (prefix.startsWith("adore")) return value.toLowerCase();
    if (prefix === "animal préféré") return `les ${value.toLowerCase()}`;
    return value.toLowerCase();
  }
  return factText.toLowerCase();
}

/**
 * Build a memory-based callback using a relevant fact from persistent memory.
 * Returns null if no suitable fact found or random chance says skip.
 */
function buildMemoryCallback(
  userText: string,
  childName: string,
  currentTopic: string | null,
  currentEmotion: string,
): string | null {
  const relevantFacts = getRelevantFacts(
    { currentTopic, currentEmotion, userText },
    3,
  );

  if (relevantFacts.length === 0) return null;

  // Pick the most relevant fact
  const fact = relevantFacts[0];
  const templateFn = MEMORY_TEMPLATES[fact.category] || MEMORY_TEMPLATES.préférence;
  if (!templateFn) return null;

  return templateFn(fact.text, childName);
}

/**
 * Try to inject a memory reference into a reply.
 * Called when cognition.shouldInjectMemory is true.
 */
function maybeInjectMemory(
  replyText: string,
  userText: string,
  childName: string,
  currentTopic: string | null,
  currentEmotion: string,
): string {
  const callback = buildMemoryCallback(userText, childName, currentTopic, currentEmotion);
  if (!callback) return replyText;

  console.log(`[Brain V6] 🧠 Memory injection: "${callback.slice(0, 60)}..."`);
  return replyText.replace(/[.!?…]*\s*$/, ". ") + callback;
}
