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
import { getLLMReply, streamLLMReply, clearHistory, addToHistory } from "./llmBrain";
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
import { assembleAndMerge } from "./v7/responseAssembly";
import { initToM, updateMentalModel, getToMSnapshot, applyToMToResponse, resetToM } from "./v8/theoryOfMind";
import { buildWorldModel, adaptToChildWorld, checkConfusionZones, resetWorldModel } from "./v8/childWorldModel";
import { maybeInitiate, resetProactiveEngine, type ProactiveContext } from "./v8/proactiveEngine";
import { applyVariation, resetVariationEngine } from "./v8/variationEngine";
import { initSilenceEngine, recordChildResponse, analyzeSilence, getAttentionState, getAttentionSummary } from "./v8/silenceEngine";
import { assessUncertainty, resetUncertaintyEngine, isLikelyGarbled, type UncertaintyAssessment } from "./v8/uncertaintyEngine";
import { evaluateMasterControl, enforceWordLimit, resolveActiveMode } from "./masterControl";
import { loadRelationship, recordInteraction, getInsideJokeReference, getPhaseBehavior, resetRelationshipEngine } from "./v8/relationshipEngine";
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
  userId?: string | null;
  sessionId?: string | null;
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
  tomSnap?: ReturnType<typeof getToMSnapshot> | null,
): BobbyBrainReply {
  let text = simplifyForAge(reply.text, childAge);
  if (personalityCtx) {
    const profile = getPersonalityProfile(personalityCtx);
    text = applyPersonalityToText(text, profile);
  }
  // V8: Apply Theory of Mind adjustments (vocabulary, fantasy protection)
  if (tomSnap) {
    text = applyToMToResponse(text, tomSnap);
  }
  // V8: Apply Child World Model adaptation (working memory, abstract→concrete, time)
  const worldCheck = adaptToChildWorld(text, childAge, tomSnap);
  if (worldCheck.appliedRules.length > 0) {
    console.log(`[Brain V8] 🌍 World Model: ${worldCheck.appliedRules.join(", ")}`);
  }
  if (worldCheck.warnings.length > 0) {
    console.log(`[Brain V8] 🌍 World warnings: ${worldCheck.warnings.join("; ")}`);
  }
  text = worldCheck.adjusted;
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
  plan?: CognitionPlan | null,
  proactiveInitiative?: import("./v8/proactiveEngine").ProactiveInitiative | null,
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

  // V7: Validation is now handled by responseAssembly.ts

  // V7: Understanding Feedback Loop — verify comprehension
  if (understanding && session) {
    const check = checkUnderstanding(understanding, reply.text, session);
    if (check.type !== "no_check") {
      console.log(`[Brain V7] 🔁 Feedback Loop: ${check.type} — ${check.triggerReason}`);
      reply.text = applyUnderstandingCheck(reply.text, check);
    }
  }

  // V8: Inject proactive initiative as follow-up
  if (proactiveInitiative && proactiveInitiative.nonIntrusiveLevel >= 0.5) {
    reply.text = reply.text.replace(/[.!?…]*\s*$/, ". ") + proactiveInitiative.content;
  }

  // V8: Apply variation engine to prevent repetition
  const { text: variedText } = applyVariation(reply.text, plan?.how?.openingType);
  reply.text = variedText;

  // V8: Inject inside joke reference based on relationship phase
  const jokeRef = getInsideJokeReference();
  if (jokeRef) {
    reply.text = reply.text.replace(/[.!?…]*\s*$/, ". ") + jokeRef;
    console.log(`[Brain V8] 🤫 Inside joke injected`);
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
  resetCognitionV7();
  resetToM();
  resetWorldModel();
  resetProactiveEngine();
  resetVariationEngine();
  resetRelationshipEngine();
  initSilenceEngine();
  resetUncertaintyEngine();
  clearResponseCache().catch(() => {});
}

export async function initBobbySession(childName: string, childAge?: number): Promise<void> {
  await loadPersistentMemory(childName);
  loadRelationship();
  if (childAge) {
    initToM(childAge);
    buildWorldModel(childAge);
    initSilenceEngine();
  }
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
  childName, childAge, userText = "", pendingNarration, parentSettings, userId, sessionId,
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

  // ═══════════════════════════════════════════════════════════
  // MASTER CONTROL LAYER — parental mode overrides (V9)
  // ═══════════════════════════════════════════════════════════
  const quickIntent = userText ? detectLocalIntent(userText) : "GENERAL";
  const masterControl = evaluateMasterControl(userText, quickIntent, parentSettings);

  if (masterControl.activeMode !== "normal") {
    console.log(`[Brain V9] 🎛️ Master Control: mode=${masterControl.activeMode}`);
    // Apply personality overrides from mode
    if (masterControl.personalityOverrides) {
      Object.assign(personalityCtx, masterControl.personalityOverrides);
    }
  }

  // If mode intercepts entirely, return immediately
  if (masterControl.intercepted && masterControl.reply) {
    return masterControl.reply;
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

  // ═══════════════════════════════════════════════════════════
  // GEMINI-FIRST PIPELINE — Online priority, V8 modules on all paths
  // ═══════════════════════════════════════════════════════════

  if (!userText) {
    return {
      text: `Je suis là ! Dis-moi ce que tu veux faire 😊`,
      intent: "GENERAL", source: "local_brain", emotion: "attentive", confidence: 0.4, isOffline: true,
    };
  }

  // ── Lightweight emotion detection (fast, no heavy V7/V8 processing) ──
  const localEmotion = detectEmotion(userText);
  personalityCtx.emotionType = localEmotion.type;
  personalityCtx.emotionIntensity = localEmotion.intensity;

  // ── V8: Pre-pipeline updates (run on ALL paths, <5ms total) ──
  recordChildResponse(userText, childAge);
  recordInteraction(userText, localEmotion.type);

  // V7: Build understanding frame for ToM & orchestrator
  const v7Session: V7Session = {
    turnCount: mem.turnCount,
    sessionMood: mem.sessionMood as "positive" | "neutral" | "negative",
    currentTopic: null,
    topicDepth: 0,
    lastExplicitIntent: null,
    lastImplicitIntent: null,
  };
  const understanding = extractDeepUnderstanding(userText, v7Session, { age: childAge, name: childName, relationshipScore: 0 });

  // V8: Update mental model (Theory of Mind)
  updateMentalModel(understanding, userText, childAge);
  const tomSnap = getToMSnapshot();

  // V8: Rebuild world model with latest ToM
  buildWorldModel(childAge, tomSnap);

  // V8: Check confusion zones
  const confusionCheck = checkConfusionZones(userText, childAge);
  if (confusionCheck.activeZones.length > 0) {
    console.log(`[Brain V8] ⚠️ Confusion zones: ${confusionCheck.warnings.join("; ")}`);
  }

  // V8: Uncertainty check (garbled/STT errors)
  if (isLikelyGarbled(userText)) {
    const uncertaintyResult = assessUncertainty({
      intentConfidence: 0.2,
      nluLayer: "fallback",
      detectedIntent: "UNKNOWN",
      childAge,
      childName,
      userText,
      consecutiveUncertainties: 0,
    });
    if (uncertaintyResult.clarificationText) {
      return {
        text: uncertaintyResult.clarificationText,
        intent: "CLARIFICATION",
        source: "uncertainty_engine",
        emotion: "attentive",
        confidence: 0.3,
        isOffline: true,
      };
    }
  }

  const priorityDecision = computePriority(understanding, v7Session, createDefaultMemoryContext());
  const cognitionPlan = buildCognitionPlan(understanding, priorityDecision, v7Session);
  const orchestrationDirective = orchestrate(understanding, priorityDecision, userText);

  // V8: Check proactive initiative
  const proactiveCtx: ProactiveContext = {
    turnCount: mem.turnCount,
    sessionMood: mem.sessionMood as "positive" | "neutral" | "negative",
    currentTopic: understanding.explicitIntent,
    silenceDurationMs: 0,
    isChildSpeaking: false,
    isEmotionalSceneActive: localEmotion.type === "sadness" || localEmotion.type === "fear",
    isSafetySceneActive: false,
    childName,
    childAge,
    totalInteractions: 0,
  };
  const proactiveInitiative = masterControl.suppressProactive ? null : maybeInitiate(proactiveCtx);

  // ═══════════════════════════════════════════════════════════
  // LAYER 1 (PRIMARY): GEMINI AI — Always try online first
  // ═══════════════════════════════════════════════════════════
  try {
    const llmStart = performance.now();
    const llmReply = await getLLMReply(childName, childAge, userText, personality, undefined, userId, sessionId);
    const llmMs = performance.now() - llmStart;

    if (llmReply) {
      // V8: Full post-processing pipeline on Gemini reply
      let reply = postProcess(llmReply, childName, childAge, personalityCtx, tomSnap);
      reply = applyOrchestration(reply, orchestrationDirective, understanding, v7Session, cognitionPlan, proactiveInitiative);

      // V9: Enforce word limit from Master Control
      if (masterControl.maxWords > 0) {
        reply.text = enforceWordLimit(reply.text, masterControl.maxWords);
      }
      const totalMs = performance.now() - pipelineStart;
      console.log(`[Brain] ✅ Gemini + V8 reply (${llmMs.toFixed(0)}ms LLM, ${totalMs.toFixed(0)}ms total)`);
      return reply;
    }
  } catch (e) {
    console.warn("[Brain] Gemini failed:", e);
  }

  // ═══════════════════════════════════════════════════════════
  // LAYER 2 (FALLBACK): Local Brain — Only when Gemini is unavailable
  // ═══════════════════════════════════════════════════════════
  console.log("[Brain] ⚠️ Gemini unavailable — falling back to local brain");

  const localReply = getLocalBrainReply(userText, childName, childAge);
  let reply = postProcess(localReply, childName, childAge, personalityCtx, tomSnap);
  reply = applyOrchestration(reply, orchestrationDirective, understanding, v7Session, cognitionPlan, proactiveInitiative);

  // Try KB if local confidence is low
  if (localReply.confidence < LAYER1_CONFIDENCE) {
    try {
      const kbReply = await queryKnowledgeBase(userText, childAge);
      if (kbReply && kbReply.confidence >= LAYER2_CONFIDENCE) {
        reply = postProcess(kbReply, childName, childAge, personalityCtx, tomSnap);
        reply = applyOrchestration(reply, orchestrationDirective, understanding, v7Session, cognitionPlan, proactiveInitiative);
      }
    } catch { /* KB failed, use local */ }
  }

  const totalMs = performance.now() - pipelineStart;
  console.log(`[Brain] ⚡ Local fallback + V8: ${localReply.intent} (${totalMs.toFixed(0)}ms total)`);
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
